const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { db, nextId, now, resetDailyCountsIfNeeded } = require('../db/database');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

router.get('/plan', (req, res) => {
  resetDailyCountsIfNeeded();
  const accounts = db.get('smtp_accounts').filter({ active: 1 }).value().map(({ smtp_pass, smtp_user, ...safe }) => safe);
  const pending = db.get('subscribers').filter({ status: 'pending' }).size().value();
  const totalCapacity = accounts.reduce((s, a) => s + Math.max(0, a.daily_limit - a.sent_today), 0);
  res.json({ accounts, pending, totalCapacity });
});

router.get('/campaigns', (req, res) => {
  res.json(db.get('campaigns').value().slice().reverse());
});

router.get('/log', (req, res) => {
  const logs = db.get('send_log').value().slice(-100).reverse();
  const subs = db.get('subscribers').value();
  const accs = db.get('smtp_accounts').value();
  const opens = db.get('opens').value();
  const enriched = logs.map(l => ({
    ...l,
    email: (subs.find(s => s.id === l.subscriber_id) || {}).email,
    company: (subs.find(s => s.id === l.subscriber_id) || {}).company,
    account_email: (accs.find(a => a.id === l.account_id) || {}).email,
    opened: opens.some(o => o.log_id === l.id)
  }));
  res.json(enriched);
});

router.post('/send', async (req, res) => {
  const { subject, body_html, daily_total, from_name } = req.body;
  if (!subject || !body_html) return res.status(400).json({ error: 'Falta asunto o cuerpo' });

  resetDailyCountsIfNeeded();

  const accounts = db.get('smtp_accounts').filter({ active: 1 }).value()
    .filter(a => a.sent_today < a.daily_limit);
  if (!accounts.length) return res.status(400).json({ error: 'No hay cuentas con capacidad disponible hoy' });

  const maxToSend = daily_total || accounts.reduce((s, a) => s + (a.daily_limit - a.sent_today), 0);
  const subscribers = db.get('subscribers').filter({ status: 'pending' }).take(maxToSend).value();
  if (!subscribers.length) return res.status(400).json({ error: 'No hay suscriptores pendientes' });

  const queue = [];
  const accState = accounts.map(a => ({ ...a }));
  let accIdx = 0;
  for (const sub of subscribers) {
    while (accIdx < accState.length && accState[accIdx].sent_today >= accState[accIdx].daily_limit) accIdx++;
    if (accIdx >= accState.length) break;
    queue.push({ sub, account: accState[accIdx] });
    accState[accIdx].sent_today++;
  }

  const campaignId = nextId('campaigns');
  db.get('campaigns').push({
    id: campaignId,
    name: `Campaña ${new Date().toLocaleDateString('es-ES')}`,
    subject, body_html,
    status: 'sending',
    created_at: now(),
    sent_count: 0,
    open_count: 0
  }).write();

  res.json({ ok: true, total: queue.length, campaignId, message: `Enviando ${queue.length} emails en background...` });

  const transporters = {};
  let sent = 0, errors = 0;

  for (const { sub, account } of queue) {
    try {
      if (!transporters[account.id]) {
        transporters[account.id] = nodemailer.createTransport({
          host: account.smtp_host,
          port: account.smtp_port,
          secure: account.smtp_port === 465,
          auth: { user: account.smtp_user, pass: account.smtp_pass }
        });
      }

      // Create log entry first so we have the ID for the pixel
      const logId = nextId('send_log');
      db.get('send_log').push({
        id: logId,
        subscriber_id: sub.id,
        account_id: account.id,
        campaign_id: campaignId,
        status: 'pending',
        error: null,
        sent_at: now()
      }).write();

      // Inject tracking pixel before </body>
      const pixelUrl = `${BASE_URL}/track/open/${logId}`;
      const pixelTag = `<img src="${pixelUrl}" width="1" height="1" style="display:none;border:0" alt=""/>`;
      const personalizedBody = body_html
        .replace(/\{\{nombre\}\}/gi, sub.name || '')
        .replace(/\{\{empresa\}\}/gi, sub.company || '')
        .replace(/\{\{email\}\}/gi, sub.email)
        .replace(/<\/body>/i, `${pixelTag}</body>`) +
        (body_html.toLowerCase().includes('</body>') ? '' : pixelTag);

      await transporters[account.id].sendMail({
        from: `${from_name || 'Presencia'} <${account.email}>`,
        to: sub.email,
        subject,
        html: personalizedBody
      });

      db.get('send_log').find({ id: logId }).assign({ status: 'sent', sent_at: now() }).write();
      db.get('subscribers').find({ id: sub.id }).assign({ status: 'sent', sent_at: now() }).write();
      db.get('smtp_accounts').find({ id: account.id }).update('sent_today', n => n + 1).write();
      sent++;
      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      db.get('subscribers').find({ id: sub.id }).assign({ status: 'error' }).write();
      db.get('send_log').push({ id: nextId('send_log'), subscriber_id: sub.id, account_id: account.id, campaign_id: campaignId, status: 'error', error: e.message, sent_at: now() }).write();
      errors++;
    }
  }

  db.get('campaigns').find({ id: campaignId }).assign({ status: 'done', sent_count: sent }).write();
  console.log(`Campaign ${campaignId} done: ${sent} sent, ${errors} errors`);
});

module.exports = router;
