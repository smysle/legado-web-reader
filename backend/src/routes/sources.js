const express = require('express');
const multer = require('multer');

const {
  importSources,
  listSources,
  getSource,
  updateSource,
  deleteSource,
  deleteSources,
} = require('../services/source-store');
const { decodeSourceId } = require('../utils/url');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function parseImportBody(req) {
  if (req.file) {
    const raw = req.file.buffer.toString('utf8');
    return JSON.parse(raw);
  }

  if (Array.isArray(req.body)) {
    return req.body;
  }

  if (Array.isArray(req.body.sources)) {
    return req.body.sources;
  }

  if (req.body && req.body.bookSourceUrl) {
    return [req.body];
  }

  return [];
}

router.post('/import', upload.single('file'), (req, res, next) => {
  try {
    const payload = parseImportBody(req);
    const result = importSources(payload);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/', (req, res, next) => {
  try {
    const enabled =
      req.query.enabled == null
        ? null
        : req.query.enabled === 'true' || req.query.enabled === '1';

    const sources = listSources({
      group: req.query.group,
      enabled,
      search: req.query.search,
    });

    res.json({ sources });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', (req, res) => {
  const sourceUrl = decodeSourceId(req.params.id);
  const source = getSource(sourceUrl);
  if (!source) {
    res.status(404).json({ error: 'source not found' });
    return;
  }
  res.json(source);
});

router.put('/:id', (req, res) => {
  const sourceUrl = decodeSourceId(req.params.id);
  const updated = updateSource(sourceUrl, req.body || {});
  if (!updated) {
    res.status(404).json({ error: 'source not found' });
    return;
  }
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const sourceUrl = decodeSourceId(req.params.id);
  const removed = deleteSource(sourceUrl);
  if (!removed) {
    res.status(404).json({ error: 'source not found' });
    return;
  }
  res.json({ deleted: removed });
});

router.delete('/', (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const decoded = ids.map((id) => decodeSourceId(id));
  const removed = deleteSources(decoded);
  res.json({ deleted: removed });
});

module.exports = router;
