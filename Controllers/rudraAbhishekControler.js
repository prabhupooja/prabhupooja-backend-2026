const db = require("../config/db");

/* =========================================
   GET SINGLE RUDRA ABHISHEK DETAILS
========================================= */
exports.addRudraAbhishek = async (req, res) => {
  const {
    fullName,
    mobile,
    email,
    service,
    poojaDate,
    message,
  } = req.body;

  try {

    /* =========================
       VALIDATIONS
    ========================= */

    // Required Fields
    if (!fullName || !mobile || !service) {
      return res.status(400).send({
        success: false,
        message: "Name, mobile and service are required",
      });
    }

    // Mobile Validation
    const mobileRegex = /^[6-9]\d{9}$/;

    if (!mobileRegex.test(mobile)) {
      return res.status(400).send({
        success: false,
        message: "Please enter valid mobile number",
      });
    }

    // Email Validation
    if (email) {
      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        return res.status(400).send({
          success: false,
          message: "Please enter valid email",
        });
      }
    }

    // Duplicate Check
 const [existingBooking] = await db.query(
  `SELECT id 
   FROM rudraAbhishek
   WHERE 
   (
      mobile = ?
      OR email = ?
   )
   AND service = ?
   AND poojaDate = ?`,
  [mobile, email, service, poojaDate]
);

    if (existingBooking.length > 0) {
      return res.status(409).send({
        success: false,
        message:
          "You have already submitted booking for this service",
      });
    }

    /* =========================
       INSERT BOOKING
    ========================= */

    const [result] = await db.query(
      `INSERT INTO rudraAbhishek
      (
        fullName,
        mobile,
        email,
        service,
        poojaDate,
        message
      )
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        fullName,
        mobile,
        email || null,
        service,
        poojaDate || null,
        message || null,
      ]
    );

    res.status(201).send({
      success: true,
      message:
        "Rudra Abhishek booking created successfully",
      bookingId: result.insertId,
    });

  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message:
        "Failed to create Rudra Abhishek booking",
      error: error.message,
    });
  }
};

exports.getRudraAbhishekDetails = async (req, res) => {
  const { id } = req.params;

  try {
    const [details] = await db.query(
      `SELECT 
          id,
          fullName,
          mobile,
          email,
          service,
          poojaDate,
          message,
          status,
          adminRemark,
          adminAssigned,
          poojaTime,
          poojaLocation,
          panditName,
          createdAt,
          updatedAt
       FROM rudraAbhishek
       WHERE id = ?`,
      [id]
    );

    if (details.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Rudra Abhishek booking not found",
      });
    }

    res.status(200).send({
      success: true,
      data: details[0],
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "Failed to fetch Rudra Abhishek details",
      error: error.message,
    });
  }
};
/* =========================================
   ADD NEW RUDRA ABHISHEK BOOKING
========================================= */

/* =========================================
   UPDATE BOOKING STATUS (ADMIN)
========================================= */
exports.updateRudraAbhishekStatus = async (req, res) => {
  const { id } = req.params;

  const {
    status,
    adminRemark,
    adminAssigned,
    poojaTime,
    poojaLocation,
    panditName,
  } = req.body;

  try {
    const [checkBooking] = await db.query(
      `SELECT id FROM rudraAbhishek WHERE id = ?`,
      [id]
    );

    if (checkBooking.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Booking not found",
      });
    }

    await db.query(
      `UPDATE rudraAbhishek
       SET
         status = ?,
         adminRemark = ?,
         adminAssigned = ?,
         poojaTime = ?,
         poojaLocation = ?,
         panditName = ?
       WHERE id = ?`,
      [
        status,
        adminRemark,
        adminAssigned,
        poojaTime,
        poojaLocation,
        panditName,
        id,
      ]
    );

    res.status(200).send({
      success: true,
      message: "Booking updated successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "Failed to update booking",
      error: error.message,
    });
  }
};
exports.getAllRudraAbhishekBookings = async (req, res) => {
  try {
    const [bookings] = await db.query(
        `SELECT
            id,
            fullName,
            mobile,
            email,
            service,
            poojaDate,
            message,
            status,
            adminRemark,
            adminAssigned,
            poojaTime,
            poojaLocation,
            panditName,
            createdAt,
            updatedAt
         FROM rudraAbhishek
         ORDER BY createdAt DESC`
    );
    res.status(200).send({
      success: true,
      data: bookings,
    });
    } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Failed to fetch Rudra Abhishek bookings",      
      error: error.message,
    });
  }
};
exports.deleteRudraAbhishek = async (req, res) => {
  const { id } = req.params;

    try {
        const [checkBooking] = await db.query(
            `SELECT id FROM rudraAbhishek WHERE id = ?`,
            [id]
        );

        if (checkBooking.length === 0) {
            return res.status(404).send({
                success: false,
                message: "Booking not found",
            });
        }
        await db.query(
            `DELETE FROM rudraAbhishek WHERE id = ?`,
            [id]
        );
        res.status(200).send({
            success: true,
            message: "Booking deleted successfully",
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).send({
            success: false,
            message: "Failed to delete booking",
            error: error.message,
        });
    }
};
