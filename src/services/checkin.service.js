const { config } = require('../config');
const { queryDatabase, createPage, formatRichText, extractProp } = require('./notion.service');
const { today, formatForNotion } = require('../utils/dateHelpers');

const DB_ID = () => config.notion.databases.checkins;

async function saveCheckin(data) {
  const page = await createPage(DB_ID(), {
    Date: { date: { start: today() } },
    Mood: { number: data.mood },
    Energy: { number: data.energy },
    Focus: { number: data.focus },
    Notes: { rich_text: formatRichText(data.notes || '') },
    'AI Response': { rich_text: formatRichText(data.aiResponse || '') },
    'Cycle Phase': data.cyclePhase ? { select: { name: data.cyclePhase } } : undefined,
  });

  return page;
}

async function getTodayCheckin() {
  const pages = await queryDatabase(DB_ID(), {
    property: 'Date',
    date: { equals: today() },
  });

  if (pages.length === 0) return null;
  return parseCheckinPage(pages[0]);
}

async function getCheckinHistory(startDate, endDate) {
  const pages = await queryDatabase(
    DB_ID(),
    {
      and: [
        { property: 'Date', date: { on_or_after: formatForNotion(startDate) } },
        { property: 'Date', date: { on_or_before: formatForNotion(endDate) } },
      ],
    },
    [{ property: 'Date', direction: 'ascending' }]
  );

  return pages.map(parseCheckinPage);
}

function parseCheckinPage(page) {
  const props = page.properties;
  return {
    id: page.id,
    date: extractProp(props.Date),
    mood: extractProp(props.Mood),
    energy: extractProp(props.Energy),
    focus: extractProp(props.Focus),
    notes: extractProp(props.Notes),
    aiResponse: extractProp(props['AI Response']),
    cyclePhase: extractProp(props['Cycle Phase']),
  };
}

module.exports = { saveCheckin, getTodayCheckin, getCheckinHistory };
