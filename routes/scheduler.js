const express = require('express');
const router = express.Router();
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const { db, nextId, now, today, resetDailyCountsIfNeeded } = require('../db/database');
const { renderTemplate } = require('./templates');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Active cron jobs map: id -> task
const activeTasks = new Map();

// ─── Ramp-up volume calculator ─────────────────────────────────────────────
function getRampVolume(campaign) {
  if (!campaign.ramp_enabled) return campaign.daily_limit || 999999;
  const start = campaign.ramp_start || campaign.scheduled_at?.slice(0,10) || today();
  const dayNum = Math.max(1, Math.floor((new Date(today()) - new Date(start)) / 86400000) + 1);
  const ramp = campaign.ramp_schedule || [20,30,50,80,120,180,250];
  const idx = Math.min(dayNum - 1, ramp.length - 1);
  return ramp[idx];
}

// ─── Core send function (reused by scheduler) ──────────────────────────────
async function executeSend(scheduledCampaign) {
  resetDailyCountsIfNeeded();

  const sc = db.get('scheduled_campaigns').find({ id: scheduledCampaign.id }).value();
  if (!sc) return;

  const accounts = db.get('smtp_accounts').filter({ active: 1 }).value()
    .filter(a => a.sent_today < a.daily_limit);
  if (!accounts.length) {
    db.get('scheduled_campaigns').find({ id: sc.id }).assign({ last_error: 'Sin cuentas SMTP disponibles', last_run: now() }).write();
    return;
  }

  const volume = getRampVolume(sc);

  // Filter by group, sector, or custom filter
  let allSubs = db.get('subscribers').filter({ status: 'pending' }).value();
  if (sc.group_id) allSubs = allSubs.filter(s => (s.groups||[]).includes(+sc.group_id));
  if (sc.sector_filter && sc.sector_filter.length) {
    const sectors = sc.sector_filter.map(s => s.toLowerCase());
    allSubs = allSubs.filter(s => sectors.includes((s.sector||'').toLowerCase()));
  }
  if (sc.status_filter) allSubs = allSubs.filter(s => s.status === sc.status_filter);
  const subscribers = allSubs.slice(0, volume);

  if (!subscribers.length) {
    db.get('scheduled_campaigns').find({ id: sc.id }).assign({ status: sc.repeat ? 'active' : 'completed', last_run: now() }).write();
    return;
  }

  // Render template
  const template = db.get('templates').find({ id: sc.template_id }).value();
  const logoUrl = db.get('_assets.logo_url').value() || '';
  const mergedVars = { ...((template||{}).variables||{}), ...(sc.variables||{}) };

  // Create campaign record
  const campaignId = nextId('campaigns');
  db.get('campaigns').push({
    id: campaignId,
    name: `${sc.name} — ${today()}`,
    subject: sc.subject,
    body_html: template ? renderTemplate(template.html, mergedVars, logoUrl) : sc.body_html || '',
    template_id: sc.template_id,
    scheduled_campaign_id: sc.id,
    status: 'sending',
    created_at: now(),
    sent_count: 0,
    open_count: 0
  }).write();

  // Distribute across accounts
  const accState = accounts.map(a => ({ ...a }));
  const queue = [];
  let accIdx = 0;
  for (const sub of subscribers) {
    while (accIdx < accState.length && accState[accIdx].sent_today >= accState[accIdx].daily_limit) accIdx++;
    if (accIdx >= accState.length) break;
    queue.push({ sub, account: accState[accIdx] });
    accState[accIdx].sent_today++;
  }

  const transporters = {};
  let sent = 0, errors = 0;

  for (const { sub, account } of queue) {
    try {
      if (!transporters[account.id]) {
        transporters[account.id] = nodemailer.createTransport({
          host: account.smtp_host, port: account.smtp_port,
          secure: account.smtp_port === 465,
          auth: { user: account.smtp_user, pass: account.smtp_pass }
        });
      }
      const logId = nextId('send_log');
      db.get('send_log').push({ id: logId, subscriber_id: sub.id, account_id: account.id, campaign_id: campaignId, status: 'pending', error: null, sent_at: now() }).write();

      const pixelUrl = `${BASE_URL}/track/open/${logId}`;
      const pixelTag = `<img src="${pixelUrl}" width="1" height="1" style="display:none" alt=""/>`;
      let html = db.get('campaigns').find({ id: campaignId }).value().body_html;
      html = html.replace(/\{\{nombre\}\}/gi, sub.name||'').replace(/\{\{empresa\}\}/gi, sub.company||'').replace(/\{\{email\}\}/gi, sub.email);
      html = html.includes('</body>') ? html.replace(/<\/body>/i, `${pixelTag}</body>`) : html + pixelTag;

      await transporters[account.id].sendMail({ from: `${sc.from_name||'Presencia'} <${account.email}>`, to: sub.email, subject: sc.subject, html });
      db.get('send_log').find({ id: logId }).assign({ status: 'sent', sent_at: now() }).write();
      db.get('subscribers').find({ id: sub.id }).assign({ status: 'sent', sent_at: now() }).write();
      db.get('smtp_accounts').find({ id: account.id }).update('sent_today', n => n + 1).write();
      sent++;
      await new Promise(r => setTimeout(r, 300));
    } catch(e) {
      db.get('subscribers').find({ id: sub.id }).assign({ status: 'error' }).write();
      errors++;
    }
  }

  db.get('campaigns').find({ id: campaignId }).assign({ status: 'done', sent_count: sent }).write();

  // Update template stats
  if (sc.template_id) {
    const tpl = db.get('templates').find({ id: sc.template_id });
    if (tpl.value()) tpl.update('stats.campaigns_used', n => (n||0)+1).update('stats.total_sent', n => (n||0)+sent).write();
  }

  // Advance ramp day
  if (sc.ramp_enabled) {
    db.get('scheduled_campaigns').find({ id: sc.id }).update('ramp_day', n => (n||0)+1).write();
  }

  const nextStatus = sc.repeat ? 'active' : 'completed';
  db.get('scheduled_campaigns').find({ id: sc.id }).assign({ status: nextStatus, last_run: now(), last_sent: sent, last_error: errors > 0 ? `${errors} errores` : null }).write();
  console.log(`[Scheduler] Campaign "${sc.name}" sent: ${sent}, errors: ${errors}`);
}

