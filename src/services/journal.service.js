const { config } = require('../config');
const { queryDatabase, createPage, updatePage, formatRichText, extractProp } = require('./notion.service');
const { today, formatForNotion } = require('../utils/dateHelpers');

const DB_ID = () => config.notion.databases.journal;

async function createEntry(data) {
  const page = await createPage(DB_ID(), {
    Date: { date: { start: today() } },
    Entry: { rich_text: formatRichText(data.entry) },
    Mood: data.mood != null ? { number: data.mood } : undefined,
    'AI Reflection': { rich_text: formatRichText(data.aiReflection || '') },
    Type: data.type ? { select: { name: data.type } } : { select: { name: 'General' } },
    'Check-in': data.checkinId ? { relation: [{ id: data.checkinId }] } : undefined,
  });
  return parseJournalPage(page);
}

async function getEntries(startDate, endDate) {
  const filter = startDate && endDate ? {
    and: [
      { property: 'Date', date: { on_or_after: formatForNotion(startDate) } },
      { property: 'Date', date: { on_or_before: formatForNotion(endDate) } },
    ],
  } : undefined;

  const pages = await queryDatabase(
    DB_ID(),
    filter,
    [{ property: 'Date', direction: 'descending' }]
  );

  return pages.map(parseJournalPage);
}

async function getEntry(pageId) {
  const { getPage } = require('./notion.service');
  const page = await getPage(pageId);
  return parseJournalPage(page);
}

function parseJournalPage(page) {
  const props = page.properties;
  return {
    id: page.id,
    date: extractProp(props.Date),
    entry: extractProp(props.Entry),
    mood: extractProp(props.Mood),
    aiReflection: extractProp(props['AI Reflection']),
    type: extractProp(props.Type),
  };
}

async function getRecentEntries(limit = 3) {
  const pages = await queryDatabase(DB_ID(), undefined, [{ property: 'Date', direction: 'descending' }], limit);
  return pages.map(parseJournalPage);
}

async function updateEntry(pageId, updates) {
  const props = {};
  if (updates.aiReflection != null) props['AI Reflection'] = { rich_text: formatRichText(updates.aiReflection) };
  return updatePage(pageId, props);
}

module.exports = { createEntry, updateEntry, getEntries, getEntry, getRecentEntries };
