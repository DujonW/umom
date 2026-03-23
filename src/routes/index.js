const { Router } = require('express');
const checkinRoutes = require('./checkin.routes');
const chatRoutes = require('./chat.routes');
const tasksRoutes = require('./tasks.routes');
const reportsRoutes = require('./reports.routes');
const journalRoutes = require('./journal.routes');
const periodRoutes = require('./period.routes');
const dumpRoutes = require('./dump.routes');

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'umom-api' });
});

router.use('/checkin', checkinRoutes);
router.use('/chat', chatRoutes);
router.use('/tasks', tasksRoutes);
router.use('/reports', reportsRoutes);
router.use('/journal', journalRoutes);
router.use('/period', periodRoutes);
router.use('/dump', dumpRoutes);

module.exports = router;
