const nodemailer = require("nodemailer");
const db = require("../config/db");
const dotenv = require('dotenv');
const { getIo } = require("../config/panditSoket");
dotenv.config();

exports.createPandit = async (req, res) => {
  const {
    name, mobile, email, gotra, qualification, temple, city, state, country,
    language, skills, gender, role, experience, price,
  } = req.body;

  console.log(req.body);

  const gurukulCertificate = req.files?.['gurukulCertificate']?.[0]?.location || null;
  const aadharCard = req.files?.['aadharCard']?.[0]?.location || null;
  const panCard = req.files?.['panCard']?.[0]?.location || null;
  const profileImage = req.files?.['profileImage']?.[0]?.location || null;

  // Basic validation (add more as needed)
  if (!name || !mobile || !email) {
    return res.status(400).send({ success: false, message: "Name, mobile, and email are required" });
  }

  try {
    // Insert new Pandit record
    const [insertResult] = await db.query(
      `INSERT INTO pandit (name, mobile, email, gotra, qualification, language, skills, 
       gender, gurukulCertificate, aadharCard, panCard, temple, city, state, country, 
       verified, profileImage, role, experience, price, form) VALUES (?, ?, ?, ?, ?, ?, ?, 
       ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 1)`,
      [name, mobile, email, gotra, qualification, language, skills, gender, gurukulCertificate,
        aadharCard, panCard, temple, city, state, country, profileImage, role, experience, price]
    );

    if (insertResult.affectedRows === 0) {
      return res.status(500).send({ success: false, message: "Failed to create pandit record" });
    }

    return res.status(201).send({
      success: true,
      message: "Pandit record created successfully",
      data: { id: insertResult.insertId }, // Return the new ID if needed
    });

  } catch (error) {
    console.error('Error in createPandit:', error);
    return res.status(500).send({
      success: false,
      message: 'Internal server error',
    });
  }
};
exports.updatePandit = async (req, res) => {
  const { id } = req.params;
  const updateFields = req.body;


  const gurukulCertificate = req.files?.['gurukulCertificate']?.[0]?.location;
  const aadharCard = req.files?.['aadharCard']?.[0]?.location;
  const panCard = req.files?.['panCard']?.[0]?.location;
  const profileImage = req.files?.['profileImage']?.[0]?.location;

  try {
    // Check if the Pandit exists
    const [existingPandit] = await db.query('SELECT * FROM pandit WHERE id = ?', [id]);

    if (existingPandit.length === 0) {
      return res.status(404).send({ success: false, message: "Pandit not found" });
    }

    let updateQuery = 'UPDATE pandit SET ';
    let queryParams = [];
    let fieldsToUpdate = [];

    // Add dynamic fields
    for (const [key, value] of Object.entries(updateFields)) {
      if (value !== undefined && value !== null && key !== 'id') {
        fieldsToUpdate.push(`${key} = ?`);
        queryParams.push(value);
      }
    }

    // Check and add file updates
    if (gurukulCertificate) {
      fieldsToUpdate.push(`gurukulCertificate = ?`);
      queryParams.push(gurukulCertificate);
    }
    if (aadharCard) {
      fieldsToUpdate.push(`aadharCard = ?`);
      queryParams.push(aadharCard);
    }
    if (panCard) {
      fieldsToUpdate.push(`panCard = ?`);
      queryParams.push(panCard);
    }
    if (profileImage) {
      fieldsToUpdate.push(`profileImage = ?`);
      queryParams.push(profileImage);
    }

    if (fieldsToUpdate.length === 0) {
      return res.status(400).send({ success: false, message: "No valid fields provided for update" });
    }

    updateQuery += fieldsToUpdate.join(', ') + ' WHERE id = ?';
    queryParams.push(id);

    await db.query(updateQuery, queryParams);

    return res.status(200).send({ success: true, message: "Pandit record updated successfully" });

  } catch (error) {
    console.error('Error in updatePandit:', error);
    return res.status(500).send({ success: false, message: 'Internal server error' });
  }
};
exports.getPanditByMobile = async (req, res) => {
  const { mobile } = req.params;
  console.log("here is the mobile", mobile)
  try {
    const [existingPandit] = await db.query('SELECT * FROM pandit WHERE mobile = ?', [mobile]);
    console.log(existingPandit)
    if (existingPandit.length > 0) {
      return res.status(200).send({
        success: true,
        data: existingPandit[0],
      });
    } else {
      return res.status(404).send({
        success: false,
        message: 'No record found',
      });
    }
  } catch (error) {
    console.error('Error in getPanditByMobile:', error);
    return res.status(500).send({
      success: false,
      message: 'Internal server error',
    });
  }
};
exports.getPanditId = async (req, res) => {
  const { id } = req.params;
  console.log(id)
  try {

    const [existingPandit] = await db.query('SELECT * FROM pandit WHERE id = ?', [id]);
    console.log("here is the data of id ", existingPandit)
    console.log("pandit object data", existingPandit[0])
    if (existingPandit.length > 0) {
      return res.status(200).send({
        success: true,
        data: existingPandit[0],
      });
    } else {
      return res.status(404).send({
        success: false,
        message: 'No record found',
      });
    }
  } catch (error) {
    console.error('Error in getPanditByID:', error);
    return res.status(500).send({
      success: false,
      message: 'Internal server error',
    });
  }
};
exports.get = async (req, res) => {
  try {
    const data = await db.query(`SELECT * FROM pandit ORDER BY created_at DESC;`);

    if (!data || data.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No services found",
      });
    }

    return res.status(200).send({
      success: true,
      data: data[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};
exports.getPandit = async (req, res) => {
  try {
    const [data] = await db.query('SELECT * FROM pandit where role = 1');
    return res.status(200).send({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('Error fetching pandit data:', error);
    return res.status(500).send({
      success: false,
      message: 'Internal Server Error',
    });
  }
};
exports.getMahurat = async (req, res) => {
  try {
    console.log('Executing query...');
    const [data] = await db.query('SELECT * FROM pandit WHERE role = 3');
    console.log('Query Result:', data);

    if (!data || data.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No pandit found",
      });
    }

    return res.status(200).send({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('Error executing query:', error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getVerifiedMahurat = async (req, res) => {
  try {
    console.log('Executing query...');
    const [data] = await db.query('SELECT * FROM pandit WHERE role = 3 AND verified = 1');
    console.log('Query Result:', data);

    if (!data || data.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No pandit found",
      });
    }

    return res.status(200).send({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('Error executing query:', error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getRejectedMahurat = async (req, res) => {
  try {
    console.log('Executing query...');
    const [data] = await db.query('SELECT * FROM pandit WHERE role = 3 AND verified = 0');
    console.log('Query Result:', data);

    if (!data || data.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No pandit found",
      });
    }

    return res.status(200).send({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('Error executing query:', error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getMahuratId = async (req, res) => {
  const { id } = req.params; // Get the id from the request parameters

  try {
    console.log('Executing query for astrologer ID:', id);

    // Query to fetch astrologer data based on ID
    const [data] = await db.query('SELECT * FROM pandit WHERE id = ? AND role = 3', [id]);

    console.log('Query Result:', data);

    if (!data || data.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Astrologer not found",
      });
    }

    return res.status(200).send({
      success: true,
      data: data[0], // Return only the first result as ID is unique
    });
  } catch (error) {
    console.error('Error executing query:', error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};
exports.getAstrologer = async (req, res) => {
  try {
    console.log('Executing query...');
    const [data] = await db.query('SELECT * FROM pandit WHERE role = 2');
    console.log('Query Result:', data);

    if (!data || data.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No astrologers found",
      });
    }

    return res.status(200).send({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('Error executing query:', error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};
exports.getAstrologerById = async (req, res) => {
  const { id } = req.params; // Get the id from the request parameters

  try {
    console.log('Executing query for astrologer ID:', id);

    // Query to fetch astrologer data based on ID
    const [data] = await db.query('SELECT * FROM pandit WHERE id = ? AND role = 2', [id]);

    console.log('Query Result:', data);

    if (!data || data.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Astrologer not found",
      });
    }

    return res.status(200).send({
      success: true,
      data: data[0], // Return only the first result as ID is unique
    });
  } catch (error) {
    console.error('Error executing query:', error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getVerifiedAstrologers = async (req, res) => {
  try {
    console.log('Executing query for verified astrologers...');
    const [data] = await db.query('SELECT * FROM pandit WHERE role = 2 AND verified = 1');
    console.log('Query Result for verified astrologers:', data);

    if (!data || data.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No verified astrologers found",
      });
    }

    return res.status(200).send({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('Error executing query for verified astrologers:', error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getRejectedAstrologers = async (req, res) => {
  try {
    console.log('Executing query for rejected astrologers...');
    const [data] = await db.query('SELECT * FROM pandit WHERE role = 2 AND verified = 0');
    console.log('Query Result for rejected astrologers:', data);

    if (!data || data.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No rejected astrologers found",
      });
    }

    return res.status(200).send({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('Error executing query for rejected astrologers:', error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.email,
    pass: process.env.pass,
  },
});

exports.verifyPandit = async (req, res) => {
  const { id } = req.params;

  try {
    const [existingPandit] = await db.query('SELECT * FROM pandit WHERE id = ?', [id]);

    if (existingPandit.length > 0) {
      const pandit = existingPandit[0];

      if (pandit.rejected === 1) {
        await db.query('UPDATE pandit SET verified = 1, rejected = 0 WHERE id = ?', [id]);
      } else {
        await db.query('UPDATE pandit SET verified = 1 WHERE id = ?', [id]);
      }

      // Send Email
      const mailOptions = {
        from: process.env.email,
        to: pandit.email,
        subject: 'Profile Verification Successful',
        text: `Dear ${pandit.name},\n\nYour profile has been verified successfully!\n\nBest regards,\nTeam`,
      };

      await transporter.sendMail(mailOptions);

      return res.status(200).send({
        success: true,
        message: 'Pandit verified successfully',
      });
    } else {
      return res.status(404).send({
        success: false,
        message: 'Pandit not found',
      });
    }
  } catch (error) {
    console.error('Error in verifyPandit:', error);
    return res.status(500).send({
      success: false,
      message: 'Internal server error',
    });
  }
};

exports.rejectPandit = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body || {};

  try {
    const [existingPandit] = await db.query('SELECT * FROM pandit WHERE id = ?', [id]);

    if (existingPandit.length > 0) {
      const pandit = existingPandit[0];

      await db.query('UPDATE pandit SET rejected = 1, verified = 0, rejection_reason = ? WHERE id = ?', [reason || null, id]);
      const mailOptions = {
        from: process.env.email,
        to: pandit.email,
        subject: 'Profile Rejection Notification',
        text: `Dear ${pandit.name},\n\nWe regret to inform you that your profile verification request has been rejected. ${reason ? `Reason: ${reason}\n\n` : ''}Please connect with our support team at +917415556555 or prabhupooja2024@gmail.com for further assistance.\n\nBest regards,\nTeam Prabhu Pooja`,
      };

      try {
        await transporter.sendMail(mailOptions);
      } catch (mErr) {
        console.warn("Mail error on reject:", mErr.message);
      }

      return res.status(200).send({
        success: true,
        message: 'Pandit rejected successfully. Notification sent.',
      });
    } else {
      return res.status(404).send({
        success: false,
        message: 'Pandit not found',
      });
    }
  } catch (error) {
    console.error('Error in rejectPandit:', error);
    return res.status(500).send({
      success: false,
      message: 'Internal server error',
    });
  }
};

exports.getVerifiedPandit = async (req, res) => {
  try {
    const data = await db.query(`SELECT * FROM pandit where verified = 1 AND role = 1 `);

    if (!data || data.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No services found",
      });
    }

    return res.status(200).send({
      success: true,
      data: data[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getRejectedPandit = async (req, res) => {
  try {
    console.log('Query Result:');
    const data = await db.query(`SELECT * FROM pandit where rejected = 1  `);

    if (!data || data.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No services found",
      });
    }

    return res.status(200).send({
      success: true,
      data: data[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.searchPandit = async (req, res) => {
  try {
    console.log("In searchPandit function");
    const { query } = req.query;

    // Validate that the query parameter is provided
    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required.",
      });
    }

    const searchQuery = `%${query}%`;

    const [astrologers] = await db.query(
      "SELECT * FROM pandit WHERE name LIKE ? AND role = 1 AND verified=1;",
      [searchQuery]
    );

    // Return the results
    return res.status(200).json({
      success: true,
      data: astrologers,
    });
  } catch (error) {
    console.error("Error searching astrologers:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while searching for astrologers.",
    });
  }
};

exports.searchAstro = async (req, res) => {
  try {
    console.log("In searchPandit function");
    const { query } = req.query;

    // Validate that the query parameter is provided
    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required.",
      });
    }

    const searchQuery = `%${query}%`;

    const [astrologers] = await db.query(
      "SELECT * FROM pandit WHERE name LIKE ? AND role = 2 AND verified=1;",
      [searchQuery]
    );

    // Return the results
    return res.status(200).json({
      success: true,
      data: astrologers,
    });
  } catch (error) {
    console.error("Error searching astrologers:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while searching for astrologers.",
    });
  }
};
exports.searchMuhurat = async (req, res) => {
  try {
    console.log("In searchPandit function");
    const { query } = req.query;

    // Validate that the query parameter is provided
    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required.",
      });
    }

    const searchQuery = `%${query}%`;

    const [astrologers] = await db.query(
      "SELECT * FROM pandit WHERE name LIKE ? AND role = 3 AND verified=1;",
      [searchQuery]
    );

    // Return the results
    return res.status(200).json({
      success: true,
      data: astrologers,
    });
  } catch (error) {
    console.error("Error searching astrologers:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while searching for astrologers.",
    });
  }
};

exports.deletePandit = async (req, res) => {
  const { id } = req.params;

  try {
    const [existingPandit] = await db.query('SELECT * FROM pandit WHERE id = ?', [id]);

    if (existingPandit.length === 0) {
      return res.status(404).send({ success: false, message: "Pandit not found" });
    }
    await db.query('DELETE FROM pandit WHERE id = ?', [id]);

    return res.status(200).send({ success: true, message: "Pandit deleted successfully" });

  } catch (error) {
    console.error('Error in deletePandit:', error);
    return res.status(500).send({ success: false, message: 'Internal server error' });
  }
};

exports.updatePanditStatus = async (req, res) => {
  const { id } = req.params;
  const { field, status } = req.body;

  // Map field names (support both camelCase and snake_case)
  const fieldMap = {
    gurukulStatus: "gurukulStatus",
    gurukul_status: "gurukulStatus",
    aadharStatus: "aadharStatus",
    aadhar_status: "aadharStatus",
    panStatus: "panStatus",
    pan_status: "panStatus"
  };

  const targetField = fieldMap[field];
  if (!targetField) {
    return res.status(400).json({
      success: false,
      message: `Invalid field name '${field}'. Allowed: gurukulStatus, aadharStatus, panStatus`
    });
  }

  const normalizedStatus = (status || "").toLowerCase();
  const allowedStatuses = ['pending', 'verified', 'approved', 'rejected'];

  if (!allowedStatuses.includes(normalizedStatus)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status value. Allowed: pending, verified, approved, rejected"
    });
  }

  const dbStatus = normalizedStatus === 'approved' ? 'verified' : normalizedStatus;

  try {
    const query = `UPDATE pandit SET ${targetField} = ? WHERE id = ?`;
    const [result] = await db.query(query, [dbStatus, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Pandit not found or no changes made" });
    }

    return res.status(200).json({
      message: `Pandit ${targetField} updated to ${dbStatus} successfully`,
      success: true
    });

  } catch (error) {
    console.error("Error updating pandit status:", error);
    return res.status(500).json({ success: false, message: "Failed to update status", error: error.message });
  }
};

/**
 * Backward compatible panditOnline helper
 */
exports.panditOnline = async (pandit_id) => {
  try {
    if (!pandit_id) {
      return { success: false, status: 400, message: "Pandit ID is required" };
    }

    // Upsert pandit_status
    await db.query(`
      INSERT INTO pandit_status (pandit_id, status, chat_mode) 
      VALUES (?, 1, 0) 
      ON DUPLICATE KEY UPDATE status = 1
    `, [pandit_id]);

    try {
      const io = getIo();
      if (io) {
        io.emit("panditOnline", { pandit_id });
        io.emit("panditStatusChanged", { pandit_id, is_online: true });
      }
    } catch (sockErr) {
      console.warn("Socket broadcast warning:", sockErr.message);
    }

    return {
      success: true,
      status: 200,
      message: "Pandit is online",
    };
  } catch (error) {
    console.error("panditOnline error:", error);
    return {
      success: false,
      status: 500,
      message: "Database error: " + error.message,
    };
  }
};

/**
 * Toggle Pandit Online / Offline Status
 */
exports.toggleOnline = async (req, res) => {
  try {
    const { pandit_id, is_online } = req.body;

    if (!pandit_id && pandit_id !== 0) {
      return res.status(400).json({ success: false, message: "Pandit ID is required" });
    }

    const onlineStatus = (is_online === true || is_online === 1 || is_online === "true" || is_online === "1") ? 1 : 0;

    await db.query(`
      INSERT INTO pandit_status (pandit_id, status, chat_mode) 
      VALUES (?, ?, 0) 
      ON DUPLICATE KEY UPDATE status = ?
    `, [pandit_id, onlineStatus, onlineStatus]);

    try {
      const io = getIo();
      if (io) {
        io.emit("panditStatusChanged", { pandit_id, is_online: Boolean(onlineStatus) });
        if (onlineStatus) {
          io.emit("panditOnline", { pandit_id });
        } else {
          io.emit("panditOffline", { pandit_id });
        }
      }
    } catch (sockErr) {
      console.warn("Socket broadcast notice:", sockErr.message);
    }

    return res.status(200).json({
      success: true,
      is_online: Boolean(onlineStatus),
      message: onlineStatus ? "Pandit is now Online" : "Pandit is now Offline",
    });
  } catch (error) {
    console.error("Error in toggleOnline:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

/**
 * Get Pandit Live Online & Chat Status
 */
exports.getPanditStatus = async (req, res) => {
  try {
    const { panditId } = req.params;
    if (!panditId) {
      return res.status(400).json({ success: false, message: "Pandit ID is required" });
    }

    const [rows] = await db.query(`SELECT status, chat_mode FROM pandit_status WHERE pandit_id = ?`, [panditId]);

    const isOnline = rows.length > 0 ? Boolean(rows[0].status) : false;
    const chatMode = rows.length > 0 ? Boolean(rows[0].chat_mode) : false;

    return res.status(200).json({
      success: true,
      pandit_id: Number(panditId),
      is_online: isOnline,
      chat_mode: chatMode,
    });
  } catch (error) {
    console.error("Error in getPanditStatus:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

/**
 * Aggregated Dashboard Stats for Pandit Panel Home
 */
exports.getDashboardStats = async (req, res) => {
  const { panditId } = req.params;

  if (!panditId) {
    return res.status(400).json({ success: false, message: "Pandit ID is required" });
  }

  try {
    // 1. Get Pandit basic info + wallet
    const [panditRows] = await db.query(
      `SELECT id, name, email, mobile, wallet, price, experience, verified FROM pandit WHERE id = ?`,
      [panditId]
    );

    if (panditRows.length === 0) {
      return res.status(404).json({ success: false, message: "Pandit not found" });
    }

    const pandit = panditRows[0];

    // 2. Get live status
    const [statusRows] = await db.query(
      `SELECT status, chat_mode FROM pandit_status WHERE pandit_id = ?`,
      [panditId]
    );
    const isOnline = statusRows.length > 0 ? Boolean(statusRows[0].status) : false;
    const chatMode = statusRows.length > 0 ? Boolean(statusRows[0].chat_mode) : false;

    // 3. Count Pujas (puja_booking + rudraabhishek + pooja requests)
    const [pujaBookingsCount] = await db.query(`
      SELECT COUNT(*) AS count 
      FROM puja_booking pb
      JOIN puja p ON pb.pujaid = p.id
      WHERE p.pandit_id = ? OR FIND_IN_SET(?, p.pandit_id) > 0
    `, [panditId, panditId]);

    const [rudraCount] = await db.query(`
      SELECT COUNT(*) AS count 
      FROM rudraabhishek r
      WHERE r.adminAssigned = ? OR r.panditName IN (SELECT name FROM pandit WHERE id = ?)
    `, [panditId, panditId]);

    const [poojaReqCount] = await db.query(`
      SELECT COUNT(*) AS count 
      FROM requests 
      WHERE pandit_astrologer_id = ? AND request_type = 'pooja'
    `, [panditId]);

    const totalPoojas = (pujaBookingsCount[0]?.count || 0) + (rudraCount[0]?.count || 0) + (poojaReqCount[0]?.count || 0);

    // 4. Count Chats
    const [chatsCount] = await db.query(`
      SELECT COUNT(*) AS count 
      FROM requests 
      WHERE pandit_astrologer_id = ? AND request_type = 'chat'
    `, [panditId]);
    const totalChats = chatsCount[0]?.count || 0;

    // 5. Count Calls
    const [callsCount] = await db.query(`
      SELECT COUNT(*) AS count 
      FROM requests 
      WHERE pandit_astrologer_id = ? AND request_type IN ('call', 'voice', 'video')
    `, [panditId]);
    const totalCalls = callsCount[0]?.count || 0;

    // 6. Calculate Earnings
    const [pujaEarnings] = await db.query(`
      SELECT COALESCE(SUM(pb.amount), 0) AS total 
      FROM puja_booking pb
      JOIN puja p ON pb.pujaid = p.id
      WHERE p.pandit_id = ? OR FIND_IN_SET(?, p.pandit_id) > 0
    `, [panditId, panditId]);

    const walletBalance = parseFloat(pandit.wallet || 0);
    const calculatedEarnings = parseFloat(pujaEarnings[0]?.total || 0) + (totalChats * parseFloat(pandit.price || 0)) + (totalCalls * parseFloat(pandit.price || 0));
    const totalEarnings = calculatedEarnings > walletBalance ? calculatedEarnings : walletBalance;

    // 7. Get Recent Requests (merged list of recent 10 items)
    const [recentPujas] = await db.query(`
      SELECT 
        pb.id AS booking_id,
        'pooja' AS service_type,
        p.name AS service_name,
        p.image AS service_image,
        pb.amount,
        pb.bookingdate AS booking_date,
        NULL AS time_slot,
        COALESCE(u.name, 'Devotee') AS devotee_name,
        u.mobile AS whatsapp_number,
        'Confirmed' AS status,
        u.name AS user_name,
        u.gender,
        pb.bookingdate AS created_at
      FROM puja_booking pb
      LEFT JOIN users u ON pb.userid = u.id
      LEFT JOIN puja p ON pb.pujaid = p.id
      WHERE p.pandit_id = ? OR FIND_IN_SET(?, p.pandit_id) > 0
      ORDER BY pb.bookingdate DESC
      LIMIT 5
    `, [panditId, panditId]);

    const [recentRudra] = await db.query(`
      SELECT 
        r.id AS booking_id,
        'rudra_abhishek' AS service_type,
        r.service AS service_name,
        NULL AS service_image,
        0 AS amount,
        r.poojaDate AS booking_date,
        r.poojaTime AS time_slot,
        r.fullName AS devotee_name,
        r.mobile AS whatsapp_number,
        r.status,
        r.fullName AS user_name,
        'Not specified' AS gender,
        r.createdAt AS created_at
      FROM rudraabhishek r
      WHERE r.adminAssigned = ? OR r.panditName IN (SELECT name FROM pandit WHERE id = ?)
      ORDER BY r.createdAt DESC
      LIMIT 5
    `, [panditId, panditId]);

    const [recentRequests] = await db.query(`
      SELECT 
        req.id AS booking_id,
        req.request_type AS service_type,
        CONCAT(UPPER(SUBSTRING(req.request_type, 1, 1)), SUBSTRING(req.request_type, 2), ' Request') AS service_name,
        NULL AS service_image,
        0 AS amount,
        req.created_at AS booking_date,
        NULL AS time_slot,
        COALESCE(cf.name, u.name, 'Devotee') AS devotee_name,
        u.mobile AS whatsapp_number,
        req.status,
        COALESCE(cf.name, u.name, 'Devotee') AS user_name,
        COALESCE(cf.gender, u.gender, 'Not specified') AS gender,
        cf.DOB,
        cf.TOB,
        cf.birth_place,
        req.created_at
      FROM requests req
      LEFT JOIN users u ON req.user_id = u.id
      LEFT JOIN chat_form cf ON req.chat_form_id = cf.id
      WHERE req.pandit_astrologer_id = ?
      ORDER BY req.created_at DESC
      LIMIT 10
    `, [panditId]);

    const mergedRecent = [...recentRequests, ...recentRudra, ...recentPujas]
      .sort((a, b) => new Date(b.created_at || b.booking_date) - new Date(a.created_at || a.booking_date))
      .slice(0, 10);

    return res.status(200).json({
      success: true,
      data: {
        pandit_id: pandit.id,
        name: pandit.name,
        total_poojas: totalPoojas,
        total_chats: totalChats,
        total_calls: totalCalls,
        total_earnings: parseFloat(totalEarnings.toFixed(2)),
        wallet_balance: parseFloat(walletBalance.toFixed(2)),
        online_status: isOnline,
        chat_mode: chatMode,
        recent_requests: mergedRecent,
      },
    });

  } catch (error) {
    console.error("Error in getDashboardStats:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

/**
 * Get all bookings assigned to a specific Pandit (for Pandit Panel)
 */
exports.getAssignedBookings = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ success: false, message: "Pandit ID is required" });
  }

  try {
    // 1. Puja Bookings assigned to this pandit
    const [pujaBookings] = await db.query(`
      SELECT 
        pb.id AS booking_id,
        'pooja' AS service_type,
        p.name AS service_name,
        p.image AS service_image,
        pb.amount,
        pb.bookingdate AS booking_date,
        NULL AS time_slot,
        COALESCE(u.name, 'Devotee') AS devotee_name,
        NULL AS gotra,
        NULL AS family_members,
        NULL AS sankalp_wish,
        NULL AS rashi_nakshatra,
        u.mobile AS whatsapp_number,
        NULL AS shipping_address,
        NULL AS city,
        NULL AS state,
        NULL AS pincode,
        p.name AS package_name,
        'Confirmed' AS status,
        u.name AS user_name,
        u.mobile AS user_mobile,
        u.email AS user_email
      FROM puja_booking pb
      LEFT JOIN users u ON pb.userid = u.id
      LEFT JOIN puja p ON pb.pujaid = p.id
      WHERE p.pandit_id = ? OR FIND_IN_SET(?, p.pandit_id) > 0
      ORDER BY pb.bookingdate DESC
    `, [id, id]);

    // 2. Rudra Abhishek Bookings assigned
    const [rudraBookings] = await db.query(`
      SELECT 
        r.id AS booking_id,
        'rudra_abhishek' AS service_type,
        r.service AS service_name,
        NULL AS service_image,
        0 AS amount,
        r.poojaDate AS booking_date,
        r.poojaTime AS time_slot,
        r.fullName AS devotee_name,
        NULL AS gotra,
        NULL AS family_members,
        r.message AS sankalp_wish,
        NULL AS rashi_nakshatra,
        r.mobile AS whatsapp_number,
        r.poojaLocation AS shipping_address,
        NULL AS city,
        NULL AS state,
        NULL AS pincode,
        'Rudra Abhishek' AS package_name,
        r.status,
        r.fullName AS user_name,
        r.mobile AS user_mobile,
        r.email AS user_email
      FROM rudraabhishek r
      WHERE r.adminAssigned = ? OR r.panditName IN (SELECT name FROM pandit WHERE id = ?)
      ORDER BY r.createdAt DESC
    `, [id, id]);

    // 3. General Requests (Call / Chat / Pooja requests)
    const [requests] = await db.query(`
      SELECT 
        req.id AS booking_id,
        req.request_type AS service_type,
        CONCAT(UPPER(SUBSTRING(req.request_type, 1, 1)), SUBSTRING(req.request_type, 2), ' Request') AS service_name,
        NULL AS service_image,
        0 AS amount,
        req.created_at AS booking_date,
        NULL AS time_slot,
        COALESCE(cf.name, u.name, 'Devotee') AS devotee_name,
        NULL AS gotra,
        NULL AS family_members,
        NULL AS sankalp_wish,
        NULL AS rashi_nakshatra,
        u.mobile AS whatsapp_number,
        NULL AS shipping_address,
        NULL AS city,
        NULL AS state,
        NULL AS pincode,
        req.request_type AS package_name,
        req.status,
        COALESCE(cf.name, u.name, 'Devotee') AS user_name,
        u.mobile AS user_mobile,
        u.email AS user_email
      FROM requests req
      LEFT JOIN users u ON req.user_id = u.id
      LEFT JOIN chat_form cf ON req.chat_form_id = cf.id
      WHERE req.pandit_astrologer_id = ?
      ORDER BY req.created_at DESC
    `, [id]);

    const allAssigned = [...pujaBookings, ...rudraBookings, ...requests];

    return res.status(200).json({
      success: true,
      count: allAssigned.length,
      data: allAssigned,
      summary: {
        total: allAssigned.length,
        pending: allAssigned.filter(b => b.status === 'Pending' || b.status === 'pending' || !b.status).length,
        completed: allAssigned.filter(b => b.status === 'Completed' || b.status === 'completed' || b.status === 'Confirmed').length,
        in_progress: allAssigned.filter(b => b.status === 'In-Progress' || b.status === 'In Progress' || b.status === 'accepted').length,
      }
    });

  } catch (error) {
    console.error("Error fetching assigned bookings for pandit:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

/**
 * Pandit status update on assigned booking + auto wallet credit
 */
exports.updateAssignedBookingStatus = async (req, res) => {
  const { bookingId } = req.params;
  const { status, service_type, remarks, pandit_id } = req.body;

  if (!bookingId || !status) {
    return res.status(400).json({ success: false, message: "Booking ID and status are required" });
  }

  try {
    if (service_type === 'rudra_abhishek') {
      await db.query(`UPDATE rudraabhishek SET status = ?, adminRemark = COALESCE(?, adminRemark) WHERE id = ?`, [status, remarks, bookingId]);
    } else if (service_type === 'request' || service_type === 'call' || service_type === 'chat' || service_type === 'voice' || service_type === 'video') {
      await db.query(`UPDATE requests SET status = ? WHERE id = ?`, [status.toLowerCase(), bookingId]);
    } else {
      // Default puja_booking
      await db.query(`UPDATE puja_booking SET paymentDate = COALESCE(paymentDate, CURDATE()) WHERE id = ?`, [bookingId]);
    }

    // Auto-credit wallet if marked Completed and pandit_id is provided
    if ((status === 'Completed' || status === 'completed') && pandit_id) {
      try {
        const [panditRow] = await db.query(`SELECT price FROM pandit WHERE id = ?`, [pandit_id]);
        const creditAmount = parseFloat(panditRow[0]?.price || 100);
        await db.query(`UPDATE pandit SET wallet = COALESCE(wallet, 0) + ? WHERE id = ?`, [creditAmount, pandit_id]);
      } catch (wErr) {
        console.warn("Wallet credit notice:", wErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Booking status updated to ${status} successfully`
    });
  } catch (error) {
    console.error("Error updating assigned booking status:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

/**
 * Pandit Wallet Details & Payout History
 */
exports.getPanditWallet = async (req, res) => {
  const { panditId } = req.params;

  if (!panditId) {
    return res.status(400).json({ success: false, message: "Pandit ID is required" });
  }

  try {
    const [panditRows] = await db.query(`SELECT id, name, wallet, price FROM pandit WHERE id = ?`, [panditId]);
    if (panditRows.length === 0) {
      return res.status(404).json({ success: false, message: "Pandit not found" });
    }

    const walletBalance = parseFloat(panditRows[0].wallet || 0);

    // Completed requests for transaction log
    const [completedRequests] = await db.query(`
      SELECT 
        r.id,
        r.request_type,
        r.updated_at AS completed_at,
        u.name AS devotee_name,
        ? AS earned_amount
      FROM requests r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.pandit_astrologer_id = ? AND r.status = 'accepted'
      ORDER BY r.updated_at DESC
      LIMIT 20
    `, [panditRows[0].price || 50, panditId]);

    return res.status(200).json({
      success: true,
      data: {
        pandit_id: Number(panditId),
        wallet_balance: walletBalance,
        per_consultation_price: parseFloat(panditRows[0].price || 0),
        recent_transactions: completedRequests,
      }
    });
  } catch (error) {
    console.error("Error in getPanditWallet:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

/**
 * Pandit Earnings Breakdown
 */
exports.getPanditEarnings = async (req, res) => {
  const { panditId } = req.params;

  if (!panditId) {
    return res.status(400).json({ success: false, message: "Pandit ID is required" });
  }

  try {
    const [panditRows] = await db.query(`SELECT id, name, wallet, price FROM pandit WHERE id = ?`, [panditId]);
    if (panditRows.length === 0) {
      return res.status(404).json({ success: false, message: "Pandit not found" });
    }

    const price = parseFloat(panditRows[0].price || 0);

    const [chatStats] = await db.query(
      `SELECT COUNT(*) AS count FROM requests WHERE pandit_astrologer_id = ? AND request_type = 'chat'`,
      [panditId]
    );
    const [callStats] = await db.query(
      `SELECT COUNT(*) AS count FROM requests WHERE pandit_astrologer_id = ? AND request_type IN ('call', 'voice', 'video')`,
      [panditId]
    );
    const [pujaStats] = await db.query(`
      SELECT COUNT(*) AS count, COALESCE(SUM(pb.amount), 0) AS total_amount 
      FROM puja_booking pb
      JOIN puja p ON pb.pujaid = p.id
      WHERE p.pandit_id = ? OR FIND_IN_SET(?, p.pandit_id) > 0
    `, [panditId, panditId]);

    const chatEarnings = (chatStats[0]?.count || 0) * price;
    const callEarnings = (callStats[0]?.count || 0) * price;
    const pujaEarnings = parseFloat(pujaStats[0]?.total_amount || 0);

    return res.status(200).json({
      success: true,
      data: {
        pandit_id: Number(panditId),
        wallet_balance: parseFloat(panditRows[0].wallet || 0),
        breakdown: {
          chats: { count: chatStats[0]?.count || 0, earnings: chatEarnings },
          calls: { count: callStats[0]?.count || 0, earnings: callEarnings },
          pujas: { count: pujaStats[0]?.count || 0, earnings: pujaEarnings },
        },
        total_estimated_earnings: chatEarnings + callEarnings + pujaEarnings,
      }
    });
  } catch (error) {
    console.error("Error in getPanditEarnings:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};