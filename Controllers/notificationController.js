const { getIo } = require("../config/soketConfig");
const db = require('../config/db');


// sendNotification function to send notifications to sellers

exports.sendNotification = async (seller_id, message) => {
  console.log("Seller ID:", seller_id, "Message:", message);

  if (!seller_id || !message) {
    return { success: false, status: 400, message: "Seller ID and message are required" };
  }

  try {
    const query = "INSERT INTO notifications (seller_id, message) VALUES (?, ?)";
    await db.query(query, [seller_id, message]);
  } catch (dbErr) {
    console.error("Error inserting seller notification into DB:", dbErr.message);
  }

  try {
    const io = getIo();
    if (io) {
      console.log(`Emitting notification_${seller_id}`);
      io.emit(`notification_${seller_id}`, { message });
    }
  } catch (error) {
    console.error("WebSocket Emit Error:", error.message);
  }

  return { success: true, status: 200, message: "Notification sent successfully" };
};

exports.getNotifications = async (req, res) => {
  const sellerId = req.params.sellerId || (req.user && req.user.id);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const filter = req.query.filter || "all";

  if (!sellerId) {
    return res.status(400).send({
      success: false,
      message: "Seller ID is required",
    });
  }

  const offset = (page - 1) * limit;

  let filterCondition = "WHERE seller_id = ?";
  const params = [sellerId];

  if (filter === "today") {
    filterCondition += " AND DATE(created_at) = CURDATE()";
  } else if (filter === "7days") {
    filterCondition += " AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
  }

  try {
    const [countResult] = await db.query(
      `SELECT COUNT(*) AS total FROM notifications ${filterCondition}`,
      params
    );
    const totalCount = countResult.length > 0 ? countResult[0].total : 0;
    const totalPages = Math.ceil(totalCount / limit) || 1;

    const [notifications] = await db.query(
      `SELECT * FROM notifications ${filterCondition} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.status(200).send({
      success: true,
      totalPages,
      totalCount,
      notifications,
    });
  } catch (error) {
    console.error("Database error in getNotifications:", error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.getTodayNotifications = async (req, res) => {
  const sellerId = req.params.sellerId || (req.user && req.user.id);

  if (!sellerId) {
    return res.status(400).send({
      success: false,
      message: "Seller ID is required",
    });
  }

  try {
    const [notifications] = await db.query(
      `SELECT * FROM notifications WHERE seller_id = ? AND DATE(created_at) = CURDATE() ORDER BY created_at DESC`,
      [sellerId]
    );

    return res.status(200).send({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error("Database error in getTodayNotifications:", error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.markSellerNotificationAsRead = async (req, res) => {
  const { notificationId } = req.params;

  if (!notificationId) {
    return res.status(400).send({
      success: false,
      message: "Notification ID is required",
    });
  }

  try {
    const [result] = await db.query(
      `UPDATE notifications SET is_read = 1 WHERE id = ?`,
      [notificationId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).send({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).send({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Database error in markSellerNotificationAsRead:", error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
exports.sendUserNotification = (userId,title,message) => {

  console.log("userId", userId, "Message:", message, "titile:", title);

  if (!userId || !message || !title) {
    return res.status(400).json({ error: "userid and message are required" });
  }

  const query = "INSERT INTO userNotifications (userId,title, message) VALUES (?,?,?)";

  db.query(query, [userId,title, message], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
  });
  try {
    const userio = getIo();
    if (!userio) {
      console.error("ERROR: Socket.io instance is undefined!");
      return;
    }

    console.log(`Trying to emit: notification_${userId}`);
   userio.emit(`notification_${userId}`, {title, message});

    console.log(` Successfully emitted WebSocket event: notification_${userId} ->`,title, message);
  } catch (error) {
    console.error(" WebSocket Emit Error:", error.message);
  }
  return { success: true, status: 200, message: "Notification sent successfully" };
};
exports.getUserNotifications = async (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  if (!userId) {
    return res.status(400).send({
      success: false,
      message: "User ID is required",
    });
  }

  const offset = (page - 1) * limit;

  try {
    const [notifications] = await db.query(
      `SELECT * FROM userNotifications WHERE userId = ? ORDER BY time DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const [countResult] = await db.query(
      `SELECT COUNT(*) AS total FROM userNotifications WHERE userId = ?`,
      [userId]
    );
    const totalCount = countResult[0].total;

    const [unreadcountResult] = await db.query(
  `SELECT COUNT(*) AS total FROM userNotifications WHERE userId = ? AND isUnread = 1`,
  [userId]
);
const unreadtotalCount = unreadcountResult[0].total;

    const hasMore = offset + notifications.length < totalCount;

    return res.status(200).send({
      success: true,
      notifications,
      unreadtotalCount,
      hasMore,
    });
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};
exports.markNotificationAsRead = async (req, res) => {
  const { notificationId } = req.params;

  if (!notificationId) {
    return res.status(400).send({
      success: false,
      message: "Notification ID is required",
    });
  }

  try {
    const [result] = await db.query(
      `UPDATE userNotifications SET isUnread = 0 WHERE id = ?`,
      [notificationId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).send({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).send({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};
exports.getAllusers = async (req, res) => {
  const search = req.query.search;

  try {
    let query = "SELECT id, name, email, mobile FROM users";
    let values = [];

    if (search) {
      query += " WHERE email LIKE ? OR mobile LIKE ?";
      values = [`%${search}%`, `%${search}%`];
    }

    const [users] = await db.query(query, values);

    return res.status(200).send({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};











