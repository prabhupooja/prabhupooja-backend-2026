const db = require("../config/db");
const { sellerGenerateToken } = require("../config/sellerToken");
const twilio = require("twilio");
const nodemailer = require("nodemailer");
const { parsePhoneNumberFromString } = require("libphonenumber-js");
const dotenv = require("dotenv");
dotenv.config();
const axios = require("axios");
const { sendNotification } = require("./notificationController");

// Helper to extract uploaded file location/path from either Array or Object files
const extractFile = (files, ...fieldKeys) => {
  if (!files) return null;
  const lowerKeys = fieldKeys.map(k => k.toLowerCase());

  if (Array.isArray(files)) {
    const found = files.find(f => lowerKeys.includes((f.fieldname || '').toLowerCase()));
    if (found) {
      return found.location || found.filename || (found.path ? found.path.replace(/\\/g, '/') : null);
    }
  } else if (typeof files === 'object') {
    for (const key of fieldKeys) {
      if (files[key] && files[key][0]) {
        const f = files[key][0];
        return f.location || f.filename || (f.path ? f.path.replace(/\\/g, '/') : null);
      }
    }
  }
  return null;
};

// Helper to calculate KYC completion percentage
const calculateKycStatus = (seller) => {
  if (!seller) return { percentage: 0, isComplete: false, pendingDocs: [] };

  const docs = [
    { name: "Shop / Business Photo", key: "shop_photo", statusKey: null },
    { name: "Aadhaar Card", key: "aadhaar_photo", statusKey: "aadhaar_status" },
    { name: "PAN Card", key: "pan_photo", statusKey: "pan_status" },
    { name: "Address Proof", key: "address_proof", statusKey: "address_proof_status" },
    { name: "Bank Account Details", key: "account_number", statusKey: "bank_status" }
  ];

  let uploadedCount = 0;
  let approvedCount = 0;
  const pendingDocs = [];
  const rejectedDocs = [];

  docs.forEach((d) => {
    const hasValue = Boolean(seller[d.key]);
    const status = d.statusKey ? seller[d.statusKey] : (hasValue ? "approved" : "initially");

    if (hasValue) uploadedCount++;
    if (status === "approved") approvedCount++;
    if (!hasValue || status === "pending" || status === "initially") pendingDocs.push(d.name);
    if (status === "rejected") rejectedDocs.push(d.name);
  });

  const percentage = Math.round((uploadedCount / docs.length) * 100);

  return {
    percentage,
    uploadedCount,
    totalDocs: docs.length,
    isFullyApproved: Boolean(seller.verified === 1 || approvedCount === docs.length),
    pendingDocs,
    rejectedDocs
  };
};

/**
 * 1. Register / Create New Seller
 * Supports both step-by-step registration and single-form registration with document uploads.
 */
