const db = require("../config/db");
const { getIo } = require("../config/soketConfig");

exports.createMessage = async (req, res) => {
  const { request_id, senderId, receiverId, message } = req.body;
  const timestamp = new Date();

  try {
    const [requestRows] = await db.query(
      `SELECT r.user_id, r.pandit_astrologer_id, r.status, u.uuid AS user_uuid, p.uuid AS pandit_uuid
       FROM requests r
       LEFT JOIN users u ON u.id = r.user_id
       LEFT JOIN pandit p ON p.id = r.pandit_astrologer_id
       WHERE r.id = ?`,
      [request_id]
    );

    const requestData = requestRows[0] || {};
    const senderValue = senderId || requestData.user_uuid || requestData.user_id;
    const receiverValue = receiverId || requestData.pandit_uuid || requestData.pandit_astrologer_id;

    if (requestData.status !== "accepted") {
      await db.query(
        `UPDATE requests SET status = ?, updated_at = NOW() WHERE id = ?`,
        ["accepted", request_id]
      );
      if (requestData.user_id) {
        await db.query(`UPDATE user_status SET status = 1, chat_mode = 1 WHERE user_id = ?`, [requestData.user_id]);
      }
      if (requestData.pandit_astrologer_id) {
        await db.query(`UPDATE pandit_status SET chat_mode = 1 WHERE pandit_id = ?`, [requestData.pandit_astrologer_id]);
      }
    }

    await db.query(
      `INSERT INTO messages (request_id, sender_id, receiver_id, message, timestamp)
       VALUES (?, ?, ?, ?, ?)`,
      [request_id, senderValue, receiverValue, message, timestamp]
    );

    const io = getIo();
    const payload = {
      requestId: request_id,
      senderId: senderValue,
      receiverId: receiverValue,
      message,
      createdAt: timestamp.toISOString(),
      user_uuid: requestData.user_uuid || null,
      pandit_uuid: requestData.pandit_uuid || null,
    };

    io.to(`chat_${request_id}`).emit("receive_chat_message", payload);
    io.to(`user_${senderValue}`).emit("receive_chat_message", payload);
    io.to(`astrologer_${receiverValue}`).emit("receive_chat_message", payload);

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      user_uuid: payload.user_uuid,
      pandit_uuid: payload.pandit_uuid,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to send message", error });
  }
};

exports.getMessages = async (req, res) => {
  const { userId, astrologerId } = req.params;

  const normalizedUserId = userId && userId !== "null" && userId !== "undefined" ? Number(userId) : null;
  const normalizedAstrologerId = astrologerId && astrologerId !== "null" && astrologerId !== "undefined" ? Number(astrologerId) : null;

  if (!normalizedUserId || !normalizedAstrologerId || Number.isNaN(normalizedUserId) || Number.isNaN(normalizedAstrologerId)) {
    return res.json({ messages: [] });
  }

  try {
    const [rows] = await db.query(
      'SELECT * FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)',
      [normalizedUserId, normalizedAstrologerId, normalizedAstrologerId, normalizedUserId]
    );
    return res.json({ messages: rows });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch messages', error });
  }
};

exports.createCall = async (req, res) => {
  const { userId, astrologerId, callType } = req.body;

  try {
    const data = await db.query(
      `INSERT INTO calls (user_id, astrologer_id, call_type) VALUES (?, ?, ?)`,
      [userId, astrologerId, callType]
    );

    if (!data) {
      return res.status(404).send({
        success: false,
        message: "Error in insert query"
      });
    }

    return res.status(201).send({
      success: true,
      message: "Call started successfully"
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error"
    });
  }
};

exports.updateCall = async (req, res) => {
  const { callId } = req.params;

  try {
    const data = await db.query(
      `UPDATE calls SET end_time = ? WHERE id = ?`,
      [new Date(), callId]
    );

    if (!data) {
      return res.status(404).send({
        success: false,
        message: "Error in update query"
      });
    }

    return res.status(200).send({
      success: true,
      message: "Call ended successfully"
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error"
    });
  }
};

