const { getCheckinHistory } = require('./checkin.service');
const { getTasks } = require('./task.service');
const { getCurrentPhase } = require('./period.service');
const { today, formatForNotion } = require('../utils/dateHelpers');

const PHASE_IMPACT = {
  menstrual:  'energy often low, brain fog common',
  follicular: 'energy rising, good week for harder tasks',
  ovulatory:  'peak energy and focus',
  luteal:     'ADHD symptoms often heightened',
};

/**
 * Assembles a compact context string (<400 tokens) from Notion data.
 * Injected into every AI system prompt so Haiku has user history.
 * All Notion calls are fire-and-ignore — a failure here never blocks a response.
 */
async function assembleContext({ days = 5 } = {}) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [checkins, tasks, phase] = await Promise.all([
    getCheckinHistory(startDate, new Date()).catch(() => []),
    getTasks({}).catch(() => []),
    getCurrentPhase().catch(() => null),
  ]);

  const lines = ['--- Your Recent Context ---'];

  // Check-in digest: one line per day, most recent first
  if (checkins.length > 0) {
    const recent = checkins.slice(-5).reverse();
    const digest = recent.map((c) => {
      const d = new Date(c.date).toLocaleDateString('en-US', { weekday: 'short' });
      const note = c.notes ? ` "${c.notes.slice(0, 40)}${c.notes.length > 40 ? '…' : ''}"` : '';
      return `${d} ${c.mood ?? '?'}/${c.energy ?? '?'}/${c.focus ?? '?'}${note}`;
    }).join(' | ');
    lines.push(`Check-ins (mood/energy/focus): ${digest}`);
  }

  // Task summary: counts only, no full descriptions
  if (tasks.length > 0) {
    const done = tasks.filter((t) => t.status === 'Done').length;
    const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
    const todo = tasks.filter((t) => t.status === 'To Do').length;
    lines.push(`Tasks: ${done} done, ${inProgress} in progress, ${todo} to do`);
  }

  // Cycle phase: single line
  if (phase) {
    const impact = PHASE_IMPACT[phase.phase] || '';
    lines.push(`Cycle: ${phase.phase} day ${phase.dayOfCycle}${impact ? ` — ${impact}` : ''}`);
  }

  if (lines.length === 1) return ''; // no data available yet — skip injection
  return lines.join('\n');
}

module.exports = { assembleContext };
