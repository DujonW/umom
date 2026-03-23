const { logCycle, getCycleLogs, getCurrentPhase, predictNextPeriod } = require('../services/period.service');
const { success, error } = require('../utils/responseHelpers');

async function log(req, res, next) {
  try {
    const { startDate, cycleLength, symptoms, notes } = req.body;
    const entry = await logCycle({ startDate, cycleLength, symptoms, notes });
    res.status(201).json(success(entry, 'Cycle log saved'));
  } catch (err) {
    next(err);
  }
}

async function history(req, res, next) {
  try {
    const limit = parseInt(req.query.limit || '6', 10);
    const logs = await getCycleLogs(limit);
    res.json(success(logs));
  } catch (err) {
    next(err);
  }
}

async function currentPhase(req, res, next) {
  try {
    const phase = await getCurrentPhase();
    if (!phase) {
      return res.status(404).json(error('No cycle data found. Log your period start date to enable phase tracking.', 'NO_DATA'));
    }
    res.json(success(phase));
  } catch (err) {
    next(err);
  }
}

async function predictions(req, res, next) {
  try {
    const prediction = await predictNextPeriod();
    if (!prediction) {
      return res.status(404).json(error('Not enough cycle data for predictions yet.', 'NO_DATA'));
    }
    res.json(success(prediction));
  } catch (err) {
    next(err);
  }
}

module.exports = { log, history, currentPhase, predictions };
