const express = require("express");
const settingController = require("../Controllers/settingController");
const { AdminverifyToken } = require("../config/admintoken");
const { AdminOrAgentVerifyToken } = require("../config/adminOrAgentToken");

const router = express.Router();

// Public / User route to get delivery charge setting & rules
router.get("/delivery-charge", settingController.getDeliveryChargeSetting);

// Admin routes to update delivery charge configuration (Admin Only)
router.put("/delivery-charge", AdminverifyToken, settingController.updateDeliveryChargeSetting);
router.post("/delivery-charge", AdminverifyToken, settingController.updateDeliveryChargeSetting);

// Admin general settings
router.get("/all", AdminOrAgentVerifyToken, settingController.getAllSettings);

module.exports = router;
