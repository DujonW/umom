const { Router } = require('express');
const { logout } = require('../controllers/auth.controller');

const router = Router();

router.post('/logout', logout);

module.exports = router;
