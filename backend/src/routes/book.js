const express = require('express');

const { getSource } = require('../services/source-store');
const { fetchRemote } = require('../utils/http');
const { extractBookInfo, extractTocPage, extractContent } = require('../services/parser');

const router = express.Router();

function mustSource(sourceId, res) {
  const source = getSource(sourceId);
  if (!source) {
    res.status(404).json({ error: 'source not found' });
    return null;
  }
  return source;
}

router.get('/info', async (req, res) => {
  const sourceId = String(req.query.sourceId || '').trim();
  const bookUrl = String(req.query.bookUrl || '').trim();

  if (!sourceId || !bookUrl) {
    res.status(400).json({ error: 'sourceId and bookUrl are required' });
    return;
  }

  const source = mustSource(sourceId, res);
  if (!source) return;

  try {
    const response = await fetchRemote(bookUrl, source);
    const info = extractBookInfo(response.body, source, response.url);

    if (!info.tocUrl) {
      info.tocUrl = bookUrl;
    }

    res.json(info);
  } catch (error) {
    res.status(502).json({ error: error.message || 'failed to fetch book info' });
  }
});

router.get('/toc', async (req, res) => {
  const sourceId = String(req.query.sourceId || '').trim();
  const tocUrl = String(req.query.tocUrl || '').trim();

  if (!sourceId || !tocUrl) {
    res.status(400).json({ error: 'sourceId and tocUrl are required' });
    return;
  }

  const source = mustSource(sourceId, res);
  if (!source) return;

  try {
    const chapters = [];
    const visited = new Set();
    let nextUrl = tocUrl;
    let guard = 0;

    while (nextUrl && !visited.has(nextUrl) && guard < 20) {
      guard += 1;
      visited.add(nextUrl);

      const response = await fetchRemote(nextUrl, source);
      const parsed = extractTocPage(response.body, source, response.url);
      chapters.push(...parsed.chapters);
      nextUrl = parsed.nextTocUrl;
    }

    res.json({ chapters });
  } catch (error) {
    res.status(502).json({ error: error.message || 'failed to fetch toc' });
  }
});

router.get('/content', async (req, res) => {
  const sourceId = String(req.query.sourceId || '').trim();
  const chapterUrl = String(req.query.chapterUrl || '').trim();

  if (!sourceId || !chapterUrl) {
    res.status(400).json({ error: 'sourceId and chapterUrl are required' });
    return;
  }

  const source = mustSource(sourceId, res);
  if (!source) return;

  try {
    const response = await fetchRemote(chapterUrl, source);
    const content = extractContent(response.body, source, chapterUrl);
    res.json(content);
  } catch (error) {
    res.status(502).json({ error: error.message || 'failed to fetch content' });
  }
});

module.exports = router;
