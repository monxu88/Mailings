const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { db, nextId, now } = require('../db/database');

// GET seed accounts list
router.get('/', (req, res) => {
  res.json(db.get('seed_tests').value().slice().reverse());
});

// POST /seed/send — send test email to seed addresses
router.post('/send', async (req, res) => {
  const { seed_emails, subject, body_html, smtp_account_id } = req.body;
  if (!seed_emails || !seed_emails.length) return res.status(400).json({ error: 'Indica al menos un email semilla' });
  if (!subject || !body_html) return res.status(400).json({ error: 'Falta asunto o cuerpo' });

  const account = db.get('smtp_accounts').find({ id: +smtp_account_id }).value();
  if (!account) return res.status(400).json({ error: 'Selecciona una cuenta SMTP válida' });

  const transporter = nodemailer.createTransport({
    host: account.smtp_host,
    port: account.smtp_port,
    secure: account.smtp_port === 465,
    auth: { user: account.smtp_user, pass: account.smtp_pass }
  });

  const results = [];
  for (const email of seed_emails) {
    try {
      await transporter.sendMail({
        from: `Test <${account.email}>`,
        to: email.trim(),
        subject: `[SEED TEST] ${subject}`,
        html: body_html,
        headers: { 'X-Seed-Test': 'true' }
      });
      const entry = {
        id: nextId('seed_tests'),
        email: email.trim(),
        subject,
        smtp_account: account.email,
        sent_at: now(),
        status: 'sent',
        inbox_result: 'pending', // user updates this manually after checking
        notes: ''
      };
      db.get('seed_tests').push(entry).write();
      results.push({ email, ok: true });
    } catch (e) {
      results.push({ email, ok: false, error: e.message });
    }
  }

  res.json({ results });
});

// PATCH /seed/:id — user updates the result after checking their inbox
router.patch('/:id', (req, res) => {
  const { inbox_result, notes } = req.body;
  // inbox_result: 'inbox' | 'spam' | 'missing'
  db.get('seed_tests').find({ id: +req.params.id })
    .assign({ inbox_result: inbox_result || 'pending', notes: notes || '' })
    .write();
  res.json({ ok: true });
});

// DELETE /seed/:id
router.delete('/:id', (req, res) => {
  db.get('seed_tests').remove({ id: +req.params.id }).write();
  res.json({ ok: true });
});

module.exports = router;
