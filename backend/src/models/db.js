const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', '..', 'database.sqlite');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS sources (
    source_url TEXT PRIMARY KEY,
    source_name TEXT NOT NULL,
    source_group TEXT,
    source_type INTEGER NOT NULL DEFAULT 0,
    enabled INTEGER NOT NULL DEFAULT 1,
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sources_enabled ON sources(enabled);
  CREATE INDEX IF NOT EXISTS idx_sources_group ON sources(source_group);
`);

module.exports = db;
