const db = require('../models/db');

function normalizeSource(source) {
  if (!source || typeof source !== 'object') return null;
  if (!source.bookSourceUrl) return null;

  return {
    ...source,
    bookSourceName: source.bookSourceName || source.bookSourceUrl,
    bookSourceGroup: source.bookSourceGroup || '',
    bookSourceType: Number(source.bookSourceType ?? 0),
    enabled: source.enabled === false ? false : true,
  };
}

function upsertSource(source) {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO sources (
      source_url, source_name, source_group, source_type, enabled, payload_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source_url) DO UPDATE SET
      source_name = excluded.source_name,
      source_group = excluded.source_group,
      source_type = excluded.source_type,
      enabled = excluded.enabled,
      payload_json = excluded.payload_json,
      updated_at = excluded.updated_at
  `);

  stmt.run(
    source.bookSourceUrl,
    source.bookSourceName,
    source.bookSourceGroup,
    source.bookSourceType,
    source.enabled ? 1 : 0,
    JSON.stringify(source),
    now,
    now,
  );
}

function importSources(sources) {
  const list = Array.isArray(sources) ? sources : [sources];
  let imported = 0;
  let duplicates = 0;
  const errors = [];

  const existsStmt = db.prepare('SELECT source_url FROM sources WHERE source_url = ?');

  for (let i = 0; i < list.length; i += 1) {
    const item = normalizeSource(list[i]);
    if (!item) {
      errors.push({ index: i, reason: 'missing bookSourceUrl' });
      continue;
    }

    if (item.bookSourceType !== 0) {
      errors.push({ index: i, reason: 'unsupported bookSourceType, only 0(text) is allowed' });
      continue;
    }

    const existed = existsStmt.get(item.bookSourceUrl);
    if (existed) duplicates += 1;

    try {
      upsertSource(item);
      imported += 1;
    } catch (error) {
      errors.push({ index: i, reason: error.message });
    }
  }

  return { imported, duplicates, errors };
}

function parseRow(row) {
  if (!row) return null;
  const payload = JSON.parse(row.payload_json);
  payload.enabled = row.enabled === 1;
  return payload;
}

function listSources({ group, enabled, search }) {
  const clauses = [];
  const params = [];

  if (group) {
    clauses.push('source_group = ?');
    params.push(group);
  }

  if (enabled != null) {
    clauses.push('enabled = ?');
    params.push(enabled ? 1 : 0);
  }

  if (search) {
    clauses.push('(source_name LIKE ? OR source_url LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db.prepare(`SELECT * FROM sources ${where} ORDER BY updated_at DESC`).all(...params);

  return rows.map((row) => {
    const source = parseRow(row);
    return {
      bookSourceUrl: source.bookSourceUrl,
      bookSourceName: source.bookSourceName,
      bookSourceGroup: source.bookSourceGroup,
      bookSourceType: source.bookSourceType,
      enabled: source.enabled,
    };
  });
}

function getSource(sourceUrl) {
  const row = db.prepare('SELECT * FROM sources WHERE source_url = ?').get(sourceUrl);
  return parseRow(row);
}

function updateSource(sourceUrl, patch) {
  const old = getSource(sourceUrl);
  if (!old) return null;

  const merged = normalizeSource({ ...old, ...patch, bookSourceUrl: sourceUrl });
  if (!merged) return null;

  upsertSource(merged);
  return merged;
}

function deleteSource(sourceUrl) {
  const info = db.prepare('DELETE FROM sources WHERE source_url = ?').run(sourceUrl);
  return info.changes;
}

function deleteSources(sourceUrls) {
  const stmt = db.prepare('DELETE FROM sources WHERE source_url = ?');
  let removed = 0;
  const tx = db.transaction((urls) => {
    for (const url of urls) {
      const info = stmt.run(url);
      removed += info.changes;
    }
  });
  tx(sourceUrls);
  return removed;
}

function getEnabledSources() {
  const rows = db.prepare('SELECT * FROM sources WHERE enabled = 1 ORDER BY updated_at DESC').all();
  return rows.map(parseRow);
}

module.exports = {
  importSources,
  listSources,
  getSource,
  updateSource,
  deleteSource,
  deleteSources,
  getEnabledSources,
};
