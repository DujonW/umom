const { Router } = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { weekly, monthly, generate } = require('../controllers/reports.controller');

const router = Router();

router.get('/weekly', weekly);
router.get('/monthly', monthly);

router.post(
  '/generate',
  [
    body('type').isIn(['weekly', 'monthly']).withMessage('Type must be weekly or monthly'),
    body('date').optional().isISO8601(),
  ],
  validate,
  generate
);

module.exports = router;
