const { Router } = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { chatLimiter } = require('../middleware/rateLimiter');
const { sendMessage, newSession, getSession, removeSession, getSessions } = require('../controllers/chat.controller');

const router = Router();

router.use(chatLimiter);

router.post(
  '/',
  [
    body('message').notEmpty().isString().isLength({ max: 2000 }).withMessage('Message is required (max 2000 chars)'),
    body('sessionId').optional().isUUID(),
    body('mode').optional().isIn(['chat', 'reframe', 'esteem']),
  ],
  validate,
  sendMessage
);

router.post('/session', newSession);
router.get('/sessions', getSessions);
router.get('/session/:id', getSession);
router.delete('/session/:id', removeSession);

module.exports = router;
