const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

const ensureUuidForEntity = async (tableName, idColumn, idValue) => {
  const [rows] = await db.query(`SELECT uuid FROM ${tableName} WHERE ${idColumn} = ?`, [idValue]);

  if (rows.length === 0) {
    return null;
  }

  if (rows[0].uuid) {
    return rows[0].uuid;
  }

  const generatedUuid = uuidv4();
  await db.query(`UPDATE ${tableName} SET uuid = ? WHERE ${idColumn} = ?`, [generatedUuid, idValue]);
  return generatedUuid;
};

exports.createRequest = async (req, res) => {
  const { user_id, pandit_astrologer_id, request_type, chat_form_id } = req.body;
  console.log(req.body);
  try {
    const userUuid = await ensureUuidForEntity("users", "id", user_id);
    const panditUuid = await ensureUuidForEntity("pandit", "id", pandit_astrologer_id);

    const requestStatus = "pending";

    const data = await db.query(
      'INSERT INTO requests (user_id, pandit_astrologer_id, request_type, status, created_at, chat_form_id) VALUES (?, ?, ?, ?, NOW(), ?)',
      [user_id, pandit_astrologer_id, request_type, requestStatus, chat_form_id]
    );

    await db.query(
      `UPDATE user_status SET status = 1 WHERE user_id = ?`,
      [user_id]
    );

    const id = data[0].insertId;
    console.log("Request created successfully");
    return res.status(201).send({
      message: 'Request created successfully',
      requestId: id,
      status: requestStatus,
      userUuid,
      panditUuid
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Failed to create request', error });
  }
};


exports.getRequests = async (req, res) => {
  const { requestId } = req.params;

  try {
    const [requests] = await db.query(
      'SELECT * FROM requests WHERE id = ?',
      [requestId]
    );

    let status = requests[0].status
    return res.status(200).send({ status });
  } catch (error) {
    res.status(500).send({ message: 'Failed to fetch requests', error });
  }
};


exports.getPanditRequests = async (req, res) => {
  const { id, type } = req.params;

  try {
    let requests = [];

    if (type === "chat") {
      // Query for chat requests
      [requests] = await db.query(
        `SELECT 
          r.id AS request_id,
          r.pandit_astrologer_id,
          r.updated_at,
          r.request_type,
          r.user_id,
          u.uuid AS user_uuid,
          r.status,
          COALESCE(cf.name, u.name, 'Devotee') AS user_name,
          COALESCE(cf.gender, u.gender, 'Not specified') AS gender,
          cf.DOB,
          cf.TOB,
          cf.birth_place
          FROM requests r 
          LEFT JOIN chat_form cf ON r.chat_form_id = cf.id 
          LEFT JOIN users u ON r.user_id = u.id 
          WHERE r.pandit_astrologer_id = ? AND r.request_type = 'chat'
          ORDER BY r.created_at DESC`,
        [id]
      );
    } else {
      // Query for other request types (call, voice, video, pooja)
      [requests] = await db.query(
        `SELECT  
          r.id AS request_id,
          r.pandit_astrologer_id,
          r.status,
          r.user_id,
          r.request_type,
          r.updated_at,
          COALESCE(u.name, 'Devotee') AS user_name,
          COALESCE(u.gender, 'Not specified') AS gender,
          u.uuid AS user_uuid,
          u.mobile AS user_mobile,
          u.email AS user_email
          FROM requests r 
          LEFT JOIN users u ON r.user_id = u.id
          WHERE r.pandit_astrologer_id = ? AND (r.request_type = ? OR (? = 'call' AND r.request_type IN ('call', 'voice', 'video')))
          ORDER BY r.created_at DESC`,
        [id, type, type]
      );
    }

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests || []
    });
  } catch (error) {
    console.error("Error in getPanditRequests:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch requests", error: error.message });
  }
};

exports.getUserRequests = async (req, res) => {
  const { id, type } = req.params;
  try {
    let requests;

    if (type === "chat") {
      [requests] = await db.query(
        `SELECT 
          r.id AS request_id,
          r.pandit_astrologer_id,
          r.updated_at,
          p.name,
          p.lastname,
          p.experience,
          p.price
        FROM requests r 
        INNER JOIN pandit p ON r.pandit_astrologer_id = p.id
        WHERE r.user_id = ? AND r.status = 'accepted'`,
        [id]
      );
    }

    res.status(200).json({ success: true, data: requests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};


exports.updateRequestStatus = async (req, res) => {
  const { requestId } = req.params;
  const { status } = req.body;
  console.log(status, "llll");

  try {
    const [request] = await db.query('SELECT * FROM requests WHERE id = ?', [requestId]);

    if (request.length > 0) {
      await db.query(
        'UPDATE requests SET status = ?, updated_at = NOW() WHERE id = ?',
        [status, requestId]
      );
      if (status === 'accepted') {
        await db.query(
          `UPDATE user_status SET chat_mode = 1 WHERE user_id = (SELECT user_id FROM requests WHERE id = ?)`,
          [requestId]
        );
        await db.query(
          `UPDATE pandit_status SET chat_mode = 1 WHERE pandit_id = (SELECT pandit_astrologer_id FROM requests WHERE id = ?)`,
          [requestId]
        );
      }
      return res.status(200).json({ message: 'Request status updated successfully' });
    } else {
      return res.status(404).json({ message: 'Request not found' });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update request status', error });
  }
};

