function isSafeExpression(expr) {
  return /^[\d\s+\-*/%().keypage]+$/.test(expr);
}

function renderSearchUrl(template, { key, page }) {
  if (!template) return '';

  return String(template).replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, expr) => {
    const trimmed = expr.trim();
    if (trimmed === 'key') return encodeURIComponent(key ?? '');
    if (trimmed === 'page') return String(page ?? 1);

    if (!isSafeExpression(trimmed)) {
      return '';
    }

    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function('key', 'page', `return (${trimmed});`);
      const output = fn(Number.isFinite(+key) ? +key : 0, Number(page || 1));
      return String(output ?? '');
    } catch (_) {
      return '';
    }
  });
}

module.exports = {
  renderSearchUrl,
};
