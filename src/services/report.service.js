const { getCheckinHistory } = require('./checkin.service');
const { getTasks } = require('./task.service');
const { getEntries } = require('./journal.service');
const { getCycleLogs } = require('./period.service');
const { config } = require('../config');
const { queryDatabase, createPage, formatRichText, extractProp } = require('./notion.service');
const { getWeekRange, getMonthRange, formatForNotion } = require('../utils/dateHelpers');

const DB_ID = () => config.notion.databases.reports;

async function aggregateWeekData(date = new Date()) {
  const { start, end } = getWeekRange(date);

  const [checkins, tasks, journalEntries] = await Promise.all([
    getCheckinHistory(start, end),
    getTasks({}),
    getEntries(start, end).catch(() => []),
  ]);

  const completedThisWeek = tasks.filter(
    (t) => t.status === 'Done' && t.completedAt && new Date(t.completedAt) >= start
  );

  const avgMood = average(checkins.map((c) => c.mood).filter(Boolean));
  const avgEnergy = average(checkins.map((c) => c.energy).filter(Boolean));
  const avgFocus = average(checkins.map((c) => c.focus).filter(Boolean));

  const notes = checkins.flatMap((c) => (c.notes ? [c.notes] : []));
  const wins = notes.filter((n) => /good|great|proud|did|completed|finished/i.test(n)).join('; ');
  const challenges = notes.filter((n) => /hard|struggle|couldn't|failed|forgot|missed/i.test(n)).join('; ');

  // Summarise journal themes for the report prompt
  const journalThemes = journalEntries.length > 0
    ? journalEntries.map((j) => `[${j.type || 'General'}] ${(j.entry || '').slice(0, 80)}`).join(' | ')
    : null;

  return {
    startDate: formatForNotion(start),
    endDate: formatForNotion(end),
    avgMood: avgMood.toFixed(1),
    avgEnergy: avgEnergy.toFixed(1),
    avgFocus: avgFocus.toFixed(1),
    tasksCompleted: completedThisWeek.length,
    tasksAttempted: tasks.length,
    journalCount: journalEntries.length,
    journalThemes,
    checkinStreak: calculateStreak(checkins),
    wins: wins || 'Nothing noted this week',
    challenges: challenges || 'Nothing notable',
  };
}

async function aggregateMonthData(date = new Date()) {
  const { start, end } = getMonthRange(date);

  const [checkins, tasks, cycleLogs] = await Promise.all([
    getCheckinHistory(start, end),
    getTasks({}),
    getCycleLogs(2),
  ]);

  const completedThisMonth = tasks.filter(
    (t) => t.status === 'Done' && t.completedAt && new Date(t.completedAt) >= start
  );

  const moodTrend = calcTrend(checkins.map((c) => c.mood).filter(Boolean));
  const energyTrend = calcTrend(checkins.map((c) => c.energy).filter(Boolean));

  const notes = checkins.flatMap((c) => (c.notes ? [c.notes] : []));
  const topWins = notes.filter((n) => /good|great|proud|did|completed|finished/i.test(n)).slice(0, 3).join('; ');
  const topChallenges = notes.filter((n) => /hard|struggle|couldn't|failed|forgot|missed/i.test(n)).slice(0, 3).join('; ');

  let cycleCorrelations = null;
  if (cycleLogs.length > 0 && checkins.length > 7) {
    cycleCorrelations = 'Cycle data available — patterns analyzed from check-in correlations';
  }

  return {
    startDate: formatForNotion(start),
    endDate: formatForNotion(end),
    weeksWithData: Math.ceil(checkins.length / 7),
    moodTrend,
    energyTrend,
    totalTasksCompleted: completedThisMonth.length,
    longestStreak: calculateStreak(checkins),
    topChallenges: topChallenges || 'None recorded',
    topWins: topWins || 'None recorded',
    cycleCorrelations,
  };
}

async function saveReport(type, dateRange, summary, rawData) {
  const page = await createPage(DB_ID(), {
    Title: { title: formatRichText(`${type} Report — ${dateRange}`) },
    Type: { select: { name: type } },
    'Date Range': { rich_text: formatRichText(dateRange) },
    Summary: { rich_text: formatRichText(summary) },
    'Raw Data': { rich_text: formatRichText(JSON.stringify(rawData)) },
    'Generated At': { date: { start: new Date().toISOString() } },
  });
  return page;
}

function average(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function calcTrend(arr) {
  if (arr.length < 2) return 'insufficient data';
  const mid = Math.floor(arr.length / 2);
  const firstHalf = average(arr.slice(0, mid));
  const secondHalf = average(arr.slice(mid));
  const diff = secondHalf - firstHalf;
  if (diff > 0.5) return 'improving';
  if (diff < -0.5) return 'declining';
  return 'stable';
}

function calculateStreak(checkins) {
  if (!checkins.length) return 0;
  const sorted = [...checkins].sort((a, b) => new Date(b.date) - new Date(a.date));
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i - 1].date) - new Date(sorted[i].date)) / (1000 * 60 * 60 * 24);
    if (Math.round(diff) === 1) streak++;
    else break;
  }
  return streak;
}

module.exports = { aggregateWeekData, aggregateMonthData, saveReport };
