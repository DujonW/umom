const { getCheckinHistory } = require('./checkin.service');
const { getTasks } = require('./task.service');
const { getCurrentPhase } = require('./period.service');
const { getUpcomingEvents } = require('./calendar-event.service');
const { today, formatForNotion } = require('../utils/dateHelpers');

const PHASE_IMPACT = {
  menstrual:  'energy often low, brain fog common',
  follicular: 'energy rising, good week for harder tasks',
  ovulatory:  'peak energy and focus',
  luteal:     'ADHD symptoms often heightened',
};

// Simple TTL cache — context changes slowly, no need to hit Notion on every AI call
const TTL_MS = 5 * 60 * 1000; // 5 minutes
let _cache = { data: null, expiresAt: 0 };

/**
 * Assembles a compact context string (<400 tokens) from Notion data.
 * Injected into every AI system prompt so Haiku has user history.
 * All Notion calls are fire-and-ignore — a failure here never blocks a response.
 * Results are cached for 5 minutes to avoid hammering the Notion API on every request.
 */
async function assembleContext({ days = 5 } = {}) {
  if (_cache.data && Date.now() < _cache.expiresAt) return _cache.data;

  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [checkins, tasks, phase, events] = await Promise.all([
    getCheckinHistory(startDate, new Date()).catch(() => []),
    getTasks({}).catch(() => []),
    getCurrentPhase().catch(() => null),
    getUpcomingEvents(14).catch(() => []),
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

  // Upcoming calendar events: next 14 days
  if (events.length > 0) {
    const eventLines = events.slice(0, 5).map((e) => {
      const d = new Date(e.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      return `${d}: ${e.title}`;
    }).join(' | ');
    lines.push(`Upcoming events: ${eventLines}`);
  }

  // Cycle phase: single line
  if (phase) {
    const impact = PHASE_IMPACT[phase.phase] || '';
    lines.push(`Cycle: ${phase.phase} day ${phase.dayOfCycle}${impact ? ` — ${impact}` : ''}`);
  }

  const result = lines.length === 1 ? '' : lines.join('\n');
  _cache = { data: result, expiresAt: Date.now() + TTL_MS };
  return result;
}

function clearCache() {
  _cache = { data: null, expiresAt: 0 };
}

module.exports = { assembleContext, clearCache };