// ─── Schedule a campaign ───────────────────────────────────────────────────
function scheduleCampaign(sc) {
  if (activeTasks.has(sc.id)) { activeTasks.get(sc.id).destroy(); activeTasks.delete(sc.id); }
  if (sc.status !== 'active') return;

  const d = new Date(sc.scheduled_at);
  const minute = d.getMinutes();
  const hour = d.getHours();
  const dayOfMonth = sc.repeat === 'daily' ? '*' : d.getDate();
  const month = sc.repeat ? '*' : d.getMonth() + 1;
  const dayOfWeek = '*';

  let cronExpr;
  if (sc.repeat === 'daily') cronExpr = `${minute} ${hour} * * *`;
  else if (sc.repeat === 'weekly') cronExpr = `${minute} ${hour} * * ${d.getDay()}`;
  else cronExpr = `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`;

  if (!cron.validate(cronExpr)) { console.warn(`[Scheduler] Invalid cron: ${cronExpr}`); return; }

  const task = cron.schedule(cronExpr, () => executeSend(sc), { timezone: 'Europe/Madrid' });
  activeTasks.set(sc.id, task);
  console.log(`[Scheduler] Scheduled "${sc.name}" → ${cronExpr}`);
}

// Boot: reschedule all active campaigns
function bootScheduler() {
  const active = db.get('scheduled_campaigns').filter({ status: 'active' }).value();
  active.forEach(scheduleCampaign);
  console.log(`[Scheduler] Booted ${active.length} active campaigns`);
}

// ─── Routes ───────────────────────────────────────────────────────────────

