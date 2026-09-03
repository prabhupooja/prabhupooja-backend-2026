const express = require("express");
const router = express.Router();
const notification = require("../Controllers/notificationController");
const {sendNotificationToUser} = require('../Controllers/MobilePushNotification')

const { sellerVerifyToken } = require("../config/sellerToken");

router.get("/get", sellerVerifyToken, notification.getNotifications);
router.get("/get/:sellerId", notification.getNotifications);
router.get("/getToday", sellerVerifyToken, notification.getTodayNotifications);
router.get('/getToday/:sellerId', notification.getTodayNotifications);
router.post('/readSellerNotification/:notificationId', notification.markSellerNotificationAsRead);
  
router.post("/send", async (req, res) => {
  const { seller_id, message } = req.body;

  const result = await notification.sendNotification(seller_id, message);

  if (result) {
    return res.status(result.status).json({
      success: result.success,
      message: result.message,
    });
  } else {
    return res.status(500).json({
      success: false,
      message: "No response from controller",
    });
  }
});

router.get("/userNotification/:userId", notification.getUserNotifications);
router.post('/readNotification/:notificationId', notification.markNotificationAsRead);

router.post("/userSend", async (req, res) => {
  const { userId,title, message } = req.body;
  const result = await notification.sendUserNotification(userId,title, message);
  if (result) {
    await sendNotificationToUser(title, message, userId);
    return res.status(result.status).json({
      success: result.success,
      message: result.message,
    });
  } else {
    return res.status(500).json({
      success: false,
      message: "No response from controller",
    });
  }
});

router.get("/users/search", notification.getAllusers);

module.exports = router;
