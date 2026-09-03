const db = require('../config/db');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const { getCache, setCache, deleteCache } = require("../config/redis");
dotenv.config();
 
const formatTemple = (item) => {
  if (!item) return item;
  let gallery = [];
  if (item.gallery_images) {
    if (Array.isArray(item.gallery_images)) {
      gallery = item.gallery_images;
    } else if (typeof item.gallery_images === 'string') {
      try {
        gallery = JSON.parse(item.gallery_images);
      } catch (e) {
        gallery = item.gallery_images.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
  }
  if (!Array.isArray(gallery)) {
    gallery = [];
  }
  if (gallery.length === 0 && item.image) {
    gallery = [item.image];
  }

  return {
    ...item,
    gallery_images: gallery,
    tag: item.tag || 'Divine Temple',
    subtitle: item.subtitle || '',
    location: item.location || item.description || '',
    map_url: item.map_url || '',
    about: item.about || item.description || '',
    significance: item.significance || '',
    rituals: item.rituals || '',
    timings: item.timings || '',
    whatsapp_number: item.whatsapp_number || item.number || '7225016699',
    facebook_url: item.facebook_url || 'https://www.facebook.com/profile.php?id=61565211141697',
    bottom_notes: item.bottom_notes || '',
    status: item.status || 'Active'
  };
};

exports.create = async (req, res) => {
  const {
    name,
    email,
    number,
    description,
    price,
    tag = 'Divine Temple',
    subtitle,
    location,
    map_url,
    about,
    significance,
    rituals,
    timings,
    whatsapp_number,
    facebook_url,
    bottom_notes,
    status = 'Active'
  } = req.body;

  const image = req.files?.['image']?.[0]?.location || req.file?.location || req.body.image || null;

  if (!image) {
    return res.status(400).send({
      success: false,
      message: "Main temple image is required",
    });
  }

  if (!name) {
    return res.status(400).send({
      success: false,
      message: 'Temple name is required',
    });
  }

  // Handle gallery images
  let galleryUrls = [];
  if (req.files?.['gallery'] && req.files['gallery'].length > 0) {
    galleryUrls = req.files['gallery'].map(f => f.location);
  }

  if (req.body.gallery_images) {
    try {
      const parsed = typeof req.body.gallery_images === 'string'
        ? JSON.parse(req.body.gallery_images)
        : req.body.gallery_images;
      if (Array.isArray(parsed)) {
        galleryUrls = [...new Set([...galleryUrls, ...parsed])];
      }
    } catch (e) {
      console.log('Error parsing body gallery_images:', e.message);
    }
  }

  if (galleryUrls.length === 0 && image) {
    galleryUrls = [image];
  }

  const galleryJson = JSON.stringify(galleryUrls);
  const templeAbout = about || description || '';
  const templeLocation = location || description || '';

  try {
    const [result] = await db.query(
      `INSERT INTO temple (
        name, email, number, image, description, price,
        tag, subtitle, location, map_url, gallery_images,
        about, significance, rituals, timings,
        whatsapp_number, facebook_url, bottom_notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        email || null,
        number || null,
        image,
        description || templeAbout,
        price || 0,
        tag,
        subtitle || null,
        templeLocation,
        map_url || null,
        galleryJson,
        templeAbout,
        significance || null,
        rituals || null,
        timings || null,
        whatsapp_number || number || null,
        facebook_url || null,
        bottom_notes || null,
        status
      ]
    );

    // Invalidate temple cache
    await deleteCache("temple:*");

    return res.status(201).send({
      success: true,
      message: 'Temple created successfully',
      id: result.insertId,
      data: {
        id: result.insertId,
        name,
        image,
        gallery_images: galleryUrls
      }
    });
  } catch (error) {
    console.error('Error inserting data into temple table:', error);
    return res.status(500).send({
      success: false,
      message: 'An error occurred while creating the temple record',
    });
  }
};

exports.getAll = async (req, res) => {
  const cacheKey = "temple:all";
  try {
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      res.setHeader("X-Cache", "HIT");
      return res.status(200).send({
        success: true,
        message: 'Records fetched successfully (cache)',
        data: cachedData,
      });
    }

    const [rows] = await db.query(`SELECT * FROM temple ORDER BY id DESC`);

    if (!rows || rows.length === 0) {
      return res.status(404).send({
        success: false,
        message: 'No records found',
      });
    }

    const formattedData = rows.map(formatTemple);
    await setCache(cacheKey, formattedData, 900); // 15 mins
    res.setHeader("X-Cache", "MISS");

    return res.status(200).send({
      success: true,
      message: 'Records fetched successfully',
      data: formattedData,
    });
  } catch (error) {
    console.error('Error fetching data from temple table:', error);
    return res.status(500).send({
      success: false,
      message: 'An error occurred while fetching the records',
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const templeId = req.params.templeId || req.params.id;
    const cacheKey = `temple:item:${templeId}`;

    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      res.setHeader("X-Cache", "HIT");
      return res.status(200).send({
        success: true,
        message: 'Temple fetched successfully (cache)',
        data: cachedData,
      });
    }

    const [rows] = await db.query(`SELECT * FROM temple WHERE id = ?`, [templeId]);

    if (!rows || rows.length === 0) {
      return res.status(404).send({
        success: false,
        message: 'Temple not found',
      });
    }

    const formatted = formatTemple(rows[0]);
    await setCache(cacheKey, formatted, 900);
    res.setHeader("X-Cache", "MISS");

    return res.status(200).send({
      success: true,
      message: 'Temple fetched successfully',
      data: formatted,
    });
  } catch (error) {
    console.error('Error fetching data from temple table:', error);
    return res.status(500).send({
      success: false,
      message: 'An error occurred while fetching the record',
    });
  }
};


exports.booking = async (req, res) => {
  const { userId, puja_date, dob, rashi, goutra, order_id, temple_id } = req.body;
console.log(req.body);

  if (!userId || !puja_date || !dob || !rashi || !goutra || !order_id || !temple_id) {
    return res.status(400).send({
      success: false,
      message: 'userId, puja_date, dob, rashi, goutra, order_id, and temple_id are required',
    });
  }

  try {
   
    const [userData] = await db.query(`SELECT name FROM users WHERE id = ?`, [userId]);
    if (!userData||userData.length === 0) {
      return res.status(404).send({
        success: false,
        message: 'User not found for the given userId',
      });
    }
    const userName = userData[0].name;

    const data = await db.query(
      `INSERT INTO temple_booking (user_id, puja_date, dob, rashi, goutra, order_id, temple_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, puja_date, dob, rashi, goutra, order_id, temple_id]
    );

    if (!data) {
      return res.status(500).send({
        success: false,
        message: 'Failed to insert booking into database',
      });
    }

    const [templeData] = await db.query(`SELECT email FROM temple WHERE id = ?`, [temple_id]);
    if (templeData.length === 0) {
      return res.status(404).send({
        success: false,
        message: 'Temple not found for the given temple_id',
      });
    }
    const templeEmail = templeData[0].email;

    const transporter = nodemailer.createTransport({
      service: 'gmail', 
      auth: {
        user: process.env.email, 
        pass: process.env.pass 
      },
    });

    const mailOptions = {
      from: process.env.email,
      to: templeEmail,
      subject: 'New Booking Notification',
      text: `A new booking has been made with the following details:
        - User Name: ${userName}
        - Puja Date: ${puja_date}
        - DOB: ${dob}
        - Rashi: ${rashi}
        - Goutra: ${goutra},`
      
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('Email error:', err);
      } else {
        console.log('Email sent:', info.response);
      }
    });

    return res.status(201).send({
      success: true,
      message: 'Temple booking created successfully, email notification sent',
    });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).send({
      success: false,
      message: 'Internal Server Error',
    });
  }
};
  
