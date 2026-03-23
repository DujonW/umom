const { deleteSession } = require('../services/session.service');
const { purgeExpired } = require('../services/pending-checkin.service');
const { clearCache } = require('../services/context.service');
const { success } = require('../utils/responseHelpers');

async function logout(req, res, next) {
  try {
    const { sessionId } = req.body;

    if (sessionId) {
      deleteSession(sessionId);
    }

    purgeExpired();
    clearCache();

    res.json(success(null, 'Logged out'));
  } catch (err) {
    next(err);
  }
}

module.exports = { logout };
