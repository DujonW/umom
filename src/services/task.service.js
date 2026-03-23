const { config } = require('../config');
const { queryDatabase, createPage, updatePage, archivePage, formatRichText, extractProp } = require('./notion.service');
const { today } = require('../utils/dateHelpers');

const DB_ID = () => config.notion.databases.tasks;

async function getTasks(filter = {}) {
  const notionFilter = buildFilter(filter);
  const pages = await queryDatabase(
    DB_ID(),
    notionFilter,
    [{ property: 'Priority', direction: 'descending' }]
  );
  return pages.map(parseTaskPage);
}

async function createTask(data) {
  const page = await createPage(DB_ID(), {
    Title: { title: formatRichText(data.title) },
    Description: { rich_text: formatRichText(data.description || '') },
    Priority: data.priority ? { select: { name: data.priority } } : undefined,
    Status: { select: { name: data.status || 'To Do' } },
    Tags: data.tags?.length ? { multi_select: data.tags.map((t) => ({ name: t })) } : undefined,
    'Estimated Minutes': data.estimatedMinutes ? { number: data.estimatedMinutes } : undefined,
    'Due Date': data.dueDate ? { date: { start: data.dueDate } } : undefined,
  });
  return parseTaskPage(page);
}

async function updateTask(notionPageId, updates) {
  const props = {};

  if (updates.title !== undefined) props.Title = { title: formatRichText(updates.title) };
  if (updates.description !== undefined) props.Description = { rich_text: formatRichText(updates.description) };
  if (updates.priority !== undefined) props.Priority = { select: { name: updates.priority } };
  if (updates.status !== undefined) {
    props.Status = { select: { name: updates.status } };
    if (updates.status === 'Done') {
      props['Completed At'] = { date: { start: today() } };
    }
  }
  if (updates.tags !== undefined) {
    props.Tags = { multi_select: updates.tags.map((t) => ({ name: t })) };
  }
  if (updates.estimatedMinutes !== undefined) {
    props['Estimated Minutes'] = { number: updates.estimatedMinutes };
  }

  const page = await updatePage(notionPageId, props);
  return parseTaskPage(page);
}

async function deleteTask(notionPageId) {
  // Notion doesn't support deletion via API — archive instead
  // archived is a top-level field, not a page property
  await archivePage(notionPageId);
  return true;
}

function buildFilter(filter) {
  const conditions = [];
  if (filter.status) {
    conditions.push({ property: 'Status', select: { equals: filter.status } });
  }
  if (filter.priority) {
    conditions.push({ property: 'Priority', select: { equals: filter.priority } });
  }
  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return { and: conditions };
}

function parseTaskPage(page) {
  const props = page.properties;
  return {
    notionPageId: page.id,
    title: extractProp(props.Title),
    description: extractProp(props.Description),
    priority: extractProp(props.Priority),
    status: extractProp(props.Status),
    tags: extractProp(props.Tags),
    estimatedMinutes: extractProp(props['Estimated Minutes']),
    completedAt: extractProp(props['Completed At']),
    dueDate: extractProp(props['Due Date']),
  };
}

module.exports = { getTasks, createTask, updateTask, deleteTask };
