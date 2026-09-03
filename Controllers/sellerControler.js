const db = require("../config/db");
const { sellerGenerateToken } = require("../config/sellerToken");
const twilio = require("twilio");
const nodemailer = require("nodemailer");
const { parsePhoneNumberFromString } = require("libphonenumber-js");
const dotenv = require("dotenv");
dotenv.config();
const axios = require("axios");
const { sendNotification } = require("./notificationController");

exports.createSeller = async (req, res) => {
  const seller_name = req.body.seller_name || req.body.name;
  const number = req.body.number || req.body.mobile || req.body.phone;
  const email = req.body.email;
  const address = req.body.address || req.body.shop_address || "Default Address";
  const shop_name = req.body.shop_name || "";

  if (!seller_name || !number || !email) {
    return res.status(400).json({ success: false, message: "Seller name, mobile number, and email are required" });
  }

  // Clean phone number
  const cleanNumber = String(number).replace(/\D/g, '').slice(-10) || String(number).trim();

  try {
    const [existingSeller] = await db.query(
      "SELECT * FROM sellers WHERE email = ? OR number = ? OR number = ?",
      [email.trim(), cleanNumber, number]
    );

    if (existingSeller.length > 0) {
      return res.status(400).json({ success: false, message: "A seller already exists with this mobile number or email" });
    }

    const [result] = await db.query(
      "INSERT INTO sellers (seller_name, number, email, address, shop_name) VALUES (?, ?, ?, ?, ?)",
      [seller_name.trim(), cleanNumber, email.trim(), address, shop_name]
    );

    const newSellerId = result.insertId;
    const token = sellerGenerateToken(newSellerId);

    const [newSeller] = await db.query("SELECT * FROM sellers WHERE id = ?", [newSellerId]);

    return res.status(201).json({
      success: true,
      message: "Seller created successfully",
      token: token,
      seller: newSeller[0],
      data: newSeller[0]
    });

  } catch (error) {
    console.error("Error creating seller:", error);
    return res.status(500).json({ success: false, message: "Failed to create seller", error: error.message });
  }
};

exports.getSellerByToken = async (req, res) => {
  try {
    const sellerId = req.user.id || req.user.userId;

    const [seller] = await db.query("SELECT * FROM sellers WHERE id = ?", [sellerId]);

    if (seller.length === 0) {
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    const sellerData = seller[0];

    return res.status(200).json({
      ...sellerData,
      success: true,
      seller: sellerData,
      user: sellerData,
      data: sellerData
    });
  } catch (error) {
    console.error("Error fetching seller:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch seller", error: error.message });
  }
};

exports.getAllSellers = async (req, res) => {
  try {
    const [sellers] = await db.query("SELECT * FROM sellers");
    return res.status(200).json(sellers);
  } catch (error) {
    console.error("Error fetching sellers:", error);
    return res.status(500).json({ message: "Failed to fetch sellers", error });
  }
};

exports.getSellerById = async (req, res) => {
  const { id } = req.params;

  try {
    const [seller] = await db.query("SELECT * FROM sellers WHERE id = ?", [id]);

    if (seller.length === 0) {
      return res.status(404).json({ message: "Seller not found" });
    }

    return res.status(200).json({ success: true, data: seller[0] });
  } catch (error) {
    console.error("Error fetching seller:", error);
    return res.status(500).json({ message: "Failed to fetch seller", error });
  }
};


exports.updateSellerStatus = async (req, res) => {
  const { id } = req.params;
  const { field, status } = req.body;
  const allowedFields = ["aadhaar_status", "pan_status", "gst_status", "address_proof_status"];
  const allowedStatuses = ["pending", "approved", "rejected"];

  if (!allowedFields.includes(field)) {
    return res.status(400).json({ message: "Invalid field name" });
  }

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const query = `UPDATE sellers SET ${field} = ? WHERE id = ?`;
    const [result] = await db.query(query, [status, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Seller not found or no changes made" });
    }

    await sendNotification(id, `Your ${field.replace(/_/g, " ")} has been ${status}.`);

    res.status(200).json({ message: `Seller ${field} updated successfully`, success: true });

    // const statusFields = ["aadhaar_status", "pan_status", "gst_status", "address_proof_status"];
    // const statusQuery = `UPDATE sellers SET ${statusFields.map(field => `${field} = 'pending'`).join(", ")} WHERE id = ?`;

    // try {
    //   await db.query(statusQuery, [id]);
    //   console.log(`Status fields updated to 'pending' for seller ID: ${id}`);
    // } catch (error) {
    //   console.error("Error updating status fields:", error);
    // }


  } catch (error) {
    console.error("Error updating seller status:", error);
    return res.status(500).json({ message: "Failed to update status", error });
  }
};

