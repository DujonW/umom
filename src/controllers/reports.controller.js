const { aggregateWeekData, aggregateMonthData, saveReport } = require('../services/report.service');
const { generateWeeklySummary, generateMonthlySummary } = require('../services/ai.service');
const { assembleContext } = require('../services/context.service');
const { success } = require('../utils/responseHelpers');

async function weekly(req, res, next) {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const [data, userContext] = await Promise.all([
      aggregateWeekData(date),
      assembleContext({ days: 7 }),
    ]);
    const summary = await generateWeeklySummary(data, userContext);
    res.json(success({ ...data, summary }));
  } catch (err) {
    next(err);
  }
}

async function monthly(req, res, next) {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const [data, userContext] = await Promise.all([
      aggregateMonthData(date),
      assembleContext({ days: 30 }),
    ]);
    const summary = await generateMonthlySummary(data, userContext);
    res.json(success({ ...data, summary }));
  } catch (err) {
    next(err);
  }
}

async function generate(req, res, next) {
  try {
    const { type, date } = req.body;
    const d = date ? new Date(date) : new Date();
    const days = type === 'weekly' ? 7 : 30;

    const [data, userContext] = await Promise.all([
      type === 'weekly' ? aggregateWeekData(d) : aggregateMonthData(d),
      assembleContext({ days }),
    ]);

    const summary = type === 'weekly'
      ? await generateWeeklySummary(data, userContext)
      : await generateMonthlySummary(data, userContext);

    const dateRange = `${data.startDate} to ${data.endDate}`;
    await saveReport(type === 'weekly' ? 'Weekly' : 'Monthly', dateRange, summary, data);

    res.json(success({ type, dateRange, summary, data }, 'Report generated and saved to Notion'));
  } catch (err) {
    next(err);
  }
}

module.exports = { weekly, monthly, generate };
