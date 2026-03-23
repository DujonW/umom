const { Router } = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { create, list, get } = require('../controllers/journal.controller');

const router = Router();

router.post(
  '/',
  [
    body('entry').notEmpty().isString().isLength({ max: 5000 }).withMessage('Journal entry is required'),
    body('mood').optional().isInt({ min: 1, max: 10 }),
    body('type').optional().isIn(['General', 'Reframe', 'Gratitude', 'Win']),
  ],
  validate,
  create
);

router.get('/', list);
router.get('/:id', get);

module.exports = router;
