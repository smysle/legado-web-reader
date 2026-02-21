const xpath = require('xpath');
const { DOMParser } = require('xmldom');
const { JSONPath } = require('jsonpath-plus');
const { ensureCheerio, evaluateJsoupLike } = require('./css');
const { detectEngine, applyRule } = require('./dispatcher');
const { splitRuleAndRegex, applyRegexPairs } = require('./regex');
const { resolveUrl } = require('../utils/url');

function toText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function parseJsonSafely(raw) {
  try {
    return JSON.parse(String(raw || '{}'));
  } catch (_) {
    return null;
  }
}

function buildContext(raw) {
  const json = parseJsonSafely(raw);
  if (json != null) {
    return { type: 'json', raw, json };
  }

  const $ = ensureCheerio(raw);
  const doc = new DOMParser({ errorHandler: { warning: null, error: null } }).parseFromString(
    raw || '',
    'text/html',
  );

  return { type: 'html', raw, $, doc };
}

function xpathToValue(node) {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number' || typeof node === 'boolean') return String(node);
  if (node.nodeType === 2) return node.nodeValue || '';
  return node.textContent || '';
}

function extractList(context, listRule) {
  const { mainRule } = splitRuleAndRegex(listRule);
  const engine = detectEngine(mainRule);

  if (context.type === 'json' || engine === 'jsonpath') {
    const expr = String(mainRule || '').replace(/^@json:/i, '').trim();
    if (!expr) return [];
    try {
      const items = JSONPath({ path: expr, json: context.json || {}, wrap: true });
      return items.map((value) => ({ type: 'json-item', value }));
    } catch (_) {
      return [];
    }
  }

  if (engine === 'xpath') {
    const expr = String(mainRule || '').replace(/^@XPath:/i, '').trim();
    if (!expr) return [];
    const nodes = xpath.select(expr, context.doc);
    return (Array.isArray(nodes) ? nodes : []).map((node) => ({ type: 'xpath-item', node }));
  }

  const selection = evaluateJsoupLike(context.$, mainRule, { asSelection: true });
  const out = [];
  selection.each((_, el) => {
    out.push({ type: 'css-item', el });
  });
  return out;
}

function pickFromJson(value, rule) {
  const textRule = String(rule || '').trim();
  if (!textRule) return '';

  const { mainRule, regexPairs } = splitRuleAndRegex(textRule);

  let result = '';
  if (/^@json:/i.test(mainRule) || mainRule.startsWith('$.')) {
    try {
      const expr = mainRule.replace(/^@json:/i, '').trim();
      const arr = JSONPath({ path: expr, json: value, wrap: true });
      result = arr.length > 0 ? toText(arr[0]) : '';
    } catch (_) {
      result = '';
    }
  } else {
    // fallback: dot path or direct key
    const parts = mainRule.split('.').filter(Boolean);
    let cur = value;
    for (const part of parts) {
      if (cur == null) break;
      cur = cur[part];
    }
    if (cur === undefined && typeof value === 'object' && value != null) {
      cur = value[mainRule];
    }
    result = toText(cur ?? '');
  }

  return applyRegexPairs(result, regexPairs);
}

function pickFromHtmlItem(context, item, rule, options = {}) {
  const { mainRule, regexPairs } = splitRuleAndRegex(rule);
  const engine = detectEngine(mainRule);
  const isUrlField = !!options.isUrlField;

  let value = '';

  if (engine === 'xpath') {
    const expr = String(mainRule).replace(/^@XPath:/i, '').trim();
    const nodes = xpath.select(expr, item.node || context.doc);
    const first = Array.isArray(nodes) ? xpathToValue(nodes[0]) : xpathToValue(nodes);
    value = first;
  } else if (engine === 'jsonpath') {
    value = '';
  } else {
    if (item.type === 'css-item') {
      value = evaluateJsoupLike(context.$, mainRule, { scope: item.el });
    } else if (item.type === 'xpath-item') {
      const html = item.node.toString ? item.node.toString() : xpathToValue(item.node);
      const $ = ensureCheerio(html);
      value = evaluateJsoupLike($, mainRule);
    }
  }

  value = applyRegexPairs(value, regexPairs);
  if (isUrlField) {
    return resolveUrl(value, options.baseUrl);
  }
  return value;
}

function pickField(context, item, rule, options = {}) {
  if (!rule) return '';
  if (item.type === 'json-item') {
    const value = pickFromJson(item.value, rule);
    return options.isUrlField ? resolveUrl(value, options.baseUrl) : value;
  }

  return pickFromHtmlItem(context, item, rule, options);
}

function extractObjectByRules(raw, ruleObj, fieldConfig = {}) {
  const output = {};
  for (const [field, conf] of Object.entries(fieldConfig)) {
    const rule = ruleObj?.[field];
    if (!rule) {
      output[field] = '';
      continue;
    }
    output[field] = applyRule(raw, rule, {
      baseUrl: conf.baseUrl,
      isUrlField: !!conf.isUrl,
    });
  }
  return output;
}

module.exports = {
  buildContext,
  extractList,
  pickField,
  extractObjectByRules,
};
