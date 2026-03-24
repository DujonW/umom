const { config } = require('../config');
const { queryDatabase, updatePage, extractProp, formatRichText } = require('./notion.service');
const { processDump } = require('../controllers/dump.controller');
const { today } = require('../utils/dateHelpers');

const DB_ID = () => config.notion.databases.inbox;

async function processInboxPage(pageId, text) {
  try {
    await updatePage(pageId, {
      Status: { select: { name: 'Processing' } },
    });

    const { aiResponse } = await processDump(text);

    await updatePage(pageId, {
      Status: { select: { name: 'Done' } },
      'Mara Response': { rich_text: formatRichText(aiResponse) },
      'Processed At': { date: { start: today() } },
    });
  } catch {
    await updatePage(pageId, {
      Status: { select: { name: 'Error' } },
    }).catch(() => {});
  }
}

async function pollInbox() {
  if (!DB_ID()) return;

  const pages = await queryDatabase(DB_ID(), {
    property: 'Status',
    select: { equals: 'Pending' },
  });

  for (const page of pages) {
    // Find the title property by type — works regardless of what the column is named
    const titleProp = Object.values(page.properties).find((p) => p.type === 'title');
    const text = titleProp ? extractProp(titleProp)?.trim() : null;
    if (!text) {
      await updatePage(page.id, { Status: { select: { name: 'Error' } } }).catch(() => {});
      continue;
    }
    await processInboxPage(page.id, text);
  }
}

module.exports = { pollInbox };