router.get('/', (req, res) => {
  const list = db.get('scheduled_campaigns').value().slice().reverse();
  res.json(list);
});

function _buildAudienceLabel(group_id, sector_filter, groups_map) {
  const parts = [];
  if (group_id && groups_map && groups_map[group_id]) parts.push('Grupo: ' + groups_map[group_id]);
  if (sector_filter && sector_filter.length) parts.push('Sectores: ' + sector_filter.join(', '));
  return parts.length ? parts.join(' + ') : 'Todos los pendientes';
}

router.post('/', (req, res) => {
  const { name, subject, template_id, variables, from_name, group_id,
          sector_filter, scheduled_at, repeat, ramp_enabled, ramp_schedule, daily_limit } = req.body;
  if (!name || !subject || !scheduled_at) return res.status(400).json({ error: 'Faltan campos: name, subject, scheduled_at' });
  // Build groups map for label
  const groups = db.get('groups').value();
  const groups_map = Object.fromEntries(groups.map(g => [g.id, g.name]));
  const id = nextId('scheduled_campaigns');
  const sc = {
    id, name, subject, template_id: +template_id || null,
    variables: variables || {},
    from_name: from_name || 'Presencia',
    group_id: group_id ? +group_id : null,
    sector_filter: sector_filter || [],
    audience_label: _buildAudienceLabel(group_id, sector_filter, groups_map),
    scheduled_at,
    repeat: repeat || null,            // null | 'daily' | 'weekly'
    ramp_enabled: !!ramp_enabled,
    ramp_schedule: ramp_schedule || [20,30,50,80,120,180,250],
    ramp_day: 0,
    ramp_start: today(),
    daily_limit: daily_limit || null,
    status: 'active',
    created_at: now(),
    last_run: null, last_sent: 0, last_error: null
  };
  db.get('scheduled_campaigns').push(sc).write();
  scheduleCampaign(sc);
  res.json({ id, ok: true });
});

router.put('/:id', (req, res) => {
  const sc = db.get('scheduled_campaigns').find({ id: +req.params.id });
  if (!sc.value()) return res.status(404).json({ error: 'No encontrada' });
  const allowed = ['name','subject','from_name','scheduled_at','repeat','status','ramp_enabled','ramp_schedule','daily_limit','group_id','template_id','variables'];
  const update = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
  sc.assign(update).write();
  scheduleCampaign(sc.value());
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const id = +req.params.id;
  if (activeTasks.has(id)) { activeTasks.get(id).destroy(); activeTasks.delete(id); }
  db.get('scheduled_campaigns').remove({ id }).write();
  res.json({ ok: true });
});

// POST run now
router.post('/:id/run', async (req, res) => {
  const sc = db.get('scheduled_campaigns').find({ id: +req.params.id }).value();
  if (!sc) return res.status(404).json({ error: 'No encontrada' });
  res.json({ ok: true, message: 'Enviando en background...' });
  await executeSend(sc);
});

// GET stats comparison across templates
router.get('/stats/templates', (req, res) => {
  const templates = db.get('templates').value();
  const campaigns = db.get('campaigns').value();
  const opens = db.get('opens').value();
  const result = templates.map(t => {
    const tCampaigns = campaigns.filter(c => c.template_id === t.id);
    const totalSent = tCampaigns.reduce((s,c) => s + (c.sent_count||0), 0);
    const totalOpened = opens.filter(o => tCampaigns.some(c => c.id === o.campaign_id)).length;
    const openRate = totalSent > 0 ? Math.round((totalOpened/totalSent)*100) : 0;
    return { id: t.id, name: t.name, category: t.category, thumbnail_color: t.thumbnail_color, campaigns_used: tCampaigns.length, total_sent: totalSent, total_opened: totalOpened, open_rate: openRate };
  }).filter(t => t.campaigns_used > 0).sort((a,b) => b.open_rate - a.open_rate);
  res.json(result);
});

module.exports = { router, bootScheduler };
