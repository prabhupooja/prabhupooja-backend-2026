const db = require("../config/db");
const nodemailer = require("nodemailer");
const { sendNotification } = require("./notificationController");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require("../config/s3Config");
const { serialize } = require("v8");
const {
  sendUserNotification,
} = require("../Controllers/notificationController");
const {
  sendNotificationToUser,
} = require("../Controllers/MobilePushNotification");


const formatSingleProductImage = (img) => {
  if (!img || img === "null" || img === "undefined") return null;
  const clean = typeof img === "string" ? img.trim() : "";
  if (!clean || clean === "null" || clean === "undefined") return null;
  if (clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("data:") || clean.startsWith("blob:")) return clean;
  const baseUrl = process.env.BACKEND_URL || "http://localhost:3002";
  const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBase}/uploads/${clean.replace(/^\/+/, "")}`;
};

const formatProductImage = (rawImage) => {
  if (!rawImage) return [];
  let list = [];
  if (Array.isArray(rawImage)) {
    list = rawImage.flat(Infinity);
  } else if (typeof rawImage === "string") {
    const trimmed = rawImage.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        list = Array.isArray(parsed) ? parsed.flat(Infinity) : [parsed];
      } catch (e) {
        list = [trimmed];
      }
    } else if (trimmed.includes(",")) {
      list = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
    } else {
      list = [trimmed];
    }
  } else {
    list = [rawImage];
  }
  return list.map(formatSingleProductImage).filter(Boolean);
};

const uploadPdfToS3 = async (filePath) => {
  const fileName = path.basename(filePath);
  const backendBaseUrl = process.env.BACKEND_URL || "http://localhost:3002";
  const localUrl = `${backendBaseUrl}/invoices/${fileName}`;

  if (!process.env.S3_BUCKET_NAME || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return localUrl;
  }

  try {
    const fileStream = fs.createReadStream(filePath);
    const uploadParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `invoices/${fileName}`,
      Body: fileStream,
      ContentType: "application/pdf",
    };

    const command = new PutObjectCommand(uploadParams);
    await s3.send(command);

    const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || "ap-south-1"}.amazonaws.com/invoices/${fileName}`;
    return fileUrl;
  } catch (s3Err) {
    console.warn("S3 upload failed for invoice, falling back to local static URL:", s3Err.message);
    return localUrl;
  }
};

const generateInvoice = async (data) => {
  return new Promise((resolve, reject) => {
    const invoicesDir = path.join(__dirname, "../invoices");
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }
    const filePath = path.join(
      invoicesDir,
      `${data.user.name}-order-invoice.pdf`
    );

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const watermarkPath = path.join(__dirname, "../public/logo.png");

    if (fs.existsSync(watermarkPath)) {
      doc.opacity(0.1);
      doc.rotate(45, { origin: [300, 300] });
      doc.image(watermarkPath, 200, 200, { width: 250 });
      doc.rotate(-45, { origin: [300, 300] });
      doc.opacity(1);
    }

    const logoPath = path.join(__dirname, "../public/logo.png");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 45, 25, { width: 40 });
    }
    // Header
    doc.fontSize(20).text("PrabhuPooja", 90, 35);
    doc.fontSize(14).text("INVOICE DETAIL", 400, 35, { align: "right" });
    doc.fontSize(12).text(`Order Id: #${data?.order?.id + 1000}`, 400, 55, {
      align: "right",
    });

    // Address and Contact
    let currentY = 70;
    doc.fontSize(9).text("PrabhuPooja", 50, currentY);
    currentY += 12;
    doc.text(
      "Mangal city, 203, Vijay Nagar, Scheme No 54, Indore, MP 452010",
      50,
      currentY,
      { width: 500 }
    );
    currentY += 12;
    doc.text("Phone: 081205 45454", 50, currentY);

    currentY += 10;
    doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
    currentY += 20;

    // Shipping Address (Left)
    let addressY = currentY;
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Shipping Address", 50, addressY);
    addressY += 15;
    doc.font("Helvetica").fontSize(9);
    doc.text(data?.address?.address || "N/A", 50, addressY, { width: 200 });
    addressY += 30;
    doc.text(data?.address?.city || "N/A", 50, addressY);
    addressY += 12;
    doc.text(data?.address?.state || "N/A", 50, addressY);
    addressY += 12;
    doc.text(data?.address?.country || "N/A", 50, addressY);
    addressY += 12;
    doc.text(data?.address?.postalCode || "N/A", 50, addressY);

    // Billing Address (Right)
    let billingY = currentY;
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Billing Address", 300, billingY);
    billingY += 15;
    doc.font("Helvetica").fontSize(9);
    doc.text(data?.address?.address || "N/A", 300, billingY, { width: 200 });
    billingY += 30;
    doc.text(data?.address?.city || "N/A", 300, billingY);
    billingY += 12;
    doc.text(data?.address?.state || "N/A", 300, billingY);
    billingY += 12;
    doc.text(data?.address?.country || "N/A", 300, billingY);
    billingY += 12;
    doc.text(data?.address?.postalCode || "N/A", 300, billingY);

    currentY = Math.max(addressY, billingY) + 20;

    // User Details (Next Row)
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Customer Details", 50, currentY);
    currentY += 15;
    doc.font("Helvetica").fontSize(9);
    doc.text(`Name: ${data?.user?.name} ${data?.user?.lastname}`, 50, currentY);
    currentY += 12;
    doc.text(`Email: ${data?.user?.email || "N/A"}`, 50, currentY);
    currentY += 12;
    doc.text(`Phone: ${data?.user?.mobile || "N/A"}`, 50, currentY);

    currentY += 30;

    // Order Info
    doc
      .font("Helvetica-Bold")
      .text("Order Id: ", 50, currentY, { continued: true })
      .font("Helvetica")
      .text(`#${data?.order?.id + 1000 || "N/A"}`);
    doc
      .font("Helvetica-Bold")
      .text("Purchase Order Date: ", 400, currentY, { continued: true })
      .font("Helvetica")
      .text(data?.order?.date || new Date().toLocaleDateString());

    currentY += 30;

    // Table Header
    doc.fillColor("white").rect(50, currentY, 500, 20).fill("#000");
    doc
      .fillColor("white")
      .font("Helvetica-Bold")
      .text("Products", 55, currentY + 5);
    doc.text("Quantity", 255, currentY + 5);
    doc.text("Price", 355, currentY + 5);
    doc.text("Total", 455, currentY + 5);

    currentY += 30;

    const products = Array.isArray(data.products)
      ? data.products
      : [data.products];
    let subtotal = 0;
    const deliveryCharge = 0;

    products.forEach((product, i) => {
      const qty = data?.quantities?.[i] || 1;
      const price = parseFloat(product.offerPrice).toFixed(2);
      const total = (qty * parseFloat(product.offerPrice)).toFixed(2);
      doc
        .fillColor("black")
        .font("Helvetica")
        .text(product.productName, 55, currentY);
      doc.text(qty.toString(), 265, currentY);
      doc.text(`Rs ${price}`, 355, currentY);
      doc.text(`Rs ${total}`, 455, currentY);
      currentY += 25;
      subtotal += parseFloat(total);
    });

    // Delivery Info
    currentY += 20;
    doc.fillColor("white").rect(50, currentY, 250, 20).fill("#000");
    doc.rect(300, currentY, 250, 20).fill("#000");
    doc
      .fillColor("white")
      .font("Helvetica-Bold")
      .text("Delivery Date", 55, currentY + 5);
    doc.text("Delivery Charge", 455, currentY + 5);

    currentY += 25;

    doc
      .fillColor("black")
      .font("Helvetica")
      .text("Estimated Delivery Date: 4 to 5 days", 55, currentY);
    doc.text(`RS ${deliveryCharge}`, 455, currentY);

    //gst info
    const gstRate = 0.0; // GST rate (0%)
    const gst = +(subtotal * gstRate).toFixed(2);

    const grandTotal = +(subtotal + gst + deliveryCharge).toFixed(2);

    // Summary
    currentY += 20;
    doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
    currentY += 10;
    doc
      .font("Helvetica-Bold")
      .text(`Subtotal:`, 400, currentY, { continued: true })
      .font("Helvetica")
      .text(`Rs ${subtotal.toFixed(2)}`);
    currentY += 15;
    doc
      .font("Helvetica-Bold")
      .text(`GST ${gstRate}%:`, 400, currentY, { continued: true })
      .font("Helvetica")
      .text(`Rs ${gst.toFixed(2)}`);
    currentY += 15;
    doc
      .font("Helvetica-Bold")
      .text(`Delivery Charges:`, 400, currentY, { continued: true })
      .font("Helvetica")
      .text(`Rs ${deliveryCharge.toFixed(2)}`);
    currentY += 15;
    doc.moveTo(400, currentY).lineTo(550, currentY).stroke();
    currentY += 10;
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(`Grand Total:`, 400, currentY, { continued: true })
      .font("Helvetica")
      .text(`Rs ${grandTotal.toFixed(2)}`);
    currentY += 40;

    // Footer
    doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
    doc.fontSize(10).text("Authorized By", 450, currentY + 55);
    doc
      .moveTo(450, currentY + 75)
      .lineTo(550, currentY + 75)
      .stroke();

    doc.end();

    stream.on("finish", () => resolve(filePath));
    stream.on("error", reject);
  });
};

