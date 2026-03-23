const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../config/database');

const SLIDING_WINDOW = 10;

function createSession(metadata = {}) {
  const db = getDB();
  const id = uuidv4();
  db.prepare(
    'INSERT INTO sessions (id, metadata) VALUES (?, ?)'
  ).run(id, JSON.stringify(metadata));
  return id;
}

function appendMessage(sessionId, role, content) {
  const db = getDB();
  const id = uuidv4();
  db.prepare(
    'INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, ?, ?)'
  ).run(id, sessionId, role, content);
  db.prepare(
    "UPDATE sessions SET updated_at = datetime('now') WHERE id = ?"
  ).run(sessionId);
  return id;
}

function saveSessionSummary(sessionId, summary) {
  const db = getDB();
  db.prepare('UPDATE sessions SET summary = ? WHERE id = ?').run(summary, sessionId);
}

function getSessionHistory(sessionId) {
  const db = getDB();
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  if (!session) return null;

  const messages = db.prepare(
    'SELECT role, content, timestamp FROM messages WHERE session_id = ? ORDER BY timestamp ASC'
  ).all(sessionId);

  return { ...session, messages };
}

/**
 * Returns the last SLIDING_WINDOW messages for use in an AI call.
 * If a prior summary exists, prepends it as context so Haiku retains
 * awareness of earlier conversation without ballooning token usage.
 */
function getWindowedHistory(sessionId) {
  const session = getSessionHistory(sessionId);
  if (!session) return null;

  const window = session.messages.slice(-SLIDING_WINDOW).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  if (session.summary && window.length > 0) {
    window.unshift({
      role: 'assistant',
      content: session.summary,
    });
    window.unshift({
      role: 'user',
      content: '[Summary of earlier conversation]',
    });
  }

  return { session, window };
}

/**
 * Returns true if the session has exceeded the window and should be summarised.
 */
function shouldSummarise(sessionId) {
  const db = getDB();
  const count = db.prepare(
    'SELECT COUNT(*) as c FROM messages WHERE session_id = ?'
  ).get(sessionId);
  return count.c > SLIDING_WINDOW * 2;
}

function deleteSession(sessionId) {
  const db = getDB();
  const result = db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  return result.changes > 0;
}

function listSessions(limit = 20) {
  const db = getDB();
  return db.prepare(
    'SELECT id, created_at, updated_at, metadata FROM sessions ORDER BY updated_at DESC LIMIT ?'
  ).all(limit);
}

module.exports = {
  createSession,
  appendMessage,
  saveSessionSummary,
  getSessionHistory,
  getWindowedHistory,
  shouldSummarise,
  deleteSession,
  listSessions,
};