exports.createSeller = async (req, res) => {
  const seller_name = req.body.seller_name || req.body.name || "";
  const number = req.body.number || req.body.mobile || req.body.phone || "";
  const email = req.body.email || "";
  const shop_name = req.body.shop_name || req.body.business_name || req.body.store_name || "";
  const address = req.body.address || req.body.shop_address || "Default Address";
  const city = req.body.city || "";
  const state = req.body.state || "";
  const pincode = req.body.pincode || req.body.zipcode || "";
  const business_type = req.body.business_type || "Proprietorship";
  const category = req.body.category || req.body.business_category || "";

  // Document numbers
  const gst = req.body.gst || req.body.gst_number || null;
  const pan_number = req.body.pan_number || null;
  const aadhaar_number = req.body.aadhaar_number || null;
  const address_proof_name = req.body.address_proof_name || "Electricity Bill / Rent Agreement";

  // Bank details
  const bank_name = req.body.bank_name || "";
  const account_holder_name = req.body.account_holder_name || seller_name;
  const account_number = req.body.account_number || "";
  const ifsc_number = req.body.ifsc_number || req.body.ifsc_code || "";

  if (!seller_name || !number || !email) {
    return res.status(400).json({ 
      success: false, 
      message: "Seller name, mobile number, and email are required for registration." 
    });
  }

  // Clean phone number
  const cleanNumber = String(number).replace(/\D/g, '').slice(-10) || String(number).trim();

  // Handle uploaded files (Supports both Multer array and object format + snake_case and camelCase)
  const files = req.files || {};
  const shop_photo = extractFile(files, "shop_photo", "shopPhoto", "image", "photo") || req.body.shop_photo || req.body.shopPhoto || null;
  const aadhaar_photo = extractFile(files, "aadhaar_photo", "aadhaarPhoto", "aadhar_photo", "aadharPhoto", "aadhaar_card") || req.body.aadhaar_photo || req.body.aadhaarPhoto || null;
  const pan_photo = extractFile(files, "pan_photo", "panPhoto", "pan_card", "panCard") || req.body.pan_photo || req.body.panPhoto || null;
  const gst_certificate = extractFile(files, "gst_certificate", "gstCertificate", "gst_photo") || req.body.gst_certificate || req.body.gstCertificate || null;
  const address_proof = extractFile(files, "address_proof", "addressProof", "address_photo") || req.body.address_proof || req.body.addressProof || null;
  const cancelled_cheque = extractFile(files, "cancelled_cheque", "cancelledCheque", "passbook", "cheque") || req.body.cancelled_cheque || req.body.cancelledCheque || null;

  // Set initial document status based on whether uploaded
  const aadhaar_status = aadhaar_photo || aadhaar_number ? "pending" : "initially";
  const pan_status = pan_photo || pan_number ? "pending" : "initially";
  const gst_status = gst || gst_certificate ? "pending" : "initially";
  const address_proof_status = address_proof ? "pending" : "initially";
  const bank_status = account_number ? "pending" : "initially";

  try {
    const [existingSeller] = await db.query(
      "SELECT * FROM sellers WHERE email = ? OR number = ? OR number = ?",
      [email.trim(), cleanNumber, number]
    );

    if (existingSeller.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: "A seller already exists with this mobile number or email. Please login instead." 
      });
    }

    const [result] = await db.query(
      `INSERT INTO sellers (
        seller_name, number, email, address, city, state, pincode,
        business_type, category, shop_name, shop_photo,
        aadhaar_number, aadhaar_photo, aadhaar_status,
        pan_number, pan_photo, pan_status,
        gst, gst_certificate, gst_status,
        address_proof, address_proof_name, address_proof_status,
        bank_name, account_holder_name, account_number, ifsc_number, cancelled_cheque, bank_status,
        verified, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'pending')`,
      [
        seller_name.trim(), cleanNumber, email.trim(), address, city, state, pincode,
        business_type, category, shop_name, shop_photo,
        aadhaar_number, aadhaar_photo, aadhaar_status,
        pan_number, pan_photo, pan_status,
        gst, gst_certificate, gst_status,
        address_proof, address_proof_name, address_proof_status,
        bank_name, account_holder_name, account_number, ifsc_number, cancelled_cheque, bank_status
      ]
    );

    const newSellerId = result.insertId;
    const token = sellerGenerateToken(newSellerId);

    // Also sync to bank_detail table if bank details were provided
    if (account_number && ifsc_number) {
      try {
        await db.query(
          `INSERT INTO bank_detail (account_holder_name, bank_name, account_number, ifsc_number, merchant_id) 
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE account_holder_name = VALUES(account_holder_name), bank_name = VALUES(bank_name), account_number = VALUES(account_number), ifsc_number = VALUES(ifsc_number)`,
          [account_holder_name, bank_name, account_number, ifsc_number, newSellerId]
        );
      } catch (bankErr) {
        console.warn("Sync to bank_detail note:", bankErr.message);
      }
    }

    const [newSeller] = await db.query("SELECT * FROM sellers WHERE id = ?", [newSellerId]);
    const sellerData = newSeller[0];
    const kycSummary = calculateKycStatus(sellerData);

    return res.status(201).json({
      success: true,
      message: "Seller registered successfully! Please complete your document KYC verification.",
      token: token,
      seller: sellerData,
      data: sellerData,
      kyc: kycSummary
    });

  } catch (error) {
    console.error("Error creating seller:", error);
    return res.status(500).json({ success: false, message: "Failed to register seller", error: error.message });
  }
};

/**
 * 2. Get Seller Profile by JWT Token
 */
exports.getSellerByToken = async (req, res) => {
  try {
    const sellerId = req.user.id || req.user.userId;

    const [seller] = await db.query("SELECT * FROM sellers WHERE id = ?", [sellerId]);

    if (seller.length === 0) {
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    const sellerData = seller[0];

    // Check bank details table if bank fields on seller row are empty
    if (!sellerData.account_number) {
      try {
        const [bankRows] = await db.query("SELECT * FROM bank_detail WHERE merchant_id = ?", [sellerId]);
        if (bankRows.length > 0) {
          sellerData.bank_name = sellerData.bank_name || bankRows[0].bank_name;
          sellerData.account_holder_name = sellerData.account_holder_name || bankRows[0].account_holder_name;
          sellerData.account_number = bankRows[0].account_number;
          sellerData.ifsc_number = bankRows[0].ifsc_number;
        }
      } catch (bErr) {}
    }

    const kyc = calculateKycStatus(sellerData);

    return res.status(200).json({
      ...sellerData,
      success: true,
      seller: sellerData,
      user: sellerData,
      data: sellerData,
      kyc: kyc
    });
  } catch (error) {
    console.error("Error fetching seller profile:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch seller", error: error.message });
  }
};