exports.create = async (req, res) => {
  const {
    productId,
    userId,
    quantity,
    totalPrice,
    booking,
    images,
    paymentMethod,
    status,
    marchentId,
    name,
    lastname,
    email,
    number,
    address,
    country,
    state,
    city,
    postalCode,
    paymentId,
  } = req.body;

  if (
    !productId ||
    !userId ||
    !quantity ||
    !totalPrice ||
    !booking ||
    !images ||
    !paymentMethod ||
    !marchentId
  ) {
    return res.status(400).send({
      success: false,
      message: "Required fields are missing.",
      fileds: req.body,
    });
  }

  try {
    const shippingAddress = {
      ...(name !== undefined && { name }),
      ...(lastname !== undefined && { lastname }),
      ...(email !== undefined && { email }),
      ...(number !== undefined && { number }),
      ...(address !== undefined && { address }),
      ...(country !== undefined && { country }),
      ...(state !== undefined && { state }),
      ...(city !== undefined && { city }),
      ...(postalCode !== undefined && { postalCode }),
    };
    if (Object.keys(shippingAddress).length === 0) {
      return res.status(400).json({ message: "No shipping data provided" });
    }

    const productIdArray = Array.isArray(productId)
      ? productId.map((id) => Number(id))
      : [Number(productId)];

    const merchantArray = Array.isArray(marchentId) ? marchentId : [marchentId];
    const quantityArray = Array.isArray(quantity) ? quantity : [quantity];
    
    // Clean and flatten image array to avoid nested stringified structures
    let imagesArray = [];
    if (Array.isArray(images)) {
      imagesArray = images.flat(Infinity).filter((img) => typeof img === "string" && img.length > 3);
    } else if (typeof images === "string") {
      const trimmed = images.trim();
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        try {
          const parsed = JSON.parse(trimmed);
          imagesArray = Array.isArray(parsed) ? parsed.flat(Infinity) : [parsed];
        } catch (e) {
          imagesArray = [trimmed];
        }
      } else if (trimmed.includes(",")) {
        imagesArray = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
      } else if (trimmed) {
        imagesArray = [trimmed];
      }
    }

    const [result] = await db.query(
      `INSERT INTO orders (productId, userId, quantity, totalPrice, createdAt, booking, images, paymentMethod, status, merchantId, shipping_address, payment_id)
       VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?,?,?)`,
      [
        JSON.stringify(productIdArray),
        userId,
        JSON.stringify(quantityArray),
        totalPrice,
        booking,
        JSON.stringify(imagesArray),
        paymentMethod,
        status,
        JSON.stringify(merchantArray),
        JSON.stringify(shippingAddress),
        paymentId,
      ]
    );

    let productRows = [];

    for (const pId of productIdArray) {
      const [rows] = await db.query("SELECT * FROM products WHERE id = ?", [
        pId,
      ]);

      if (rows.length > 0) {
        productRows.push(rows[0]);
      }
    }

    const [userRows] = await db.query(`SELECT * FROM users WHERE id = ?`, [
      userId,
    ]);

    if (!result.affectedRows) {
      return res.status(500).send({
        success: false,
        message: "Failed to create order.",
      });
    }

    if (booking === "cart") {
      await db.query(
        `DELETE FROM cart WHERE user_id = ? AND productId IN (?)`,
        [userId, productIdArray]
      );
    }

    const [user] = await db.query(
      "SELECT name, lastname, email FROM users WHERE id = ?",
      [userId]
    );
    const order = {
      id: result.insertId,
      date: new Date().toLocaleDateString(),
    };

    if (user && user[0]?.email) {
      try {
        const filePath = await generateInvoice({
          user: userRows[0] || user[0],
          products: productRows,
          order: order,
          quantities: quantityArray,
          address: shippingAddress,
        });
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.email,
            pass: process.env.pass,
          },
        });

        const mailOptions = {
          from: process.env.email,
          to: user[0].email,
          subject: "Order Confirmation - PrabhuPooja",
          text: `Dear ${user[0].name},\n\nYour order #${result.insertId} has been placed successfully. Thank you for shopping with us!\n\nBest regards,\nPrabhuPooja`,
          attachments: [
            {
              filename: "order-invoice.pdf",
              path: filePath,
            },
          ],
        };

        await transporter.sendMail(mailOptions);

        let invoiceUrl = await uploadPdfToS3(filePath);

        await db.query(
          `INSERT INTO order_invoice (user_id, order_id, path_url) VALUES (?, ?, ?)`,
          [userId, result.insertId, invoiceUrl]
        );
      } catch (emailErr) {
        console.error("Error creating/sending invoice:", emailErr);
      }
    }

    const orderId = result.insertId;

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];

    const stepStatus = JSON.stringify([
      { name: "Order Placed", date: dateStr, status: "completed" },
      { name: "Dispatched", date: "", status: "processing" },
      { name: "Shipping", date: "", status: "processing" },
      { name: "Delivered", date: "", status: "processing" },
    ]);

    await db.query(
      `INSERT INTO order_tracking 
      (user_id, order_id, status, status_date, estimated_delivery_start, estimated_delivery_end, created_at, updated_at)
     VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 5 DAY), NOW(), NOW())`,
      [userId, orderId, stepStatus]
    );

    // 1. Notify Seller(s)
    const customerName = user && user[0] ? `${user[0].name || 'Devotee'}` : 'Devotee';
    for (let i = 0; i < merchantArray.length; i++) {
      const merchantId = merchantArray[i];
      try {
        await sendNotification(merchantId, `New order #${orderId} of ₹${totalPrice} placed by ${customerName}`);
      } catch (sErr) {
        console.warn("Seller notification warning:", sErr.message);
      }
    }

    // 2. Notify Customer (In-App Socket + Mobile Push Notification)
    try {
      const customerMsg = `Your sacred order #${orderId} of ₹${totalPrice} has been placed successfully!`;
      if (sendUserNotification) await sendUserNotification(userId, "Order Placed Successfully", customerMsg);
      if (sendNotificationToUser) await sendNotificationToUser("Order Placed Successfully", customerMsg, userId);
    } catch (uErr) {
      console.warn("Customer notification warning:", uErr.message);
    }

    return res.status(201).send({
      success: true,
      message: "Order created successfully",
      orderId: orderId,
    });
  } catch (error) {
    console.error("Unexpected error:", error);

    try {
      const [user] = await db.query(
        "SELECT name, email FROM users WHERE id = ?",
        [userId]
      );
      if (user && user[0]?.email) {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.email,
            pass: process.env.pass,
          },
        });
        if (paymentMethod.toLowarCase() === "upi") {
          const mailOptions = {
            from: process.env.email,
            to: user[0].email,
            subject: "Payment Received - Order Not Confirmed",
            text: `Dear ${user[0].name},\n\nWe noticed that your payment was successfully processed, but your order could not be confirmed due to a technical issue.\n\nPlease do not worry — our team is already looking into it. You will either receive an order confirmation shortly, or a full refund will be processed to your original payment method within 5–7 business days.\n\nWe sincerely apologize for the inconvenience and appreciate your patience.\n\nBest regards,\nPrabhuPooja Support Team`,
          };
          await transporter.sendMail(mailOptions);
        } else {
          const mailOptions = {
            from: process.env.email,
            to: user[0].email,
            subject: "Order Not Confirmed",
            text: `Dear ${user[0].name},\n\nWe noticed that your order is not booked, Please try again leter.\n\nBest regards,\nPrabhuPooja Support Team`,
          };
          await transporter.sendMail(mailOptions);
        }

        // await transporter.sendMail(mailOptions);
      }
    } catch (emailErr) {
      console.error("Error fetching user or sending error email:", emailErr);
    }

    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getAll = async (req, res) => {
  try {
    const { search = "", status = "", sellerId = "", page, limit } = req.query;
    
    let whereClauses = [];
    let queryParams = [];

    if (search && search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      whereClauses.push(`(
        orders.id LIKE ? OR
        users.name LIKE ? OR
        users.email LIKE ? OR
        users.mobile LIKE ? OR
        sellers.seller_name LIKE ? OR
        sellers.shop_name LIKE ? OR
        orders.paymentMethod LIKE ? OR
        orders.status LIKE ? OR
        orders.order_status LIKE ?
      )`);
      queryParams.push(
        searchPattern, searchPattern, searchPattern, searchPattern,
        searchPattern, searchPattern, searchPattern, searchPattern, searchPattern
      );
    }

    if (status && status !== 'all') {
      whereClauses.push(`(orders.status = ? OR orders.order_status = ?)`);
      queryParams.push(status, status);
    }

    if (sellerId) {
      whereClauses.push(`(orders.merchantId = ? OR orders.merchantId = ?)`);
      queryParams.push(sellerId, JSON.stringify(sellerId));
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Pagination
    let paginationSql = "";
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    if (!isNaN(pageNum) && !isNaN(limitNum) && pageNum > 0 && limitNum > 0) {
      const offset = (pageNum - 1) * limitNum;
      paginationSql = ` LIMIT ${limitNum} OFFSET ${offset}`;
    }

    const query = `
      SELECT 
        orders.id AS orderId,
        orders.id,
        orders.userId,
        orders.merchantId AS sellerId,
        orders.merchantId,
        orders.totalPrice AS Price,
        orders.totalPrice,
        orders.paymentMethod AS Method,
        orders.paymentMethod,
        orders.status AS orderStatus,
        orders.status,
        orders.order_status AS orderProgress,
        orders.order_status,
        orders.shipping_address AS shippingAddress,
        orders.payment_id AS paymentId,
        orders.createdAt AS orderDate,
        orders.createdAt,
        users.name AS userName,
        users.email AS userEmail,
        users.mobile AS userMobile,
        sellers.seller_name AS sellerName,
        sellers.shop_name AS shopName,
        sellers.number AS sellerMobile,
        sellers.email AS sellerEmail
      FROM orders
      LEFT JOIN users ON orders.userId = users.id
      LEFT JOIN sellers ON (orders.merchantId = sellers.id OR orders.merchantId = CONCAT('"', sellers.id, '"'))
      ${whereSql}
      ORDER BY orders.createdAt DESC
      ${paginationSql};
    `;

    const [orders] = await db.query(query, queryParams);

    const [countResult] = await db.query(
      `SELECT COUNT(*) AS total 
       FROM orders 
       LEFT JOIN users ON orders.userId = users.id 
       LEFT JOIN sellers ON (orders.merchantId = sellers.id OR orders.merchantId = CONCAT('"', sellers.id, '"')) 
       ${whereSql}`,
      queryParams
    );

    const total = countResult[0]?.total || orders.length;

    return res.status(200).send({
      success: true,
      count: total,
      total,
      totalPages: limitNum ? Math.ceil(total / limitNum) : 1,
      data: orders,
      orders: orders
    });
  } catch (error) {
    console.error("Error in orderController.getAll:", error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

exports.getProductByOrderId = async (req, res) => {
  const { orderId } = req.params;

  if (!orderId) {
    return res.status(400).send({
      success: false,
      message: "Order ID is required",
    });
  }

  try {
    const orderQuery = `
            SELECT 
                orders.id AS orderId,
                orders.userId,
                orders.productId,
                orders.quantity,
                orders.totalPrice,
                orders.paymentMethod,
                orders.order_status,
                orders.cancel_reason,
                orders.shipping_address,
                users.name AS userName,
                users.email AS userEmail,
                orders.createdAt AS orderDate
            FROM orders
            LEFT JOIN users ON orders.userId = users.id
            WHERE orders.id = ?
        `;
    const [order] = await db.query(orderQuery, [orderId]);

    if (!order || order.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Order not found",
      });
    }

    const orderItem = order[0];
    let productIds = [];
    try {
      if (typeof orderItem.productId === "string") {
        if (orderItem.productId.trim().startsWith("[")) {
          productIds = JSON.parse(orderItem.productId);
        } else {
          productIds = orderItem.productId.split(",").map((id) => parseInt(id.trim())).filter(Boolean);
        }
      } else if (Array.isArray(orderItem.productId)) {
        productIds = orderItem.productId;
      } else if (typeof orderItem.productId === "number") {
        productIds = [orderItem.productId];
      }
    } catch (parseErr) {
      productIds = [];
    }

    let productDetails = [];
    if (productIds.length > 0) {
      const [products] = await db.query(
        `SELECT id AS productId, productName, image AS productImage, merchantId, offerPrice AS productOfferPrice, price
         FROM products WHERE id IN (?)`,
        [productIds]
      );
      productDetails = products;
    }

    const invoiceQuery = `
      SELECT path_url 
      FROM order_invoice 
      WHERE order_id = ? AND user_id = ?
    `;
    const [invoiceResult] = await db.query(invoiceQuery, [
      orderId,
      orderItem.userId,
    ]);

    let pathUrl = invoiceResult.length > 0 ? invoiceResult[0].path_url : "No invoice found";

    return res.status(200).send({
      success: true,
      orders: orderItem,
      products: productDetails,
      pathUrl: pathUrl,
    });
  } catch (error) {
    console.error("Error in getProductByOrderId:", error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.getbyId = async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).send({
      success: false,
      message: "User ID is required",
      data: { orderCount: 0, orders: [] },
    });
  }

  try {
    const query = `
      SELECT 
        orders.id AS orderId,
        orders.userId,
        orders.productId,
        orders.quantity,
        orders.order_status,
        orders.status AS payment_status,
        orders.cancel_reason,
        orders.paymentMethod,
        orders.totalPrice,
        orders.images,
        orders.shipping_address,
        ot.order_progress_status,
        users.name AS userName,
        users.email AS userEmail,
        orders.createdAt AS orderDate
      FROM orders
      INNER JOIN users ON orders.userId = users.id
      LEFT JOIN order_tracking ot ON orders.id = ot.order_id
      WHERE orders.userId = ?
      ORDER BY orders.createdAt DESC
    `;

    const [orders] = await db.query(query, [userId]);

    const validOrders = (orders || []).filter(
      (order) => order && order.orderId !== null && order.orderId !== undefined
    );

    if (!validOrders || validOrders.length === 0) {
      return res.status(200).send({
        success: true,
        data: {
          orderCount: 0,
          orders: [],
        },
      });
    }

    const formattedOrders = validOrders.map((order) => {
      let parsedImages = [];
      try {
        if (Array.isArray(order.images)) {
          parsedImages = order.images;
        } else if (typeof order.images === "string") {
          const trimmed = order.images.trim();
          if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            parsedImages = JSON.parse(trimmed);
          } else if (trimmed) {
            parsedImages = trimmed.split(",").map((s) => s.trim());
          }
        }
      } catch (e) {
        parsedImages = [];
      }

      parsedImages = (parsedImages || []).map((img) => formatProductImage(img)).filter(Boolean);

      let parsedQuantity = [1];
      try {
        if (Array.isArray(order.quantity)) {
          parsedQuantity = order.quantity;
        } else if (typeof order.quantity === "string") {
          const trimmed = order.quantity.trim();
          if (trimmed.startsWith("[")) {
            parsedQuantity = JSON.parse(trimmed);
          } else if (trimmed) {
            parsedQuantity = trimmed.split(",").map((q) => parseInt(q.trim()) || 1);
          }
        } else if (typeof order.quantity === "number") {
          parsedQuantity = [order.quantity];
        }
      } catch (e) {
        parsedQuantity = [1];
      }

      let parsedProductId = [];
      try {
        if (Array.isArray(order.productId)) {
          parsedProductId = order.productId;
        } else if (typeof order.productId === "string") {
          const trimmed = order.productId.trim();
          if (trimmed.startsWith("[")) {
            parsedProductId = JSON.parse(trimmed);
          } else if (trimmed) {
            parsedProductId = trimmed.split(",").map((p) => parseInt(p.trim()) || p.trim());
          }
        } else if (typeof order.productId === "number") {
          parsedProductId = [order.productId];
        }
      } catch (e) {
        parsedProductId = [];
      }

      const rawProgress = order.order_progress_status || order.order_status || "order_placed";

      return {
        orderId: order.orderId,
        userId: order.userId,
        productId: parsedProductId,
        quantity: parsedQuantity,
        order_status: order.order_status || "pending",
        order_progress_status: rawProgress,
        status: rawProgress,
        paymentStatus: order.payment_status || "pending",
        cancel_reason: order.cancel_reason,
        paymentMethod: order.paymentMethod,
        totalPrice: parseFloat(order.totalPrice || 0),
        images: parsedImages,
        userName: order.userName,
        userEmail: order.userEmail,
        orderDate: order.orderDate,
      };
    });

    return res.status(200).send({
      success: true,
      data: {
        orderCount: formattedOrders.length,
        orders: formattedOrders,
      },
    });
  } catch (error) {
    console.error("Error in getbyId:", error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { totalPrice, paymentMethod, status } = req.body;

  try {
    const data = await db.query(`SELECT * FROM orders WHERE id = ?`, [id]);

    if (!data.length) {
      return res.status(404).send({
        success: false,
        message: "Order not found",
      });
    }

    const updatedOrder = await db.query(
      `UPDATE orders SET totalPrice = ?, paymentMethod = ?, status = ? WHERE id = ?`,
      [
        totalPrice || data[0].totalPrice,
        paymentMethod || data[0].paymentMethod,
        status || data[0].status,
        id,
      ]
    );
    console.log(updatedOrder, data, "lllllls");

    return res.status(200).send({
      success: true,
      message: "Order updated successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.delete = async (req, res) => {
  const { id } = req.params;

  try {
    const data = await db.query(`SELECT * FROM orders WHERE id = ?`, [id]);

    if (!data.length) {
      return res.status(404).send({
        success: false,
        message: "Order not found",
      });
    }

    await db.query(`DELETE FROM orders WHERE id = ?`, [id]);

    return res.status(200).send({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getByMerchantId = async (req, res) => {
  let { merchantId } = req.params;
  let { limit, page, search } = req.query || {};

  if (!merchantId) {
    return res.status(400).send({
      success: false,
      message: "Merchant ID is required",
    });
  }

  merchantId = parseInt(merchantId);
  limit = parseInt(limit) || 10;
  page = parseInt(page) || 1;
  const offset = (page - 1) * limit;

  try {
    const productsQuery = `SELECT * FROM products WHERE merchantId = ?`;
    const [products] = await db.query(productsQuery, [merchantId]);

    const merchantIdStr = String(merchantId);
    const merchantIdJson = JSON.stringify(merchantId);

    let queryCondition = `WHERE (JSON_CONTAINS(o.merchantId, ?) OR JSON_CONTAINS(o.merchantId, ?) OR o.merchantId = ? OR o.merchantId LIKE ?)`;
    let queryParams = [merchantIdJson, `"${merchantIdStr}"`, merchantIdStr, `%"${merchantIdStr}"%`];

    if (search && search.trim() !== "") {
      queryCondition += ` AND (
              o.id LIKE ? OR
              o.status LIKE ? OR
              o.paymentMethod LIKE ? OR
              u.name LIKE ? OR
              u.lastname LIKE ?
          )`;
      const searchPattern = `%${search}%`;
      queryParams.push(
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern
      );
    }

    if (search) {
      try {
        const decodedSearch = decodeURIComponent(search);
        const searchParams = new URLSearchParams(decodedSearch);
        const startDateStr = searchParams.get("startdate");
        const endDateStr = searchParams.get("enddate");

        if (startDateStr && endDateStr) {
          queryCondition += ` AND DATE(o.createdAt) BETWEEN ? AND ?`;
          queryParams.push(startDateStr, endDateStr);
        }
      } catch (error) {
        console.error("Date Parsing Error:", error);
      }
    }

    const countQuery = `
          SELECT COUNT(*) AS totalOrders 
          FROM orders o
          LEFT JOIN users u ON o.userId = u.id
          ${queryCondition};
      `;
    const [countResult] = await db.query(countQuery, queryParams);
    const totalOrders = countResult.length > 0 && countResult[0].totalOrders ? countResult[0].totalOrders : 0;

    const allOrdersQuery = `
          SELECT DISTINCT 
              o.*, 
              u.name AS userName, 
              u.lastname AS userLastName, 
              u.image AS userImage
          FROM orders o
          LEFT JOIN users u ON o.userId = u.id
          ${queryCondition}
          ORDER BY o.createdAt DESC
          LIMIT ? OFFSET ?;
      `;

    const [allOrders] = await db.query(allOrdersQuery, [...queryParams, limit, offset]);

    const formattedOrders = allOrders.map((order) => ({
      ...order,
      userImage: order.userImage ? order.userImage.toString() : null,
    }));

    // Calculate total income from merchant's actual orders
    const totalIncome = allOrders.reduce(
      (acc, order) => acc + (parseFloat(order.totalPrice) || 0),
      0
    );
    const averageSale = allOrders.length > 0 ? totalIncome / allOrders.length : 0;

    return res.status(200).send({
      success: true,
      data: {
        products,
        orders: formattedOrders,
        totalPages: Math.ceil(totalOrders / limit) || 1,
        totalOrders,
        totalIncome: totalIncome.toFixed(2),
        averageSale: averageSale.toFixed(2),
      },
    });
  } catch (error) {
    console.error("Database Error in getByMerchantId:", error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.getCustomerByMerchantId = async (req, res) => {
  let { merchantId } = req.params;
  let { limit, page, search } = req.query;

  if (!merchantId) {
    return res.status(400).send({
      success: false,
      message: "Merchant ID is required",
    });
  }

  merchantId = parseInt(merchantId);
  limit = parseInt(limit) || 10;
  page = parseInt(page) || 1;
  const offset = (page - 1) * limit;

  try {
    const productsQuery = `SELECT * FROM products WHERE merchantId = ?`;
    const [products] = await db.query(productsQuery, [merchantId]);

    const merchantIdStr = String(merchantId);
    const merchantIdJson = JSON.stringify(merchantId);

    let queryCondition = `WHERE (JSON_CONTAINS(o.merchantId, ?) OR JSON_CONTAINS(o.merchantId, ?) OR o.merchantId = ? OR o.merchantId LIKE ?)`;
    let queryParams = [merchantIdJson, `"${merchantIdStr}"`, merchantIdStr, `%"${merchantIdStr}"%`];

    if (search && search.trim() !== "") {
      queryCondition += ` AND (
        o.id LIKE ? OR
        o.status LIKE ? OR
        o.paymentMethod LIKE ? OR
        u.name LIKE ? OR
        u.lastname LIKE ? OR
        u.email LIKE ? OR
        u.address LIKE ?
      )`;
      const searchPattern = `%${search}%`;
      queryParams.push(
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern
      );
    }

    // Count Total Unique Customers
    const userCountQuery = `
      SELECT COUNT(DISTINCT o.userId) AS totalUsers
      FROM orders o
      LEFT JOIN users u ON o.userId = u.id
      ${queryCondition}
    `;
    const [countResult] = await db.query(userCountQuery, queryParams);
    const totalUsers = countResult.length > 0 && countResult[0].totalUsers ? countResult[0].totalUsers : 0;

    // Fetch Customers with aggregated order statistics
    const allUserQuery = `
      SELECT 
        o.userId,
        u.name AS userName, 
        u.lastname AS userLastName, 
        u.email AS userEmail, 
        u.address AS userAddress, 
        u.city AS city,
        u.state AS state,
        u.country AS country,
        u.postalCode AS postalCode,
        u.image AS userImage,
        COUNT(o.id) AS orderCount,
        SUM(o.totalPrice) AS totalAmountSpent
      FROM orders o
      LEFT JOIN users u ON o.userId = u.id
      ${queryCondition}
      GROUP BY o.userId, u.name, u.lastname, u.email, u.address, u.city, u.state, u.country, u.postalCode, u.image
      ORDER BY totalAmountSpent DESC
      LIMIT ? OFFSET ?;
    `;

    const [allUsers] = await db.query(allUserQuery, [...queryParams, limit, offset]);

    return res.status(200).send({
      success: true,
      data: {
        products,
        users: allUsers,
        totalPages: Math.ceil(totalUsers / limit) || 1,
        totalUsers,
      },
    });
  } catch (error) {
    console.error("Database Error in getCustomerByMerchantId:", error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.getCustomerDetail = async (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const [userRows] = await db.query(
      `SELECT id, name, email, mobile, image 
       FROM users 
       WHERE id = ?`,
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const userDetails = userRows[0];

    const [orderCountResult] = await db.query(
      `SELECT COUNT(*) as totalOrders FROM orders WHERE userId = ?`,
      [userId]
    );
    const totalOrders = orderCountResult[0].totalOrders;
    const totalPages = Math.ceil(totalOrders / limit);

    const [orders] = await db.query(
      `SELECT id, userId, productId, totalPrice, createdAt, paymentMethod, status, order_status
       FROM orders 
       WHERE userId = ?
       ORDER BY createdAt DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    let detailedOrders = [];

    for (const order of orders) {
      let productIds = [];

      try {
        if (typeof order.productId === "string") {
          if (order.productId.trim().startsWith("[")) {
            productIds = JSON.parse(order.productId);
          } else {
            productIds = order.productId
              .split(",")
              .map((id) => parseInt(id.trim()));
          }
        } else if (Array.isArray(order.productId)) {
          productIds = order.productId;
        } else if (typeof order.productId === "number") {
          productIds = [order.productId];
        }
      } catch (parseErr) {
        productIds = [];
      }

      productIds = productIds.filter(Boolean);

      let products = [];
      if (productIds.length > 0) {
        const [prodList] = await db.query(
          `SELECT id, productName, offerPrice, image 
           FROM products 
           WHERE id IN (?)`,
          [productIds]
        );
        products = prodList;
      }

      detailedOrders.push({
        ...order,
        products,
      });
    }

    const [total] = await db.query(
      `SELECT SUM(totalPrice) AS totalAmountSpent 
       FROM orders 
       WHERE userId = ?`,
      [userId]
    );

    res.status(200).json({
      success: true,
      user: userDetails,
      orders: detailedOrders,
      pagination: {
        totalPages,
      },
      totalAmountSpent: total[0].totalAmountSpent || 0,
    });
  } catch (err) {
    console.error("Error fetching customer details:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getOrderbyOrderId = async (req, res) => {
  const { orderId, merchantId } = req.params;

  if (!merchantId || !orderId) {
    return res.status(400).send({
      success: false,
      message: "Order ID and Merchant ID are required",
    });
  }

  try {
    const merchantIdStr = String(merchantId);
    const merchantIdJson = JSON.stringify(parseInt(merchantId));

    const orderQuery = `SELECT * FROM orders WHERE id = ? AND (JSON_CONTAINS(merchantId, ?) OR JSON_CONTAINS(merchantId, ?) OR merchantId = ? OR merchantId LIKE ?)`;
    const [order] = await db.query(orderQuery, [orderId, merchantIdJson, `"${merchantIdStr}"`, merchantIdStr, `%"${merchantIdStr}"%`]);

    if (!order || order.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Order not found for this Merchant ID",
      });
    }

    const productsQuery = `SELECT * FROM products WHERE merchantId = ?`;
    const [products] = await db.query(productsQuery, [merchantId]);

    const userIds = [...new Set(order.map((o) => o.userId))].filter(Boolean);
    let userMap = {};
    if (userIds.length > 0) {
      const usersQuery = `SELECT id, name, lastname, email, mobile, image, address FROM users WHERE id IN (?)`;
      const [users] = await db.query(usersQuery, [userIds]);
      userMap = users.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {});
    }

    const updatedOrders = order.map((orderItem) => {
      let prodIds = [];
      try {
        if (typeof orderItem.productId === "string") {
          prodIds = JSON.parse(orderItem.productId);
        } else if (Array.isArray(orderItem.productId)) {
          prodIds = orderItem.productId;
        } else if (typeof orderItem.productId === "number") {
          prodIds = [orderItem.productId];
        }
      } catch (e) {
        prodIds = [];
      }
      if (!Array.isArray(prodIds)) prodIds = [prodIds];

      const productDetails = prodIds
        .map((productId) =>
          products.find((product) => Number(product.id) === Number(productId))
        )
        .filter(Boolean);

      return {
        ...orderItem,
        productDetails,
        userDetails: userMap[orderItem.userId] || null,
      };
    });

    return res.status(200).send({
      success: true,
      orders: updatedOrders,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    return res.status(500).send({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.orderTrackingByUser = async (req, res) => {
  const { orderId } = req.params;

  if (!orderId) {
    return res.status(400).send({
      success: false,
      message: "Order ID is required",
    });
  }

  try {
    const query = `
      SELECT 
        o.id AS orderId,
        o.userId,
        o.merchantId,
        o.productId,
        o.quantity,
        o.totalPrice,
        o.paymentMethod,
        o.status AS orderPaymentStatus,
        o.order_status AS orderStatus,
        o.cancel_reason,
        o.createdAt AS orderDate,
        o.shipping_address AS shippingAddress,
        o.payment_id AS transactionId,
        u.name AS userName,
        u.lastname AS userLastName,
        u.email AS userEmail,
        u.mobile AS userNumber,
        u.address AS userAddress,
        u.city AS userCity,
        u.state AS userState,
        u.postalCode AS userPostalCode,
        u.country AS userCountry,
        u.image AS userImage,
        ot.status AS trackingStatus,
        ot.status_date,
        ot.estimated_delivery_start,
        ot.estimated_delivery_end,
        ot.order_progress_status,
        ot.created_at AS trackingCreatedAt,
        ot.updated_at AS trackingUpdatedAt
      FROM orders o
      INNER JOIN users u ON o.userId = u.id
      LEFT JOIN order_tracking ot ON o.id = ot.order_id
      WHERE o.id = ?
    `;

    const [orderRows] = await db.query(query, [orderId]);

    if (!orderRows || orderRows.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Order not found",
      });
    }

    const row = orderRows[0];

    // 1. Parse Products and Quantities
    let productIds = [];
    try {
      if (Array.isArray(row.productId)) {
        productIds = row.productId;
      } else if (typeof row.productId === "string") {
        const trimmed = row.productId.trim();
        if (trimmed.startsWith("[")) {
          productIds = JSON.parse(trimmed);
        } else if (trimmed) {
          productIds = trimmed.split(",").map((id) => parseInt(id.trim())).filter(Boolean);
        }
      } else if (typeof row.productId === "number") {
        productIds = [row.productId];
      }
    } catch (parseErr) {
      productIds = [];
    }

    let quantities = [];
    try {
      if (Array.isArray(row.quantity)) {
        quantities = row.quantity;
      } else if (typeof row.quantity === "string") {
        const trimmed = row.quantity.trim();
        if (trimmed.startsWith("[")) {
          quantities = JSON.parse(trimmed);
        } else if (trimmed) {
          quantities = trimmed.split(",").map((q) => parseInt(q.trim()) || 1);
        }
      } else if (typeof row.quantity === "number") {
        quantities = [row.quantity];
      }
    } catch (parseErr) {
      quantities = [];
    }

    let productDetailsWithQuantity = [];
    if (productIds.length > 0) {
      const [productRows] = await db.query(
        `SELECT id AS productId, productName, image, price, offerPrice, description, merchantId
         FROM products WHERE id IN (?)`,
        [productIds]
      );

      productDetailsWithQuantity = productRows.map((product) => {
        const index = productIds.indexOf(product.productId);
        return {
          ...product,
          image: formatProductImage(product.image),
          quantity: quantities[index] || 1,
        };
      });
    }

    // 2. Parse / Structure Shipping Address
    let parsedShippingAddress = {
      name: row.userName || "",
      lastname: row.userLastName || "",
      email: row.userEmail || "",
      number: row.userNumber || "",
      address: row.userAddress || "",
      city: row.userCity || "",
      state: row.userState || "",
      postalCode: row.userPostalCode || "",
      country: row.userCountry || "India",
    };

    if (row.shippingAddress) {
      try {
        if (typeof row.shippingAddress === "object") {
          parsedShippingAddress = { ...parsedShippingAddress, ...row.shippingAddress };
        } else if (typeof row.shippingAddress === "string") {
          const trimmed = row.shippingAddress.trim();
          if (trimmed.startsWith("{")) {
            const parsedObj = JSON.parse(trimmed);
            parsedShippingAddress = { ...parsedShippingAddress, ...parsedObj };
          } else if (trimmed) {
            parsedShippingAddress.address = trimmed;
          }
        }
      } catch (addrErr) {
        console.warn("Shipping address parse warning:", addrErr.message);
      }
    }

    // 3. Parse / Structure Tracking Status Timeline
    const orderDateStr = row.orderDate ? new Date(row.orderDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "Recently";
    const estStartStr = row.estimated_delivery_start ? new Date(row.estimated_delivery_start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : "Expected soon";
    const estEndStr = row.estimated_delivery_end ? new Date(row.estimated_delivery_end).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : "Expected 4-5 days";

    let parsedTrackingStatus = [];
    try {
      if (Array.isArray(row.trackingStatus)) {
        parsedTrackingStatus = row.trackingStatus;
      } else if (typeof row.trackingStatus === "string") {
        const trimmed = row.trackingStatus.trim();
        if (trimmed.startsWith("[")) {
          parsedTrackingStatus = JSON.parse(trimmed);
        }
      }
    } catch (trkErr) {
      parsedTrackingStatus = [];
    }

    if (!Array.isArray(parsedTrackingStatus) || parsedTrackingStatus.length === 0) {
      const isDelivered = row.orderStatus === "delivered" || row.orderStatus === "complete";
      const isShipped = row.orderStatus === "dispatched" || row.orderStatus === "shipped";
      const isCancelled = row.orderStatus === "cancel" || row.orderStatus === "cancelled";

      parsedTrackingStatus = [
        { name: "Order Placed", status: isCancelled ? "error" : "completed", date: orderDateStr },
        { name: "Processing & Packaging", status: isCancelled ? "error" : (isDelivered || isShipped ? "completed" : "processing"), date: isCancelled ? "Order Cancelled" : "In Warehouse" },
        { name: "Dispatched & In Transit", status: isCancelled ? "error" : (isDelivered ? "completed" : (isShipped ? "processing" : "pending")), date: isShipped ? "Dispatched" : `Expected ${estStartStr}` },
        { name: "Delivered", status: isCancelled ? "error" : (isDelivered ? "completed" : "pending"), date: isDelivered ? "Delivered" : `Expected ${estEndStr}` },
      ];
    }

    // 4. Fetch Invoice URL
    const [invoiceRows] = await db.query(
      `SELECT path_url FROM order_invoice WHERE order_id = ?`,
      [orderId]
    );
    let invoiceUrl = null;
    if (invoiceRows.length > 0 && invoiceRows[0].path_url) {
      const rawUrl = invoiceRows[0].path_url.trim();
      if (rawUrl && rawUrl !== "No invoice found" && rawUrl !== "null" && rawUrl !== "undefined") {
        invoiceUrl = rawUrl;
      }
    }

    let courierInfo = null;
    let trackingNumberInfo = null;
    if (Array.isArray(parsedTrackingStatus)) {
      for (const step of parsedTrackingStatus) {
        if (step.courier) courierInfo = step.courier;
        if (step.trackingNumber) trackingNumberInfo = step.trackingNumber;
      }
    }

    return res.status(200).send({
      success: true,
      order: {
        orderId: row.orderId,
        orderDate: row.orderDate,
        totalPrice: parseFloat(row.totalPrice || 0),
        orderStatus: row.orderPaymentStatus || row.orderStatus || "Paid",
        order_progress_status: row.order_progress_status || row.orderStatus || "order_placed",
        cancel_reason: row.cancel_reason || null,
        courier: courierInfo,
        trackingNumber: trackingNumberInfo,
        estimated_delivery_start: row.estimated_delivery_start,
        estimated_delivery_end: row.estimated_delivery_end,
        paymentMethod: row.paymentMethod,
        transactionId: row.transactionId,
        shippingAddress: parsedShippingAddress,
        trackingStatus: parsedTrackingStatus,
      },
      products: productDetailsWithQuantity,
      invoiceUrl: invoiceUrl,
    });
  } catch (error) {
    console.error("Error in orderTrackingByUser:", error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.CancelOrder = async (req, res) => {
  const { orderId } = req.params;
  const { cancelReason } = req.body;

  if (!orderId) {
    return res.status(400).send({
      success: false,
      message: "Order ID is required",
    });
  }

  try {
    const [order] = await db.query(`SELECT * FROM orders WHERE id = ?`, [
      orderId,
    ]);

    if (!order.length) {
      return res.status(404).send({
        success: false,
        message: "Order not found",
      });
    }

    await db.query(
      `UPDATE orders SET order_status = ?, cancel_reason = ? WHERE id = ?`,
      ["cancel", cancelReason, orderId]
    );

    const [rows] = await db.query(
      "SELECT status FROM order_tracking WHERE order_id = ?",
      [orderId]
    );

    if (!rows.length) {
      throw new Error("Order not found");
    }

    let statusArray = rows[0].status;

    if (typeof statusArray === "string") {
      statusArray = JSON.parse(statusArray);
    }

    statusArray = statusArray.map((item) => {
      if (item.status === "processing") {
        return { ...item, status: "error" };
      }
      return item;
    });

    await db.query(
      "UPDATE order_tracking SET status = ?, order_progress_status = ? WHERE order_id = ?",
      [JSON.stringify(statusArray), "error", orderId]
    );

    return res.status(200).send({
      success: true,
      message: "Order cancelled successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.totalOrderIncome = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        COUNT(*) AS completedOrders, 
        SUM(totalPrice) AS totalIncome 
      FROM orders 
      WHERE order_status = 'complete'
    `);

    res.status(200).json({
      success: true,
      data: {
        completedOrders: rows[0].completedOrders,
        totalIncome: rows[0].totalIncome || 0, // Fallback if null
      },
    });
  } catch (error) {
    console.error("Error in totalOrderIncome:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.userOrderById = async (req, res) => {
  const { userId } = req.params;

  try {
    const orderDetailsQuery = `
      SELECT
        o.id AS order_id,
        o.totalPrice AS order_total_price,
        o.paymentMethod AS payment_method,
        o.order_status AS status,
        oi.id AS invoice_id,
        oi.path_url AS invoice_pdf,
        oi.created_at AS invoice_created_at
      FROM
        orders o
      LEFT JOIN
        order_invoice oi ON o.id = oi.order_id
      WHERE
        o.userId = ?
      ORDER BY
        o.id;
    `;

    const [orderDetails] = await db.execute(orderDetailsQuery, [userId]);

    const aggregateQuery = `
      SELECT
        COUNT(o.id) AS order_count,
        SUM(o.totalPrice) AS total_price,
        COUNT(oi.id) AS invoice_count
      FROM
        orders o
      LEFT JOIN
        order_invoice oi ON o.id = oi.order_id
      WHERE
        o.userId = ?;
    `;

    const [aggregateData] = await db.execute(aggregateQuery, [userId]);

    return res.json({
      success: true,
      orderDetails,
      aggregateData: aggregateData[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "An error occurred",
    });
  }
};

exports.statusUpdate = async (req, res) => {
  const { orderId } = req.params;
  const {
    status,
    name,
    statusName,
    orderStatus,
    order_progress_status,
    paymentStatus,
    orderPaymentStatus,
    totalPrice,
    paymentMethod,
    cancelReason,
    cancel_reason,
    courierName,
    courier_name,
    courierPartner,
    trackingNumber,
    tracking_number,
    awbNumber,
    awb_number,
  } = req.body;

  if (!orderId) {
    return res.status(400).json({ success: false, message: "Order ID is required" });
  }

  const currentDate = new Date().toISOString().split("T")[0];
  const finalCourier = courierName || courier_name || courierPartner || "";
  const finalTrackingNum = trackingNumber || tracking_number || awbNumber || awb_number || "";

  try {
    const orderQuery = `SELECT id AS orderId, userId, order_status, status FROM orders WHERE id = ?`;
    const [orderRows] = await db.query(orderQuery, [orderId]);

    if (!orderRows || orderRows.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    const currentOrder = orderRows[0];
    const resolvedProgressStatus = order_progress_status || orderStatus || statusName || name || status || "processing";
    const resolvedPaymentStatus = paymentStatus || orderPaymentStatus || null;
    const resolvedCancelReason = cancelReason || cancel_reason || null;

    // 1. Determine main order table status
    let resolvedOrderStatus = currentOrder.order_status || "pending";
    const lowerProgress = resolvedProgressStatus.toLowerCase();
    if (lowerProgress.includes("deliver") || lowerProgress.includes("complete")) {
      resolvedOrderStatus = "complete";
    } else if (lowerProgress.includes("dispatch") || lowerProgress.includes("transit") || lowerProgress.includes("ship")) {
      resolvedOrderStatus = "dispatched";
    } else if (lowerProgress.includes("cancel") || lowerProgress.includes("error") || lowerProgress.includes("reject")) {
      resolvedOrderStatus = "cancel";
    } else if (lowerProgress.includes("process") || lowerProgress.includes("pack") || lowerProgress.includes("confirm")) {
      resolvedOrderStatus = "pending";
    } else if (orderStatus) {
      resolvedOrderStatus = orderStatus;
    }

    // 2. Update orders table
    let orderUpdateFields = [`order_status = ?`];
    let orderUpdateValues = [resolvedOrderStatus];

    if (resolvedPaymentStatus) {
      orderUpdateFields.push(`status = ?`);
      orderUpdateValues.push(resolvedPaymentStatus);
    }
    if (totalPrice !== undefined && totalPrice !== null) {
      orderUpdateFields.push(`totalPrice = ?`);
      orderUpdateValues.push(totalPrice);
    }
    if (paymentMethod) {
      orderUpdateFields.push(`paymentMethod = ?`);
      orderUpdateValues.push(paymentMethod);
    }
    if (resolvedCancelReason) {
      orderUpdateFields.push(`cancel_reason = ?`);
      orderUpdateValues.push(resolvedCancelReason);
    }

    orderUpdateValues.push(orderId);
    await db.query(`UPDATE orders SET ${orderUpdateFields.join(", ")} WHERE id = ?`, orderUpdateValues);

    // 3. Update or initialize order_tracking table
    const [trackingRows] = await db.query(`SELECT status FROM order_tracking WHERE order_id = ?`, [orderId]);

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

    const isDelivered = resolvedOrderStatus === "complete" || lowerProgress.includes("deliver");
    const isDispatched = resolvedOrderStatus === "dispatched" || lowerProgress.includes("dispatch") || lowerProgress.includes("ship");
    const isCancelled = resolvedOrderStatus === "cancel" || lowerProgress.includes("cancel") || status === "error";

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
        const itemObj = { 
          ...step, 
          status: isDelivered ? "completed" : (isDispatched ? "processing" : "pending"), 
          date: currentDate 
        };
        if (finalCourier) itemObj.courier = finalCourier;
        if (finalTrackingNum) itemObj.trackingNumber = finalTrackingNum;
        return itemObj;
      }
      if (stepName.includes("deliver")) {
        return { ...step, status: isDelivered ? "completed" : "pending", date: currentDate };
      }
      return step;
    });

    if (trackingRows.length > 0) {
      await db.query(
        `UPDATE order_tracking SET status = ?, order_progress_status = ? WHERE order_id = ?`,
        [JSON.stringify(trackingTimeline), resolvedProgressStatus, orderId]
      );
    } else {
      await db.query(
        `INSERT INTO order_tracking (order_id, status, order_progress_status) VALUES (?, ?, ?)`,
        [orderId, JSON.stringify(trackingTimeline), resolvedProgressStatus]
      );
    }

    // 4. Send Smart Notifications to User
    try {
      if (currentOrder.userId) {
        let notifTitle = "Order Update";
        let notifBody = `Hello! Your order status has changed to ${resolvedProgressStatus}. Track your order 📱`;

        if (isDispatched) {
          notifTitle = "Order Dispatched 🚚";
          if (finalCourier && finalTrackingNum) {
            notifBody = `Your sacred order #${orderId} is dispatched via ${finalCourier} (AWB: ${finalTrackingNum}). Track delivery on app!`;
          } else if (finalCourier) {
            notifBody = `Your sacred order #${orderId} is dispatched via ${finalCourier}.`;
          } else {
            notifBody = `Your sacred order #${orderId} has been dispatched and is on its way!`;
          }
        } else if (isDelivered) {
          notifTitle = "Order Delivered ✨";
          notifBody = `Blessed! Your sacred order #${orderId} has been safely delivered. Thank you for choosing PrabhuPooja! 🙏`;
        } else if (isCancelled) {
          notifTitle = "Order Cancelled";
          notifBody = `Your order #${orderId} has been cancelled. ${resolvedCancelReason ? `Reason: ${resolvedCancelReason}` : ''}`;
        }

        await sendNotificationToUser(notifTitle, notifBody, currentOrder.userId);
        await sendUserNotification(currentOrder.userId, notifTitle, notifBody);
      }
    } catch (nErr) {
      console.warn("Notification notice:", nErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Order status updated to ${resolvedOrderStatus} and tracking step set to ${resolvedProgressStatus}.`,
      data: {
        orderId: Number(orderId),
        orderStatus: resolvedOrderStatus,
        order_progress_status: resolvedProgressStatus,
        courier: finalCourier || null,
        trackingNumber: finalTrackingNum || null,
        trackingStatus: trackingTimeline,
      },
    });
  } catch (err) {
    console.error("Error in statusUpdate:", err);
    return res.status(500).json({
      success: false,
      message: "Error updating order status.",
      error: err.message,
    });
  }
};

/**
 * 1. User Initiates Return / Refund / Replacement Request
 */
exports.returnOrder = async (req, res) => {
  const {
    order_id,
    orderId,
    request_type = "refund", // "refund" or "replacement"
    reason,
    product_id,
    amount,
    upi_id,
    account_holder_name,
    bank_name,
    account_number,
    ifsc_code,
    proof_images
  } = req.body;

  const targetOrderId = order_id || orderId;
  if (!targetOrderId) {
    return res.status(400).json({ success: false, message: "Order ID is required" });
  }

  try {
    const [originalOrder] = await db.query("SELECT * FROM orders WHERE id = ?", [targetOrderId]);

    if (!originalOrder || originalOrder.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = originalOrder[0];
    const orderStatusLower = String(order.order_status || order.status || "").toLowerCase();

    // Check if order was delivered / completed
    if (!["complete", "completed", "delivered"].includes(orderStatusLower)) {
      return res.status(400).json({
        success: false,
        message: "Return / Replacement is only allowed after the order is delivered."
      });
    }

    const [existingReturn] = await db.query("SELECT * FROM order_return WHERE order_id = ?", [targetOrderId]);

    const resolvedAmount = amount ? parseFloat(amount) : parseFloat(order.totalPrice || 0);
    const resolvedMerchantId = order.merchantId ? (typeof order.merchantId === 'object' ? JSON.stringify(order.merchantId) : String(order.merchantId)) : null;
    const resolvedProductId = product_id ? (typeof product_id === 'object' ? JSON.stringify(product_id) : String(product_id)) : (typeof order.productId === 'object' ? JSON.stringify(order.productId) : String(order.productId));
    const resolvedProof = proof_images ? (Array.isArray(proof_images) ? JSON.stringify(proof_images) : String(proof_images)) : null;

    if (existingReturn.length > 0) {
      // Update existing return request
      await db.query(`
        UPDATE order_return 
        SET 
          request_type = ?, 
          reason = ?, 
          amount = ?, 
          upi_id = ?, 
          account_holder_name = ?, 
          bank_name = ?, 
          account_number = ?, 
          ifsc_code = ?, 
          proof_images = ?,
          admin_status = 'pending',
          refund_status = 'pending',
          updatedAt = NOW()
        WHERE order_id = ?
      `, [
        request_type,
        reason || null,
        resolvedAmount,
        upi_id || null,
        account_holder_name || null,
        bank_name || null,
        account_number || null,
        ifsc_code || null,
        resolvedProof,
        targetOrderId
      ]);

      return res.status(200).json({
        success: true,
        message: `${request_type === 'replacement' ? 'Replacement' : 'Refund'} request updated successfully. Admin is reviewing your request.`
      });
    }

    const insertQuery = `
      INSERT INTO order_return 
      (order_id, user_id, merchant_id, product_id, amount, request_type, reason, upi_id, account_holder_name, bank_name, account_number, ifsc_code, proof_images, refund_status, admin_status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')
    `;

    await db.query(insertQuery, [
      targetOrderId,
      order.userId,
      resolvedMerchantId,
      resolvedProductId,
      resolvedAmount,
      request_type,
      reason || null,
      upi_id || null,
      account_holder_name || null,
      bank_name || null,
      account_number || null,
      ifsc_code || null,
      resolvedProof
    ]);

    // Send Notification to Admin & User
    try {
      if (order.userId) {
        await sendNotification(order.userId, `Your ${request_type} request for Order #${targetOrderId} has been received.`);
      }
    } catch (nErr) {}

    return res.status(201).json({
      success: true,
      message: `${request_type === 'replacement' ? 'Replacement' : 'Refund'} request submitted successfully! Admin will review and process your request.`
    });
  } catch (error) {
    console.error("Error in returnOrder:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

/**
 * 2. Admin: Get All Returns & Replacements Across All Orders
 */
exports.getAllReturnsForAdmin = async (req, res) => {
  try {
    const { status, type, search, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;

    let whereClauses = [];
    let queryParams = [];

    if (status && status !== 'all') {
      whereClauses.push('(ret.admin_status = ? OR ret.refund_status = ?)');
      queryParams.push(status, status);
    }

    if (type && type !== 'all') {
      whereClauses.push('ret.request_type = ?');
      queryParams.push(type);
    }

    if (search && search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      whereClauses.push('(ret.order_id LIKE ? OR u.name LIKE ? OR u.mobile LIKE ? OR s.shop_name LIKE ? OR s.seller_name LIKE ? OR ret.upi_id LIKE ?)');
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*) AS total 
      FROM order_return ret
      LEFT JOIN users u ON ret.user_id = u.id
      LEFT JOIN orders o ON ret.order_id = o.id
      LEFT JOIN sellers s ON (ret.merchant_id = s.id OR ret.merchant_id = CONCAT('"', s.id, '"'))
      ${whereSql}
    `;
    const [[{ total }]] = await db.query(countQuery, queryParams);

    const dataQuery = `
      SELECT 
        ret.*,
        u.name AS userName,
        u.mobile AS userMobile,
        u.email AS userEmail,
        o.totalPrice AS orderTotalPrice,
        o.paymentMethod AS orderPaymentMethod,
        o.createdAt AS orderCreatedAt,
        s.id AS sellerId,
        s.seller_name AS sellerName,
        s.shop_name AS shopName,
        s.number AS sellerMobile,
        s.email AS sellerEmail,
        s.wallet_balance AS sellerWalletBalance
      FROM order_return ret
      LEFT JOIN users u ON ret.user_id = u.id
      LEFT JOIN orders o ON ret.order_id = o.id
      LEFT JOIN sellers s ON (ret.merchant_id = s.id OR ret.merchant_id = CONCAT('"', s.id, '"'))
      ${whereSql}
      ORDER BY ret.createdAt DESC
      LIMIT ? OFFSET ?
    `;

    const [returns] = await db.query(dataQuery, [...queryParams, limitNum, offset]);

    return res.status(200).json({
      success: true,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
      data: returns
    });
  } catch (error) {
    console.error("Error in getAllReturnsForAdmin:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

/**
 * 3. Admin: Update Return Status (Approve / Reject / Process Refund / Replacement Courier)
 */
exports.updateReturnStatusByAdmin = async (req, res) => {
  const { id } = req.params;
  const {
    status, // "approved", "rejected", "refunded", "replaced"
    admin_remarks,
    adminRemarks,
    transaction_reference,
    transactionReference,
    payment_receipt,
    paymentReceipt,
    replacement_tracking_id,
    replacementTrackingId,
    replacement_courier,
    replacementCourier
  } = req.body;

  if (!id || !status) {
    return res.status(400).json({ success: false, message: "Return Request ID and status are required" });
  }

  try {
    const [existing] = await db.query("SELECT * FROM order_return WHERE id = ? OR order_id = ?", [id, id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Return request not found" });
    }

    const retRecord = existing[0];
    const prevStatus = (retRecord.admin_status || '').toLowerCase();
    const newStatusLower = status.toLowerCase();

    const resolvedRemarks = admin_remarks || adminRemarks || null;
    const resolvedRef = transaction_reference || transactionReference || null;
    const resolvedReceipt = payment_receipt || paymentReceipt || null;
    const resolvedTracking = replacement_tracking_id || replacementTrackingId || null;
    const resolvedCourier = replacement_courier || replacementCourier || null;

    // Handle Seller Wallet Deduction when Refund is marked completed/refunded
    let sellerId = retRecord.merchant_id;
    if (typeof sellerId === 'string' && sellerId.startsWith('"')) {
      try { sellerId = JSON.parse(sellerId); } catch (e) {}
    }

    if (newStatusLower === 'refunded' && retRecord.wallet_deducted === 0 && sellerId) {
      const refundAmount = parseFloat(retRecord.amount || 0);
      if (refundAmount > 0) {
        try {
          await db.query("UPDATE sellers SET wallet_balance = GREATEST(0, wallet_balance - ?) WHERE id = ?", [refundAmount, sellerId]);
          console.log(`✓ Deducted ₹${refundAmount} from seller #${sellerId} wallet balance for refunded order #${retRecord.order_id}`);
        } catch (wErr) {
          console.warn("Error deducting seller wallet for refund:", wErr.message);
        }
      }
    }

    const updateQuery = `
      UPDATE order_return 
      SET 
        admin_status = ?, 
        refund_status = ?,
        admin_remarks = COALESCE(?, admin_remarks),
        transaction_reference = COALESCE(?, transaction_reference),
        payment_receipt = COALESCE(?, payment_receipt),
        replacement_tracking_id = COALESCE(?, replacement_tracking_id),
        replacement_courier = COALESCE(?, replacement_courier),
        wallet_deducted = CASE WHEN ? = 'refunded' THEN 1 ELSE wallet_deducted END,
        updatedAt = NOW()
      WHERE id = ?
    `;

    await db.query(updateQuery, [
      status,
      status,
      resolvedRemarks,
      resolvedRef,
      resolvedReceipt,
      resolvedTracking,
      resolvedCourier,
      newStatusLower,
      retRecord.id
    ]);

    // Notify User
    if (retRecord.user_id) {
      try {
        let msg = `Your ${retRecord.request_type} request for Order #${retRecord.order_id} has been ${status}.`;
        if (newStatusLower === 'refunded' && resolvedRef) msg += ` UTR: ${resolvedRef}`;
        if (newStatusLower === 'replaced' && resolvedTracking) msg += ` Courier Tracking: ${resolvedTracking} (${resolvedCourier || 'Standard'})`;
        await sendNotification(retRecord.user_id, msg);
      } catch (nErr) {}
    }

    // Notify Seller
    if (sellerId) {
      try {
        await sendNotification(sellerId, `Order #${retRecord.order_id} ${retRecord.request_type} status was updated to ${status} by Admin.`);
      } catch (sErr) {}
    }

    return res.status(200).json({
      success: true,
      message: `Return request #${retRecord.id} status updated to ${status}`
    });
  } catch (error) {
    console.error("Error in updateReturnStatusByAdmin:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

// Backwards compatibility alias for refundOrder
exports.refundOrder = exports.updateReturnStatusByAdmin;

/**
 * 4. Seller: Get Return & Replacement Requests for this Seller's Shop
 */
exports.getSellerReturns = async (req, res) => {
  try {
    const sellerId = req.user.id || req.user.userId;
    const { status, type, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;

    const sellerIdStr = String(sellerId);
    const sellerIdJson = JSON.stringify(sellerId);

    let whereClauses = ["(ret.merchant_id = ? OR ret.merchant_id = ? OR JSON_CONTAINS(ret.merchant_id, ?) OR JSON_CONTAINS(ret.merchant_id, ?) OR ret.merchant_id LIKE ?)"];
    let queryParams = [sellerId, sellerIdStr, sellerIdJson, `"${sellerIdStr}"`, `%"${sellerIdStr}"%`];

    if (status && status !== 'all') {
      whereClauses.push('(ret.admin_status = ? OR ret.refund_status = ?)');
      queryParams.push(status, status);
    }

    if (type && type !== 'all') {
      whereClauses.push('ret.request_type = ?');
      queryParams.push(type);
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const countQuery = `SELECT COUNT(*) AS total FROM order_return ret ${whereSql}`;
    const [[{ total }]] = await db.query(countQuery, queryParams);

    const dataQuery = `
      SELECT 
        ret.*,
        u.name AS userName,
        u.mobile AS userMobile,
        o.totalPrice AS orderTotalPrice,
        o.shipping_address AS shippingAddress,
        o.createdAt AS orderDate
      FROM order_return ret
      LEFT JOIN users u ON ret.user_id = u.id
      LEFT JOIN orders o ON ret.order_id = o.id
      ${whereSql}
      ORDER BY ret.createdAt DESC
      LIMIT ? OFFSET ?
    `;

    const [returns] = await db.query(dataQuery, [...queryParams, limitNum, offset]);

    return res.status(200).json({
      success: true,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
      data: returns
    });
  } catch (error) {
    console.error("Error in getSellerReturns:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

/**
 * 5. User: Get My Return / Replacement Status
 */
exports.getUserReturns = async (req, res) => {
  try {
    const userId = req.params.userId || (req.user && req.user.id);
    const { orderId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    let whereClauses = ["ret.user_id = ?"];
    let queryParams = [userId];

    if (orderId) {
      whereClauses.push("ret.order_id = ?");
      queryParams.push(orderId);
    }

    const dataQuery = `
      SELECT 
        ret.*,
        o.totalPrice AS orderTotalPrice,
        o.createdAt AS orderDate,
        s.shop_name AS shopName
      FROM order_return ret
      LEFT JOIN orders o ON ret.order_id = o.id
      LEFT JOIN sellers s ON (ret.merchant_id = s.id OR ret.merchant_id = CONCAT('"', s.id, '"'))
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY ret.createdAt DESC
    `;

    const [returns] = await db.query(dataQuery, queryParams);

    return res.status(200).json({
      success: true,
      count: returns.length,
      data: returns
    });
  } catch (error) {
    console.error("Error in getUserReturns:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

exports.getOrderTrackingByStatus = async (req, res) => {
  const { status } = req.params;
  let { limit, page } = req.query;

  limit = parseInt(limit) || 10;
  page = parseInt(page) || 1;
  const offset = (page - 1) * limit;

  try {
    // Get counts of each order_progress_status
    const [statusCounts] = await db.query(`
      SELECT order_progress_status, COUNT(*) as count
      FROM order_tracking
      GROUP BY order_progress_status
    `);

    // Get count of unpaid orders
    const [unpaidOrders] = await db.query(`
      SELECT COUNT(*) as count FROM orders WHERE status = 'unpaid'
    `);

    // Get count of paid orders
    const [paidOrders] = await db.query(`
      SELECT COUNT(*) as count FROM orders WHERE status = 'paid'
    `);

    // Get total return amount
    const [totalReturnAmount] = await db.query(`
      SELECT SUM(amount) as totalReturnAmount FROM order_return
    `);
    let entriesByStatus = [];
    let totalEntries = 0;
    let totalPages = 0;

    if (status) {
      // Count total entries for this status
      const [countResult] = await db.query(
        `
        SELECT COUNT(*) as total FROM order_tracking WHERE order_progress_status = ?
      `,
        [status]
      );

      totalEntries = countResult[0]?.total || 0;
      totalPages = Math.ceil(totalEntries / limit);

      // Fetch paginated tracking entries
      const [trackingEntries] = await db.query(
        `
        SELECT * FROM order_tracking
        WHERE order_progress_status = ?
        LIMIT ? OFFSET ?
      `,
        [status, limit, offset]
      );

      for (const entry of trackingEntries) {
        // Get associated order
        const [orderResults] = await db.query(
          `
          SELECT * FROM orders WHERE id = ?
        `,
          [entry.order_id]
        );

        const order = orderResults[0];

        if (order) {
          // let productIds = [];

          // const rawProductId = order.productId;
          // if (typeof rawProductId === 'string') {
          //   productIds = rawProductId.split(',').map(id => parseInt(id.trim()));
          // } else if (Array.isArray(rawProductId)) {
          //   productIds = rawProductId;
          // } else if (typeof rawProductId === 'number') {
          //   productIds = [rawProductId];
          // }

          // Attach user info
          const [userResult] = await db.query(
            `
            SELECT id, name, email, mobile FROM users WHERE id = ?
          `,
            [order.userId]
          );
          entry.user = userResult[0] || {};

          // Attach order-specific info
          // entry.shipping_address = order.shipping_address;
          entry.totalPrice = order.totalPrice;
          // entry.quantity = order.quantity;

          // Attach product info
          // if (productIds.length > 0) {
          //   const [productDetails] = await db.query(`
          //     SELECT * FROM products WHERE id IN (?)
          //   `, [productIds]);

          //   for (const product of productDetails) {
          //     const [sellerDetails] = await db.query(`
          //       SELECT id, seller_name, shop_name, number FROM sellers WHERE id = ?
          //     `, [product.merchantId]);
          //     product.seller = sellerDetails[0] || {};
          //   }

          //   entry.products = productDetails;
          // } else {
          //   entry.products = [];
          // }
        } else {
          entry.products = [];
          entry.user = {};
        }

        // Remove unwanted fields
        delete entry.created_at;
        delete entry.updated_at;
        delete entry.estimated_delivery_start;
        delete entry.estimated_delivery_end;
        delete entry.status;
        delete entry.status_date;
      }

      entriesByStatus = trackingEntries;
    }

    return res.status(200).json({
      success: true,
      statusCounts,
      filteredEntries: entriesByStatus,
      unpaidOrdersCount: unpaidOrders[0]?.count || 0,
      paidOrderCount: paidOrders[0]?.count || 0,
      totalReturnAmount: totalReturnAmount[0]?.totalReturnAmount || 0,
      pagination: {
        page,
        limit,
        totalPages,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error retrieving tracking data" });
  }
};

exports.TrackingStatus = async (req, res) => {
  try {
    const { status } = req.params;
    let { limit, page, section } = req.query;

    limit = parseInt(limit) || 10;
    page = parseInt(page) || 1;
    const offset = (page - 1) * limit;

    // Default to fetching both if no section specified
    const fetchOrders = !section || section === "orders";
    const fetchReturns = !section || section === "returns";

    let orders = [];
    let orderReturns = [];
    let orderPagination = {};
    let returnPagination = {};

    if (fetchOrders) {
      const [orderCountResult] = await db.query(
        `
        SELECT COUNT(*) as total FROM orders WHERE status = ?
      `,
        [status]
      );

      const totalOrderEntries = orderCountResult[0]?.total || 0;
      const totalOrderPages = Math.ceil(totalOrderEntries / limit);

      const [ordersResult] = await db.query(
        `
        SELECT * FROM orders WHERE status = ? LIMIT ? OFFSET ?
      `,
        [status, limit, offset]
      );

      console.log(ordersResult);
      for (const order of ordersResult) {
        if (order.userId) {
          const [userDetails] = await db.query(
            `
            SELECT id, name, email, mobile FROM users WHERE id = ?
          `,
            [order.userId]
          );
          order.user = userDetails[0] || null;
        } else {
          order.user = null;
        }
      }

      orders = ordersResult;
      orderPagination = {
        page,
        limit,
        totalEntries: totalOrderEntries,
        totalPages: totalOrderPages,
      };
    }

    // --- Order Returns Section ---
    if (fetchReturns) {
      const [returnCountResult] = await db.query(`
        SELECT COUNT(*) as total FROM order_return
      `);

      const totalReturnEntries = returnCountResult[0]?.total || 0;
      const totalReturnPages = Math.ceil(totalReturnEntries / limit);

      const [returnsResult] = await db.query(
        `
        SELECT * FROM order_return LIMIT ? OFFSET ?
      `,
        [limit, offset]
      );

      for (const returnOrder of returnsResult) {
        let productIds = [];
        const rawProductId = returnOrder.product_id;

        if (typeof rawProductId === "string") {
          productIds = rawProductId.split(",").map((id) => parseInt(id.trim()));
        } else if (Array.isArray(rawProductId)) {
          productIds = rawProductId;
        } else if (typeof rawProductId === "number") {
          productIds = [rawProductId];
        }

        if (productIds.length > 0) {
          const [productDetails] = await db.query(
            `
            SELECT * FROM products WHERE id IN (?)
          `,
            [productIds]
          );

          for (const item of productDetails) {
            if (item.merchantId) {
              const [sellerDetails] = await db.query(
                `
                SELECT id, seller_name, shop_name, number FROM sellers WHERE id = ?
              `,
                [item.merchantId]
              );
              item.seller = sellerDetails[0] || {};
            } else {
              item.seller = {};
            }
          }

          returnOrder.products = productDetails;
        } else {
          returnOrder.products = [];
        }

        if (returnOrder.user_id) {
          const [userDetails] = await db.query(
            `
            SELECT id, name, email, mobile FROM users WHERE id = ?
          `,
            [returnOrder.user_id]
          );
          returnOrder.user = userDetails[0] || null;
        } else {
          returnOrder.user = null;
        }
      }

      orderReturns = returnsResult;
      returnPagination = {
        page,
        limit,
        totalEntries: totalReturnEntries,
        totalPages: totalReturnPages,
      };
    }

    // Final response
    return res.status(200).json({
      success: true,
      orders,
      orderPagination,
      orderReturns,
      returnPagination,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.getByOrderId = async (req, res) => {
  const { orderId } = req.params;

  if (!orderId) {
    return res.status(400).send({
      success: false,
      message: "Order ID is required",
    });
  }

  try {
    // 1. Fetch order and user details
    const orderQuery = `
      SELECT 
          orders.id AS orderId,
          orders.totalPrice,
          orders.productId,
          orders.userId,
          orders.paymentMethod,
          orders.images,
          orders.quantity,
          orders.order_status,
          orders.shipping_address,
          users.name AS userName,
          users.lastname AS userLast,
          users.email AS userEmail,
          users.mobile AS userPhone,
          orders.createdAt AS orderDate
      FROM orders
      INNER JOIN users ON orders.userId = users.id
      WHERE orders.id = ?
    `;
    const [order] = await db.query(orderQuery, [orderId]);

    if (!order || order.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Order not found",
      });
    }

    const orderDetails = order[0];

    let productIds = [];

    try {
      if (typeof orderDetails.productId === "string") {
        if (orderDetails.productId.includes("[")) {
          // JSON format
          productIds = JSON.parse(orderDetails.productId);
        } else {
          // Comma-separated
          productIds = orderDetails.productId.split(",").map((id) => id.trim());
        }
      } else if (Array.isArray(orderDetails.productId)) {
        productIds = orderDetails.productId;
      }
    } catch (err) {
      console.error("Failed to parse productId array:", err);
    }

    // 2. Fetch product + merchant details for each productId
    const productDetails = await Promise.all(
      productIds.map(async (productId) => {
        const productQuery = `
          SELECT 
              p.id AS productId, 
              p.productName, 
              p.merchantId,
              p.offerPrice AS productOfferPrice,
              s.seller_name AS merchantName,
              s.address AS location,
              s.email AS merchantEmail,
              s.number AS merchantPhone,
              s.shop_name AS shopName
          FROM products p
          INNER JOIN sellers s ON p.merchantId = s.id
          WHERE p.id = ?
        `;
        const [productResult] = await db.query(productQuery, [productId]);
        return productResult[0]; // Each query returns array
      })
    );

    // 3. Get invoice URL
    const invoiceQuery = `
      SELECT path_url 
      FROM order_invoice 
      WHERE order_id = ? AND user_id = ?
    `;
    const [invoiceResult] = await db.query(invoiceQuery, [
      orderId,
      orderDetails.userId,
    ]);

    const pathUrl =
      invoiceResult.length > 0 ? invoiceResult[0].path_url : "No invoice found";

    return res.status(200).send({
      success: true,
      order: orderDetails,
      products: productDetails.filter(Boolean), // remove undefined/null if any
      invoiceUrl: pathUrl,
    });
  } catch (error) {
    console.error("Error in getByOrderId:", error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.RecentOrders = async (req, res) => {
  try {
    const query = "SELECT * FROM orders ORDER BY createdAt DESC LIMIT 5;";
    const [orders] = await db.query(query);

    for (let order of orders) {
      let productIds = [];

      if (order.productId) {
        try {
          productIds = JSON.parse(order.productId);

          if (!Array.isArray(productIds)) {
            productIds = [productIds];
          }
        } catch (err) {
          // Agar JSON parse fail hua, to comma separated string samajh ke handle karo
          if (typeof order.productId === "string") {
            productIds = order.productId.split(",").map((id) => id.trim());
          } else {
            productIds = [order.productId];
          }
        }
      }

      // Filter out null/undefined/empty string
      productIds = productIds.filter((id) => id);

      if (productIds.length > 0) {
        const placeholders = productIds.map(() => "?").join(",");
        const productQuery = `SELECT * FROM products WHERE id IN (${placeholders})`;
        const [products] = await db.query(productQuery, productIds);

        order.products = products;
      } else {
        order.products = [];
      }
    }

    return res.status(200).json({
      message: "Recent orders with product details fetched successfully",
      data: orders,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

/**
 * Download or Stream Official Order Invoice (PDF) on-demand
 */
exports.downloadOrderInvoice = async (req, res) => {
  const { orderId } = req.params;
  if (!orderId) {
    return res.status(400).json({ success: false, message: "Order ID is required" });
  }

  try {
    // 1. Check if invoice exists in order_invoice table
    const [invoiceRows] = await db.query(
      "SELECT path_url FROM order_invoice WHERE order_id = ? ORDER BY id DESC LIMIT 1",
      [orderId]
    );

    if (invoiceRows.length > 0 && invoiceRows[0].path_url) {
      const url = invoiceRows[0].path_url.trim();
      if (url.startsWith("http://") || url.startsWith("https://")) {
        return res.redirect(url);
      }
    }

    // 2. If not already stored, generate invoice on-demand from order & product data
    const [orders] = await db.query("SELECT * FROM orders WHERE id = ?", [orderId]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = orders[0];
    const [userRows] = await db.query("SELECT * FROM users WHERE id = ?", [order.userId]);
    const user = userRows[0] || { name: "Customer", lastname: "", email: "support@prabhupooja.com", mobile: "N/A" };

    let productIds = [];
    try {
      productIds = JSON.parse(order.productId);
      if (!Array.isArray(productIds)) productIds = [productIds];
    } catch (e) {
      if (typeof order.productId === "string" && order.productId.includes(",")) {
        productIds = order.productId.split(",").map((s) => s.trim());
      } else {
        productIds = [order.productId];
      }
    }
    productIds = productIds.filter(Boolean);

    let productRows = [];
    if (productIds.length > 0) {
      const placeholders = productIds.map(() => "?").join(",");
      const [prods] = await db.query(`SELECT * FROM products WHERE id IN (${placeholders})`, productIds);
      productRows = prods;
    }

    let quantities = [1];
    try {
      quantities = JSON.parse(order.quantity);
    } catch (e) {
      quantities = [order.quantity || 1];
    }

    let shippingAddress = {};
    try {
      shippingAddress = typeof order.shipping_address === "string" ? JSON.parse(order.shipping_address) : order.shipping_address;
    } catch (e) {
      shippingAddress = { address: order.shipping_address || "Standard Delivery Address" };
    }

    const filePath = await generateInvoice({
      user,
      products: productRows,
      order,
      quantities: Array.isArray(quantities) ? quantities : [quantities],
      address: shippingAddress || {},
    });

    const fileName = path.basename(filePath);
    const backendBaseUrl = process.env.BACKEND_URL || "http://localhost:3002";
    const localUrl = `${backendBaseUrl}/invoices/${fileName}`;

    // Save for future calls
    try {
      await db.query(
        `INSERT INTO order_invoice (user_id, order_id, path_url) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE path_url = VALUES(path_url)`,
        [order.userId, orderId, localUrl]
      );
    } catch (iErr) {}

    return res.sendFile(filePath);
  } catch (error) {
    console.error("Error generating invoice on-demand:", error);
    return res.status(500).json({ success: false, message: "Failed to generate invoice", error: error.message });
  }
};
