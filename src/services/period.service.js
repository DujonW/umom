const { config } = require('../config');
const { queryDatabase, createPage, formatRichText, extractProp } = require('./notion.service');
const { today, formatForNotion } = require('../utils/dateHelpers');
const { phaseToSymptomProfile } = require('../utils/adhdHelpers');

const DB_ID = () => config.notion.databases.cycleLogs;

async function logCycle(data) {
  const page = await createPage(DB_ID(), {
    'Start Date': { date: { start: formatForNotion(data.startDate) } },
    'Cycle Length': data.cycleLength ? { number: data.cycleLength } : undefined,
    Symptoms: data.symptoms?.length
      ? { multi_select: data.symptoms.map((s) => ({ name: s })) }
      : undefined,
    Notes: { rich_text: formatRichText(data.notes || '') },
  });
  return parseCyclePage(page);
}

async function getCycleLogs(limit = 6) {
  const pages = await queryDatabase(
    DB_ID(),
    undefined,
    [{ property: 'Start Date', direction: 'descending' }]
  );
  return pages.slice(0, limit).map(parseCyclePage);
}

/**
 * Calculates the current cycle phase based on the most recent cycle log.
 * Returns: { phase, dayOfCycle, daysUntilNextPeriod, profile }
 */
async function getCurrentPhase() {
  const logs = await getCycleLogs(3);
  if (logs.length === 0) return null;

  const latest = logs[0];
  if (!latest.startDate) return null;

  const cycleLength = latest.cycleLength || averageCycleLength(logs);
  const startDate = new Date(latest.startDate);
  const now = new Date();
  const dayOfCycle = Math.floor((now - startDate) / (1000 * 60 * 60 * 24)) + 1;

  const phase = calculatePhase(dayOfCycle, cycleLength);
  const daysUntilNextPeriod = Math.max(0, cycleLength - dayOfCycle);
  const profile = phaseToSymptomProfile(phase);

  return { phase, dayOfCycle, cycleLength, daysUntilNextPeriod, profile };
}

/**
 * Predicts the next period start date.
 */
async function predictNextPeriod() {
  const logs = await getCycleLogs(3);
  if (logs.length === 0) return null;

  const latest = logs[0];
  const cycleLength = latest.cycleLength || averageCycleLength(logs);
  const startDate = new Date(latest.startDate);
  const nextPeriod = new Date(startDate);
  nextPeriod.setDate(startDate.getDate() + cycleLength);

  return {
    predictedDate: formatForNotion(nextPeriod),
    confidence: logs.length >= 3 ? 'high' : 'low',
    basedOnCycles: logs.length,
  };
}

function calculatePhase(dayOfCycle, cycleLength) {
  if (dayOfCycle <= 5) return 'menstrual';
  if (dayOfCycle <= Math.round(cycleLength * 0.45)) return 'follicular';
  if (dayOfCycle <= Math.round(cycleLength * 0.55)) return 'ovulatory';
  return 'luteal';
}

function averageCycleLength(logs) {
  const lengths = logs.filter((l) => l.cycleLength).map((l) => l.cycleLength);
  if (lengths.length === 0) return 28;
  return Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
}

function parseCyclePage(page) {
  const props = page.properties;
  return {
    id: page.id,
    startDate: extractProp(props['Start Date']),
    cycleLength: extractProp(props['Cycle Length']),
    symptoms: extractProp(props.Symptoms),
    notes: extractProp(props.Notes),
  };
}

module.exports = { logCycle, getCycleLogs, getCurrentPhase, predictNextPeriod };
