const { chat, reframe, buildEsteem, summariseSession } = require('../services/ai.service');
const {
  createSession,
  appendMessage,
  saveSessionSummary,
  getSessionHistory,
  getWindowedHistory,
  shouldSummarise,
  deleteSession,
  listSessions,
} = require('../services/session.service');
const { getCurrentPhase } = require('../services/period.service');
const { assembleContext } = require('../services/context.service');
const { success, error } = require('../utils/responseHelpers');

async function sendMessage(req, res, next) {
  try {
    const { message, sessionId, mode } = req.body;

    let sid = sessionId;
    if (!sid) {
      sid = createSession();
    }

    const sessionData = getWindowedHistory(sid);
    if (!sessionData) {
      return res.status(404).json(error('Session not found', 'NOT_FOUND'));
    }

    appendMessage(sid, 'user', message);

    // Load context and cycle phase in parallel
    const [cyclePhaseResult, userContext] = await Promise.all([
      getCurrentPhase().catch(() => null),
      assembleContext({ days: 5 }),
    ]);
    const cyclePhase = cyclePhaseResult?.phase || null;

    // Build windowed history with any existing summary prepended
    const history = [...sessionData.window, { role: 'user', content: message }];

    let reply;
    if (mode === 'reframe') {
      reply = await reframe(message, 'worstCase', userContext);
    } else if (mode === 'esteem') {
      reply = await buildEsteem(message, userContext);
    } else {
      reply = await chat(history, { cyclePhase, userContext });
    }

    appendMessage(sid, 'assistant', reply);

    // Generate a summary if the session has grown long (fire-and-forget style — don't block response)
    if (shouldSummarise(sid)) {
      const fullHistory = getSessionHistory(sid);
      const summaryHistory = fullHistory.messages.map((m) => ({ role: m.role, content: m.content }));
      summariseSession(summaryHistory)
        .then((summary) => saveSessionSummary(sid, summary))
        .catch(() => {}); // non-critical
    }

    res.json(success({ sessionId: sid, reply, cyclePhase }));
  } catch (err) {
    next(err);
  }
}

async function newSession(req, res, next) {
  try {
    const sid = createSession(req.body.metadata || {});
    res.json(success({ sessionId: sid }, 'Session created'));
  } catch (err) {
    next(err);
  }
}

async function getSession(req, res, next) {
  try {
    const session = getSessionHistory(req.params.id);
    if (!session) return res.status(404).json(error('Session not found', 'NOT_FOUND'));
    res.json(success(session));
  } catch (err) {
    next(err);
  }
}

async function removeSession(req, res, next) {
  try {
    const deleted = deleteSession(req.params.id);
    if (!deleted) return res.status(404).json(error('Session not found', 'NOT_FOUND'));
    res.json(success(null, 'Session deleted'));
  } catch (err) {
    next(err);
  }
}

async function getSessions(req, res, next) {
  try {
    const sessions = listSessions(20);
    res.json(success(sessions));
  } catch (err) {
    next(err);
  }
}

module.exports = { sendMessage, newSession, getSession, removeSession, getSessions };
