const { buildContext, extractList, pickField, extractObjectByRules } = require('../engine/extractor');
const { applyRule } = require('../engine/dispatcher');
const { applyReplaceRegexSpec } = require('../engine/regex');
const { resolveUrl } = require('../utils/url');

function extractSearchResults(raw, source, baseUrl) {
  const rule = source.ruleSearch || {};
  if (!rule.bookList) return [];

  const context = buildContext(raw);
  const items = extractList(context, rule.bookList);

  return items.map((item) => ({
    sourceId: source.bookSourceUrl,
    sourceName: source.bookSourceName,
    name: pickField(context, item, rule.name),
    author: pickField(context, item, rule.author),
    intro: pickField(context, item, rule.intro),
    kind: pickField(context, item, rule.kind),
    lastChapter: pickField(context, item, rule.lastChapter),
    coverUrl: pickField(context, item, rule.coverUrl, { isUrlField: true, baseUrl }),
    bookUrl: pickField(context, item, rule.bookUrl, { isUrlField: true, baseUrl }),
    wordCount: pickField(context, item, rule.wordCount),
  })).filter((book) => book.name || book.bookUrl);
}

function extractBookInfo(raw, source, baseUrl) {
  const rule = source.ruleBookInfo || {};

  const data = extractObjectByRules(raw, rule, {
    name: { baseUrl, isUrl: false },
    author: { baseUrl, isUrl: false },
    intro: { baseUrl, isUrl: false },
    kind: { baseUrl, isUrl: false },
    lastChapter: { baseUrl, isUrl: false },
    coverUrl: { baseUrl, isUrl: true },
    tocUrl: { baseUrl, isUrl: true },
    wordCount: { baseUrl, isUrl: false },
  });

  return data;
}

function extractTocPage(raw, source, baseUrl) {
  const rule = source.ruleToc || {};
  if (!rule.chapterList) {
    return { chapters: [], nextTocUrl: '' };
  }

  const context = buildContext(raw);
  const items = extractList(context, rule.chapterList);

  const chapters = items.map((item) => {
    const name = pickField(context, item, rule.chapterName);
    const url = pickField(context, item, rule.chapterUrl, { isUrlField: true, baseUrl });
    const vipRaw = pickField(context, item, rule.isVip);
    const isVip = /^(1|true|vip|yes)$/i.test(String(vipRaw || '').trim());
    return { name, url, isVip };
  }).filter((chapter) => chapter.name || chapter.url);

  const nextTocUrl = rule.nextTocUrl
    ? resolveUrl(applyRule(raw, rule.nextTocUrl, { baseUrl }), baseUrl)
    : '';

  return { chapters, nextTocUrl };
}

function extractContent(raw, source, chapterUrl) {
  const rule = source.ruleContent || {};
  const baseUrl = chapterUrl;

  let content = rule.content ? applyRule(raw, rule.content, { baseUrl }) : '';
  if (!content) {
    content = applyRule(raw, '@css:body@html', { baseUrl });
  }

  content = applyReplaceRegexSpec(content, rule.replaceRegex);

  const title = rule.title ? applyRule(raw, rule.title, { baseUrl }) : '';
  const nextContentUrl = rule.nextContentUrl
    ? resolveUrl(applyRule(raw, rule.nextContentUrl, { baseUrl, isUrlField: true }), baseUrl)
    : '';

  return {
    title,
    content,
    contentType: /<[^>]+>/.test(content) ? 'html' : 'text',
    nextContentUrl: nextContentUrl || null,
  };
}

module.exports = {
  extractSearchResults,
  extractBookInfo,
  extractTocPage,
  extractContent,
};
