const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

const adapter = new FileSync(path.join(__dirname, 'coldmail.json'));
const db = low(adapter);

db.defaults({
  subscribers: [],
  smtp_accounts: [],
  campaigns: [],
  send_log: [],
  opens: [],
  seed_tests: [],
  groups: [],
  warmup_accounts: [],
  warmup_log: [],
  templates: [],
  scheduled_campaigns: [],
  _assets: { logo_url: '', logo_base64: '' },
  warmup_config: {
    enabled: false,
    hour: 8,
    minute: 0,
    ramp: [5,5,5,5,5,5,5,15,15,15,15,15,15,15,30,30,30,30,30,30,30,50,50,50,50,50,50,50],
    subjects: [
      "Seguimiento de nuestra conversacion",
      "Una pregunta rapida",
      "Tienes un momento esta semana",
      "Compartiendo algo que puede interesarte",
      "Re: propuesta pendiente",
      "Actualizacion importante",
      "Como va todo por tu lado",
      "Retomando el hilo",
      "Novedad que queria contarte",
      "Breve consulta"
    ]
  },
  _seq: { subscribers: 0, smtp_accounts: 0, campaigns: 0, send_log: 0, opens: 0, seed_tests: 0, groups: 0, warmup_log: 0, warmup_accounts: 0, templates: 0, scheduled_campaigns: 0 }
}).write();

function nextId(table) {
  const val = db.get(`_seq.${table}`).value() + 1;
  db.set(`_seq.${table}`, val).write();
  return val;
}

function now() { return new Date().toISOString(); }
function today() { return new Date().toISOString().slice(0, 10); }

function resetDailyCountsIfNeeded() {
  const t = today();
  db.get('smtp_accounts')
    .filter(a => a.last_reset < t)
    .each(a => { a.sent_today = 0; a.last_reset = t; })
    .value();
  db.write();
}

module.exports = { db, nextId, now, today, resetDailyCountsIfNeeded };