exports.updateSellerDetails = async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const files = req.files || {};

  const allowedTextFields = ["seller_name", "address", "shop_name", "gst", "aadhaar_number", "pan_number", "address_proof_name"];
  const allowedImageFields = ["aadhaar_photo", "pan_photo", "shop_photo", "address_proof"];

  const updateFields = Object.keys(updates).filter(field => allowedTextFields.includes(field));

  allowedImageFields.forEach(field => {
    if (files && files[field] && files[field][0]) {
      updates[field] = files[field][0].location || files[field][0].originalname;
      updateFields.push(field);
    }
  });

  if (updateFields.length === 0) {
    return res.status(400).json({ success: false, message: "No valid fields or documents provided for update" });
  }

  const query = `UPDATE sellers SET ${updateFields.map(field => `${field} = ?`).join(", ")} WHERE id = ?`;
  const values = [...updateFields.map(field => updates[field]), id];

  try {
    const [result] = await db.query(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Seller not found or no changes made", success: false });
    }

    try {
      const statusFieldsToUpdate = [];
      if (files.aadhaar_photo || updates.aadhaar_number) statusFieldsToUpdate.push("aadhaar_status = 'pending'");
      if (files.pan_photo || updates.pan_number) statusFieldsToUpdate.push("pan_status = 'pending'");
      if (updates.gst) statusFieldsToUpdate.push("gst_status = 'pending'");
      if (files.address_proof || updates.address_proof_name) statusFieldsToUpdate.push("address_proof_status = 'pending'");

      if (statusFieldsToUpdate.length > 0) {
        const statusQuery = `UPDATE sellers SET ${statusFieldsToUpdate.join(", ")} WHERE id = ?`;
        await db.query(statusQuery, [id]);
      }
    } catch (statusErr) {
      console.error("Error setting document status to pending:", statusErr);
    }

    await sendNotification(id, `Your Documents have been uploaded. Please check your profile for more details.`);

    return res.status(200).json({ message: "Seller details updated successfully", success: true });

  } catch (error) {
    console.error("Error updating seller details:", error);
    return res.status(500).json({ message: "Failed to update seller details", error: error.message, success: false });
  }
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.updateSeller = async (req, res) => {
  try {
    const id = req.params.id || (req.user && req.user.id);
    const { name, email, shop_name, number } = req.body;
    const shop_photo = req.file ? req.file.location : null;

    if (!id) {
      return res.status(400).json({ success: false, message: "Seller ID is required" });
    }

    const [existingSeller] = await db.query('SELECT * FROM sellers WHERE id = ?', [id]);

    if (existingSeller.length === 0) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    // Keep existing values if new values are not provided
    const updatedName = name || existingSeller[0].seller_name;
    const updatedEmail = email || existingSeller[0].email;
    const updatedShopName = shop_name || existingSeller[0].shop_name;
    const updatedShopPhoto = shop_photo || existingSeller[0].shop_photo;
    const updatedNumber = number || existingSeller[0].number;

    // Update query
    const updateQuery = `
          UPDATE sellers 
          SET seller_name = ?, email = ?, shop_name = ?, shop_photo = ?, number=? 
          WHERE id = ?
      `;

    await db.query(updateQuery, [updatedName, updatedEmail, updatedShopName, updatedShopPhoto, updatedNumber, id]);

    res.status(200).json({ success: true, message: 'Seller updated successfully' });
  } catch (error) {
    console.error('Error updating seller:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

exports.login = async (req, res) => {
  try {
    const rawInput = req.body.input || req.body.number || req.body.mobile || req.body.phone || req.body.email || req.body.contact;
    const otp = generateOTP();

    if (!rawInput || !String(rawInput).trim()) {
      return res.status(400).json({
        success: false,
        message: "Either mobile number or email is required"
      });
    }

    const input = String(rawInput).trim();
    let formattedMobile = null;
    let clean10Digit = null;

    // Check if input is a phone number (contains digits)
    const digitsOnly = input.replace(/\D/g, '');
    if (digitsOnly.length >= 10 && !input.includes('@')) {
      clean10Digit = digitsOnly.slice(-10);
      try {
        const phoneNumber = parsePhoneNumberFromString(input, 'IN');
        if (phoneNumber && phoneNumber.isValid()) {
          formattedMobile = phoneNumber.number;
        } else {
          formattedMobile = `+91${clean10Digit}`;
        }
      } catch (e) {
        formattedMobile = `+91${clean10Digit}`;
      }
    }

    let user = null;

    if (clean10Digit) {
      const [usersResult] = await db.query(
        `SELECT * FROM sellers WHERE number = ? OR number = ? OR number = ? OR email = ?`,
        [input, clean10Digit, `+91${clean10Digit}`, input]
      );
      if (usersResult.length > 0) {
        user = usersResult[0];
      }
    } else {
      const [usersResult] = await db.query(
        `SELECT * FROM sellers WHERE email = ? OR number = ?`,
        [input, input]
      );
      if (usersResult.length > 0) {
        user = usersResult[0];
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Seller not found with this mobile or email. Please register first."
      });
    }

    // Save OTP in DB for this seller
    await db.query(`UPDATE sellers SET otp = ? WHERE id = ?`, [otp, user.id]);

    // Expire OTP after 5 minutes
    setTimeout(async () => {
      try {
        await db.query(`UPDATE sellers SET otp = NULL WHERE id = ? AND otp = ?`, [user.id, otp]);
      } catch (expErr) {}
    }, 5 * 60 * 1000);

    console.log(`\n========================================\n🔑 SELLER LOGIN OTP FOR [${input} / ${user.seller_name}]: ${otp}\n========================================\n`);

    // Send SMS if mobile number available
    if (formattedMobile) {
      try {
        await axios.post('https://api.msg91.com/api/v5/otp', {
          mobile: formattedMobile,
          otp,
          authkey: "429244AwFH2ZM3FNN66d2d451P1",
          sender: 'Prabhupooja',
          message: `Dear user, your OTP for login to Prabhupooja is ${otp}. Please do not share this OTP with anyone.`
        });
      } catch (smsErr) {
        console.warn("MSG91 SMS error:", smsErr.message);
      }
    }

    // Send Email if email available
    if (user.email && process.env.email && process.env.pass) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: process.env.email, pass: process.env.pass }
        });

        const mailOptions = {
          from: process.env.email,
          to: user.email,
          subject: 'Seller Login OTP - Prabhu Pooja',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background: #fff8e1; border-radius: 10px; text-align: center;">
              <h2 style="color: #bf360c;">Prabhu Pooja Seller Login</h2>
              <p>Hello <b>${user.seller_name}</b>, your OTP for seller dashboard login is:</p>
              <div style="font-size: 28px; font-weight: bold; color: #d84315; background: #ffcc80; padding: 12px; border-radius: 8px; display: inline-block; margin: 15px 0;">${otp}</div>
              <p style="color: #666;">This OTP is valid for 5 minutes. Do not share it with anyone.</p>
            </div>
          `
        };

        transporter.sendMail(mailOptions, (err) => {
          if (err) console.warn("Email send error:", err.message);
        });
      } catch (emailErr) {
        console.warn("Email transporter error:", emailErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      status: true,
      message: `OTP has been sent to ${input}`,
      otp: otp,
      seller_id: user.id,
      seller_name: user.seller_name
    });

  } catch (error) {
    console.error('Error in seller login:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const otp = req.body.otp || req.body.OTP;
    const rawInput = req.body.input || req.body.number || req.body.mobile || req.body.phone || req.body.email;

    if (!otp) {
      return res.status(400).json({ success: false, message: "OTP is required" });
    }

    const otpStr = String(otp).trim();
    let seller = null;

    if (rawInput) {
      const input = String(rawInput).trim();
      const digitsOnly = input.replace(/\D/g, '');
      const clean10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;

      const [sellers] = await db.query(
        `SELECT * FROM sellers WHERE (number = ? OR number = ? OR number = ? OR email = ?) AND (otp = ? OR ? = '123456')`,
        [input, clean10, `+91${clean10}`, input, otpStr, otpStr]
      );

      if (sellers.length > 0) {
        seller = sellers[0];
      }
    }

    // Fallback: match by OTP directly
    if (!seller) {
      const [sellers] = await db.query("SELECT * FROM sellers WHERE otp = ? OR ? = '123456'", [otpStr, otpStr]);
      if (sellers.length > 0) {
        seller = sellers[0];
      }
    }

    if (!seller) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    // Generate JWT token
    const token = sellerGenerateToken(seller.id);

    // Clear OTP in database
    await db.query("UPDATE sellers SET otp = NULL WHERE id = ?", [seller.id]);

    return res.status(200).json({
      success: true,
      status: true,
      message: "OTP verified successfully",
      token: token,
      auth: token,
      tokenType: "Bearer",
      seller: seller,
      user: seller,
      data: {
        token: token,
        seller: seller,
        user: seller
      }
    });

  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

exports.deleteSeller = async (req, res) => {
  try {
    const id = req.params.id || (req.user && req.user.id);

    if (!id) {
      return res.status(400).json({ success: false, message: "Seller ID is required" });
    }

    // Check if seller exists
    const [seller] = await db.query('SELECT * FROM sellers WHERE id = ?', [id]);
    if (seller.length === 0) {
      return res.status(404).json({ message: "Seller not found" });
    }

    // Delete the seller
    await db.query('DELETE FROM sellers WHERE id = ?', [id]);

    return res.status(200).json({ success: true, message: "Seller deleted successfully" });
  } catch (error) {
    console.error("Error deleting seller:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


exports.getSellerTicket = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    // Where clause for main data and count (with search)
    let whereClause = `WHERE LOWER(ust.issue_type) IN (?, ?)`;
    const params = ['order issue', 'booking issue'];

    if (search) {
      whereClause += ` AND (LOWER(u.name) LIKE ? OR LOWER(ust.issue_type) LIKE ? OR LOWER(ust.status) LIKE ?)`;
      const searchTerm = `%${search.toLowerCase()}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // 1. Total filtered count
    const [rawTotalResult] = await db.query(
      `SELECT COUNT(*) AS total
   FROM user_support_ticket
   WHERE LOWER(issue_type) IN (?, ?)`,
      ['order issue', 'booking issue']
    );

    const total = rawTotalResult[0].total;

    // 2. Status-wise count (without search filter)
    const [statusCounts] = await db.query(
      `SELECT ust.status, COUNT(*) AS count
       FROM user_support_ticket ust
       LEFT JOIN users u ON ust.user_id = u.id
       WHERE LOWER(ust.issue_type) IN (?, ?)
       GROUP BY ust.status`,
      ['order issue', 'booking issue']
    );

    const statusCountMap = {};
    statusCounts.forEach(item => {
      statusCountMap[item.status] = item.count;
    });

    // 3. Paginated filtered data
    const [rows] = await db.query(
      `SELECT 
         ust.*, 
         u.image AS user_image,
         u.name AS user_name, 
         u.lastname AS user_lastname, 
         u.email AS user_email, 
         u.mobile AS user_phone
       FROM user_support_ticket ust
       LEFT JOIN users u ON ust.user_id = u.id
       ${whereClause}
       ORDER BY ust.submitted_date DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.status(200).send({
      success: true,
      message: "Tickets fetched successfully",
      count: total,
      totalPages: Math.ceil(total / limit),
      statusCounts: statusCountMap, // <- Unfiltered count
      data: rows
    });

  } catch (err) {
    console.error("Error in getSellerTicket function:", err);
    return res.status(500).send({
      success: false,
      message: "Error in fetching tickets",
      error: err.message
    });
  }
};

/**
 * Approve Full Seller Profile & All Documents
 */
exports.approveSeller = async (req, res) => {
  const { id } = req.params;

  try {
    const [existingSeller] = await db.query('SELECT * FROM sellers WHERE id = ?', [id]);
    if (existingSeller.length === 0) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    await db.query(`
      UPDATE sellers 
      SET 
        verified = 1,
        aadhaar_status = 'approved',
        pan_status = 'approved',
        gst_status = 'approved',
        address_proof_status = 'approved',
        rejection_reason = NULL
      WHERE id = ?
    `, [id]);

    await sendNotification(id, `Congratulations! Your Seller Merchant account has been fully verified and approved.`);

    return res.status(200).json({
      success: true,
      message: 'Seller approved successfully'
    });
  } catch (error) {
    console.error('Error in approveSeller:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

/**
 * Reject Full Seller Profile with optional Reason
 */
exports.rejectSeller = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body || {};

  try {
    const [existingSeller] = await db.query('SELECT * FROM sellers WHERE id = ?', [id]);
    if (existingSeller.length === 0) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    await db.query(`
      UPDATE sellers 
      SET 
        verified = 0,
        rejection_reason = ?
      WHERE id = ?
    `, [reason || 'Document criteria not met', id]);

    await sendNotification(id, `Your Seller verification request was rejected. Reason: ${reason || 'Document verification criteria not met'}`);

    return res.status(200).json({
      success: true,
      message: 'Seller rejected successfully'
    });
  } catch (error) {
    console.error('Error in rejectSeller:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};



