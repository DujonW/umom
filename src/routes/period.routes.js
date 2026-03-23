const { Router } = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { log, history, currentPhase, predictions } = require('../controllers/period.controller');

const router = Router();

router.post(
  '/log',
  [
    body('startDate').notEmpty().isISO8601().withMessage('Start date is required (YYYY-MM-DD)'),
    body('cycleLength').optional().isInt({ min: 21, max: 45 }).withMessage('Cycle length must be 21-45 days'),
    body('symptoms').optional().isArray(),
    body('notes').optional().isString().isLength({ max: 1000 }),
  ],
  validate,
  log
);

router.get('/history', history);
router.get('/phase', currentPhase);
router.get('/predictions', predictions);

module.exports = router;