exports.createVideoCall = async (req, res) => {
  const { userId, astrologerId } = req.body;

  try {
    const data = await db.query(
      `INSERT INTO video_calls (user_id, astrologer_id) VALUES (?, ?)`,
      [userId, astrologerId]
    );

    if (!data) {
      return res.status(404).send({
        success: false,
        message: "Error in insert query"
      });
    }

    return res.status(201).send({
      success: true,
      message: "Video call started successfully"
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error"
    });
  }
};

exports.updateVideoCall = async (req, res) => {
  const { videoCallId } = req.params;

  try {
    const data = await db.query(
      `UPDATE video_calls SET end_time = ? WHERE id = ?`,
      [new Date(), videoCallId]
    );

    if (!data) {
      return res.status(404).send({
        success: false,
        message: "Error in update query"
      });
    }

    return res.status(200).send({
      success: true,
      message: "Video call ended successfully"
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error"
    });
  }
};

exports.chatForm = async (req, res) => {
  const { name, gender, DOB, TOB, birth_place, userid } = req.body;

  // Validate required fields
  if (!name || !gender || !DOB || !TOB || !birth_place || !userid) {
    return res.status(400).send({
      success: false,
      message: "All fields are required"
    });
  }

  try {
    // Insert query
    const insertQuery = `
            INSERT INTO chat_form (name, gender, DOB, TOB, birth_place, userid)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

    const values = [name, gender, DOB, TOB, birth_place, userid];

    const result = await db.query(insertQuery, values);

    return res.status(201).send({
      success: true,
      message: "Data inserted successfully",
      id: result[0].insertId,
    });

  } catch (err) {
    console.error("Error inserting data:", err);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
      error: err.message || err
    });
  }
};

exports.endChat = async (req, res) => {
  try {
    const { user_uuid, pandit_uuid } = req.body;
    console.log(user_uuid, pandit_uuid);
    const [userData] = await db.query("SELECT id FROM users WHERE uuid = ?", [user_uuid]);
    const [panditData] = await db.query("SELECT id FROM pandit WHERE uuid = ?", [pandit_uuid]);

    if (userData.length === 0 || panditData.length === 0) {
      return res.status(404).json({ message: "User or Pandit not found" });
    }

    const userId = userData[0].id;
    const panditId = panditData[0].id;

    await db.query("UPDATE user_status SET chat_mode = 0 WHERE user_id = ?", [userId]);
    await db.query("UPDATE pandit_status SET chat_mode = 0 WHERE pandit_id = ?", [panditId]);

    return res.status(200).json({ message: "Chat ended successfully" });
  } catch (error) {
    console.error("Error in endChat:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.userMode = async (req, res) => {
  const { user_id } = req.params;

  try {
    const [rows] = await db.query('SELECT * FROM user_status WHERE user_id=?', [user_id]);

    if (rows.length > 0) {
      res.json({ success: true, data: rows[0] }); // User ka status return karega
    } else {
      res.json({ success: false, message: "User status not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Database error", error: error.message });
  }
};

exports.panditMode = async (req, res) => {
  const { pandit_id } = req.params;

  try {
    const [rows] = await db.query('SELECT * FROM pandit_status WHERE pandit_id=?', [pandit_id]);

    if (rows.length > 0) {
      res.json({ success: true, data: rows[0] }); // User ka status return karega
    } else {
      res.json({ success: false, message: "pandit status not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Database error", error: error.message });
  }
};

exports.chatHistory = async (req, res) => {
  const { request_id } = req.params;

  try {
      if (!request_id) {
          return res.status(400).json({ error: "Request ID is required" });
      }

      const [requestRows] = await db.query(
        `SELECT u.uuid AS user_uuid, p.uuid AS pandit_uuid
         FROM requests r
         LEFT JOIN users u ON u.id = r.user_id
         LEFT JOIN pandit p ON p.id = r.pandit_astrologer_id
         WHERE r.id = ?`,
        [request_id]
      );

      const [messages] = await db.query(
          `SELECT * FROM messages WHERE request_id = ? ORDER BY timestamp ASC`,
          [request_id]
      );

   return res.status(200).send({
    success:true,
    data:messages,
    user_uuid: requestRows[0]?.user_uuid || null,
    pandit_uuid: requestRows[0]?.pandit_uuid || null
   })

  } catch (err) {
      console.error(err);
      return res.status(500).send({
        success: false,
        message: "Internal Server Error",
        error: err.message || err
      });
  }
};

