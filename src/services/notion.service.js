const { getNotionClient } = require('../config/notion');
const { config } = require('../config');
const { withRetry } = require('../utils/retry');

/**
 * Low-level Notion API wrapper. All other services use this, never the client directly.
 * All network calls are wrapped with withRetry to handle transient Notion API errors.
 */

async function queryDatabase(databaseId, filter = undefined, sorts = undefined) {
  const client = getNotionClient();
  const params = { database_id: databaseId };
  if (filter) params.filter = filter;
  if (sorts) params.sorts = sorts;

  const pages = [];
  let cursor;

  do {
    if (cursor) params.start_cursor = cursor;
    const response = await withRetry(() => client.databases.query(params));
    pages.push(...response.results);
    cursor = response.next_cursor;
  } while (cursor);

  return pages;
}

async function createPage(databaseId, properties, children = []) {
  const client = getNotionClient();
  return withRetry(() => client.pages.create({
    parent: { database_id: databaseId },
    properties,
    children,
  }));
}

async function updatePage(pageId, properties) {
  const client = getNotionClient();
  return withRetry(() => client.pages.update({ page_id: pageId, properties }));
}

async function getPage(pageId) {
  const client = getNotionClient();
  return withRetry(() => client.pages.retrieve({ page_id: pageId }));
}

/**
 * Builds a Notion rich text array from a plain string.
 */
function formatRichText(text) {
  return [{ type: 'text', text: { content: text || '' } }];
}

/**
 * Extracts plain text from a Notion rich text array.
 */
function extractText(richTextArray) {
  if (!Array.isArray(richTextArray)) return '';
  return richTextArray.map((rt) => rt.plain_text || rt.text?.content || '').join('');
}

/**
 * Extracts the value from a Notion property by type.
 */
function extractProp(property) {
  if (!property) return null;
  switch (property.type) {
    case 'title': return extractText(property.title);
    case 'rich_text': return extractText(property.rich_text);
    case 'number': return property.number;
    case 'select': return property.select?.name || null;
    case 'multi_select': return property.multi_select?.map((s) => s.name) || [];
    case 'date': return property.date?.start || null;
    case 'checkbox': return property.checkbox;
    case 'url': return property.url;
    default: return null;
  }
}

module.exports = { queryDatabase, createPage, updatePage, getPage, formatRichText, extractText, extractProp };
