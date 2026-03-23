/**
 * Returns the Monday and Sunday (inclusive) of the week containing `date`.
 */
function getWeekRange(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { start: monday, end: sunday };
}

/**
 * Returns the first and last day of the month containing `date`.
 */
function getMonthRange(date = new Date()) {
  const d = new Date(date);
  const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Formats a Date as YYYY-MM-DD for Notion date properties.
 */
function formatForNotion(date) {
  return new Date(date).toISOString().split('T')[0];
}

/**
 * Parses a Notion date string (YYYY-MM-DD or ISO) back to a JS Date.
 */
function parseFromNotion(dateStr) {
  return new Date(dateStr);
}

/**
 * Returns today's date as YYYY-MM-DD.
 */
function today() {
  return formatForNotion(new Date());
}

module.exports = { getWeekRange, getMonthRange, formatForNotion, parseFromNotion, today };
