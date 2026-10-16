const db = require("../config/db");

// Auto-ensure table exists on first use without affecting any existing table
let isTableInitialized = false;
const ensureTableExists = async () => {
  if (isTableInitialized) return;
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS spiritual_enquiries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        karmic_name VARCHAR(255) DEFAULT NULL,
        spiritual_name VARCHAR(255) DEFAULT NULL,
        country VARCHAR(150) DEFAULT NULL,
        mobile VARCHAR(50) DEFAULT NULL,
        email VARCHAR(255) DEFAULT NULL,
        message TEXT DEFAULT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        admin_remark TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_created_at (created_at),
        INDEX idx_status (status),
        INDEX idx_email (email),
        INDEX idx_mobile (mobile)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await db.query(createTableQuery);
    isTableInitialized = true;
  } catch (err) {
    console.error("[SpiritualEnquiry] Table check error:", err.message);
  }
};

// 1. CREATE ENQUIRY (Public endpoint - can be called from external frontend)
exports.create = async (req, res) => {
  await ensureTableExists();
  try {
    const body = req.body || {};

    // Flexible field mapping so whatever casing/spelling is sent from external frontend works perfectly
    const karmic_name = body.karmic_name || body.carnic_name || body.karmicName || body.carnicName || null;
    const spiritual_name = body.spiritual_name || body.spritual_name || body.spiritualName || body.spritualName || null;
    const country = body.country || null;
    const mobile = body.mobile || body.mobile_number || body.mobileNumber || body.phone || null;
    const email = body.email || null;
    const message = body.message || null;

    const [result] = await db.query(
      `INSERT INTO spiritual_enquiries 
        (karmic_name, spiritual_name, country, mobile, email, message, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [karmic_name, spiritual_name, country, mobile, email, message]
    );

    const insertedId = result.insertId;

    return res.status(201).json({
      success: true,
      message: "Enquiry submitted successfully",
      data: {
        id: insertedId,
        karmic_name,
        spiritual_name,
        country,
        mobile,
        email,
        message,
        status: "pending",
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("[SpiritualEnquiry Error] create:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

// 2. GET ALL ENQUIRIES (For Admin panel)
exports.getAll = async (req, res) => {
  await ensureTableExists();
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const search = (req.query.search || "").trim();
    const status = (req.query.status || "").trim();

    let whereConditions = [];
    let queryParams = [];

    if (search) {
      whereConditions.push(
        `(karmic_name LIKE ? OR spiritual_name LIKE ? OR email LIKE ? OR mobile LIKE ? OR country LIKE ?)`
      );
      const searchWildcard = `%${search}%`;
      queryParams.push(searchWildcard, searchWildcard, searchWildcard, searchWildcard, searchWildcard);
    }

    if (status) {
      whereConditions.push(`status = ?`);
      queryParams.push(status);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    // Total count
    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM spiritual_enquiries ${whereClause}`,
      queryParams
    );
    const total = countRows[0]?.total || 0;

    // Data rows
    const [rows] = await db.query(
      `SELECT * FROM spiritual_enquiries ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      data: rows
    });
  } catch (error) {
    console.error("[SpiritualEnquiry Error] getAll:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

// 3. GET SINGLE ENQUIRY BY ID
exports.getById = async (req, res) => {
  await ensureTableExists();
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT * FROM spiritual_enquiries WHERE id = ?`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error("[SpiritualEnquiry Error] getById:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

// 4. UPDATE ENQUIRY / STATUS (For Admin panel)
exports.update = async (req, res) => {
  await ensureTableExists();
  try {
    const { id } = req.params;
    const body = req.body || {};

    const [existing] = await db.query(
      `SELECT * FROM spiritual_enquiries WHERE id = ?`,
      [id]
    );
    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found"
      });
    }

    let fields = [];
    let values = [];

    if (body.karmic_name !== undefined || body.carnic_name !== undefined) {
      fields.push("karmic_name = ?");
      values.push(body.karmic_name || body.carnic_name);
    }
    if (body.spiritual_name !== undefined || body.spritual_name !== undefined) {
      fields.push("spiritual_name = ?");
      values.push(body.spiritual_name || body.spritual_name);
    }
    if (body.country !== undefined) {
      fields.push("country = ?");
      values.push(body.country);
    }
    if (body.mobile !== undefined || body.mobile_number !== undefined || body.phone !== undefined) {
      fields.push("mobile = ?");
      values.push(body.mobile || body.mobile_number || body.phone);
    }
    if (body.email !== undefined) {
      fields.push("email = ?");
      values.push(body.email);
    }
    if (body.message !== undefined) {
      fields.push("message = ?");
      values.push(body.message);
    }
    if (body.status !== undefined) {
      fields.push("status = ?");
      values.push(body.status);
    }
    if (body.admin_remark !== undefined || body.remark !== undefined) {
      fields.push("admin_remark = ?");
      values.push(body.admin_remark || body.remark);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields provided to update"
      });
    }

    values.push(id);
    await db.query(
      `UPDATE spiritual_enquiries SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    const [updated] = await db.query(
      `SELECT * FROM spiritual_enquiries WHERE id = ?`,
      [id]
    );

    return res.status(200).json({
      success: true,
      message: "Enquiry updated successfully",
      data: updated[0]
    });
  } catch (error) {
    console.error("[SpiritualEnquiry Error] update:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

// 5. DELETE ENQUIRY (For Admin panel)
exports.delete = async (req, res) => {
  await ensureTableExists();
  try {
    const { id } = req.params;
    const [result] = await db.query(
      `DELETE FROM spiritual_enquiries WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Enquiry deleted successfully"
    });
  } catch (error) {
    console.error("[SpiritualEnquiry Error] delete:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};
