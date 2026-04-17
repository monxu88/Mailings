const express = require('express');
const router = express.Router();
const { db, nextId, now } = require('../db/database');

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

// GET /track/open/:logId — pixel endpoint embedded in emails
router.get('/open/:logId', (req, res) => {
  const logId = +req.params.logId;
  const log = db.get('send_log').find({ id: logId }).value();

  if (log && log.status === 'sent') {
    const alreadyOpened = db.get('opens').find({ log_id: logId }).value();
    if (!alreadyOpened) {
      // First open
      db.get('opens').push({
        id: nextId('opens'),
        log_id: logId,
        subscriber_id: log.subscriber_id,
        campaign_id: log.campaign_id,
        opened_at: now(),
        user_agent: req.headers['user-agent'] || '',
        ip: req.headers['x-forwarded-for'] || req.ip
      }).write();
      // Mark subscriber as opened
      db.get('subscribers').find({ id: log.subscriber_id }).assign({ last_opened: now() }).write();
      // Update campaign open count
      db.get('campaigns').find({ id: log.campaign_id }).update('open_count', n => (n || 0) + 1).write();
    } else {
      // Subsequent open — just update timestamp
      db.get('opens').find({ log_id: logId }).assign({ opened_at: now() }).write();
    }
  }

  res.set({
    'Content-Type': 'image/gif',
    'Content-Length': PIXEL.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache'
  });
  res.end(PIXEL);
});

// GET /track/stats/:campaignId — open stats for a campaign
router.get('/stats/:campaignId', (req, res) => {
  const cid = +req.params.campaignId;
  const campaign = db.get('campaigns').find({ id: cid }).value();
  if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' });

  const logs = db.get('send_log').filter({ campaign_id: cid, status: 'sent' }).value();
  const opens = db.get('opens').filter({ campaign_id: cid }).value();
  const openedIds = new Set(opens.map(o => o.subscriber_id));

  const total_sent = logs.length;
  const total_opened = openedIds.size;
  const open_rate = total_sent > 0 ? Math.round((total_opened / total_sent) * 100) : 0;

  // Per-subscriber detail
  const subs = db.get('subscribers').value();
  const detail = logs.map(l => {
    const sub = subs.find(s => s.id === l.subscriber_id) || {};
    const open = opens.find(o => o.subscriber_id === l.subscriber_id);
    return {
      email: sub.email,
      company: sub.company,
      name: sub.name,
      opened: !!open,
      opened_at: open ? open.opened_at : null
    };
  }).sort((a, b) => (b.opened ? 1 : 0) - (a.opened ? 1 : 0));

  res.json({ campaign, total_sent, total_opened, open_rate, detail });
});

// GET /track/opens — all opens summary across campaigns
router.get('/opens', (req, res) => {
  const campaigns = db.get('campaigns').value();
  const result = campaigns.map(c => {
    const sent = db.get('send_log').filter({ campaign_id: c.id, status: 'sent' }).size().value();
    const opened = db.get('opens').filter({ campaign_id: c.id }).uniqBy('subscriber_id').size().value();
    return {
      ...c,
      body_html: undefined,
      total_sent: sent,
      total_opened: opened,
      open_rate: sent > 0 ? Math.round((opened / sent) * 100) : 0
    };
  }).reverse();
  res.json(result);
});

module.exports = router;
