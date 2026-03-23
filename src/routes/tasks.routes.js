const { Router } = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { list, create, update, remove, initiate } = require('../controllers/tasks.controller');

const router = Router();

router.get('/', list);

router.post(
  '/',
  [
    body('title').notEmpty().isString().isLength({ max: 500 }).withMessage('Title is required'),
    body('description').optional().isString().isLength({ max: 2000 }),
    body('priority').optional().isIn(['High', 'Medium', 'Low']),
    body('status').optional().isIn(['To Do', 'In Progress', 'Done', 'Paused']),
    body('estimatedMinutes').optional().isInt({ min: 1, max: 480 }),
    body('tags').optional().isArray(),
  ],
  validate,
  create
);

router.patch(
  '/:id',
  [
    body('title').optional().isString().isLength({ max: 500 }),
    body('status').optional().isIn(['To Do', 'In Progress', 'Done', 'Paused']),
    body('priority').optional().isIn(['High', 'Medium', 'Low']),
  ],
  validate,
  update
);

router.delete('/:id', remove);

router.post(
  '/:id/initiate',
  [body('title').notEmpty().isString()],
  validate,
  initiate
);

module.exports = router;
