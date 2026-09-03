const db = require('../config/db'); 

exports.createCoupon = async (req, res) => {
  let { code, discount_type, discount_value, expiry_date, sellerId } = req.body;

  sellerId = sellerId || (req.user && req.user.id);

  if (!code || !discount_type || !discount_value || !sellerId) {
    return res.status(400).json({ success: false, message: 'All required fields must be provided.' });
  }

  try {
    const [result] = await db.query(`
      INSERT INTO productCoupons 
      (code, discount_type, discount_value, expiry_date, sellerId) 
      VALUES (?, ?, ?, ?, ?)
    `, [code, discount_type, discount_value, expiry_date, sellerId]);

    return res.status(201).json({
      message: 'Coupon created successfully.',
      couponId: result.insertId,
      success: true
    });

  } catch (err) {
    console.error("Database error in createCoupon:", err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Coupon code already exists.' });
    }
    return res.status(500).json({ success: false, message: 'Database error', error: err.message });
  }
};

exports.getSellersCoupon = async (req, res) => {
  const sellerId = req.params.sellerId || (req.user && req.user.id);

  if (!sellerId) {
    return res.status(400).json({ success: false, message: "sellerId is required." });
  }

  try {
    const [rows] = await db.query(
      `SELECT * FROM productCoupons WHERE sellerId = ? ORDER BY created_at DESC`,
      [sellerId]
    );

    return res.status(200).json({
      success: true,
      message: "Coupons fetched successfully.",
      coupons: rows,
    });
  } catch (err) {
    console.error("Database error in getSellersCoupon:", err);
    return res.status(500).json({ success: false, message: "Database error", error: err.message });
  }
};

exports.getValidateCoupon = async (req, res) => {
  let { code } = req.params;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!code || !code.trim()) {
    return res.status(400).json({ message: "Coupon code is required", success: false });
  }

  code = code.trim();

  try {
    const [rows] = await db.query(
      "SELECT * FROM productCoupons WHERE BINARY code = ?",
      [code]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Invalid coupon code", success: false });
    }

    const coupon = rows[0];
    const expiry = new Date(coupon.expiry_date);
    expiry.setHours(0, 0, 0, 0);

    if (expiry < today) {
      return res.status(400).json({ message: "Coupon expired", success: false });
    }

    return res.status(200).json({
      type: coupon.discount_type,
      value: coupon.discount_value,
      message: "Coupon valid",
      success: true
    });

  } catch (error) {
    console.error("Error validating coupon:", error);
    return res.status(500).json({ success: false, message: "Something went wrong", error: error.message });
  }
};

exports.updateCoupon = async (req, res) => {
  const { id } = req.params;
  const fields = req.body;

  if (!id) {
    return res.status(400).json({ message: 'Coupon ID is required.' });
  }

  // Filter out only the fields that are allowed to be updated
  const allowedFields = ['code', 'discount_type', 'discount_value', 'expiry_date'];
  const keysToUpdate = Object.keys(fields).filter(key => allowedFields.includes(key));

  if (keysToUpdate.length === 0) {
    return res.status(400).json({ message: 'No valid fields provided for update.' });
  }

  // Create SET clause dynamically
  const setClause = keysToUpdate.map(field => `${field} = ?`).join(', ');
  const values = keysToUpdate.map(field => fields[field]);
  values.push(id); // add id at the end for the WHERE clause

  try {
    const [result] = await db.query(
      `UPDATE productCoupons SET ${setClause} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Coupon not found.' });
    }

    console.log(`Coupon with ID ${id} updated successfully.`);
    return res.status(200).json({
      message: 'Coupon updated successfully.',
      success: true
    });

  } catch (err) {
    console.error("Database error:", err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Coupon code already exists.' });
    }
    return res.status(500).json({ message: 'Database error', error: err });
  }
};

exports.deleteCoupon = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: 'Coupon ID is required.' });
  }

  try {
    const [result] = await db.query(
      `DELETE FROM productCoupons WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Coupon not found.' });
    }

    console.log(`Coupon with ID ${id} deleted successfully.`);
    return res.status(200).json({
      message: 'Coupon deleted successfully.',
      success: true
    });

  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ message: 'Database error', error: err });
  }
};







  
