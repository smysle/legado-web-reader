function resolveUrl(value, baseUrl) {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';

  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^(data|mailto|javascript):/i.test(raw)) return raw;

  try {
    return new URL(raw, baseUrl).toString();
  } catch (_) {
    return raw;
  }
}

function decodeSourceId(id) {
  try {
    return decodeURIComponent(id);
  } catch (_) {
    return id;
  }
}

function encodeSourceId(sourceUrl) {
  return encodeURIComponent(sourceUrl);
}

module.exports = {
  resolveUrl,
  decodeSourceId,
  encodeSourceId,
};
