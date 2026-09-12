const admin = require('firebase-admin');
const db = require('../config/db');

let deviceTokens = [];

exports.saveToken = (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  if (!deviceTokens.includes(token)) {
    deviceTokens.push(token);
  }

  return res.status(200).json({ message: 'Token saved successfully', tokens: deviceTokens });
};

exports.saveDBToken = async (req, res) => {
  const { token } = req.body;
  const { userId } = req.params;

  if (!token || !userId) {
    return res.status(400).json({ error: 'Token and userId are required' });
  }

  try {
    const [rows] = await db.query(`SELECT id FROM users WHERE id = ?`, [userId]);

    if (rows.length > 0) {
      await db.query(
        `UPDATE users SET deviceToken = ? WHERE id = ?`,
        [token, userId]
      );
    } else {
      await db.query(
        `INSERT INTO users (id, deviceToken) VALUES (?, ?)`,
        [userId, token]
      );
    }

    return res.status(200).json({ message: 'Token saved or updated', token, userId });
  } catch (err) {
    console.error('Error saving token:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.sendNotification = async (req, res) => {
  const { title, body } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body are required' });
  }

  if (!admin.apps || admin.apps.length === 0) {
    console.warn("Firebase Admin not initialized. Skipping notification.");
    return res.status(200).json({ message: 'Firebase not configured, notification skipped', sent: 0 });
  }

  try {
    // 1. Fetch persistent device tokens from DB
    const [userTokens] = await db.query(
      `SELECT DISTINCT deviceToken FROM users WHERE deviceToken IS NOT NULL AND deviceToken != ''`
    );
    const dbTokenList = userTokens.map((r) => r.deviceToken).filter(Boolean);

    // 2. Merge with memory tokens (remove duplicates)
    const allTokens = Array.from(new Set([...deviceTokens, ...dbTokenList]));

    if (allTokens.length === 0) {
      return res.status(200).json({
        message: 'No registered device tokens found.',
        sent: 0,
      });
    }

    const responses = [];

    for (const token of allTokens) {
      try {
        const message = {
          notification: {
            title,
            body,
          },
          token: token,
        };

        const response = await admin.messaging().send(message);
        responses.push(response);
      } catch (sendErr) {
        console.warn(`FCM send failed for token: ${token.slice(0, 10)}... Error: ${sendErr.message}`);
      }
    }

    return res.status(200).json({
      message: `Notifications sent successfully to ${responses.length} device(s)`,
      sent: responses.length,
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
};

exports.sendAutoNotification = async (title, body) => {
  if (!title || !body) {
    throw new Error('Title and body are required');
  }

  if (!admin.apps || admin.apps.length === 0) {
    console.warn("Firebase Admin not initialized. Skipping auto notification.");
    return { message: 'Firebase not configured', sent: 0 };
  }

  try {
    const [userTokens] = await db.query(
      `SELECT DISTINCT deviceToken FROM users WHERE deviceToken IS NOT NULL AND deviceToken != ''`
    );
    const dbTokenList = userTokens.map((r) => r.deviceToken).filter(Boolean);
    const allTokens = Array.from(new Set([...deviceTokens, ...dbTokenList]));

    const responses = [];

    for (const token of allTokens) {
      try {
        const message = {
          notification: {
            title,
            body,
          },
          token: token,
        };
        const response = await admin.messaging().send(message);
        responses.push(response);
      } catch (err) {
        console.warn("Auto notification token error:", err.message);
      }
    }
    return {
      message: 'Notifications sent successfully',
      sent: responses.length,
    };
  } catch (error) {
    console.error('Error sending auto notification:', error);
    throw new Error('Failed to send notification');
  }
};

exports.sendNotificationToUser = async (title, body, userId) => {
  if (!title || !body || !userId) {
    throw new Error('Title, body, and userId are required');
  }

  if (!admin.apps || admin.apps.length === 0) {
    console.warn("Firebase Admin not initialized. Skipping user notification.");
    return { success: false, message: 'Firebase Admin not configured' };
  }

  try {
    const [rows] = await db.query(
      'SELECT deviceToken FROM users WHERE id = ?',
      [userId]
    );

    if (rows.length === 0 || !rows[0].deviceToken) {
      return { success: false, message: 'Device token not found for this user' };
    }

    const deviceToken = rows[0].deviceToken;

    const message = {
      notification: { title, body },
      token: deviceToken,
    };
    const response = await admin.messaging().send(message);
    return {
      success: true,
      message: 'Notification sent successfully',
      response,
    };
  } catch (error) {
    console.error('Error sending notification:', error);
    return {
      success: false,
      message: 'Failed to send notification',
      error: error.message || error,
    };
  }
};
