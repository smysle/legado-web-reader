const { ensureCheerio, evaluateJsoupLike } = require('./css');
const { evaluateXPath } = require('./xpath');
const { evaluateJsonPath } = require('./jsonpath');
const { splitRuleAndRegex, applyRegexPairs } = require('./regex');
const { resolveUrl } = require('../utils/url');

function detectEngine(rule) {
  const value = String(rule || '').trim();
  if (!value) return 'unknown';
  if (/^@css:/i.test(value)) return 'css';
  if (/^@XPath:/i.test(value) || value.startsWith('//')) return 'xpath';
  if (/^@json:/i.test(value) || value.startsWith('$.')) return 'jsonpath';
  return 'jsoup-default';
}

function isEmptyResult(value) {
  if (Array.isArray(value)) return value.length === 0;
  return String(value || '').trim() === '';
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  const text = String(value).trim();
  return text ? [text] : [];
}

function evalSingle(raw, singleRule, { asArray = false, scope = null } = {}) {
  const engine = detectEngine(singleRule);
  if (engine === 'xpath') {
    return evaluateXPath(raw, singleRule, { all: asArray });
  }
  if (engine === 'jsonpath') {
    return evaluateJsonPath(raw, singleRule, { all: asArray });
  }

  const $ = ensureCheerio(raw);
  return evaluateJsoupLike($, singleRule, { scope, asArray });
}

function evalCompound(raw, mainRule, options = {}) {
  const rule = String(mainRule || '').trim();
  if (!rule) return options.asArray ? [] : '';

  if (rule.includes('||')) {
    const branches = rule.split('||').map((s) => s.trim()).filter(Boolean);
    for (const branch of branches) {
      const out = evalCompound(raw, branch, options);
      if (!isEmptyResult(out)) return out;
    }
    return options.asArray ? [] : '';
  }

  if (rule.includes('&&')) {
    const parts = rule.split('&&').map((s) => s.trim()).filter(Boolean);
    const values = parts.map((part) => evalCompound(raw, part, options));
    if (options.asArray) {
      return values.flatMap((v) => toArray(v));
    }
    return values.map((v) => (Array.isArray(v) ? v.join('') : String(v || ''))).join('');
  }

  if (rule.includes('%%')) {
    const parts = rule.split('%%').map((s) => s.trim()).filter(Boolean);
    const values = parts.map((part) => toArray(evalCompound(raw, part, { ...options, asArray: true })));
    if (values.length === 0) return options.asArray ? [] : '';

    let acc = values[0];
    for (let i = 1; i < values.length; i += 1) {
      const set = new Set(values[i]);
      acc = acc.filter((v) => set.has(v));
    }

    if (options.asArray) return acc;
    return acc[0] || '';
  }

  return evalSingle(raw, rule, options);
}

function applyRule(raw, rule, options = {}) {
  const { baseUrl, asArray = false, isUrlField = false, scope = null } = options;
  const { mainRule, regexPairs } = splitRuleAndRegex(rule);

  let result = evalCompound(raw, mainRule, { asArray, scope });

  if (Array.isArray(result)) {
    const cleaned = result.map((item) => applyRegexPairs(item, regexPairs));
    if (!isUrlField) return cleaned;
    return cleaned.map((item) => resolveUrl(item, baseUrl));
  }

  result = applyRegexPairs(result, regexPairs);
  if (!isUrlField) return result;
  return resolveUrl(result, baseUrl);
}

module.exports = {
  applyRule,
  detectEngine,
};
