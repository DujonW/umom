const { config } = require('../config');
const { createPage, queryDatabase, formatRichText, extractProp } = require('./notion.service');

const DB_ID = () => config.notion.databases.calendarEvents;

/**
 * Creates a calendar event in Notion.
 * The Date property uses a datetime string when a time is provided — this makes
 * the event appear as a timed block in Notion Calendar (cal.notion.so).
 * All-day events (no time) appear as full-day items.
 *
 * Returns null if the calendarEvents database is not configured.
 */
async function createCalendarEvent(data) {
  if (!DB_ID()) return null;

  // Build the date property — datetime when time is known, date-only otherwise
  const startStr = data.startTime ? `${data.date}T${data.startTime}:00` : data.date;
  const dateProperty = { start: startStr };
  if (data.endTime) {
    dateProperty.end = `${data.date}T${data.endTime}:00`;
  }

  const page = await createPage(DB_ID(), {
    Title: { title: formatRichText(data.title) },
    Date: { date: dateProperty },
    Notes: data.notes ? { rich_text: formatRichText(data.notes) } : undefined,
  });

  return parseEventPage(page);
}

async function getUpcomingEvents(days = 14) {
  if (!DB_ID()) return [];
  const from = new Date().toISOString().split('T')[0];
  const to = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const pages = await queryDatabase(DB_ID(), {
    and: [
      { property: 'Date', date: { on_or_after: from } },
      { property: 'Date', date: { on_or_before: to } },
    ],
  }, [{ property: 'Date', direction: 'ascending' }]);

  return pages.map(parseEventPage);
}

function parseEventPage(page) {
  const props = page.properties;
  return {
    notionPageId: page.id,
    title: extractProp(props.Title),
    date: extractProp(props.Date),
    notes: extractProp(props.Notes),
  };
}

module.exports = { createCalendarEvent, getUpcomingEvents };
