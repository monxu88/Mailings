const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const { db, nextId, now } = require('../db/database');

const upload = multer({ storage: multer.memoryStorage() });

router.get('/', (req, res) => {
  const { status, search, group } = req.query;
  let list = db.get('subscribers').value();
  if (status) list = list.filter(s => s.status === status);
  if (group) list = list.filter(s => (s.groups || []).includes(+group));
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(s =>
      (s.email||'').includes(q) || (s.company||'').toLowerCase().includes(q) || (s.name||'').toLowerCase().includes(q)
    );
  }
  res.json(list.slice().reverse());
});

router.get('/stats', (req, res) => {
  const list = db.get('subscribers').value();
  res.json({
    total: list.length,
    pending: list.filter(s => s.status === 'pending').length,
    sent: list.filter(s => s.status === 'sent').length,
    bounced: list.filter(s => s.status === 'error' || s.status === 'bounced').length
  });
});

router.delete('/bulk/bounced', (req, res) => {
  const before = db.get('subscribers').size().value();
  db.get('subscribers').remove(s => s.status === 'error' || s.status === 'bounced').write();
  const after = db.get('subscribers').size().value();
  res.json({ deleted: before - after });
});

router.delete('/:id', (req, res) => {
  db.get('subscribers').remove({ id: +req.params.id }).write();
  res.json({ ok: true });
});

// POST /preview — parse Excel and return first 5 rows + column names (no import yet)
router.post('/preview', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', header: 1 });
  if (rows.length < 2) return res.status(400).json({ error: 'Archivo vacío o sin datos' });
  const headers = rows[0].map(h => String(h).trim());
  const preview = rows.slice(1, 6).map(row =>
    headers.reduce((obj, h, i) => { obj[h] = String(row[i] || ''); return obj; }, {})
  );
  const total = rows.length - 1;
  res.json({ headers, preview, total });
});

// POST /import — import with explicit column mapping
router.post('/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  // mapping: { email: 'col_name', name: 'col_name', company: 'col_name', sector: 'col_name' }
  // groups: [id1, id2] optional
  let mapping, groups;
  try {
    mapping = JSON.parse(req.body.mapping || '{}');
    groups = JSON.parse(req.body.groups || '[]').map(Number);
  } catch { return res.status(400).json({ error: 'Mapping inválido' }); }

  if (!mapping.email) return res.status(400).json({ error: 'Debes indicar qué columna es el email' });

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const existing = new Set(db.get('subscribers').map('email').value());
  let imported = 0, skipped = 0;
  const toAdd = [];

  for (const row of rows) {
    const email = String(row[mapping.email] || '').trim().toLowerCase();
    if (!email || !email.includes('@')) { skipped++; continue; }
    if (existing.has(email)) { skipped++; continue; }
    existing.add(email);
    toAdd.push({
      id: nextId('subscribers'),
      email,
      name: mapping.name ? String(row[mapping.name] || '').trim() : '',
      company: mapping.company ? String(row[mapping.company] || '').trim() : '',
      sector: mapping.sector ? String(row[mapping.sector] || '').trim() : '',
      custom1: mapping.custom1 ? String(row[mapping.custom1] || '').trim() : '',
      custom1_label: mapping.custom1_label || '',
      groups: groups.length ? [...groups] : [],
      status: 'pending',
      created_at: now(),
      sent_at: null
    });
    imported++;
  }

  if (toAdd.length > 0) db.get('subscribers').push(...toAdd).write();
  res.json({ imported, skipped, total: rows.length });
});

// GET /sectors — list all unique sectors
router.get('/sectors', (req, res) => {
  const subs = db.get('subscribers').value();
  const sectors = [...new Set(subs.map(s => (s.sector||'').trim()).filter(Boolean))].sort();
  const counts = sectors.map(s => ({
    sector: s,
    count: subs.filter(x => (x.sector||'').trim() === s).length,
    pending: subs.filter(x => (x.sector||'').trim() === s && x.status === 'pending').length
  }));
  res.json(counts);
});

// POST /audience-preview — preview how many subscribers match filters
router.post('/audience-preview', (req, res) => {
  const { group_id, sector_filter } = req.body;
  let subs = db.get('subscribers').filter({ status: 'pending' }).value();
  if (group_id) subs = subs.filter(s => (s.groups||[]).includes(+group_id));
  if (sector_filter && sector_filter.length) {
    const sectors = sector_filter.map(s => s.toLowerCase());
    subs = subs.filter(s => sectors.includes((s.sector||'').toLowerCase()));
  }
  res.json({ count: subs.length, sample: subs.slice(0,5).map(s => ({ email: s.email, name: s.name, company: s.company, sector: s.sector })) });
});

module.exports = router;
