const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/subscribers', require('./routes/subscribers'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/smtp', require('./routes/smtp'));
app.use('/api/dns', require('./routes/dns'));
app.use('/api/send', require('./routes/send'));
app.use('/api/seed', require('./routes/seed'));
app.use('/api/warmup', require('./routes/warmup').router);
app.use('/api/spamscore', require('./routes/spamscore'));
app.use('/api/templates', require('./routes/templates').router);
app.use('/api/scheduler', require('./routes/scheduler').router);
app.use('/track', require('./routes/tracking'));

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ColdMail running on http://localhost:${PORT}`);
  require('./warmup-scheduler').restartScheduler();
  require('./routes/scheduler').bootScheduler();
});
