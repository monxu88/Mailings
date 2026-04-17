const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
let Imap;
try { Imap = require('imap'); } catch(e) { console.warn('[Warmup] imap module not available - IMAP auto-read disabled'); }
const { db, nextId, now, today } = require('../db/database');

// ─── Helpers ───────────────────────────────────────────────────────────────

const WARMUP_TAG = 'X-Warmup-ColdMail';

function getRampVolume(dayNumber) {
  const ramp = db.get('warmup_config.ramp').value();
  const idx = Math.max(0, Math.min(dayNumber - 1, ramp.length - 1));
  return ramp[idx];
}

function getRandomSubject() {
  const subjects = db.get('warmup_config.subjects').value();
  return subjects[Math.floor(Math.random() * subjects.length)];
}

function getWarmupBody(fromEmail, toEmail) {
  const snippets = [
    `<p>Hola,</p><p>Te escribo para retomar el contacto. Espero que todo vaya bien por tu lado.</p><p>Cuando tengas un momento, me gustaría hablar contigo sobre algunas novedades que pueden ser de interés.</p><p>Un saludo,<br>${fromEmail}</p>`,
    `<p>Buenos días,</p><p>Solo quería hacer un seguimiento de nuestra conversación anterior. ¿Has tenido oportunidad de revisar lo que te comenté?</p><p>Quedo a tu disposición.<br>${fromEmail}</p>`,
    `<p>Hola,</p><p>Espero que estés bien. Te escribo con una consulta rápida sobre la gestión del equipo en vuestra empresa.</p><p>¿Tienes 10 minutos esta semana para una llamada?</p><p>Gracias,<br>${fromEmail}</p>`,
    `<p>Buenas tardes,</p><p>Quería compartir contigo algo que creo que puede resultarte útil para optimizar procesos en tu organización.</p><p>¿Te parece bien que te lo explique brevemente?</p><p>Saludos,<br>${fromEmail}</p>`
  ];
  return snippets[Math.floor(Math.random() * snippets.length)];
}

// ─── IMAP: mark email as read + move out of spam ───────────────────────────

function processInboxViaImap(account) {
  return new Promise((resolve) => {
    if (!Imap) return resolve({ processed: 0, note: 'IMAP module not installed' });
    if (!account.imap_host) return resolve({ processed: 0, note: 'No IMAP configured' });

    const imap = new Imap({
      user: account.imap_user || account.smtp_user,
      password: account.imap_pass || account.smtp_pass,
      host: account.imap_host,
      port: account.imap_port || 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 10000,
      authTimeout: 5000
    });

    let processed = 0;

    imap.once('ready', () => {
      // First check INBOX for warmup emails to mark as read
      imap.openBox('INBOX', false, (err, box) => {
        if (err) { imap.end(); return resolve({ processed: 0, error: err.message }); }
        imap.search([['HEADER', WARMUP_TAG, 'true'], 'UNSEEN'], (err, uids) => {
          if (err || !uids || !uids.length) { imap.end(); return resolve({ processed }); }
          // Mark as read
          imap.setFlags(uids, ['\\Seen'], () => {
            processed += uids.length;
            imap.end();
            resolve({ processed });
          });
        });
      });
    });

    imap.once('error', (err) => resolve({ processed: 0, error: err.message }));
    imap.once('end', () => {});
    imap.connect();
  });
}

// ─── Core send warmup emails ───────────────────────────────────────────────

