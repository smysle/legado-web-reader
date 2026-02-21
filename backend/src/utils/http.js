const axios = require('axios');

const DEFAULT_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function parseHeaderSpec(header) {
  if (!header) return {};
  if (typeof header === 'object' && !Array.isArray(header)) return header;

  try {
    const parsed = JSON.parse(String(header));
    if (parsed && typeof parsed === 'object') return parsed;
    return {};
  } catch (_) {
    return {};
  }
}

function parseUrlSpec(urlSpec) {
  const raw = String(urlSpec || '').trim();
  if (!raw) return { url: '', method: 'GET', headers: {}, body: null };

  const firstComma = raw.indexOf(',');
  if (firstComma < 0) {
    return { url: raw, method: 'GET', headers: {}, body: null };
  }

  const maybeJson = raw.slice(firstComma + 1).trim();
  if (!maybeJson.startsWith('{')) {
    return { url: raw, method: 'GET', headers: {}, body: null };
  }

  try {
    const spec = JSON.parse(maybeJson);
    return {
      url: raw.slice(0, firstComma).trim(),
      method: String(spec.method || 'GET').toUpperCase(),
      headers: spec.headers && typeof spec.headers === 'object' ? spec.headers : {},
      body: spec.body ?? null,
    };
  } catch (_) {
    return { url: raw, method: 'GET', headers: {}, body: null };
  }
}

async function fetchRemote(urlSpec, source) {
  const parsed = parseUrlSpec(urlSpec);
  if (!parsed.url) {
    throw new Error('empty request url');
  }

  const sourceHeaders = parseHeaderSpec(source?.header);
  const headers = {
    'user-agent': DEFAULT_UA,
    ...sourceHeaders,
    ...parsed.headers,
  };

  const response = await axios({
    url: parsed.url,
    method: parsed.method,
    headers,
    data: parsed.body,
    timeout: 15000,
    maxRedirects: 5,
    validateStatus: (status) => status >= 200 && status < 400,
    responseType: 'text',
  });

  const contentType = String(response.headers['content-type'] || '').toLowerCase();
  const data = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

  return {
    url: parsed.url,
    body: data,
    contentType,
    status: response.status,
  };
}

module.exports = {
  fetchRemote,
  parseUrlSpec,
};
