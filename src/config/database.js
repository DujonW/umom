const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { config } = require('./index');

let db;

function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call initDB() first.');
  }
  return db;
}

function initDB() {
  const dbPath = path.resolve(process.cwd(), config.sqlite.path);
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  runMigrations(db);
  return db;
}

function runMigrations(database) {
  const migrationsDir = path.join(__dirname, '..', 'migrations');

  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  if (!fs.existsSync(migrationsDir)) return;

  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const applied = database.prepare('SELECT 1 FROM schema_migrations WHERE filename = ?').get(file);
    if (!applied) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      database.exec(sql);
      database.prepare('INSERT INTO schema_migrations (filename) VALUES (?)').run(file);
      console.log(`[DB] Applied migration: ${file}`);
    }
  }
}

module.exports = { getDB, initDB };