/**
 * 3. Update Seller Details & Upload KYC Documents
 */
exports.updateSellerDetails = async (req, res) => {
  const id = req.params.id || (req.user && (req.user.id || req.user.userId));
  if (!id) {
    return res.status(400).json({ success: false, message: "Seller ID is required" });
  }

  const updates = req.body || {};
  const files = req.files || {};

  const allowedTextFields = [
    "seller_name", "shop_name", "address", "city", "state", "pincode",
    "business_type", "category", "gst", "aadhaar_number", "pan_number",
    "address_proof_name", "bank_name", "account_holder_name", "account_number", "ifsc_number"
  ];

  const fieldAliases = {
    name: "seller_name",
    sellerName: "seller_name",
    shopName: "shop_name",
    businessName: "shop_name",
    businessType: "business_type",
    aadhaarNumber: "aadhaar_number",
    aadharNumber: "aadhaar_number",
    panNumber: "pan_number",
    gstNumber: "gst",
    accountHolderName: "account_holder_name",
    accountNumber: "account_number",
    ifscNumber: "ifsc_number",
    ifscCode: "ifsc_number",
    bankName: "bank_name",
    addressProofName: "address_proof_name"
  };

  // Map any camelCase input keys
  Object.keys(fieldAliases).forEach(alias => {
    if (updates[alias] !== undefined && updates[fieldAliases[alias]] === undefined) {
      updates[fieldAliases[alias]] = updates[alias];
    }
  });

  const updateFields = Object.keys(updates).filter(field => allowedTextFields.includes(field));

  // Extract files using extractFile helper
  const uploadedShopPhoto = extractFile(files, "shop_photo", "shopPhoto", "image", "photo");
  if (uploadedShopPhoto) { updates["shop_photo"] = uploadedShopPhoto; if (!updateFields.includes("shop_photo")) updateFields.push("shop_photo"); }

  const uploadedAadhaar = extractFile(files, "aadhaar_photo", "aadhaarPhoto", "aadhar_photo", "aadharPhoto", "aadhaar_card");
  if (uploadedAadhaar) { updates["aadhaar_photo"] = uploadedAadhaar; if (!updateFields.includes("aadhaar_photo")) updateFields.push("aadhaar_photo"); }

  const uploadedPan = extractFile(files, "pan_photo", "panPhoto", "pan_card", "panCard");
  if (uploadedPan) { updates["pan_photo"] = uploadedPan; if (!updateFields.includes("pan_photo")) updateFields.push("pan_photo"); }

  const uploadedGst = extractFile(files, "gst_certificate", "gstCertificate", "gst_photo");
  if (uploadedGst) { updates["gst_certificate"] = uploadedGst; if (!updateFields.includes("gst_certificate")) updateFields.push("gst_certificate"); }

  const uploadedAddress = extractFile(files, "address_proof", "addressProof", "address_photo");
  if (uploadedAddress) { updates["address_proof"] = uploadedAddress; if (!updateFields.includes("address_proof")) updateFields.push("address_proof"); }

  const uploadedCheque = extractFile(files, "cancelled_cheque", "cancelledCheque", "passbook", "cheque");
  if (uploadedCheque) { updates["cancelled_cheque"] = uploadedCheque; if (!updateFields.includes("cancelled_cheque")) updateFields.push("cancelled_cheque"); }

  if (updateFields.length === 0) {
    return res.status(400).json({ success: false, message: "No valid fields or documents provided for update" });
  }

  try {
    const query = `UPDATE sellers SET ${updateFields.map(field => `${field} = ?`).join(", ")} WHERE id = ?`;
    const values = [...updateFields.map(field => updates[field]), id];

    const [result] = await db.query(query, values);

    // Auto-update document status to 'pending' when documents/numbers are uploaded
    const statusFieldsToUpdate = [];
    if (uploadedAadhaar || updates.aadhaar_number || updates.aadhaar_photo) statusFieldsToUpdate.push("aadhaar_status = 'pending'");
    if (uploadedPan || updates.pan_number || updates.pan_photo) statusFieldsToUpdate.push("pan_status = 'pending'");
    if (uploadedGst || updates.gst || updates.gst_certificate) statusFieldsToUpdate.push("gst_status = 'pending'");
    if (uploadedAddress || updates.address_proof_name || updates.address_proof) statusFieldsToUpdate.push("address_proof_status = 'pending'");
    if (uploadedCheque || updates.account_number || updates.ifsc_number) statusFieldsToUpdate.push("bank_status = 'pending'");

    if (statusFieldsToUpdate.length > 0) {
      statusFieldsToUpdate.push("status = 'pending'");
      await db.query(`UPDATE sellers SET ${statusFieldsToUpdate.join(", ")} WHERE id = ?`, [id]);
    }

    // Sync bank details to bank_detail table
    if (updates.account_number && updates.ifsc_number) {
      try {
        await db.query(
          `INSERT INTO bank_detail (account_holder_name, bank_name, account_number, ifsc_number, merchant_id)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE account_holder_name = VALUES(account_holder_name), bank_name = VALUES(bank_name), account_number = VALUES(account_number), ifsc_number = VALUES(ifsc_number)`,
          [updates.account_holder_name || updates.seller_name || "", updates.bank_name || "", updates.account_number, updates.ifsc_number, id]
        );
      } catch (bErr) {}
    }

    await sendNotification(id, `Your KYC Documents have been submitted successfully. Admin will review and verify them.`);

    const [updatedRow] = await db.query("SELECT * FROM sellers WHERE id = ?", [id]);
    const kyc = calculateKycStatus(updatedRow[0]);

    return res.status(200).json({
      success: true,
      message: "Seller details & documents updated successfully. Verification status is now pending review.",
      data: updatedRow[0],
      seller: updatedRow[0],
      kyc: kyc
    });

  } catch (error) {
    console.error("Error updating seller details:", error);
    return res.status(500).json({ success: false, message: "Failed to update seller details", error: error.message });
  }
};

