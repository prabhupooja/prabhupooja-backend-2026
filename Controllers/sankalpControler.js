const db = require('../config/db');

// 1. Create Guidance / Quick Enquiry (Form 1: मार्गदर्शन अथवा प्रश्न पूछें)
// Fields: name, phone, city_state, topic, message
exports.createEnquiry = async (req, res) => {
    try {
        const { name, phone, city_state, topic, message } = req.body;

        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Name and Phone/WhatsApp number are required.'
            });
        }

        const [result] = await db.query(
            `INSERT INTO sankalp_enquiries (name, phone, city_state, topic, message) VALUES (?, ?, ?, ?, ?)`,
            [
                name ? name.trim() : '',
                phone ? phone.trim() : '',
                city_state ? city_state.trim() : null,
                topic ? topic.trim() : null,
                message ? message.trim() : null
            ]
        );

        return res.status(201).json({
            success: true,
            message: 'मार्गदर्शन / प्रश्न अनुरोध सफलतापूर्वक दर्ज कर लिया गया है।',
            id: result.insertId
        });
    } catch (error) {
        console.error('Error creating sankalp enquiry:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while submitting enquiry.',
            error: error.message
        });
    }
};

// 2. Create Multi-Step Vedic Sankalp & Anushthan Booking (Form 2 & 3: ऑनलाइन अनुष्ठान व परामर्श संकल्प)
// Fields: host_name, father_husband_name, gotra, whatsapp_number, location_city_state, ritual_name, special_wish
exports.createBooking = async (req, res) => {
    try {
        const {
            host_name,
            father_husband_name,
            gotra,
            whatsapp_number,
            location_city_state,
            ritual_name,
            special_wish
        } = req.body;

        if (!host_name || !whatsapp_number || !ritual_name) {
            return res.status(400).json({
                success: false,
                message: 'Host Name, WhatsApp Number, and Ritual Name are required.'
            });
        }

        // Generate unique Reference ID jaise MBM-75574
        const randomDigits = Math.floor(10000 + Math.random() * 90000);
        const reference_id = `MBM-${randomDigits}`;

        const [result] = await db.query(
            `INSERT INTO sankalp_bookings (
                reference_id, 
                host_name, 
                father_husband_name, 
                gotra, 
                whatsapp_number, 
                location_city_state, 
                ritual_name, 
                special_wish,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
            [
                reference_id,
                host_name ? host_name.trim() : '',
                father_husband_name ? father_husband_name.trim() : null,
                gotra ? gotra.trim() : null,
                whatsapp_number ? whatsapp_number.trim() : '',
                location_city_state ? location_city_state.trim() : null,
                ritual_name ? ritual_name.trim() : '',
                special_wish ? special_wish.trim() : null
            ]
        );

        return res.status(201).json({
            success: true,
            message: 'Resolution request successfully submitted. May Mother Goddess bless you.',
            data: {
                id: result.insertId,
                reference_id: reference_id,
                host_name: host_name,
                father_husband_name: father_husband_name || '',
                gotra: gotra || '',
                whatsapp_number: whatsapp_number,
                location_city_state: location_city_state || '',
                ritual_name: ritual_name,
                special_wish: special_wish || '',
                status: 'Pending'
            }
        });
    } catch (error) {
        console.error('Error creating sankalp booking:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while submitting booking.',
            error: error.message
        });
    }
};

// 3. Admin: Get all Enquiries with search, filters & pagination
exports.getAllEnquiries = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;

        const { search, status, fromDate, toDate } = req.query;

        let whereClauses = [];
        let queryParams = [];

        if (search) {
            whereClauses.push(`(name LIKE ? OR phone LIKE ? OR topic LIKE ? OR city_state LIKE ?)`);
            const s = `%${search}%`;
            queryParams.push(s, s, s, s);
        }

        if (status) {
            whereClauses.push(`status = ?`);
            queryParams.push(status);
        }

        if (fromDate) {
            whereClauses.push(`DATE(created_at) >= ?`);
            queryParams.push(fromDate);
        }

        if (toDate) {
            whereClauses.push(`DATE(created_at) <= ?`);
            queryParams.push(toDate);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Count Total
        const [countRows] = await db.query(
            `SELECT COUNT(*) as total FROM sankalp_enquiries ${whereSql}`,
            queryParams
        );
        const total = countRows[0].total;

        // Fetch paginated rows
        const [rows] = await db.query(
            `SELECT * FROM sankalp_enquiries ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
            [...queryParams, limit, offset]
        );

        return res.status(200).json({
            success: true,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            data: rows
        });
    } catch (error) {
        console.error('Error getting sankalp enquiries:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// 4. Admin: Get all Bookings with search, filters & pagination
exports.getAllBookings = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;

        const { search, status, ritual_name, fromDate, toDate } = req.query;

        let whereClauses = [];
        let queryParams = [];

        if (search) {
            whereClauses.push(`(reference_id LIKE ? OR host_name LIKE ? OR whatsapp_number LIKE ? OR location_city_state LIKE ? OR gotra LIKE ?)`);
            const s = `%${search}%`;
            queryParams.push(s, s, s, s, s);
        }

        if (status) {
            whereClauses.push(`status = ?`);
            queryParams.push(status);
        }

        if (ritual_name) {
            whereClauses.push(`ritual_name LIKE ?`);
            queryParams.push(`%${ritual_name}%`);
        }

        if (fromDate) {
            whereClauses.push(`DATE(created_at) >= ?`);
            queryParams.push(fromDate);
        }

        if (toDate) {
            whereClauses.push(`DATE(created_at) <= ?`);
            queryParams.push(toDate);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Count Total
        const [countRows] = await db.query(
            `SELECT COUNT(*) as total FROM sankalp_bookings ${whereSql}`,
            queryParams
        );
        const total = countRows[0].total;

        // Fetch paginated rows
        const [rows] = await db.query(
            `SELECT * FROM sankalp_bookings ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
            [...queryParams, limit, offset]
        );

        return res.status(200).json({
            success: true,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            data: rows
        });
    } catch (error) {
        console.error('Error getting sankalp bookings:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// 5. Admin: Get Single Booking by ID or Reference ID
exports.getBookingById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(
            `SELECT * FROM sankalp_bookings WHERE id = ? OR reference_id = ?`,
            [id, id]
        );

        if (!rows || rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No sankalp booking found with that identifier.'
            });
        }

        return res.status(200).json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        console.error('Error getting booking detail:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// 6. Admin: Update Status of Booking
exports.updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required.'
            });
        }

        const [result] = await db.query(
            `UPDATE sankalp_bookings SET status = ? WHERE id = ? OR reference_id = ?`,
            [status, id, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'No sankalp booking found to update.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Booking status updated successfully.'
        });
    } catch (error) {
        console.error('Error updating booking status:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// 7. Admin: Update Status of Enquiry
exports.updateEnquiryStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required.'
            });
        }

        const [result] = await db.query(
            `UPDATE sankalp_enquiries SET status = ? WHERE id = ?`,
            [status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'No enquiry found to update.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Enquiry status updated successfully.'
        });
    } catch (error) {
        console.error('Error updating enquiry status:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// 8. Admin: Delete Booking
exports.deleteBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.query(
            `DELETE FROM sankalp_bookings WHERE id = ? OR reference_id = ?`,
            [id, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'No record found to delete.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Booking deleted successfully.'
        });
    } catch (error) {
        console.error('Error deleting booking:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// 9. Admin: Delete Enquiry
exports.deleteEnquiry = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.query(
            `DELETE FROM sankalp_enquiries WHERE id = ?`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'No record found to delete.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Enquiry deleted successfully.'
        });
    } catch (error) {
        console.error('Error deleting enquiry:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};
