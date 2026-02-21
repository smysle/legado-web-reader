const express = require('express');

const { getSource, getEnabledSources } = require('../services/source-store');
const { fetchRemote } = require('../utils/http');
const { renderSearchUrl } = require('../utils/template');
const { extractSearchResults } = require('../services/parser');

const router = express.Router();

router.get('/', async (req, res) => {
  const keyword = String(req.query.keyword || '').trim();
  const sourceId = String(req.query.sourceId || '').trim();
  const page = Number(req.query.page || 1);

  if (!keyword) {
    res.status(400).json({ error: 'keyword is required' });
    return;
  }

  let sources;
  if (sourceId) {
    const source = getSource(sourceId);
    if (!source) {
      res.status(404).json({ error: 'source not found' });
      return;
    }
    sources = [source];
  } else {
    sources = getEnabledSources().filter((s) => s.searchUrl && s.ruleSearch);
  }

  const jobs = sources.map(async (source) => {
    if (!source.searchUrl || !source.ruleSearch) return [];

    const targetUrl = renderSearchUrl(source.searchUrl, { key: keyword, page });
    if (!targetUrl) return [];

    try {
      const response = await fetchRemote(targetUrl, source);
      return extractSearchResults(response.body, source, response.url);
    } catch (_) {
      return [];
    }
  });

  const chunks = await Promise.all(jobs);
  const results = chunks.flat();

  res.json({
    results,
    hasMore: false,
  });
});

module.exports = router;
