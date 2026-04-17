const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db, nextId, now } = require('../db/database');
const DEFAULT_TEMPLATES = require('../templates-default');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

// Seed default templates on first run
function seedTemplates() {
  const existing = db.get('templates').size().value();
  if (existing === 0) {
    DEFAULT_TEMPLATES.forEach(t => {
      db.get('templates').push({
        id: nextId('templates'),
        ...t,
        is_default: true,
        created_at: now(),
        updated_at: now(),
        stats: { campaigns_used: 0, total_sent: 0, total_opened: 0, open_rate: 0 }
      }).write();
    });
    console.log('[Templates] Seeded 10 default templates');
  }
}
seedTemplates();

// Render template: replace {{var}} with values
function renderTemplate(html, variables, logoUrl) {
  let out = html;
  const vars = { ...variables, logo_url: logoUrl || variables.logo_url || '' };
  // Replace all {{var}}
  Object.entries(vars).forEach(([k, v]) => {
    out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v || '');
  });
  // Handle {{#if var}}...{{/if}} blocks
  out = out.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, varName, content) => {
    return vars[varName] ? content : '';
  });
  // Handle {{#if var}}...{{else}}...{{/if}}
  out = out.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, varName, ifContent, elseContent) => {
    return vars[varName] ? ifContent : elseContent;
  });
  return out;
}

// GET all templates (with stats)
router.get('/', (req, res) => {
  const templates = db.get('templates').value().map(t => ({ ...t, html: undefined }));
  res.json(templates);
});

// GET single template with full HTML
router.get('/:id', (req, res) => {
  const t = db.get('templates').find({ id: +req.params.id }).value();
  if (!t) return res.status(404).json({ error: 'Plantilla no encontrada' });
  res.json(t);
});

// POST create template
router.post('/', (req, res) => {
  const { name, description, category, html, variables } = req.body;
  if (!name || !html) return res.status(400).json({ error: 'Nombre y HTML requeridos' });
  const id = nextId('templates');
  db.get('templates').push({
    id, name, description: description || '', category: category || 'cold',
    html, variables: variables || {},
    thumbnail_color: variables?.primary_color || '#1a1a1a',
    is_default: false, created_at: now(), updated_at: now(),
    stats: { campaigns_used: 0, total_sent: 0, total_opened: 0, open_rate: 0 }
  }).write();
  res.json({ id, ok: true });
});

// PUT update template
router.put('/:id', (req, res) => {
  const t = db.get('templates').find({ id: +req.params.id });
  if (!t.value()) return res.status(404).json({ error: 'No encontrada' });
  const { name, description, html, variables, category } = req.body;
  const update = { updated_at: now() };
  if (name) update.name = name;
  if (description !== undefined) update.description = description;
  if (html) update.html = html;
  if (variables) { update.variables = variables; update.thumbnail_color = variables.primary_color || '#1a1a1a'; }
  if (category) update.category = category;
  t.assign(update).write();
  res.json({ ok: true });
});

// DELETE template (only non-default, or force)
router.delete('/:id', (req, res) => {
  const t = db.get('templates').find({ id: +req.params.id }).value();
  if (!t) return res.status(404).json({ error: 'No encontrada' });
  if (t.is_default && !req.query.force) return res.status(400).json({ error: 'No puedes eliminar plantillas por defecto. Usa ?force=1' });
  db.get('templates').remove({ id: +req.params.id }).write();
  res.json({ ok: true });
});

// POST /preview — render template with variables and return HTML
router.post('/:id/preview', (req, res) => {
  const t = db.get('templates').find({ id: +req.params.id }).value();
  if (!t) return res.status(404).json({ error: 'No encontrada' });
  const { variables, logo_url } = req.body;
  const mergedVars = { ...t.variables, ...(variables || {}) };
  const rendered = renderTemplate(t.html, mergedVars, logo_url || db.get('_assets.logo_url').value());
  res.json({ html: rendered });
});

// POST /render — render arbitrary HTML with variables (for campaign send)
router.post('/render', (req, res) => {
  const { template_id, variables, logo_url } = req.body;
  const t = db.get('templates').find({ id: +template_id }).value();
  if (!t) return res.status(404).json({ error: 'Plantilla no encontrada' });
  const mergedVars = { ...t.variables, ...(variables || {}) };
  const rendered = renderTemplate(t.html, mergedVars, logo_url || db.get('_assets.logo_url').value());
  res.json({ html: rendered, subject: variables?.subject_line || t.variables?.subject_line || '' });
});

// POST /logo — upload logo image
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

router.post('/logo', upload.single('logo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const ext = req.file.originalname.split('.').pop().toLowerCase();
  const filename = `logo_${Date.now()}.${ext}`;
  const filepath = path.join(uploadDir, filename);
  fs.writeFileSync(filepath, req.file.buffer);
  const url = `/uploads/${filename}`;
  db.set('_assets.logo_url', url).write();
  res.json({ ok: true, url });
});

// PUT /logo-url — set logo from URL
router.put('/logo-url', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL requerida' });
  db.set('_assets.logo_url', url).write();
  res.json({ ok: true, url });
});

// GET /logo
router.get('/assets/logo', (req, res) => {
  res.json({ url: db.get('_assets.logo_url').value() || '' });
});

module.exports = { router, renderTemplate };
