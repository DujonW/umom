const { validateConfig, config } = require('./config');
const { initDB } = require('./config/database');
const { createApp } = require('./app');
const { startScheduler } = require('./scheduler');

// Validate environment variables before anything else
validateConfig();

// Initialize SQLite database
initDB();

// Create and start Express app
const app = createApp();

app.listen(config.port, () => {
  console.log(`\n🌸 Umom ADHD Coaching API running on port ${config.port}`);
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   Health check: http://localhost:${config.port}/api/health\n`);
  startScheduler();
});

module.exports = app;