exports.getAllBookings = async (req, res) => {
  try {
  
    const query = `
      SELECT 
        tb.id AS booking_id,
        tb.puja_date,
        tb.dob,
        tb.rashi,
        tb.goutra,
        tb.order_id,
        u.name AS user_name,
        u.mobile AS user_number,
        t.name AS temple_name,
        t.description AS temple_address,
        t.email AS temple_email,
        t.number AS temple_number
      FROM temple_booking tb
      JOIN users u ON tb.user_id = u.id
      JOIN temple t ON tb.temple_id = t.id;
    `;
    
   
    const [bookingData] = await db.query(query);

    if (bookingData.length === 0) {
      return res.status(404).send({
        success: false,
        message: 'No bookings found',
      });
    }

    return res.status(200).send({
      success: true,
      data: bookingData,  
    });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).send({
      success: false,
      message: 'Internal Server Error',
    });
  }
};
exports.getByUserId = async (req, res) => {
  const { userId } = req.params; // Assuming userId is passed as a route parameter
  
  try {
    if (!userId) {
      return res.status(400).send({
        success: false,
        message: "User ID is required",
      });
    }

    // Query to fetch all records for the given userId
    const data = await db.query(`
      SELECT 
      temple.name AS templeName,
        temple.image AS templeImage,
        temple.price AS templePrice,
        temple.description AS templeAddress,
        temple_booking.puja_date AS bookingDate
      FROM temple
      INNER JOIN temple_booking ON temple_booking.temple_id = temple.id
      WHERE temple_booking.user_id = ?`, [userId]);

    if (data.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No temples found for the given user ID",
      });
    }

    const templeCount = data[0].length;
