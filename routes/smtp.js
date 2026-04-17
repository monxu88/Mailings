const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { db, nextId, today, resetDailyCountsIfNeeded } = require('../db/database');

router.get('/', (req, res) => {
  resetDailyCountsIfNeeded();
  const accounts = db.get('smtp_accounts').value().map(a => {
    const { smtp_pass, smtp_user, ...safe } = a;
    return safe;
  });
  res.json(accounts);
});

router.post('/', (req, res) => {
  const { email, smtp_host, smtp_port, smtp_user, smtp_pass, daily_limit } = req.body;
  if (!email || !smtp_host || !smtp_user || !smtp_pass)
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  const exists = db.get('smtp_accounts').find({ email }).value();
  if (exists) return res.status(400).json({ error: 'El email ya existe' });
  const id = nextId('smtp_accounts');
  db.get('smtp_accounts').push({
    id, email, smtp_host,
    smtp_port: smtp_port || 587,
    smtp_user, smtp_pass,
    daily_limit: daily_limit || 50,
    sent_today: 0,
    last_reset: today(),
    active: 1
  }).write();
  res.json({ id, ok: true });
});

router.put('/:id', (req, res) => {
  const { daily_limit, active } = req.body;
  const account = db.get('smtp_accounts').find({ id: +req.params.id });
  if (!account.value()) return res.status(404).json({ error: 'No encontrado' });
  if (daily_limit !== undefined) account.assign({ daily_limit: +daily_limit }).write();
  if (active !== undefined) account.assign({ active: active ? 1 : 0 }).write();
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.get('smtp_accounts').remove({ id: +req.params.id }).write();
  res.json({ ok: true });
});

router.post('/:id/test', async (req, res) => {
  const account = db.get('smtp_accounts').find({ id: +req.params.id }).value();
  if (!account) return res.status(404).json({ error: 'Cuenta no encontrada' });
  try {
    const transporter = nodemailer.createTransport({
      host: account.smtp_host,
      port: account.smtp_port,
      secure: account.smtp_port === 465,
      auth: { user: account.smtp_user, pass: account.smtp_pass }
    });
    await transporter.verify();
    res.json({ ok: true, message: 'Conexión SMTP correcta' });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

module.exports = router;
