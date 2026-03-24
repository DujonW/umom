require('dotenv').config();

const required = [
  'ANTHROPIC_API_KEY',
  'NOTION_API_KEY',
  'NOTION_DB_CHECKINS',
  'NOTION_DB_TASKS',
  'NOTION_DB_JOURNAL',
  'NOTION_DB_REPORTS',
  'NOTION_DB_CYCLE_LOGS',
];

function validateConfig() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}\nCopy .env.example to .env and fill in the values.`);
  }
}

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  claude: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
  },
  notion: {
    apiKey: process.env.NOTION_API_KEY,
    databases: {
      checkins: process.env.NOTION_DB_CHECKINS,
      tasks: process.env.NOTION_DB_TASKS,
      journal: process.env.NOTION_DB_JOURNAL,
      reports: process.env.NOTION_DB_REPORTS,
      cycleLogs: process.env.NOTION_DB_CYCLE_LOGS,
      calendarEvents: process.env.NOTION_DB_CALENDAR_EVENTS || null, // optional
      inbox: process.env.NOTION_DB_INBOX || null, // optional — "What's on Your Mind?" inbox
    },
  },
  sqlite: {
    path: process.env.SQLITE_PATH || 'data/umom.db',
  },
};

module.exports = { config, validateConfig };
