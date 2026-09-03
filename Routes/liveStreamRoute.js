const express = require('express');
const router = express.Router();
const videoController = require("../Controllers/liveStreamController")

router.post('/token', videoController.generateToken);
router.post('/update-status', videoController.updateStreamStatus);

module.exports = router;