const { Router } = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { submit, getToday, getHistory } = require('../controllers/checkin.controller');

const router = Router();

router.post(
  '/',
  [
    body('mood').isInt({ min: 1, max: 10 }).withMessage('Mood must be 1-10'),
    body('energy').isInt({ min: 1, max: 10 }).withMessage('Energy must be 1-10'),
    body('focus').isInt({ min: 1, max: 10 }).withMessage('Focus must be 1-10'),
    body('notes').optional().isString().isLength({ max: 2000 }),
  ],
  validate,
  submit
);

router.get('/today', getToday);
router.get('/history', getHistory);

module.exports = router;