console.log(data[0])
    return res.status(200).send({
      success: true,
      message: "Records fetched successfully",
      count: templeCount, 
      data: data[0],          
    });
  } catch (error) {
    console.error("Error fetching data from the table:", error);
    return res.status(500).send({
      success: false,
      message: "An error occurred while fetching the records",
    });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    email,
    number,
    description,
    price,
    tag,
    subtitle,
    location,
    map_url,
    about,
    significance,
    rituals,
    timings,
    whatsapp_number,
    facebook_url,
    bottom_notes,
    status
  } = req.body;

  const image = req.files?.['image']?.[0]?.location || req.file?.location || (typeof req.body.image === 'string' ? req.body.image : null);

  if (!id) {
    return res.status(400).send({ success: false, message: "ID is required" });
  }

  try {
    const [existing] = await db.query(`SELECT * FROM temple WHERE id = ?`, [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).send({ success: false, message: "Temple record not found" });
    }

    const currentTemple = existing[0];
    let updateFields = [];
    let values = [];

    if (name !== undefined) {
      updateFields.push("name = ?");
      values.push(name);
    }
    if (email !== undefined) {
      updateFields.push("email = ?");
      values.push(email);
    }
    if (number !== undefined) {
      updateFields.push("number = ?");
      values.push(number);
    }
    if (description !== undefined) {
      updateFields.push("description = ?");
      values.push(description);
    }
    if (price !== undefined) {
      updateFields.push("price = ?");
      values.push(price);
    }
    if (tag !== undefined) {
      updateFields.push("tag = ?");
      values.push(tag);
    }
    if (subtitle !== undefined) {
      updateFields.push("subtitle = ?");
      values.push(subtitle);
    }
    if (location !== undefined) {
      updateFields.push("location = ?");
      values.push(location);
    }
    if (map_url !== undefined) {
      updateFields.push("map_url = ?");
      values.push(map_url);
    }
    if (about !== undefined) {
      updateFields.push("about = ?");
      values.push(about);
    }
    if (significance !== undefined) {
      updateFields.push("significance = ?");
      values.push(significance);
    }
    if (rituals !== undefined) {
      updateFields.push("rituals = ?");
      values.push(rituals);
    }
    if (timings !== undefined) {
      updateFields.push("timings = ?");
      values.push(timings);
    }
    if (whatsapp_number !== undefined) {
      updateFields.push("whatsapp_number = ?");
      values.push(whatsapp_number);
    }
    if (facebook_url !== undefined) {
      updateFields.push("facebook_url = ?");
      values.push(facebook_url);
    }
    if (bottom_notes !== undefined) {
      updateFields.push("bottom_notes = ?");
      values.push(bottom_notes);
    }
    if (status !== undefined) {
      updateFields.push("status = ?");
      values.push(status);
    }
    if (image) {
      updateFields.push("image = ?");
      values.push(image);
    }

    // Handle Gallery images
    let newGalleryUrls = [];
    if (req.files?.['gallery'] && req.files['gallery'].length > 0) {
      newGalleryUrls = req.files['gallery'].map(f => f.location);
    }

    if (req.body.gallery_images) {
      try {
        const parsed = typeof req.body.gallery_images === 'string'
          ? JSON.parse(req.body.gallery_images)
          : req.body.gallery_images;
        if (Array.isArray(parsed)) {
          newGalleryUrls = [...new Set([...newGalleryUrls, ...parsed])];
        }
      } catch (e) {
        console.log('Error parsing gallery_images in update:', e.message);
      }
    }

    if (newGalleryUrls.length > 0) {
      updateFields.push("gallery_images = ?");
      values.push(JSON.stringify(newGalleryUrls));
    }

    if (updateFields.length === 0) {
      return res.status(400).send({ success: false, message: "No fields provided to update" });
    }

    values.push(id);
    const query = `UPDATE temple SET ${updateFields.join(", ")} WHERE id = ?`;
    await db.query(query, values);

    // Invalidate temple cache
    await deleteCache("temple:*");

    return res.status(200).send({
      success: true,
      message: "Temple updated successfully",
    });
  } catch (error) {
    console.error("Error updating temple data:", error);
    return res.status(500).send({
      success: false,
      message: "An error occurred while updating the temple record",
    });
  }
};

