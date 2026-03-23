CREATE TABLE IF NOT EXISTS pending_checkins (
  id        TEXT PRIMARY KEY,
  mood      REAL,
  energy    REAL,
  focus     REAL,
  notes     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
