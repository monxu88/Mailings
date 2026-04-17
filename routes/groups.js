const express = require('express');
const router = express.Router();
const { db, nextId, now } = require('../db/database');

// GET all groups with subscriber count
router.get('/', (req, res) => {
  const groups = db.get('groups').value();
  const result = groups.map(g => ({
    ...g,
    count: db.get('subscribers').filter(s => (s.groups || []).includes(g.id)).size().value()
  }));
  res.json(result);
});

// POST create group
router.post('/', (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  const exists = db.get('groups').find(g => g.name.toLowerCase() === name.toLowerCase()).value();
  if (exists) return res.status(400).json({ error: 'Ya existe un grupo con ese nombre' });
  const id = nextId('groups');
  db.get('groups').push({ id, name, color: color || '#6366f1', created_at: now() }).write();
  res.json({ id, ok: true });
});

// PUT rename group
router.put('/:id', (req, res) => {
  const { name, color } = req.body;
  const g = db.get('groups').find({ id: +req.params.id });
  if (!g.value()) return res.status(404).json({ error: 'Grupo no encontrado' });
  if (name) g.assign({ name }).write();
  if (color) g.assign({ color }).write();
  res.json({ ok: true });
});

// DELETE group — removes group from all subscribers
router.delete('/:id', (req, res) => {
  const gid = +req.params.id;
  db.get('groups').remove({ id: gid }).write();
  // Remove from all subscribers
  db.get('subscribers').each(s => {
    if (s.groups && s.groups.includes(gid)) {
      s.groups = s.groups.filter(x => x !== gid);
    }
  }).write();
  res.json({ ok: true });
});

// POST assign subscribers to group
router.post('/:id/assign', (req, res) => {
  const gid = +req.params.id;
  const { subscriber_ids } = req.body; // array of ids
  if (!subscriber_ids || !subscriber_ids.length) return res.status(400).json({ error: 'Sin suscriptores' });
  db.get('subscribers').each(s => {
    if (subscriber_ids.includes(s.id)) {
      if (!s.groups) s.groups = [];
      if (!s.groups.includes(gid)) s.groups.push(gid);
    }
  }).write();
  res.json({ ok: true, assigned: subscriber_ids.length });
});

// POST remove subscribers from group
router.post('/:id/remove', (req, res) => {
  const gid = +req.params.id;
  const { subscriber_ids } = req.body;
  db.get('subscribers').each(s => {
    if (subscriber_ids.includes(s.id) && s.groups) {
      s.groups = s.groups.filter(x => x !== gid);
    }
  }).write();
  res.json({ ok: true });
});

// GET subscribers in a group
router.get('/:id/subscribers', (req, res) => {
  const gid = +req.params.id;
  const subs = db.get('subscribers').filter(s => (s.groups || []).includes(gid)).value();
  res.json(subs);
});

module.exports = router;
