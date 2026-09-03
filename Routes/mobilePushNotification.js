const express = require("express");
const router = express.Router();
const pushNotification = require('../Controllers/MobilePushNotification')

router.post("/save-token", pushNotification.saveToken);
router.post("/send", pushNotification.sendNotification);
router.post("/saveDbToken/:userId", pushNotification.saveDBToken);

module.exports = router;
