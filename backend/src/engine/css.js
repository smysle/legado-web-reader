const cheerio = require('cheerio');

const EXTRACTOR_KEYS = new Set([
  'text',
  'html',
  'outerHtml',
  'ownText',
  'textNodes',
  'all',
  'href',
  'src',
]);

function ensureCheerio(raw) {
  return cheerio.load(raw || '');
}

function splitSegments(rule) {
  return String(rule || '')
    .split('@')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseIndex(token) {
  if (token == null || token === '') return null;
  const num = Number(token);
  if (!Number.isInteger(num)) return null;
  return num;
}

function parseTypedSegment(segment) {
  const parts = segment.split('.');
  const type = parts[0];

  if (type === 'class' && parts[1]) {
    return { selector: `.${parts[1]}`, index: parseIndex(parts[2]) };
  }
  if (type === 'id' && parts[1]) {
    return { selector: `#${parts[1]}`, index: parseIndex(parts[2]) };
  }
  if (type === 'tag' && parts[1]) {
    return { selector: parts[1], index: parseIndex(parts[2]) };
  }
  if (type === 'css' && parts[1]) {
    return { selector: parts.slice(1).join('.'), index: null };
  }

  return null;
}

function applySegment($, current, segment) {
  const typed = parseTypedSegment(segment);
  let next;

  if (typed) {
    next = current.find(typed.selector);
    if (typed.index != null) next = next.eq(typed.index);
    return next;
  }

  if (/^-?\d+$/.test(segment)) {
    return current.eq(Number(segment));
  }

  if (segment === 'children') return current.children();

  if (segment.startsWith('children.')) {
    const idx = parseIndex(segment.split('.')[1]);
    const children = current.children();
    return idx == null ? children : children.eq(idx);
  }

  try {
    return current.find(segment);
  } catch (_) {
    return $([]);
  }
}

function ownText($el) {
  const clone = $el.clone();
  clone.children().remove();
  return clone.text();
}

function extractFromSingle($el, extractor) {
  if (!$el || $el.length === 0) return '';

  switch (extractor) {
    case 'text':
    case 'textNodes':
      return $el.text().trim();
    case 'html':
      return ($el.html() || '').trim();
    case 'outerHtml':
    case 'all':
      return ($el.toString() || '').trim();
    case 'ownText':
      return ownText($el).trim();
    case 'href':
    case 'src':
      return ($el.attr(extractor) || '').trim();
    default: {
      const attr = $el.attr(extractor);
      if (attr != null) return String(attr).trim();
      return $el.text().trim();
    }
  }
}

function extractFromSelection($, selection, extractor, asArray = false) {
  if (!asArray) {
    return extractFromSingle(selection.first(), extractor);
  }

  const list = [];
  selection.each((_, el) => {
    list.push(extractFromSingle($(el), extractor));
  });

  return list.filter((v) => String(v || '').trim() !== '');
}

function evaluateJsoupLike($, rule, { scope = null, asSelection = false, asArray = false } = {}) {
  const raw = String(rule || '').trim().replace(/^@css:/i, '');
  if (!raw) return asSelection ? $([]) : '';

  const segments = splitSegments(raw);
  let current = scope ? $(scope) : $.root();
  let extractor = null;

  for (const segment of segments) {
    if (EXTRACTOR_KEYS.has(segment)) {
      extractor = segment;
      break;
    }
    current = applySegment($, current, segment);
  }

  if (asSelection) return current;

  if (!extractor) {
    if (asArray) {
      const values = [];
      current.each((_, el) => values.push($(el).text().trim()));
      return values.filter(Boolean);
    }
    return current.first().text().trim();
  }

  return extractFromSelection($, current, extractor, asArray);
}

module.exports = {
  ensureCheerio,
  evaluateJsoupLike,
};
