const { randomUUID } = require('crypto');
const { getDB } = require('../config/database');

const TTL_HOURS = 24;

function save(data) {
  const db = getDB();
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO pending_checkins (id, mood, energy, focus, notes, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, data.mood ?? null, data.energy ?? null, data.focus ?? null, data.notes ?? null, expiresAt);

  return id;
}

function get(id) {
  const db = getDB();
  const row = db.prepare('SELECT * FROM pending_checkins WHERE id = ? AND expires_at > datetime("now")').get(id);
  return row || null;
}

function remove(id) {
  getDB().prepare('DELETE FROM pending_checkins WHERE id = ?').run(id);
}

function purgeExpired() {
  getDB().prepare('DELETE FROM pending_checkins WHERE expires_at <= datetime("now")').run();
}

module.exports = { save, get, remove, purgeExpired };
