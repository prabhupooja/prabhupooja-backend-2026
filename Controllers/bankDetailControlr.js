const db = require("../config/db");
const crypto = require("crypto");
const { sendNotification } = require("../Controllers/notificationController");

exports.create = async (req, res) => {
  try {
    let {
      account_holder_name,
      bank_name,
      account_number,
      ifsc_number,
      merchant_id,
    } = req.body;

    merchant_id = merchant_id || (req.user && req.user.id);

    if (
      !account_holder_name ||
      !bank_name ||
      !account_number ||
      !ifsc_number ||
      !merchant_id
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Check if merchant_id already exists
    const [existingMerchant] = await db.query(
      "SELECT * FROM bank_detail WHERE merchant_id = ?",
      [merchant_id]
    );

    if (existingMerchant.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Merchant ID already exists",
      });
    }

    // Insert new bank details
    await db.query(
      "INSERT INTO bank_detail (account_holder_name, bank_name, account_number, ifsc_number, merchant_id) VALUES (?, ?, ?, ?, ?)",
      [account_holder_name, bank_name, account_number, ifsc_number, merchant_id]
    );

    return res.status(201).json({
      success: true,
      message: "Bank details added successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.getBankDetailsByMerchantId = async (req, res) => {
  try {
    const merchant_id = req.params.merchant_id || (req.user && req.user.id);

    if (!merchant_id) {
      return res.status(400).json({
        success: false,
        message: "Merchant ID is required",
      });
    }

    // Fetch bank details by merchant_id
    const [bankDetails] = await db.query(
      "SELECT * FROM bank_detail WHERE merchant_id = ?",
      [merchant_id]
    );

    if (bankDetails.length === 0) {
      return res.status(200).json({
        success: false,
        message: "No bank details found for this Merchant ID",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      data: bankDetails[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.updateBankDetailsByMerchantId = async (req, res) => {
  try {
    const merchant_id = req.params.merchant_id || (req.user && req.user.id);
    const { account_holder_name, bank_name, account_number, ifsc_number } =
      req.body;

    if (!merchant_id) {
      return res.status(400).json({
        success: false,
        message: "Merchant ID is required",
      });
    }

    // Check if bank details exist
    const [existingBankDetails] = await db.query(
      "SELECT * FROM bank_detail WHERE merchant_id = ?",
      [merchant_id]
    );

    if (existingBankDetails.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No bank details found for this Merchant ID",
      });
    }

    // Build update query dynamically based on provided fields
    const updateFields = [];
    const values = [];

    if (account_holder_name) {
      updateFields.push("account_holder_name = ?");
      values.push(account_holder_name);
    }
    if (bank_name) {
      updateFields.push("bank_name = ?");
      values.push(bank_name);
    }
    if (account_number) {
      updateFields.push("account_number = ?");
      values.push(account_number);
    }
    if (ifsc_number) {
      updateFields.push("ifsc_number = ?");
      values.push(ifsc_number);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update",
      });
    }

    updateFields.push("isVerify = 0");
    values.push(merchant_id);

    const updateQuery = `UPDATE bank_detail SET ${updateFields.join(", ")} WHERE merchant_id = ?`;

    await db.query(updateQuery, values);

    return res.status(200).json({
      success: true,
      message: "Bank details updated successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.deleteBankDetailsByMerchantId = async (req, res) => {
  try {
    const merchant_id = req.params.merchant_id || (req.user && req.user.id);

    if (!merchant_id) {
      return res.status(400).json({
        success: false,
        message: "Merchant ID is required",
      });
    }

    // Check if bank details exist
    const [existingBankDetails] = await db.query(
      "SELECT * FROM bank_detail WHERE merchant_id = ?",
      [merchant_id]
    );

    if (existingBankDetails.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No bank details found for this Merchant ID",
      });
    }

    // Delete bank details
    await db.query("DELETE FROM bank_detail WHERE merchant_id = ?", [
      merchant_id,
    ]);

    return res.status(200).json({
      success: true,
      message: "Bank details deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.requestWithdrawal = async (req, res) => {
  try {
    let { seller_id, amount } = req.body;
    seller_id = seller_id || (req.user && req.user.id);

    if (!seller_id || !amount) {
      return res
        .status(400)
        .json({ message: "Seller ID and amount are required", success: false });
    }

    if (amount <= 0) {
      return res
        .status(400)
        .json({ message: "Invalid amount value", success: false });
    }
    const bankQuery = "SELECT * FROM bank_detail WHERE merchant_id = ?";
    const [bankResult] = await db.query(bankQuery, [seller_id]);

    if (bankResult.length === 0) {
      return res
        .status(400)
        .json({
          message: "No bank details found for this seller",
          success: false,
        });
    }

    const balanceQuery = "SELECT wallet_balance FROM sellers WHERE id = ?";
    const [balanceResult] = await db.query(balanceQuery, [seller_id]);

    if (balanceResult.length === 0) {
      return res
        .status(400)
        .json({ message: "Seller not found", success: false });
    }

    const currentBalance = parseFloat(balanceResult[0].wallet_balance);

    if (currentBalance < amount) {
      return res
        .status(400)
        .json({ message: "Insufficient balance", success: false });
    }
    const timestamp = new Date()
      .toISOString()
      .replace(/[-T:.Z]/g, "")
      .slice(0, 14);
    const randomCode = crypto.randomBytes(2).toString("hex").toUpperCase();
    const transactionId = `PP-${timestamp}-${randomCode}`;

    const updateBalanceQuery =
      "UPDATE sellers SET wallet_balance = wallet_balance - ? WHERE id = ?";
    await db.query(updateBalanceQuery, [amount, seller_id]);

    const withdrawQuery = `INSERT INTO withdrawal_requests (seller_id, amount, transactionId,type) VALUES (?, ?, ?,?)`;
    const [result] = await db.query(withdrawQuery, [
      seller_id,
      amount,
      transactionId,
      "Withdrawn",
    ]);

    await sendNotification(
      seller_id,
      `Your withdrawal request of ₹${amount} has been submitted.`
    );

    return res.status(200).json({
      message: "Withdrawal request submitted",
      request_id: result.insertId,
      transactionId: transactionId,
      success: true,
    });
  } catch (error) {
    console.error("Error:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
};

exports.getWithdrawalRequests = async (req, res) => {
  try {
    const sellerId = req.params.sellerId || (req.user && req.user.id);
    let { limit, page, search } = req.query;

    if (!sellerId) {
      return res.status(400).json({
        success: false,
        message: "Merchant ID is required",
      });
    }

    limit = parseInt(limit) || 10;
    page = parseInt(page) || 1;
    const offset = (page - 1) * limit;

    let queryCondition = "WHERE seller_id = ?";
    let queryParams = [sellerId];

    if (search && search.trim() !== "") {
      queryCondition += ` AND (
                id LIKE ? OR
                status LIKE ? OR
                transactionId LIKE ? OR
                type LIKE ?
            )`;
      const searchPattern = `%${search}%`;
      queryParams.push(
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern
      );
    }

    const countQuery = `
            SELECT COUNT(*) AS totalRequests 
            FROM withdrawal_requests 
            ${queryCondition};
        `;
    const [[{ totalRequests }]] = await db.query(countQuery, queryParams);

    const allRequestsQuery = `
            SELECT * FROM withdrawal_requests 
            ${queryCondition} 
            ORDER BY created_at DESC  -- Ensure the latest date comes first
            LIMIT ? OFFSET ?;
        `;

    queryParams.push(limit, offset);
    const [result] = await db.query(allRequestsQuery, queryParams);

    return res.status(200).json({
      success: true,
      data: result,
      totalRequests,
      totalPages: Math.ceil(totalRequests / limit),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.verifyBankAccount = async (req, res) => {
  const { id, amount } = req.params;

  if (!id || !amount) {
    return res
      .status(400)
      .json({ success: false, message: "ID and amount are required" });
  }

  try {
    const [result] = await db.query("SELECT * FROM bank_detail WHERE id = ?", [
      id,
    ]);

    if (result.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No bank detail found with this ID" });
    }

    const record = result[0];

    if (Number(record.lastTransaction) === Number(amount)) {
      await db.query(
        "UPDATE bank_detail SET isVerify = 1, lastTransaction = NULL WHERE id = ?",
        [id]
      );
      return res
        .status(200)
        .json({ success: true, message: "Bank account verified successfully" });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Amount does not match" });
    }
  } catch (error) {
    console.error("Error verifying bank account:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error", error });
  }
};

/**
 * Admin: Get All Withdrawal Requests Across All Sellers
 */
exports.getAllWithdrawalRequestsForAdmin = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;

    let whereClauses = [];
    let queryParams = [];

    if (status && status !== 'all') {
      whereClauses.push('wr.status = ?');
      queryParams.push(status);
    }

    if (search && search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      whereClauses.push('(wr.transactionId LIKE ? OR s.seller_name LIKE ? OR s.shop_name LIKE ? OR s.number LIKE ? OR s.email LIKE ?)');
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM withdrawal_requests wr
      LEFT JOIN sellers s ON wr.seller_id = s.id
      ${whereSql}
    `;
    const [[{ total }]] = await db.query(countQuery, queryParams);

    const dataQuery = `
      SELECT 
        wr.*,
        s.seller_name AS sellerName,
        s.shop_name AS shopName,
        s.number AS sellerMobile,
        s.email AS sellerEmail,
        s.wallet_balance AS currentWalletBalance,
        bd.bank_name AS bankName,
        bd.account_holder_name AS accountHolderName,
        bd.account_number AS accountNumber,
        bd.ifsc_number AS ifscNumber
      FROM withdrawal_requests wr
      LEFT JOIN sellers s ON wr.seller_id = s.id
      LEFT JOIN bank_detail bd ON (s.id = bd.merchant_id)
      ${whereSql}
      ORDER BY wr.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const [requests] = await db.query(dataQuery, [...queryParams, limitNum, offset]);

    return res.status(200).json({
      success: true,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
      data: requests
    });
  } catch (error) {
    console.error("Error in getAllWithdrawalRequestsForAdmin:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

/**
 * Admin: Approve / Mark Transferred or Reject Withdrawal Request
 */
exports.updateWithdrawalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminRemark, transferReference } = req.body;

    if (!id || !status) {
      return res.status(400).json({ success: false, message: "Request ID and status are required" });
    }

    const [existing] = await db.query("SELECT * FROM withdrawal_requests WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Withdrawal request not found" });
    }

    const request = existing[0];
    const prevStatus = (request.status || '').toLowerCase();
    const newStatusLower = status.toLowerCase();

    // If changing from pending/approved to rejected, refund the amount back to seller wallet!
    if (newStatusLower === 'rejected' && prevStatus !== 'rejected') {
      const refundAmount = parseFloat(request.amount || 0);
      if (refundAmount > 0) {
        await db.query("UPDATE sellers SET wallet_balance = COALESCE(wallet_balance, 0) + ? WHERE id = ?", [refundAmount, request.seller_id]);
        console.log(`✓ Refunded ₹${refundAmount} to seller #${request.seller_id} for rejected withdrawal request #${id}`);
      }
    }

    await db.query(
      "UPDATE withdrawal_requests SET status = ?, remarks = ? WHERE id = ?",
      [status, adminRemark || transferReference || null, id]
    );

    // Notify seller
    try {
      await sendNotification(
        request.seller_id,
        `Your withdrawal request of ₹${request.amount} has been ${status}. ${adminRemark ? `Remark: ${adminRemark}` : ''}`
      );
    } catch (nErr) {}

    return res.status(200).json({
      success: true,
      message: `Withdrawal request status updated to ${status}`
    });
  } catch (error) {
    console.error("Error in updateWithdrawalStatus:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

