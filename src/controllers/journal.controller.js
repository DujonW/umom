const { createEntry, getEntries, getEntry } = require('../services/journal.service');
const { reframe, buildEsteem, chat } = require('../services/ai.service');
const { assembleContext } = require('../services/context.service');
const { success, error } = require('../utils/responseHelpers');

// Maps journal type to the appropriate AI response style
async function getAiReflection(entry, type, userContext) {
  switch (type) {
    case 'Reframe':
      return reframe(entry, 'worstCase', userContext);
    case 'Anxiety':
      return reframe(entry, 'overwhelm', userContext);
    case 'Gratitude':
    case 'Win':
      return buildEsteem(entry, userContext);
    default: // General
      return chat(
        [{ role: 'user', content: `I wrote this in my journal: "${entry}"\n\nReflect back what you notice and offer one gentle thought. Under 100 words.` }],
        { userContext }
      );
  }
}

async function create(req, res, next) {
  try {
    const { entry, mood, type } = req.body;

    const userContext = await assembleContext({ days: 5 });
    const aiReflection = await getAiReflection(entry, type || 'General', userContext);
    const saved = await createEntry({ entry, mood, aiReflection, type });

    res.status(201).json(success(saved, 'Journal entry saved'));
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const { start, end } = req.query;
    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;
    const entries = await getEntries(startDate, endDate);
    res.json(success(entries));
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    const entry = await getEntry(req.params.id);
    if (!entry) return res.status(404).json(error('Entry not found', 'NOT_FOUND'));
    res.json(success(entry));
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, get };
