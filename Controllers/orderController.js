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


const uploadPdfToS3 = async (filePath) => {
  const fileName = path.basename(filePath);
  const fileStream = fs.createReadStream(filePath);

  const uploadParams = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `invoices/${fileName}`,
    Body: fileStream,
    ContentType: "application/pdf",
    // ACL: "public-read",
  };

  const command = new PutObjectCommand(uploadParams);
  await s3.send(command);

  const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/invoices/${fileName}`;
  return fileUrl;
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
    const imagesArray = Array.isArray(images) ? images : [images];

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

    for (const productId of productIdArray) {
      const [rows] = await db.query("SELECT * FROM products WHERE id = ?", [
        productId,
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
      "SELECT name, email FROM users WHERE id = ?",
      [userId]
    );
    const order = {
      id: result.insertId,
      date: new Date().toLocaleDateString(),
    };

    if (user && user[0]?.email) {
      try {
        const filePath = await generateInvoice({
          user: userRows[0],
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
          subject: "Order Confirmation",
          text: `Dear ${user[0].name},\n\nYour order has been placed. Thank you for shopping with us!\n\nBest regards,\nPrabhuPooja`,
          attachments: [
            {
              filename: "order-invoice.pdf",
              path: filePath,
            },
          ],
        };

        await transporter.sendMail(mailOptions);

        const fileName = filePath.split("/").pop();

        const invoiceUrl = await uploadPdfToS3(filePath, fileName);

        fs.unlinkSync(filePath);

        const [invoice] = await db.query(
          `INSERT INTO order_invoice (user_id, order_id, path_url) VALUES (?, ?, ?)`,
          [userId, result.insertId, invoiceUrl]
        );
      } catch (emailErr) {
        console.error("Error sending email:", emailErr);
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

    for (let i = 0; i < merchantArray.length; i++) {
      const merchantId = merchantArray[i];
      await sendNotification(merchantId, `New order placed by ${user[0].name}`);
    }

    return res.status(201).send({
      success: true,
      message: "Order created successfully",
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
    const { search } = req.query || "";
    console.log(search, "ds");
    const query = `
      SELECT 
        orders.id AS orderId,
        orders.userId,
        orders.totalPrice AS Price,
        orders.paymentMethod AS Method,
        orders.status AS orderStatus,
        JSON_LENGTH(orders.quantity) AS TotalOrder,
        users.name AS userName,
        users.email AS userEmail,
        orders.createdAt AS orderDate
      FROM orders
      INNER JOIN users ON orders.userId = users.id
      WHERE 
        orders.id LIKE ? OR
        users.name LIKE ? OR
        orders.paymentMethod LIKE ? OR
        orders.status = ?
      ORDER BY orders.createdAt DESC;
    `;

    // For LIKE fields
    const searchPattern = `%${search}%`;

    const data = await db.query(query, [
      searchPattern,
      searchPattern,
      searchPattern,
      search,
    ]);

    if (!data.length) {
      return res.status(404).send({
        success: false,
        message: "No orders found",
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
                orders.cancel_reason,
                 orders.paymentMethod,
                orders.totalPrice,
                orders.images,
                users.name AS userName,
                users.email AS userEmail,
                orders.createdAt AS orderDate
            FROM orders
            INNER JOIN users ON orders.userId = users.id
            WHERE orders.userId = ?
            ORDER BY orders.createdAt DESC
        `;

    const orders = await db.query(query, [userId]);

    if (!orders.length) {
      return res.status(404).send({
        success: false,
        message: "No orders found for this user",
      });
    }
    const orderCount = orders[0].length;

    const orderDetails = await Promise.all(
      orders.map(async (order) => {
        return {
          ...order,
        };
      })
    );

    return res.status(200).send({
      success: true,
      data: {
        orderCount,
        orders: orderDetails[0],
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
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

    if (req.query.search) {
      try {
        const decodedSearch = decodeURIComponent(req.query.search);
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
        o.createdAt AS orderDate,
        o.shipping_address as shippingAddress,
        o.payment_id AS transactionId,
        u.name AS userName,
        u.email AS userEmail,
        u.image As userImage,
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

    const [order] = await db.query(query, [orderId]);

    if (order.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Order not found",
      });
    }

    const productIds = order[0].productId;
    const quantities = order[0].quantity;

    console.log(productIds, "lklklk");

    const [productDetails] = await db.query(
      `SELECT * FROM products WHERE id IN (?)`,
      [productIds]
    );

    const productDetailsWithQuantity = productDetails.map((product) => {
      const index = productIds.indexOf(product.id);
      return {
        ...product,
        quantity: quantities[index],
      };
    });

    const [invoiceRows] = await db.query(
      `SELECT path_url FROM order_invoice WHERE order_id = ?`,
      [orderId]
    );

    const invoiceUrl = invoiceRows.length ? invoiceRows[0].path_url : null;

    return res.status(200).send({
      success: true,
      order: order[0],
      products: productDetailsWithQuantity,
      invoiceUrl: invoiceUrl,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
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
  const { status, name, order_progress_status, paymentStatus } = req.body;

  const currentDate = new Date().toISOString().split("T")[0];

  const orderQuery = `
    SELECT 
        orders.id AS orderId,
        orders.userId
    FROM orders
    WHERE orders.id = ?
`;
  const [order] = await db.query(orderQuery, [orderId]);

  try {
    if (paymentStatus) {
      await db.query(
        `
        UPDATE orders
        SET status = ?
        WHERE id = ?
      `,
        [paymentStatus, orderId]
      );

      await sendNotificationToUser(
        "Payment Status",
        `Payment status updated to ${paymentStatus}`,
        order[0].userId
      );

      await sendUserNotification(
        order[0].userId,
        "Payment Status",
        `Payment status updated to ${paymentStatus}`
      );

      return res.status(200).json({
        success: true,
        message: `Payment status updated to ${paymentStatus}`,
      });
    } else {
      if (!status || !name || !order_progress_status) {
        return res
          .status(400)
          .json({ message: "Missing required fields for status update" });
      }

      if (!["processing", "completed", "error"].includes(status)) {
        return res
          .status(400)
          .json({
            message:
              "Invalid status, allowed values: processing, completed, error",
          });
      }

      const [orderTrackingResult] = await db.query(
        "SELECT status FROM order_tracking WHERE order_id = ?",
        [orderId]
      );

      if (orderTrackingResult.length === 0) {
        return res.status(404).json({ message: "Order not found." });
      }

      let orderTracking = orderTrackingResult[0].status;

      if (status === "error") {
        let anyUpdated = false;
        orderTracking = orderTracking.map((step) => {
          if (step.status === "processing") {
            step.status = "error";
            step.date = currentDate;
            anyUpdated = true;
          }
          return step;
        });

        if (anyUpdated) {
          await db.query(
            `
          UPDATE order_tracking
          SET status = ?
          WHERE order_id = ?
        `,
            [JSON.stringify(orderTracking), orderId]
          );
        }

        await db.query(
          `
        UPDATE orders
        SET order_status = 'cancel', cancel_reason = 'Cancelled by admin'
        WHERE id = ?
      `,
          [orderId]
        );

        return res.status(200).json({
          success: true,
          message:
            "Order has been cancelled and all processing steps marked as error.",
        });
      }

      if (status === "processing") {
        let anyUpdated = false;
        orderTracking = orderTracking.map((step) => {
          if (step.status === "error" || step.name === name) {
            step.status = "processing";
            step.date = currentDate;
            anyUpdated = true;
          }
          return step;
        });

        if (anyUpdated) {
          await db.query(
            `
          UPDATE order_tracking
          SET status = ?
          WHERE order_id = ?
        `,
            [JSON.stringify(orderTracking), orderId]
          );
        }

        await db.query(
          `
        UPDATE orders
        SET order_status = 'pending', cancel_reason = ''
        WHERE id = ?
      `,
          [orderId]
        );
      }
      let updated = false;
      orderTracking = orderTracking.map((step) => {
        if (step.name === name) {
          step.status = status;
          step.date = currentDate;
          updated = true;
        }
        return step;
      });

      if (!updated) {
        return res.status(404).json({ message: "Order step not found." });
      }

      await db.query(
        `
      UPDATE order_tracking
      SET status = ?
      WHERE order_id = ?
    `,
        [JSON.stringify(orderTracking), orderId]
      );

      await db.query(
        `
      UPDATE order_tracking
      SET order_progress_status = ?
      WHERE order_id = ?
    `,
        [order_progress_status, orderId]
      );

      if (name === "Delivered") {
        if (status === "completed") {
          await db.query(
            `
          UPDATE orders
          SET order_status = 'complete'
          WHERE id = ?
        `,
            [orderId]
          );
        } else if (status === "processing") {
          await db.query(
            `
          UPDATE orders
          SET order_status = 'pending'
          WHERE id = ?
        `,
            [orderId]
          );
        }
      }

      // Optional paymentStatus update if sent along with others
      if (paymentStatus) {
        await db.query(
          `
        UPDATE orders 
        SET status = ? 
        WHERE id = ?
      `,
          [paymentStatus, orderId]
        );
      }

      await sendNotificationToUser(
        "Order Update",
        `Hello! Your order status has changed to ${order_progress_status}. Track your order 📱`,
         order[0].userId,
      );

      await sendUserNotification(
        order[0].userId,
        "Order Update",
        `Hello! Your order status has changed to ${order_progress_status}. Track your order 📱`
      );
      return res.status(200).json({
        success: true,
        message: `Order ${name} status updated to ${status} and progress status set to ${order_progress_status}.`,
      });
    }
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Error updating the status or order progress status." });
  }
};

exports.returnOrder = async (req, res) => {
  const { order_id } = req.body;
  if (!order_id) {
    return res.status(400).json({ error: "Order ID is required" });
  }

  try {
    const [originalOrder] = await db.query(
      "SELECT * FROM orders WHERE id = ?",
      [order_id]
    );

    if (!originalOrder || originalOrder.length === 0) {
      return res.status(404).json({ error: "Original order not found" });
    }

    const order = originalOrder[0];

    // Check if order status is complete
    if (order.order_status !== "complete") {
      return res
        .status(400)
        .json({ error: "Order is not complete. Return not allowed." });
    }

    const [existingReturn] = await db.query(
      "SELECT * FROM order_return WHERE order_id = ?",
      [order_id]
    );

    if (existingReturn.length > 0) {
      return res
        .status(400)
        .json({ error: "Return order for this order already exists" });
    }

    const insertQuery = `
      INSERT INTO order_return (order_id, user_id, merchant_id, product_id, amount)
      VALUES (?, ?, ?, ?, ?)
    `;

    await db.query(insertQuery, [
      order_id,
      order.userId,
      JSON.stringify(order.merchantId),
      JSON.stringify(order.productId),
      order.totalPrice,
    ]);

    return res.status(201).json({
      success: true,
      message: "Return order created successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.refundOrder = async (req, res) => {
  const { order_id } = req.params;

  if (!order_id) {
    return res.status(400).json({ error: "Order ID is required" });
  }

  try {
    const [originalOrder] = await db.query(
      "SELECT * FROM orders WHERE id = ?",
      [order_id]
    );

    if (!originalOrder || originalOrder.length === 0) {
      return res.status(404).json({ error: "Original order not found" });
    }

    const order = originalOrder[0];

    if (order.order_status !== "complete") {
      return res
        .status(400)
        .json({ error: "Order is not complete. Return not allowed." });
    }

    const [existingReturn] = await db.query(
      "SELECT * FROM order_return WHERE order_id = ?",
      [order_id]
    );

    if (existingReturn.length === 0) {
      return res
        .status(400)
        .json({ error: "No return order found for this order to update" });
    }

    // Update the existing return record
    await db.query(
      "UPDATE order_return SET refund_status = ?, createdAt = NOW() WHERE order_id = ?",
      [true, order_id]
    );

    return res
      .status(200)
      .json({ message: "Refund status updated successfully." });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "An error occurred while updating the refund status." });
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
