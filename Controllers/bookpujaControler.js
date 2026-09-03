const db = require('../config/db');

async function createRequest(requestData) {
  const { user_id, pujaid, pandit_id, request_type } = requestData;
  try {
    let targetPanditId = pandit_id;

    if (!targetPanditId) {
      const pujaQuery = 'SELECT pandit_id FROM puja WHERE id = ?';
      const [puja] = await db.query(pujaQuery, [pujaid]);
      if (puja.length && puja[0].pandit_id) {
        const firstId = String(puja[0].pandit_id).split(',')[0].trim();
        targetPanditId = Number(firstId) || null;
      }
    }

    if (!targetPanditId) {
      console.log('No pandit associated with this booking request');
      return { requestId: null };
    }

    const [data] = await db.query(
      'INSERT INTO requests (user_id, pandit_astrologer_id, request_type) VALUES (?, ?, ?)',
      [user_id, targetPanditId, request_type || 'pooja']
    );
    const id = data.insertId;
    console.log("Request created successfully for pandit:", targetPanditId);
    return { requestId: id };
  } catch (error) {
    console.error('Failed to create request:', error);
    return { requestId: null };
  }
}

exports.create = async (req, res) => {
  try {
    let { 
      pujaid, paymentid, amount, userid, bookingdate, paymentdate, 
      pandit_id, selected_pandit_id,
      devotee_name, gotra, family_members, sankalp_wish, 
      rashi_nakshatra, time_slot, whatsapp_number, need_prasad,
      shipping_address, city, state, pincode, package_name
    } = req.body;

    if (!pujaid || !userid || !bookingdate) {
      return res.status(400).send({
        success: false,
        message: 'pujaid, userid, and bookingdate are required',
      });
    }

    // Default payment ID if cash/free/test
    if (!paymentid) {
      paymentid = `PAY_${Date.now()}`;
    }

    // Resolve puja details if needed
    let actualPujaId = pujaid;
    if (isNaN(pujaid)) {
      const [pRows] = await db.query('SELECT id FROM puja WHERE LOWER(name) = ? OR LOWER(REPLACE(name, " ", "-")) = ?', [pujaid.replace(/[-_]/g, ' '), pujaid]);
      if (pRows && pRows.length > 0) actualPujaId = pRows[0].id;
    }

    const [puja] = await db.query('SELECT * FROM puja WHERE id = ?', [actualPujaId]);
    if (!puja.length) {
      return res.status(404).send({
        success: false,
        message: 'Invalid Puja ID',
      });
    }

    if (!amount) {
      const p = puja[0];
      const pPrice = Number(p.price) || 0;
      const pDiscount = Number(p.discount) || 0;
      const pFinal = Number(p.final_price) || 0;
      amount = (pFinal > 0 && pFinal <= pPrice) ? pFinal : (pDiscount > 0 ? Math.round(pPrice - (pPrice * pDiscount / 100)) : pPrice);
    }

    const [user] = await db.query('SELECT * FROM users WHERE id = ?', [userid]);
    if (!user.length) {
      return res.status(404).send({
        success: false,
        message: 'Invalid User ID',
      });
    }

    const assignedPanditId = selected_pandit_id || pandit_id || (puja[0].pandit_id ? String(puja[0].pandit_id).split(',')[0].trim() : null);

    const paymentDateObj = paymentdate ? new Date(paymentdate * 1000) : new Date();
    const formattedPaymentDate = isNaN(paymentDateObj.getTime()) 
      ? new Date().toISOString().slice(0, 19).replace('T', ' ')
      : paymentDateObj.toISOString().slice(0, 19).replace('T', ' ');

    const familyMembersStr = Array.isArray(family_members) ? family_members.join(', ') : (family_members || null);

    const bookingQuery = `
      INSERT INTO puja_booking (
        pujaid, paymentid, amount, userid, bookingdate, paymentDate, 
        selected_pandit_id, devotee_name, gotra, family_members, 
        sankalp_wish, rashi_nakshatra, time_slot, whatsapp_number, 
        need_prasad, prasad_price, shipping_address, city, state, pincode, 
        package_name, booking_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [bookingResult] = await db.query(bookingQuery, [
      actualPujaId,
      paymentid,
      amount,
      userid,
      bookingdate,
      formattedPaymentDate,
      assignedPanditId,
      devotee_name || user[0].name,
      gotra || 'Kashyap',
      familyMembersStr,
      sankalp_wish || null,
      rashi_nakshatra || null,
      time_slot || 'Morning (07:00 AM - 10:00 AM)',
      whatsapp_number || user[0].mobile,
      need_prasad ? 1 : 0,
      Number(req.body.prasad_price) || 0,
      shipping_address || null,
      city || null,
      state || null,
      pincode || null,
      package_name || 'Individual / Single Sankalp',
      'Confirmed'
    ]);

    const requestData = {
      user_id: userid,
      pujaid: actualPujaId,
      pandit_id: assignedPanditId,
      request_type: 'pooja',
    };

    const requestResponse = await createRequest(requestData);

    return res.status(201).send({
      success: true,
      message: 'Booking created successfully with complete Sankalp & Devotee details',
      bookingId: bookingResult.insertId,
      requestId: requestResponse.requestId,
    });

  } catch (error) {
    console.error('Error creating booking and request:', error);
    return res.status(500).send({
      success: false,
      message: 'Internal Server Error',
      error: error.message
    });
  }
};

exports.getBookingDate = async (req, res) => {
  try {
    const { pooja_id, user_id } = req.params;

    if (!pooja_id || !user_id || pooja_id === 'undefined' || user_id === 'undefined' || user_id === 'null') {
      return res.status(200).send({
        success: true,
        data: null,
        message: "No previous booking found",
      });
    }

    let actualPujaId = pooja_id;
    if (isNaN(pooja_id)) {
      const normalizedParam = pooja_id.toLowerCase().trim();
      const cleanParam = normalizedParam.replace(/[-_]/g, ' ');
      const [pujaRows] = await db.query(
        `SELECT id FROM puja 
         WHERE LOWER(name) = ? 
            OR LOWER(REPLACE(name, ' ', '-')) = ? 
            OR LOWER(REPLACE(name, ' ', '')) = ?`,
        [cleanParam, normalizedParam, normalizedParam.replace(/[-_\s]/g, '')]
      );
      if (pujaRows && pujaRows.length > 0) {
        actualPujaId = pujaRows[0].id;
      }
    }

    const [data] = await db.query(
      `SELECT * 
       FROM puja_booking 
       WHERE (pujaid = ? OR pujaid = ?) AND userid = ? 
       ORDER BY bookingdate DESC 
       LIMIT 1`,
      [actualPujaId, pooja_id, user_id]
    );

    if (!data || data.length === 0) {
      return res.status(200).send({
        success: true,
        data: null,
        message: "No previous booking found",
      });
    }

    return res.status(200).send({
      success: true,
      data: data[0],
    });
  } catch (error) {
    console.error('Error in getBookingDate:', error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getAllBookings = async (req, res) => {
  try {
    const query = `
      SELECT 
        pb.id AS booking_id,
        u.name AS user_name,
        u.email AS user_email,
        u.mobile AS user_mobile,
        p.name AS puja_name,
        p.price AS puja_price,
        p.discount AS puja_discount,
        p.final_price AS puja_final_price,
        p.pandit_id AS puja_pandit_ids,
        pb.selected_pandit_id AS selected_pandit_id,
        pd.name AS pandit_name,
        pd.mobile AS pandit_mobile,
        pd.email AS pandit_email,
        pd.profileImage AS pandit_image,
        pb.paymentid AS payment_id,
        pb.amount AS booking_amount,
        pb.bookingdate AS booking_date,
        pb.paymentDate AS payment_date,
        pb.devotee_name,
        pb.gotra,
        pb.family_members,
        pb.sankalp_wish,
        pb.rashi_nakshatra,
        pb.time_slot,
        pb.whatsapp_number,
        pb.need_prasad,
        pb.shipping_address,
        pb.city,
        pb.state,
        pb.pincode,
        pb.package_name,
        pb.booking_status
      FROM 
        puja_booking pb
      INNER JOIN 
        users u ON pb.userid = u.id
      INNER JOIN 
        puja p ON pb.pujaid = p.id
      LEFT JOIN 
        pandit pd ON (pb.selected_pandit_id IS NOT NULL AND pb.selected_pandit_id = pd.id) 
                  OR (pb.selected_pandit_id IS NULL AND FIND_IN_SET(pd.id, p.pandit_id) > 0)
      ORDER BY 
        pb.bookingdate DESC;
    `;

    const [bookings] = await db.query(query);

    return res.status(200).send({
      success: true,
      data: bookings || [],
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return res.status(500).send({
      success: false,
      message: 'Internal Server Error',
    });
  }
};

exports.getBookingsByUserId = async (req, res) => {
  try {
    const { userId } = req.params; 

    if (!userId) {
      return res.status(400).send({
        success: false,
        message: 'User ID is required',
      });
    }

    const query = `
      SELECT 
        pb.id AS booking_id,
        u.name AS user_name,
        u.email AS user_email,
        u.mobile AS user_mobile,
        p.name AS puja_name,
        p.price AS puja_price,
        p.discount AS puja_discount,
        p.final_price AS puja_final_price,
        p.pandit_id AS puja_pandit_ids,
        pb.selected_pandit_id AS selected_pandit_id,
        pd.name AS pandit_name,
        pd.mobile AS pandit_mobile,
        pd.email AS pandit_email,
        pd.profileImage AS pandit_image,
        pb.paymentid AS payment_id,
        pb.amount AS booking_amount,
        pb.bookingdate AS booking_date,
        pb.paymentDate AS payment_date,
        pb.devotee_name,
        pb.gotra,
        pb.family_members,
        pb.sankalp_wish,
        pb.rashi_nakshatra,
        pb.time_slot,
        pb.whatsapp_number,
        pb.need_prasad,
        pb.shipping_address,
        pb.city,
        pb.state,
        pb.pincode,
        pb.package_name,
        pb.booking_status
      FROM 
        puja_booking pb
      INNER JOIN 
        users u ON pb.userid = u.id
      INNER JOIN 
        puja p ON pb.pujaid = p.id
      LEFT JOIN 
        pandit pd ON (pb.selected_pandit_id IS NOT NULL AND pb.selected_pandit_id = pd.id) 
                  OR (pb.selected_pandit_id IS NULL AND FIND_IN_SET(pd.id, p.pandit_id) > 0)
      WHERE 
        pb.userid = ?  
      ORDER BY 
        pb.bookingdate DESC;
    `;

    const [bookings] = await db.query(query, [userId]);

    return res.status(200).send({
      success: true,
      data: bookings || [],
    });
  } catch (error) {
    console.error('Error fetching bookings by user ID:', error);
    return res.status(500).send({
      success: false,
      message: 'Internal Server Error',
    });
  }
};

exports.updateBooking = async (req, res) => {
  try {
    const { id } = req.params; 
    const updateData = req.body;

    if (!id) {
      return res.status(400).send({
        success: false,
        message: 'Booking ID is required',
      });
    }

    const [existingBooking] = await db.query('SELECT * FROM puja_booking WHERE id = ?', [id]);

    if (!existingBooking.length) {
      return res.status(404).send({
        success: false,
        message: 'Booking not found',
      });
    }

    let updateFields = [];
    let updateValues = [];

    const allowedFields = [
      'pujaid', 'paymentid', 'amount', 'userid', 'bookingdate', 'selected_pandit_id',
      'devotee_name', 'gotra', 'family_members', 'sankalp_wish', 'rashi_nakshatra',
      'time_slot', 'whatsapp_number', 'need_prasad', 'shipping_address', 'city',
      'state', 'pincode', 'package_name', 'booking_status'
    ];

    for (const key of allowedFields) {
      if (updateData[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updateData[key]);
      }
    }

    if (updateData.paymentdate) {
      const paymentDate = new Date(updateData.paymentdate * 1000);
      const formattedPaymentDate = isNaN(paymentDate.getTime())
        ? new Date().toISOString().slice(0, 19).replace('T', ' ')
        : paymentDate.toISOString().slice(0, 19).replace('T', ' ');
      updateFields.push('paymentDate = ?');
      updateValues.push(formattedPaymentDate);
    }

    if (updateFields.length === 0) {
      return res.status(400).send({
        success: false,
        message: 'No fields to update',
      });
    }

    updateValues.push(id);

    const updateQuery = `UPDATE puja_booking SET ${updateFields.join(', ')} WHERE id = ?`;
    await db.query(updateQuery, updateValues);

    return res.status(200).send({
      success: true,
      message: 'Booking updated successfully',
    });

  } catch (error) {
    console.error('Error updating booking:', error);
    return res.status(500).send({
      success: false,
      message: 'Internal Server Error',
    });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const { id } = req.params; 

    if (!id) {
      return res.status(400).send({
        success: false,
        message: 'Booking ID is required',
      });
    }

    const [existingBooking] = await db.query('SELECT * FROM puja_booking WHERE id = ?', [id]);

    if (!existingBooking.length) {
      return res.status(404).send({
        success: false,
        message: 'Booking not found',
      });
    }

    await db.query('DELETE FROM puja_booking WHERE id = ?', [id]);

    return res.status(200).send({
      success: true,
      message: 'Booking deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting booking:', error);
    return res.status(500).send({
      success: false,
      message: 'Internal Server Error',
    });
  }
};