async function runWarmupCycle() {
  const config = db.get('warmup_config').value();
  const smtpAccounts = db.get('smtp_accounts').filter({ active: 1 }).value();
  const externalAccounts = db.get('warmup_accounts').filter({ active: 1 }).value();

  if (!smtpAccounts.length) return { ok: false, error: 'No hay cuentas SMTP activas' };

  const t = today();
  const results = [];

  for (const account of smtpAccounts) {
    // Calculate how many days this account has been warming up
    const startDate = account.warmup_start || t;
    if (!account.warmup_start) {
      db.get('smtp_accounts').find({ id: account.id }).assign({ warmup_start: t, warmup_active: true }).write();
    }

    const dayNumber = Math.floor((new Date(t) - new Date(startDate)) / 86400000) + 1;
    const targetVolume = getRampVolume(dayNumber);

    // Check if already ran today for this account
    const alreadyRan = db.get('warmup_log').find({ account_id: account.id, date: t }).value();
    if (alreadyRan) {
      results.push({ account: account.email, skipped: true, reason: 'Ya ejecutado hoy' });
      continue;
    }

    // Build recipient pool: other SMTP accounts + external accounts
    const recipients = [
      ...smtpAccounts.filter(a => a.id !== account.id).map(a => ({ email: a.email, type: 'internal', id: a.id })),
      ...externalAccounts.map(a => ({ email: a.email, type: 'external', id: a.id }))
    ];

    if (!recipients.length) {
      results.push({ account: account.email, skipped: true, reason: 'Sin destinatarios de warm-up' });
      continue;
    }

    // Pick random recipients up to targetVolume
    const shuffled = recipients.sort(() => Math.random() - 0.5);
    const toSend = shuffled.slice(0, Math.min(targetVolume, shuffled.length));

    let sent = 0, errors = 0;

    try {
      const transporter = nodemailer.createTransport({
        host: account.smtp_host,
        port: account.smtp_port,
        secure: account.smtp_port === 465,
        auth: { user: account.smtp_user, pass: account.smtp_pass },
        connectionTimeout: 10000
      });

      for (const recipient of toSend) {
        try {
          const subject = getRandomSubject();
          const body = getWarmupBody(account.email, recipient.email);
          await transporter.sendMail({
            from: account.email,
            to: recipient.email,
            subject,
            html: body,
            headers: { [WARMUP_TAG]: 'true' }
          });
          sent++;
          await new Promise(r => setTimeout(r, 800 + Math.random() * 1200)); // humanized delay
        } catch (e) {
          errors++;
        }
      }
    } catch (e) {
      results.push({ account: account.email, error: e.message, sent: 0, day: dayNumber });
      continue;
    }

    // Log the run
    db.get('warmup_log').push({
      id: nextId('warmup_log'),
      account_id: account.id,
      account_email: account.email,
      date: t,
      day_number: dayNumber,
      target: targetVolume,
      sent,
      errors,
      ran_at: now()
    }).write();

    // Update account warmup day counter
    db.get('smtp_accounts').find({ id: account.id }).assign({ warmup_day: dayNumber }).write();

    results.push({ account: account.email, day: dayNumber, target: targetVolume, sent, errors });
  }

  // After sending, process IMAP to mark warmup emails as read
  setTimeout(async () => {
    const allAccounts = [
      ...smtpAccounts.map(a => ({ ...a, imap_host: a.imap_host, imap_user: a.smtp_user, imap_pass: a.smtp_pass })),
      ...externalAccounts
    ];
    for (const acc of allAccounts) {
      if (acc.imap_host) await processInboxViaImap(acc);
    }
  }, 5 * 60 * 1000); // 5 min after sending

  return { ok: true, date: t, results };
}

// ─── Routes ───────────────────────────────────────────────────────────────

// GET config + status
router.get('/config', (req, res) => {
  const config = db.get('warmup_config').value();
  const smtpAccounts = db.get('smtp_accounts').value().map(a => {
    const logs = db.get('warmup_log').filter({ account_id: a.id }).value();
    const lastLog = logs[logs.length - 1];
    const dayNumber = a.warmup_day || 0;
    const ramp = config.ramp;
    const isReady = dayNumber >= ramp.length;
    return {
      id: a.id,
      email: a.email,
      warmup_active: a.warmup_active || false,
      warmup_start: a.warmup_start || null,
      warmup_day: dayNumber,
      current_volume: getRampVolume(dayNumber || 1),
      is_ready: isReady,
      last_run: lastLog ? lastLog.date : null,
      last_sent: lastLog ? lastLog.sent : 0,
      total_days: ramp.length
    };
  });
  res.json({ config, smtpAccounts });
});

// PUT update config
router.put('/config', (req, res) => {
  const { enabled, hour, minute } = req.body;
  const cfg = db.get('warmup_config');
  if (enabled !== undefined) cfg.assign({ enabled }).write();
  if (hour !== undefined) cfg.assign({ hour: +hour }).write();
  if (minute !== undefined) cfg.assign({ minute: +minute }).write();
  // Restart scheduler
  const { restartScheduler } = require('../warmup-scheduler');
  restartScheduler();
  res.json({ ok: true, config: db.get('warmup_config').value() });
});

// POST run now (manual trigger)
router.post('/run', async (req, res) => {
  res.json({ ok: true, message: 'Warm-up iniciado en background...' });
  const result = await runWarmupCycle();
  console.log('Warmup result:', JSON.stringify(result));
});

// GET log
router.get('/log', (req, res) => {
  const logs = db.get('warmup_log').value().slice().reverse().slice(0, 100);
  res.json(logs);
});

// GET external warmup accounts (IMAP seed mailboxes)
router.get('/accounts', (req, res) => {
  res.json(db.get('warmup_accounts').value().map(a => ({ ...a, imap_pass: undefined, smtp_pass: undefined })));
});

// POST add external seed mailbox
router.post('/accounts', (req, res) => {
  const { email, imap_host, imap_port, imap_user, imap_pass } = req.body;
  if (!email || !imap_host) return res.status(400).json({ error: 'Email e IMAP host requeridos' });
  const id = nextId('warmup_accounts');
  db.get('warmup_accounts').push({
    id, email, imap_host,
    imap_port: imap_port || 993,
    imap_user: imap_user || email,
    imap_pass: imap_pass || '',
    active: 1,
    added_at: now()
  }).write();
  res.json({ id, ok: true });
});

// DELETE external account
router.delete('/accounts/:id', (req, res) => {
  db.get('warmup_accounts').remove({ id: +req.params.id }).write();
  res.json({ ok: true });
});

// POST reset warmup for an SMTP account
router.post('/reset/:accountId', (req, res) => {
  const id = +req.params.accountId;
  db.get('smtp_accounts').find({ id }).assign({ warmup_start: null, warmup_day: 0, warmup_active: false }).write();
  db.get('warmup_log').remove({ account_id: id }).write();
  res.json({ ok: true });
});

module.exports = { router, runWarmupCycle };
