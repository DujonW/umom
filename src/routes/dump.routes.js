const { Router } = require('express');
const { dump, followup } = require('../controllers/dump.controller');

const router = Router();

// POST /api/dump              — brain dump, saves tasks/journal, may return pendingId
// POST /api/dump/followup     — fills missing check-in fields from a follow-up reply
router.post('/', dump);
router.post('/followup', followup);

module.exports = router;
