const express = require('express');
const router = express.Router();
const healthController = require('../Controllers/healthController');

router.get('/', healthController.getHealth);
router.get('/db-stats', healthController.getDbStats);

module.exports = router;
