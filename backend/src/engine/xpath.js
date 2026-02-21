const xpath = require('xpath');
const { DOMParser } = require('xmldom');

function evaluateXPath(raw, expression, { all = false } = {}) {
  const doc = new DOMParser({
    errorHandler: { warning: null, error: null },
  }).parseFromString(raw || '', 'text/html');

  const expr = String(expression || '').replace(/^@XPath:/i, '').trim();
  if (!expr) return all ? [] : '';

  const nodes = xpath.select(expr, doc);
  if (!Array.isArray(nodes)) {
    return String(nodes || '');
  }

  const values = nodes.map((node) => {
    if (node == null) return '';
    if (typeof node === 'string') return node;
    if (node.nodeType === 2) return node.nodeValue || '';
    return node.textContent || '';
  }).map((s) => String(s).trim()).filter(Boolean);

  if (all) return values;
  return values[0] || '';
}

module.exports = {
  evaluateXPath,
};
