const { JSONPath } = require('jsonpath-plus');

function safeParseJson(input) {
  if (input && typeof input === 'object') return input;
  try {
    return JSON.parse(String(input || '{}'));
  } catch (_) {
    return {};
  }
}

function evaluateJsonPath(raw, expression, { all = false } = {}) {
  const data = safeParseJson(raw);
  const expr = String(expression || '').replace(/^@json:/i, '').trim();
  if (!expr) return all ? [] : '';

  try {
    const result = JSONPath({ path: expr, json: data, wrap: true });
    const mapped = result.map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item == null) return '';
      return JSON.stringify(item);
    }).filter(Boolean);

    if (all) return mapped;
    return mapped[0] || '';
  } catch (_) {
    return all ? [] : '';
  }
}

module.exports = {
  evaluateJsonPath,
  safeParseJson,
};
