const cron = require('node-cron');
const { aggregateWeekData, aggregateMonthData, saveReport } = require('./services/report.service');
const { generateWeeklySummary, generateMonthlySummary } = require('./services/ai.service');
const { assembleContext } = require('./services/context.service');

const TZ = process.env.TZ_SCHEDULER || 'America/Los_Angeles';

function startScheduler() {
  // Weekly report — every Sunday at 20:00
  cron.schedule('0 20 * * 0', async () => {
    console.log('[scheduler] Generating weekly report...');
    try {
      const [data, userContext] = await Promise.all([
        aggregateWeekData(new Date()),
        assembleContext({ days: 7 }),
      ]);

      if (data.checkinStreak === 0 && data.tasksCompleted === 0 && data.journalCount === 0) {
        console.log('[scheduler] No data this week — skipping weekly report.');
        return;
      }

      const summary = await generateWeeklySummary(data, userContext);
      const dateRange = `${data.startDate} to ${data.endDate}`;
      await saveReport('Weekly', dateRange, summary, data);
      console.log(`[scheduler] Weekly report saved: ${dateRange}`);
    } catch (err) {
      console.error('[scheduler] Weekly report failed:', err.message);
    }
  }, { timezone: TZ });

  // Monthly report — 1st of each month at 20:00
  cron.schedule('0 20 1 * *', async () => {
    console.log('[scheduler] Generating monthly report...');
    try {
      // Use yesterday's date so we capture the full previous month
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [data, userContext] = await Promise.all([
        aggregateMonthData(yesterday),
        assembleContext({ days: 30 }),
      ]);

      if (data.totalTasksCompleted === 0 && data.weeksWithData === 0) {
        console.log('[scheduler] No data last month — skipping monthly report.');
        return;
      }

      const summary = await generateMonthlySummary(data, userContext);
      const dateRange = `${data.startDate} to ${data.endDate}`;
      await saveReport('Monthly', dateRange, summary, data);
      console.log(`[scheduler] Monthly report saved: ${dateRange}`);
    } catch (err) {
      console.error('[scheduler] Monthly report failed:', err.message);
    }
  }, { timezone: TZ });

  console.log(`[scheduler] Crons registered — weekly (Sun 08:00) and monthly (1st 08:30) [${TZ}]`);
}

module.exports = { startScheduler };
