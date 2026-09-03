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

  try {
    const responses = [];

    for (const token of deviceTokens) {
      const message = {
        notification: {
          title,
          body,
        },
        token: token,
      };

      const response = await admin.messaging().send(message);
      responses.push(response);
    }

    return res.status(200).json({
      message: 'Notifications sent successfully',
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
  try {
    const responses = [];

    for (const token of deviceTokens) {
      const message = {
        notification: {
          title,
          body,
        },
        token: token,
      };
      const response = await admin.messaging().send(message);
      responses.push(response);
    }
    return {
      message: 'Notifications sent successfully',
      sent: responses.length,
    };
  } catch (error) {
    console.error('Error sending notification:', error);
    throw new Error('Failed to send notification');
  }
};

exports.sendNotificationToUser = async (title, body, userId) => {
  if (!title || !body || !userId) {
    throw new Error('Title, body, and userId are required');
  }
  try {
    const [rows] = await db.query(
      'SELECT deviceToken FROM users WHERE id = ?',
      [userId]
    );

    if (rows.length === 0 || !rows[0].deviceToken) {
      throw new Error('Device token not found for this user');
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
