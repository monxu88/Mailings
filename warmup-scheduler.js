const cron = require('node-cron');
const { db } = require('./db/database');

let currentTask = null;

function restartScheduler() {
  if (currentTask) { currentTask.destroy(); currentTask = null; }

  const config = db.get('warmup_config').value();
  if (!config.enabled) {
    console.log('[Warmup] Scheduler disabled');
    return;
  }

  const h = config.hour || 8;
  const m = config.minute || 0;
  const cronExpr = `${m} ${h} * * *`; // every day at H:M

  console.log(`[Warmup] Scheduler set to run daily at ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);

  currentTask = cron.schedule(cronExpr, async () => {
    console.log(`[Warmup] Starting daily warmup cycle at ${new Date().toISOString()}`);
    try {
      const { runWarmupCycle } = require('./routes/warmup');
      const result = await runWarmupCycle();
      console.log('[Warmup] Cycle complete:', JSON.stringify(result));
    } catch (e) {
      console.error('[Warmup] Error:', e.message);
    }
  }, { timezone: 'Europe/Madrid' });
}

module.exports = { restartScheduler };
