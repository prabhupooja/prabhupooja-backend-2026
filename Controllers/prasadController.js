const db = require("../config/db");
const nodemailer = require('nodemailer');
const { getCache, setCache, deleteCache } = require("../config/redis");

exports.create = async (req, res) => {
  const { prasad_name, price, temple_id } = req.body;
  const image = req.file?.location;
  if (!image) {
    return res.status(400).send({
      success: false,
      message: "Image file is required"
    });
  }

  try {
    const data = await db.query(`INSERT INTO prasad (prasad_name,price,temple_id, image) VALUES (?,?, ?,?)`, [prasad_name, price, temple_id, image]);

    if (!data) {
      return res.status(404).send({
        success: false,
        message: "Error in insert query"
      });
    }

    // Invalidate prasad cache
    await deleteCache("prasad:*");

    return res.status(201).send({
      success: true,
      message: "prasad created successfully"
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.get = async (req, res) => {
  const cacheKey = "prasad:all";
  try {
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      res.setHeader("X-Cache", "HIT");
      return res.status(200).send({
        success: true,
        data: cachedData,
      });
    }

    const [temples] = await db.query("SELECT * FROM prasad");

    if (!temples || temples.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No prashad found",
      });
    }

    // Cache for 10 minutes (600s)
    await setCache(cacheKey, temples, 600);
    res.setHeader("X-Cache", "MISS");

    return res.status(200).send({
      success: true,
      data: temples,
    });
  } catch (error) {
    console.error("Error fetching prashad:", error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `prasad:item:${id}`;

    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      res.setHeader("X-Cache", "HIT");
      return res.status(200).send({
        success: true,
        data: cachedData,
      });
    }

    const [data] = await db.query(`SELECT * FROM prasad WHERE id = ?`, [id]);

    if (!data || data.length === 0) {
      return res.status(404).send({
        success: false,
        message: "prasad not found",
      });
    }

    await setCache(cacheKey, data[0], 600);
    res.setHeader("X-Cache", "MISS");

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

exports.update = async (req, res) => {
  const { id } = req.params;
  const { prasad_name, price, temple_id } = req.body;
  const image = req.file ? req.file.location : null;

  try {
    const [existingService] = await db.query(`SELECT * FROM prasad WHERE id = ?`, [id]);

    if (!existingService || existingService.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Prasad not found",
      });
    }

    // Dynamically build the SET clause of the UPDATE query
    const updateFields = [];
    const updateValues = [];

    if (prasad_name) {
      updateFields.push("prasad_name = ?");
      updateValues.push(prasad_name);
    }

    if (price) {
      updateFields.push("price = ?");
      updateValues.push(price);
    }

    if (temple_id) {
      updateFields.push("temple_id = ?");
      updateValues.push(temple_id);
    }

    if (image) {
      updateFields.push("image = ?");
      updateValues.push(image);
    }

    // If no fields are provided, return an error
    if (updateFields.length === 0) {
      return res.status(400).send({
        success: false,
        message: "No fields provided to update",
      });
    }

    // Add the ID to the values array
    updateValues.push(id);

    // Construct the final query
    const updateQuery = `UPDATE prasad SET ${updateFields.join(", ")} WHERE id = ?`;

    // Execute the query
    const [result] = await db.query(updateQuery, updateValues);

    if (result.affectedRows === 0) {
      return res.status(404).send({
        success: false,
        message: "Failed to update Prasad",
      });
    }

    // Invalidate cache
    await deleteCache("prasad:*");

    return res.status(200).send({
      success: true,
      message: "Prasad updated successfully",
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
    const [existingService] = await db.query(`SELECT * FROM prasad WHERE id = ?`, [id]);

    if (!existingService || existingService.length === 0) {
      return res.status(404).send({
        success: false,
        message: "prasad  not found"
      });
    }

    const data = await db.query(`DELETE FROM prasad WHERE id = ?`, [id]);

    if (!data) {
      return res.status(404).send({
        success: false,
        message: "Error in delete query"
      });
    }

    // Invalidate cache
    await deleteCache("prasad:*");

    return res.status(200).send({
      success: true,
      message: "prasad deleted successfully"
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};


exports.booking = async (req, res) => {
  const { 
    prasadid, paymentid, sankalpaName, sankalpaGotra, quantity, 
    paymentMethod, userid, amount, prasadweight, weight, status,
    mobile, shipping_address, city, state, pincode
  } = req.body;

  // Check for essential fields
  if (!prasadid || !userid || !amount) {
    return res.status(400).send({
      success: false,
      message: "prasadid, userid, and amount are required",
    });
  }

  try {
    const qty = Number(quantity) || 1;
    const bookingStatus = status || 'Pending';
    const payMethod = paymentMethod || 'Online';
    const payId = paymentid || `PRASAD_PAY_${Date.now()}`;
    const pWeight = prasadweight || weight || 'Standard';

    // Insert booking into the database
    const [result] = await db.query(`
      INSERT INTO prasad_booking (
        prasadid, paymentid, sankalpa_name, sankalpa_gotra, quantity, 
        paymentMethod, userid, amount, booking_date, prasadweight, 
        weight, status, mobile, shipping_address, city, state, pincode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      prasadid,
      payId,
      sankalpaName || null,
      sankalpaGotra || 'Kashyap',
      qty,
      payMethod,
      userid,
      amount,
      pWeight,
      pWeight,
      bookingStatus,
      mobile || null,
      shipping_address || null,
      city || null,
      state || null,
      pincode || null
    ]);

    // Send email confirmation if user has email
    try {
      const [user] = await db.query('SELECT name, email FROM users WHERE id = ?', [userid]);
      if (user && user.length > 0 && user[0].email) {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.email,
            pass: process.env.pass,
          }
        });

        const mailOptions = {
          from: process.env.email,
          to: user[0].email,
          subject: 'Prasad Order Confirmation - Prabhu Pooja',
          html: `<p>Dear ${user[0].name},</p><p>Your order for Mandir Prasad of <strong>₹${amount}</strong> has been successfully placed.</p><p>We will pack and dispatch the holy consecrated Prasad to your address soon.</p><p>Best regards,<br/>Prabhu Pooja</p>`
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.warn('Prasad confirmation mail notice:', error.message);
          } else {
            console.log('Prasad booking email sent successfully');
          }
        });
      }
    } catch (e) {
      console.warn("Mail error ignored:", e.message);
    }

    return res.status(201).send({
      success: true,
      message: "Prasad booked successfully",
      bookingId: result.insertId
    });
  } catch (error) {
    console.error("Error creating prasad booking:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to create prasad booking",
      error: error.message
    });
  }
};

exports.updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentid, sankalpaName, sankalpaGotra, quantity, paymentMethod, userid, amount, prasadweight, weight, status } = req.body;

    console.log(`Updating Booking ID: ${id}`, req.body);

    if (!id) {
      return res.status(400).send({
        success: false,
        message: "Booking ID is required",
      });
    }

    const checkQuery = "SELECT * FROM prasad_booking WHERE id = ?";
    const [existingBooking] = await db.query(checkQuery, [id]);

    if (!existingBooking.length) {
      return res.status(404).send({
        success: false,
        message: "Booking not found",
      });
    }

    let updateFields = [];
    let updateValues = [];

    if (paymentid) {
      updateFields.push("paymentid = ?");
      updateValues.push(paymentid);
    }
    if (sankalpaName) {
      updateFields.push("sankalpa_name = ?");
      updateValues.push(sankalpaName);
    }
    if (sankalpaGotra) {
      updateFields.push("sankalpa_gotra = ?");
      updateValues.push(sankalpaGotra);
    }
    if (quantity) {
      updateFields.push("quantity = ?");
      updateValues.push(quantity);
    }
    if (paymentMethod) {
      updateFields.push("paymentMethod = ?");
      updateValues.push(paymentMethod);
    }
    if (userid) {
      updateFields.push("userid = ?");
      updateValues.push(userid);
    }
    if (amount) {
      updateFields.push("amount = ?");
      updateValues.push(amount);
    }
    if (prasadweight) {
      updateFields.push("prasadweight = ?");
      updateValues.push(prasadweight);
    }
    if (weight) {
      updateFields.push("weight = ?");
      updateValues.push(weight);
    }
    if (status) {
      updateFields.push("status = ?");
      updateValues.push(status);
    }

    if (updateFields.length === 0) {
      return res.status(400).send({
        success: false,
        message: "No fields to update",
      });
    }

    updateValues.push(id);
    const updateQuery = `UPDATE prasad_booking SET ${updateFields.join(", ")} WHERE id = ?`;
    await db.query(updateQuery, updateValues);

    return res.status(200).send({
      success: true,
      message: "Booking updated successfully",
    });

  } catch (error) {
    console.error("Error updating booking:", error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};


exports.deleteBooking = async (req, res) => {
  const { id } = req.params;

  // Check if ID is provided
  if (!id) {
    return res.status(400).send({
      success: false,
      message: "Booking ID is required",
    });
  }

  try {
    // Check if booking exists
    const [existingBooking] = await db.query("SELECT * FROM prasad_booking WHERE id = ?", [id]);

    if (existingBooking.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Booking not found",
      });
    }

    // Delete booking from the database
    await db.query("DELETE FROM prasad_booking WHERE id = ?", [id]);

    res.status(200).send({
      success: true,
      message: "Booking deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).send({
      success: false,
      message: "Failed to delete booking",
    });
  }
};


exports.getAllBookingDetails = async (req, res) => {
  try {
    const query = `
      SELECT 
        pb.id,
        u.name AS user_name,
        COALESCE(pb.mobile, u.mobile) AS user_number,
        u.email AS user_email,
        p.prasad_name AS prasad_name,
        p.image AS prasad_image,
        pb.amount,
        pb.sankalpa_name,
        pb.sankalpa_gotra,
        pb.quantity,
        pb.prasadweight,
        pb.weight,
        pb.booking_date,
        pb.status,
        pb.paymentMethod,
        pb.paymentid,
        pb.shipping_address,
        pb.city,
        pb.state,
        pb.pincode
      FROM prasad_booking pb
      JOIN users u ON u.id = pb.userid
      JOIN prasad p ON p.id = pb.prasadid
      ORDER BY pb.booking_date DESC
    `;

    const [results] = await db.query(query);

    return res.status(200).json({
      success: true,
      data: results || [],
      count: results?.length || 0
    });
  } catch (error) {
    console.error('Error fetching booking details:', error.message);
    return res.status(500).json({ error: 'Failed to retrieve booking details. Please try again later.' });
  }
};

// Prasad Demand & Order Summary for Admin Dashboard
exports.getPrasadDemandSummary = async (req, res) => {
  try {
    const [summaryRows] = await db.query(`
      SELECT 
        COUNT(*) AS total_orders,
        COALESCE(SUM(quantity), 0) AS total_units_demanded,
        COALESCE(SUM(amount), 0) AS total_revenue,
        COUNT(CASE WHEN status = 'Pending' OR status IS NULL THEN 1 END) AS pending_orders,
        COUNT(CASE WHEN status = 'Dispatched' THEN 1 END) AS dispatched_orders,
        COUNT(CASE WHEN status = 'Delivered' THEN 1 END) AS delivered_orders
      FROM prasad_booking
    `);

    const [prasadWiseDemand] = await db.query(`
      SELECT 
        p.id AS prasad_id,
        p.prasad_name,
        p.price,
        COUNT(pb.id) AS order_count,
        COALESCE(SUM(pb.quantity), 0) AS total_quantity_demanded,
        COALESCE(SUM(pb.amount), 0) AS total_sales
      FROM prasad p
      LEFT JOIN prasad_booking pb ON p.id = pb.prasadid
      GROUP BY p.id, p.prasad_name, p.price
      ORDER BY total_quantity_demanded DESC
    `);

    return res.status(200).json({
      success: true,
      summary: summaryRows[0] || {},
      prasad_wise_demand: prasadWiseDemand || []
    });
  } catch (error) {
    console.error('Error fetching prasad demand summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};

exports.getBookingByUserId = async (req, res) => {
  const { userId } = req.params;

  try {
    // Check if the userId is provided
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        prasadCount: 0,
      });
    }

    // Query to fetch booking details by user ID
    const query = `
      SELECT 
        users.name AS user_name,
        users.mobile AS user_number,
        users.email AS user_email,
        prasad.prasad_name AS prasad_name,
        prasad.image AS prasadImage,
        prasad_booking.amount,
        prasad_booking.sankalpa_name,
        prasad_booking.sankalpa_gotra,
        prasad_booking.booking_date
      FROM prasad_booking
      JOIN users ON users.id = prasad_booking.userid
      JOIN prasad ON prasad.id = prasad_booking.prasadid
      WHERE prasad_booking.userid = ?`; // Filter by userId

    // Execute the query
    const [data] = await db.query(query, [userId]);

    // If no bookings are found, return 0 in prasadCount
    if (data.length === 0) {
      return res.status(200).json({
        success: true,
        prasadCount: 0,
        message: 'No bookings found for the given user ID.',
        data: [], // Send an empty array for clarity
      });
    }

    // Get the count of records
    const prasadCount = data.length;  // Use data.length to get the number of records

    // Return the response with the count and data
    res.status(200).json({
      success: true,
      prasadCount: prasadCount,
      data: data,  // Send the fetched data in the response
    });
  } catch (error) {
    console.error('Error fetching booking details:', error.message);
    res.status(500).json({
      success: false,
      prasadCount: 0, // Ensure prasadCount is included even in errors
      message: 'Failed to retrieve booking details. Please try again later.',
    });
  }
};
exports.statusUpdate = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    // Corrected SELECT query
    const [existingStatus] = await db.query(`SELECT * FROM prasad_booking WHERE id = ?`, [id]);

    // Corrected condition for checking if the order exists
    if (!existingStatus.length) {
      return res.status(404).send({
        success: false,
        message: "Order not found",
      });
    }

    // Update the status
    await db.query(`UPDATE prasad_booking SET status = ? WHERE id = ?`, [status, id]);

    return res.status(200).send({
      success: true,
      message: "Status updated successfully",
    });

  } catch (err) {
    console.error("Error updating status:", err);
    return res.status(500).send({
      success: false,
      message: "Failed to update status",
    });
  }
};

