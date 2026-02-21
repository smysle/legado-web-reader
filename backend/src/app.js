const express = require('express');
const cors = require('cors');

const sourcesRouter = require('./routes/sources');
const searchRouter = require('./routes/search');
const bookRouter = require('./routes/book');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/sources', sourcesRouter);
app.use('/api/search', searchRouter);
app.use('/api/book', bookRouter);

app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: err.message || 'internal server error' });
});

module.exports = app;