exports.updateTempleBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, puja_date, dob, rashi, goutra, order_id, temple_id, status } = req.body;

    console.log(`Updating Temple Booking ID: ${id}`, req.body);

    if (!id) {
      return res.status(400).send({
        success: false,
        message: "Booking ID is required",
      });
    }

    const checkQuery = "SELECT * FROM temple_booking WHERE id = ?";
    const [existingBooking] = await db.query(checkQuery, [id]);

    if (!existingBooking.length) {
      return res.status(404).send({
        success: false,
        message: "Booking not found",
      });
    }

    let updateFields = [];
    let updateValues = [];

    if (userId) {
      updateFields.push("user_id = ?");
      updateValues.push(userId);
    }
    if (puja_date) {
      updateFields.push("puja_date = ?");
      updateValues.push(puja_date);
    }
    if (dob) {
      updateFields.push("dob = ?");
      updateValues.push(dob);
    }
    if (rashi) {
      updateFields.push("rashi = ?");
      updateValues.push(rashi);
    }
    if (goutra) {
      updateFields.push("goutra = ?");
      updateValues.push(goutra);
    }
    if (order_id) {
      updateFields.push("order_id = ?");
      updateValues.push(order_id);
    }
    if (temple_id) {
      updateFields.push("temple_id = ?");
      updateValues.push(temple_id);
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
    const updateQuery = `UPDATE temple_booking SET ${updateFields.join(", ")} WHERE id = ?`;
    await db.query(updateQuery, updateValues);

    return res.status(200).send({
      success: true,
      message: "Temple booking updated successfully",
    });
  } catch (error) {
    console.error("Error updating temple booking:", error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).send({
        success: false,
        message: "Booking ID is required",
      });
    }

    // Check if the booking exists
    const checkQuery = "SELECT * FROM temple_booking WHERE id = ?";
    const [existingBooking] = await db.query(checkQuery, [id]);

    if (!existingBooking.length) {
      return res.status(404).send({
        success: false,
        message: "Booking not found",
      });
    }

    // Delete the booking
    const deleteQuery = "DELETE FROM temple_booking WHERE id = ?";
    await db.query(deleteQuery, [id]);

    return res.status(200).send({
      success: true,
      message: "Temple booking deleted successfully",
    });

  } catch (error) {
    console.error("Error deleting booking:", error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};



exports.delete = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).send({ success: false, message: "ID is required" });
  }

  try {
    // Check if record exists
    const [existing] = await db.query(`SELECT * FROM temple WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).send({ success: false, message: "Record not found" });
    }

    await db.query(`DELETE FROM temple WHERE id = ?`, [id]);

    // Invalidate temple cache
    await deleteCache("temple:*");

    return res.status(200).send({
      success: true,
      message: "Record deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting data:", error);
    return res.status(500).send({
      success: false,
      message: "An error occurred while deleting the record",
    });
  }
};




  