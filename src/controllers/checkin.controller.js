const { saveCheckin, getTodayCheckin, getCheckinHistory } = require('../services/checkin.service');
const { respondToCheckin } = require('../services/ai.service');
const { getCurrentPhase } = require('../services/period.service');
const { assembleContext } = require('../services/context.service');
const { success, error } = require('../utils/responseHelpers');

async function submit(req, res, next) {
  try {
    const { mood, energy, focus, notes } = req.body;

    const [cyclePhaseResult, userContext] = await Promise.all([
      getCurrentPhase().catch(() => null),
      assembleContext({ days: 7 }),
    ]);

    const cyclePhase = cyclePhaseResult?.phase || null;

    // Build cycle-aware additions to the system context
    let cycleContext = userContext;
    if (!cyclePhaseResult) {
      cycleContext += '\n\nNo cycle data on file. Once in your response, naturally ask: "Do you know when your last period started? Even a rough date helps me support you better through each phase."';
    } else if (cyclePhaseResult.daysUntilNextPeriod <= 2) {
      cycleContext += `\n\nNote: period predicted in ${cyclePhaseResult.daysUntilNextPeriod} day(s). Mention this gently — late luteal phase often amplifies ADHD symptoms. Encourage extra self-compassion.`;
    } else if (cyclePhaseResult.phase === 'menstrual') {
      cycleContext += '\n\nNote: currently in menstrual phase. Keep suggestions minimal and rest-friendly.';
    }

    const aiResponse = await respondToCheckin({ mood, energy, focus, notes, cyclePhase }, cycleContext);
    await saveCheckin({ mood, energy, focus, notes, aiResponse, cyclePhase });

    res.json(success({ mood, energy, focus, notes, aiResponse, cyclePhase, cycleDay: cyclePhaseResult?.dayOfCycle || null }, 'Check-in saved'));
  } catch (err) {
    next(err);
  }
}

async function getToday(req, res, next) {
  try {
    const checkin = await getTodayCheckin();
    if (!checkin) {
      return res.status(404).json(error("No check-in found for today yet. Ready when you are!", 'NOT_FOUND'));
    }
    res.json(success(checkin));
  } catch (err) {
    next(err);
  }
}

async function getHistory(req, res, next) {
  try {
    const { start, end } = req.query;
    const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date();

    const history = await getCheckinHistory(startDate, endDate);
    res.json(success(history));
  } catch (err) {
    next(err);
  }
}

module.exports = { submit, getToday, getHistory };