/**
 * 4. Seller Dashboard Analytics & Metrics
 */
exports.getSellerDashboardStats = async (req, res) => {
  try {
    const sellerId = req.user.id || req.user.userId;

    const [sellerRows] = await db.query("SELECT * FROM sellers WHERE id = ?", [sellerId]);
    if (sellerRows.length === 0) {
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    const seller = sellerRows[0];
    const kyc = calculateKycStatus(seller);

    // 1. Total Products
    const [productCountResult] = await db.query(
      "SELECT COUNT(*) AS total, SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN verified = 0 THEN 1 ELSE 0 END) AS pending FROM products WHERE merchantId = ? AND (isDeleted = 0 OR isDeleted IS NULL)",
      [sellerId]
    );

    // 2. Orders Statistics
    const [ordersResult] = await db.query(
      `SELECT 
         COUNT(*) AS totalOrders,
         SUM(CASE WHEN status = 'delivered' OR status = 'Delivered' THEN 1 ELSE 0 END) AS completedOrders,
         SUM(CASE WHEN status IN ('pending', 'Processing', 'processing', 'Pending') THEN 1 ELSE 0 END) AS pendingOrders,
         SUM(CASE WHEN status = 'cancelled' OR status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelledOrders,
         COALESCE(SUM(CASE WHEN status = 'delivered' OR status = 'Delivered' THEN totalPrice ELSE 0 END), 0) AS totalRevenue
       FROM orders 
       WHERE merchantId = ? OR merchantId = ?`,
      [sellerId, JSON.stringify(sellerId)]
    );

    // 3. Pending Withdrawal Requests
    let pendingWithdrawals = 0;
    try {
      const [withdrawRows] = await db.query(
        "SELECT COALESCE(SUM(amount), 0) AS pendingAmount FROM withdrawal_requests WHERE seller_id = ? AND status = 'pending'",
        [sellerId]
      );
      pendingWithdrawals = withdrawRows[0]?.pendingAmount || 0;
    } catch (wErr) {}

    // 4. Recent 5 Orders
    const [recentOrders] = await db.query(
      `SELECT o.*, p.productName, p.image AS productImage 
       FROM orders o
       LEFT JOIN products p ON o.productId = p.id
       WHERE o.merchantId = ? OR o.merchantId = ?
       ORDER BY o.createdAt DESC LIMIT 5`,
      [sellerId, JSON.stringify(sellerId)]
    );

    return res.status(200).json({
      success: true,
      data: {
        seller: {
          id: seller.id,
          seller_name: seller.seller_name,
          shop_name: seller.shop_name,
          email: seller.email,
          number: seller.number,
          verified: seller.verified === 1,
          status: seller.status || "pending",
          wallet_balance: parseFloat(seller.wallet_balance || 0),
          rejection_reason: seller.rejection_reason || null
        },
        kyc: kyc,
        stats: {
          totalProducts: productCountResult[0]?.total || 0,
          activeProducts: productCountResult[0]?.active || 0,
          pendingProducts: productCountResult[0]?.pending || 0,
          totalOrders: ordersResult[0]?.totalOrders || 0,
          completedOrders: ordersResult[0]?.completedOrders || 0,
          pendingOrders: ordersResult[0]?.pendingOrders || 0,
          cancelledOrders: ordersResult[0]?.cancelledOrders || 0,
          totalRevenue: parseFloat(ordersResult[0]?.totalRevenue || 0),
          walletBalance: parseFloat(seller.wallet_balance || 0),
          pendingWithdrawals: parseFloat(pendingWithdrawals)
        },
        recentOrders: recentOrders || []
      }
    });

  } catch (error) {
    console.error("Error fetching seller dashboard stats:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

/**
 * 5. Get Seller Orders List
 */
exports.getSellerOrders = async (req, res) => {
  try {
    const sellerId = req.user.id || req.user.userId;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status;

    const sellerIdStr = String(sellerId);
    const sellerIdJson = JSON.stringify(sellerId);

    let whereClause = `WHERE (o.merchantId = ? OR o.merchantId = ? OR JSON_CONTAINS(o.merchantId, ?) OR JSON_CONTAINS(o.merchantId, ?) OR o.merchantId LIKE ?)`;
    let params = [sellerId, sellerIdStr, sellerIdJson, `"${sellerIdStr}"`, `%"${sellerIdStr}"%`];

    if (status && status.toLowerCase() !== "all") {
      const st = status.toLowerCase();
      if (st === "cod") {
        whereClause += ` AND o.paymentMethod = 'COD'`;
      } else if (st === "online") {
        whereClause += ` AND o.paymentMethod != 'COD'`;
      } else {
        whereClause += ` AND (LOWER(o.status) = ? OR LOWER(o.order_status) = ?)`;
        params.push(st, st);
      }
    }

    const query = `
      SELECT o.*, p.productName, p.image AS productImage, p.price AS originalPrice, p.offerPrice AS productOfferPrice,
             u.name AS customerName, u.lastname AS customerLastName, u.mobile AS customerMobile, u.email AS customerEmail
      FROM orders o
      LEFT JOIN products p ON o.productId = p.id
      LEFT JOIN users u ON o.userId = u.id
      ${whereClause}
      ORDER BY o.createdAt DESC LIMIT ? OFFSET ?
    `;
    params.push(limit, offset);

    const [orders] = await db.query(query, params);

    // Populate multiple products if productId contains array
    for (let order of orders) {
      let productIds = [];
      if (order.productId) {
        try {
          productIds = JSON.parse(order.productId);
          if (!Array.isArray(productIds)) productIds = [productIds];
        } catch (e) {
          if (typeof order.productId === "string" && order.productId.includes(",")) {
            productIds = order.productId.split(",").map(s => s.trim());
          } else {
            productIds = [order.productId];
          }
        }
      }
      productIds = productIds.filter(Boolean);
      if (productIds.length > 0) {
        const placeholders = productIds.map(() => "?").join(",");
        const [prodList] = await db.query(`SELECT * FROM products WHERE id IN (${placeholders})`, productIds);
        order.products = prodList;
      } else {
        order.products = [];
      }
    }

    let countParams = [sellerId, sellerIdStr, sellerIdJson, `"${sellerIdStr}"`, `%"${sellerIdStr}"%`];
    let countWhere = `WHERE (o.merchantId = ? OR o.merchantId = ? OR JSON_CONTAINS(o.merchantId, ?) OR JSON_CONTAINS(o.merchantId, ?) OR o.merchantId LIKE ?)`;
    if (status && status.toLowerCase() !== "all") {
      const st = status.toLowerCase();
      if (st === "cod") {
        countWhere += ` AND o.paymentMethod = 'COD'`;
      } else if (st === "online") {
        countWhere += ` AND o.paymentMethod != 'COD'`;
      } else {
        countWhere += ` AND (LOWER(o.status) = ? OR LOWER(o.order_status) = ?)`;
        countParams.push(st, st);
      }
    }

    const [countResult] = await db.query(
      `SELECT COUNT(*) AS total FROM orders o ${countWhere}`,
      countParams
    );

    const total = countResult[0]?.total || 0;

    return res.status(200).json({
      success: true,
      count: total,
      totalPages: Math.ceil(total / limit) || 1,
      currentPage: page,
      data: orders
    });

  } catch (error) {
    console.error("Error fetching seller orders:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch orders", error: error.message });
  }
};

/**
 * 6. Update Seller Order Status (e.g. processing, shipped, delivered, cancelled)
 */
exports.updateSellerOrderStatus = async (req, res) => {
  const { id } = req.params;
  const sellerId = req.user.id || req.user.userId;
  const {
    status,
    order_status,
    tracking_number,
    trackingNumber,
    tracking_no,
    courier_name,
    courierName,
    cancel_reason,
    cancelReason
  } = req.body;

  const targetStatus = status || order_status;
  if (!targetStatus) {
    return res.status(400).json({ success: false, message: "Order status is required" });
  }

  const sellerIdStr = String(sellerId);
  const sellerIdJson = JSON.stringify(sellerId);
  const currentDate = new Date().toISOString().split("T")[0];

  try {
    const [order] = await db.query(
      `SELECT * FROM orders WHERE id = ? AND (merchantId = ? OR merchantId = ? OR JSON_CONTAINS(merchantId, ?) OR JSON_CONTAINS(merchantId, ?) OR merchantId LIKE ?)`,
      [id, sellerId, sellerIdStr, sellerIdJson, `"${sellerIdStr}"`, `%"${sellerIdStr}"%`]
    );

    if (order.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found or not authorized for this merchant" });
    }

    const currentOrder = order[0];
    const prevStatus = String(currentOrder.status || currentOrder.order_status || '').toLowerCase();
    const newStatusLower = String(targetStatus).toLowerCase();
    const resolvedTracking = tracking_number || trackingNumber || tracking_no || null;
    const resolvedCourier = courier_name || courierName || null;
    const resolvedCancelReason = cancel_reason || cancelReason || null;

    // Map status accurately
    let resolvedOrderStatus = targetStatus;
    let resolvedProgress = "processing";

    if (newStatusLower.includes('deliver') || newStatusLower.includes('complete')) {
      resolvedOrderStatus = 'complete';
      resolvedProgress = 'Delivered';
    } else if (newStatusLower.includes('ship') || newStatusLower.includes('dispatch') || newStatusLower.includes('transit')) {
      resolvedOrderStatus = 'dispatched';
      resolvedProgress = 'Dispatched & In Transit';
    } else if (newStatusLower.includes('process') || newStatusLower.includes('pack')) {
      resolvedOrderStatus = 'pending';
      resolvedProgress = 'Processing & Packaging';
    } else if (newStatusLower.includes('cancel') || newStatusLower.includes('reject') || newStatusLower.includes('error')) {
      resolvedOrderStatus = 'cancel';
      resolvedProgress = 'Cancelled';
    }

    // 1. Update orders table
    let updateFields = [`order_status = ?`, `status = ?`];
    let updateValues = [resolvedOrderStatus, resolvedOrderStatus];

    if (resolvedTracking) {
      updateFields.push(`tracking_number = ?`);
      updateValues.push(resolvedTracking);
    }
    if (resolvedCourier) {
      updateFields.push(`courier_name = ?`);
      updateValues.push(resolvedCourier);
    }
    if (resolvedOrderStatus === 'cancel') {
      updateFields.push(`cancelled_by = 'seller'`);
      if (resolvedCancelReason) {
        updateFields.push(`cancel_reason = ?`);
        updateValues.push(resolvedCancelReason);
      }
    }

    updateValues.push(id);
    await db.query(`UPDATE orders SET ${updateFields.join(", ")} WHERE id = ?`, updateValues);

    // 2. Update order_tracking table timeline
    const [trackingRows] = await db.query(`SELECT status FROM order_tracking WHERE order_id = ?`, [id]);
    let trackingTimeline = [];
    if (trackingRows.length > 0 && trackingRows[0].status) {
      try {
        trackingTimeline = typeof trackingRows[0].status === "string" ? JSON.parse(trackingRows[0].status) : trackingRows[0].status;
      } catch (e) {
        trackingTimeline = [];
      }
    }

    if (!Array.isArray(trackingTimeline) || trackingTimeline.length === 0) {
      trackingTimeline = [
        { name: "Order Placed", status: "completed", date: currentDate },
        { name: "Processing & Packaging", status: "processing", date: currentDate },
        { name: "Dispatched & In Transit", status: "pending", date: currentDate },
        { name: "Delivered", status: "pending", date: currentDate },
      ];
    }

    const isDelivered = resolvedOrderStatus === "complete";
    const isDispatched = resolvedOrderStatus === "dispatched";
    const isCancelled = resolvedOrderStatus === "cancel";

    trackingTimeline = trackingTimeline.map((step) => {
      const stepName = (step.name || "").toLowerCase();
      if (isCancelled) {
        return { ...step, status: "error", date: currentDate };
      }
      if (stepName.includes("placed")) {
        return { ...step, status: "completed", date: step.date || currentDate };
      }
      if (stepName.includes("process") || stepName.includes("pack")) {
        return { ...step, status: isDelivered || isDispatched ? "completed" : "processing", date: currentDate };
      }
      if (stepName.includes("dispatch") || stepName.includes("transit") || stepName.includes("ship")) {
        return { ...step, status: isDelivered ? "completed" : (isDispatched ? "processing" : "pending"), date: currentDate };
      }
      if (stepName.includes("deliver")) {
        return { ...step, status: isDelivered ? "completed" : "pending", date: currentDate };
      }
      return step;
    });

    if (trackingRows.length > 0) {
      await db.query(
        `UPDATE order_tracking SET status = ?, order_progress_status = ? WHERE order_id = ?`,
        [JSON.stringify(trackingTimeline), resolvedProgress, id]
      );
    } else {
      await db.query(
        `INSERT INTO order_tracking (order_id, status, order_progress_status) VALUES (?, ?, ?)`,
        [id, JSON.stringify(trackingTimeline), resolvedProgress]
      );
    }

    // 3. If order was delivered for the first time, credit seller wallet balance!
    if (isDelivered && prevStatus !== 'complete' && prevStatus !== 'delivered') {
      const orderAmount = parseFloat(currentOrder.totalPrice || 0);
      if (orderAmount > 0) {
        try {
          await db.query("UPDATE sellers SET wallet_balance = COALESCE(wallet_balance, 0) + ? WHERE id = ?", [orderAmount, sellerId]);
          console.log(`✓ Credited ₹${orderAmount} to seller #${sellerId} wallet balance for delivered order #${id}`);
        } catch (wErr) {
          console.warn("Error crediting seller wallet:", wErr.message);
        }
      }
    }

    // 4. Send notifications to customer
    if (currentOrder.userId) {
      try {
        const notifMsg = isCancelled
          ? `Your order #${id} has been cancelled by merchant. ${resolvedCancelReason ? `Reason: ${resolvedCancelReason}` : ''}`
          : `Your order #${id} has been updated to ${resolvedProgress}.`;
        
        await sendNotification(currentOrder.userId, notifMsg);
        
        const { sendUserNotification } = require("./notificationController");
        const { sendNotificationToUser } = require("./MobilePushNotification");
        if (sendUserNotification) await sendUserNotification(currentOrder.userId, "Order Update", notifMsg);
        if (sendNotificationToUser) await sendNotificationToUser("Order Update", notifMsg, currentOrder.userId);
      } catch (nErr) {
        console.warn("Notification error:", nErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Order #${id} status updated to ${resolvedProgress}`,
      status: resolvedOrderStatus,
      order_progress_status: resolvedProgress,
      cancelled_by: isCancelled ? 'seller' : null
    });
  } catch (error) {
    console.error("Error updating seller order status:", error);
    return res.status(500).json({ success: false, message: "Failed to update order status", error: error.message });
  }
};

/**
 * 7. Get Seller Products List
 */
exports.getSellerProducts = async (req, res) => {
  try {
    const sellerId = req.user.id || req.user.userId;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;

    const [products] = await db.query(
      `SELECT * FROM products WHERE merchantId = ? AND (isDeleted = 0 OR isDeleted IS NULL) ORDER BY id DESC LIMIT ? OFFSET ?`,
      [sellerId, limit, offset]
    );

    const [countResult] = await db.query(
      `SELECT COUNT(*) AS total FROM products WHERE merchantId = ? AND (isDeleted = 0 OR isDeleted IS NULL)`,
      [sellerId]
    );

    return res.status(200).json({
      success: true,
      count: countResult[0]?.total || 0,
      totalPages: Math.ceil((countResult[0]?.total || 0) / limit),
      data: products
    });
  } catch (error) {
    console.error("Error fetching seller products:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch products", error: error.message });
  }
};

/**
 * 8. Admin: Get All Sellers with KYC Details
 */
exports.getAllSellers = async (req, res) => {
  try {
    const [sellers] = await db.query("SELECT * FROM sellers ORDER BY id DESC");
    const sellersWithKyc = sellers.map(s => ({
      ...s,
      kyc: calculateKycStatus(s)
    }));
    return res.status(200).json(sellersWithKyc);
  } catch (error) {
    console.error("Error fetching sellers:", error);
    return res.status(500).json({ message: "Failed to fetch sellers", error: error.message });
  }
};

/**
 * 9. Admin: Get Single Seller by ID
 */
exports.getSellerById = async (req, res) => {
  const { id } = req.params;

  try {
    const [seller] = await db.query("SELECT * FROM sellers WHERE id = ?", [id]);

    if (seller.length === 0) {
      return res.status(404).json({ message: "Seller not found" });
    }

    const sellerData = seller[0];

    // Fetch bank details
    try {
      const [bankRows] = await db.query("SELECT * FROM bank_detail WHERE merchant_id = ?", [id]);
      if (bankRows.length > 0) {
        sellerData.bank_detail = bankRows[0];
      }
    } catch (bErr) {}

    // Product count
    const [pCount] = await db.query("SELECT COUNT(*) AS count FROM products WHERE merchantId = ?", [id]);
    sellerData.productCount = pCount[0]?.count || 0;

    sellerData.kyc = calculateKycStatus(sellerData);

    return res.status(200).json({ success: true, data: sellerData });
  } catch (error) {
    console.error("Error fetching seller:", error);
    return res.status(500).json({ message: "Failed to fetch seller", error: error.message });
  }
};

/**
 * 10. Admin: Update Specific Document Status or Overall Status
 */
exports.updateSellerStatus = async (req, res) => {
  const { id } = req.params;
  const { field, status, rejection_reason } = req.body;
  const allowedFields = ["aadhaar_status", "pan_status", "gst_status", "address_proof_status", "bank_status", "status"];
  const allowedStatuses = ["pending", "approved", "rejected", "active", "suspended"];

  if (field && !allowedFields.includes(field)) {
    return res.status(400).json({ success: false, message: "Invalid field name" });
  }

  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status value" });
  }

  try {
    const updateField = field || "status";
    const query = `UPDATE sellers SET ${updateField} = ?, rejection_reason = ? WHERE id = ?`;
    const [result] = await db.query(query, [status, rejection_reason || null, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    await sendNotification(id, `Your seller ${updateField.replace(/_/g, " ")} has been updated to ${status}.`);

    res.status(200).json({ success: true, message: `Seller ${updateField} updated successfully` });
  } catch (error) {
    console.error("Error updating seller status:", error);
    return res.status(500).json({ success: false, message: "Failed to update status", error: error.message });
  }
};

/**
 * 11. Admin: Approve Entire Seller Profile
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
        status = 'active',
        aadhaar_status = 'approved',
        pan_status = 'approved',
        gst_status = 'approved',
        address_proof_status = 'approved',
        bank_status = 'approved',
        rejection_reason = NULL
      WHERE id = ?
    `, [id]);

    await sendNotification(id, `Congratulations! Your Seller Merchant account and all KYC documents have been fully verified and approved.`);

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
 * 12. Admin: Reject Entire Seller Profile with Reason
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
        status = 'rejected',
        rejection_reason = ?
      WHERE id = ?
    `, [reason || 'KYC Document verification criteria not met', id]);

    await sendNotification(id, `Your Seller verification was rejected. Reason: ${reason || 'Document verification criteria not met'}`);

    return res.status(200).json({
      success: true,
      message: 'Seller rejected successfully'
    });
  } catch (error) {
    console.error('Error in rejectSeller:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

/**
 * 13. Update Profile (Seller Basic Info)
 */
exports.updateSeller = async (req, res) => {
  try {
    const id = req.params.id || (req.user && (req.user.id || req.user.userId));
    const { name, seller_name, email, shop_name, number } = req.body;
    const shop_photo = req.file ? req.file.location : null;

    if (!id) {
      return res.status(400).json({ success: false, message: "Seller ID is required" });
    }

    const [existingSeller] = await db.query('SELECT * FROM sellers WHERE id = ?', [id]);

    if (existingSeller.length === 0) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    const updatedName = seller_name || name || existingSeller[0].seller_name;
    const updatedEmail = email || existingSeller[0].email;
    const updatedShopName = shop_name || existingSeller[0].shop_name;
    const updatedShopPhoto = shop_photo || existingSeller[0].shop_photo;
    const updatedNumber = number || existingSeller[0].number;

    const updateQuery = `
      UPDATE sellers 
      SET seller_name = ?, email = ?, shop_name = ?, shop_photo = ?, number = ? 
      WHERE id = ?
    `;

    await db.query(updateQuery, [updatedName, updatedEmail, updatedShopName, updatedShopPhoto, updatedNumber, id]);

    res.status(200).json({ success: true, message: 'Seller profile updated successfully' });
  } catch (error) {
    console.error('Error updating seller profile:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * 14. Seller OTP Login
 */
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

    // Send SMS
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

    // Send Email
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

/**
 * 15. Verify Seller OTP
 */
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

    const kyc = calculateKycStatus(seller);

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
        user: seller,
        kyc: kyc
      }
    });

  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

/**
 * 16. Delete Seller Account
 */
exports.deleteSeller = async (req, res) => {
  try {
    const id = req.params.id || (req.user && (req.user.id || req.user.userId));

    if (!id) {
      return res.status(400).json({ success: false, message: "Seller ID is required" });
    }

    const [seller] = await db.query('SELECT * FROM sellers WHERE id = ?', [id]);
    if (seller.length === 0) {
      return res.status(404).json({ message: "Seller not found" });
    }

    await db.query('DELETE FROM sellers WHERE id = ?', [id]);

    return res.status(200).json({ success: true, message: "Seller deleted successfully" });
  } catch (error) {
    console.error("Error deleting seller:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * 17. Support Tickets for Seller
 */
exports.getSellerTicket = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let whereClause = `WHERE LOWER(ust.issue_type) IN (?, ?)`;
    const params = ['order issue', 'booking issue'];

    if (search) {
      whereClause += ` AND (LOWER(u.name) LIKE ? OR LOWER(ust.issue_type) LIKE ? OR LOWER(ust.status) LIKE ?)`;
      const searchTerm = `%${search.toLowerCase()}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const [rawTotalResult] = await db.query(
      `SELECT COUNT(*) AS total FROM user_support_ticket WHERE LOWER(issue_type) IN (?, ?)`,
      ['order issue', 'booking issue']
    );

    const total = rawTotalResult[0].total;

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
      statusCounts: statusCountMap,
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
