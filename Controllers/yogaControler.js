const db = require('../config/db');

exports.getAllusers = async (req, res) => {
    try {
        const query = `
          SELECT 
            y.id,
            y.user_id,
            COALESCE(y.name, u.name) AS name,
            COALESCE(y.email, u.email) AS email,
            COALESCE(y.mobile, u.mobile) AS mobile,
            y.payment_id,
            y.amount,
            y.booking_date,
            y.status,
            y.time_slot,
            y.notes,
            y.assigned_pandit_id,
            p.name AS instructor_name,
            p.mobile AS instructor_mobile,
            p.profileImage AS instructor_image
          FROM yoga_users y
          LEFT JOIN users u ON y.user_id = u.id
          LEFT JOIN pandit p ON y.assigned_pandit_id = p.id
          ORDER BY y.id DESC
        `;
        const [userData] = await db.query(query);

        return res.status(200).send({
            success: true,
            count: userData?.length || 0,
            data: userData || []
        });

    } catch (error) {
        console.error("Error fetching yoga users:", error);
        return res.status(500).send({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

exports.getUserById = async (req, res) => {
    const { userId } = req.params;

    try {
        if (!userId) {
            return res.status(400).send({
                success: false,
                message: 'User ID is required'
            });
        }

        const query = `
          SELECT 
            y.*,
            p.name AS instructor_name,
            p.mobile AS instructor_mobile,
            p.profileImage AS instructor_image
          FROM yoga_users y
          LEFT JOIN pandit p ON y.assigned_pandit_id = p.id
          WHERE y.user_id = ?
        `;
        const [userData] = await db.query(query, [userId]);

        return res.status(200).send({
            success: true,
            count: userData.length,
            data: userData
        });

    } catch (error) {
        console.error('Error fetching user details:', error.message);
        return res.status(500).send({
            success: false,
            message: 'Internal server error'
        });
    }
};

exports.updateYogaBooking = async (req, res) => {
    const { id } = req.params;
    const { 
      payment_id, amount, booking_date, status, 
      assigned_pandit_id, time_slot, notes, name, mobile, email 
    } = req.body;

    try {
        const [existingBooking] = await db.query('SELECT * FROM yoga_users WHERE id = ?', [id]);

        if (existingBooking.length === 0) {
            return res.status(404).send({ success: false, message: "Booking not found" });
        }

        let fieldsToUpdate = [];
        let queryParams = [];

        if (payment_id !== undefined) {
            fieldsToUpdate.push(`payment_id = ?`);
            queryParams.push(payment_id);
        }
        if (amount !== undefined) {
            fieldsToUpdate.push(`amount = ?`);
            queryParams.push(amount);
        }
        if (booking_date !== undefined) {
            fieldsToUpdate.push(`booking_date = ?`);
            queryParams.push(booking_date);
        }
        if (status !== undefined) {
            fieldsToUpdate.push(`status = ?`);
            queryParams.push(status);
        }
        if (assigned_pandit_id !== undefined) {
            fieldsToUpdate.push(`assigned_pandit_id = ?`);
            queryParams.push(assigned_pandit_id || null);
        }
        if (time_slot !== undefined) {
            fieldsToUpdate.push(`time_slot = ?`);
            queryParams.push(time_slot);
        }
        if (notes !== undefined) {
            fieldsToUpdate.push(`notes = ?`);
            queryParams.push(notes);
        }
        if (name !== undefined) {
            fieldsToUpdate.push(`name = ?`);
            queryParams.push(name);
        }
        if (mobile !== undefined) {
            fieldsToUpdate.push(`mobile = ?`);
            queryParams.push(mobile);
        }
        if (email !== undefined) {
            fieldsToUpdate.push(`email = ?`);
            queryParams.push(email);
        }

        if (fieldsToUpdate.length === 0) {
            return res.status(400).send({ success: false, message: "No valid fields provided for update" });
        }

        const updateQuery = `UPDATE yoga_users SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;
        queryParams.push(id);

        await db.query(updateQuery, queryParams);

        return res.status(200).send({ 
          success: true, 
          message: "Yoga Booking updated successfully" 
        });

    } catch (error) {
        console.error('Error updating yoga booking:', error);
        return res.status(500).send({ success: false, message: 'Internal server error' });
    }
};

exports.deleteYogaBooking = async (req, res) => {
    const { id } = req.params;

    try {
        const [existingBooking] = await db.query('SELECT * FROM yoga_users WHERE id = ?', [id]);

        if (existingBooking.length === 0) {
            return res.status(404).send({ success: false, message: "Booking not found" });
        }

        await db.query('DELETE FROM yoga_users WHERE id = ?', [id]);

        return res.status(200).send({ success: true, message: "Yoga Booking deleted successfully" });

    } catch (error) {
        console.error('Error deleting yoga booking:', error);
        return res.status(500).send({ success: false, message: 'Internal server error' });
    }
};

exports.createYogaBooking = async (req, res) => {
    try {
        const { user_id, name, email, mobile, payment_id, amount, booking_date } = req.body;

        if (!name || !mobile) {
            return res.status(400).send({
                success: false,
                message: "Name and mobile number are required"
            });
        }

        const [result] = await db.query(
            `INSERT INTO yoga_users (user_id, name, email, mobile, payment_id, amount, booking_date) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                user_id || (req.user && req.user.id) || null,
                name.trim(),
                email ? email.trim() : null,
                mobile.trim(),
                payment_id || `YOGA_${Date.now()}`,
                amount ? parseFloat(amount) : 0,
                booking_date || new Date().toISOString().slice(0, 10)
            ]
        );

        return res.status(201).send({
            success: true,
            message: "Yoga session booked successfully",
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('Error creating yoga booking:', error);
        return res.status(500).send({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};