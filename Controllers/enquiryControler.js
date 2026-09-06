const nodemailer = require('nodemailer');
const db = require('../config/db');
const dotenv = require('dotenv');
dotenv.config();
const twilio = require('twilio');
const twilioClient = (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

exports.create = async (req, res) => {
    let { name, email, phone_no, message, address, reason, pandit_id, pandit_name, user_id, status } = req.body;
    if (!name || !email || !phone_no || !message) {
        return res.status(400).send({
            success: false,
            message: 'Name, email, phone number, and message are required'
        });
    }
    address = address || 'N/A';
    reason = reason || 'General Enquiry';
    const enquiryStatus = status || 'Pending';
    const targetPanditId = pandit_id ? Number(pandit_id) : null;
    const targetUserId = user_id ? Number(user_id) : null;

    try {
        const [data] = await db.query(
            `INSERT INTO enquiry (name, email, phone_no, message, address, reason, pandit_id, pandit_name, user_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name.trim(), email.trim(), phone_no.trim(), message.trim(), address, reason, targetPanditId, pandit_name || null, targetUserId, enquiryStatus]
        );
        if (!data) {
            return res.status(404).send({
                success: false,
                message: 'Error in insert query'
            });
        }

        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.email, 
                    pass: process.env.pass 
                }
            });

            const mailOptions = {
                from: process.env.email || 'prabhupooja2024@gmail.com',
                replyTo: email,
                to: 'prabhupooja2024@gmail.com',
                subject: `New Enquiry Submitted - ${name}${pandit_name ? ` (For Pandit: ${pandit_name})` : ''}`,
                html: `
                    <h2>New Enquiry Received</h2>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Phone Number:</strong> ${phone_no}</p>
                    <p><strong>Reason / Service:</strong> ${reason}</p>
                    ${pandit_name ? `<p><strong>Assigned Pandit:</strong> ${pandit_name} (ID: ${targetPanditId || 'N/A'})</p>` : ''}
                    <p><strong>Address:</strong> ${address}</p>
                    <p><strong>Message:</strong></p>
                    <p style="background-color: #f4f4f4; padding: 10px; border-radius: 5px;">${message}</p>
                `
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Error sending enquiry email:', error.message);
                } else {
                    console.log('Enquiry email sent: ' + info.response);
                }
            });
        } catch (mailErr) {
            console.error('Mail setup error in enquiry:', mailErr.message);
        }

        return res.status(201).send({ 
            success: true,
            message: 'Enquiry created successfully',
            enquiryId: data.insertId
        });
    } catch (error) {
        console.error('Error in create enquiry:', error);
        return res.status(500).send({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

exports.getAll = async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM enquiry ORDER BY id DESC`);
        
        return res.status(200).send({
            success: true,
            count: rows ? rows.length : 0,
            data: rows || []
        });
    } catch (error) {
        console.error('Error in getAll enquiry:', error);
        return res.status(500).send({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

exports.getById = async (req, res) => {
    const { id } = req.params; 
    try {
        const [rows] = await db.query(`SELECT * FROM enquiry WHERE id = ?`, [id]);
        
        if (!rows || rows.length === 0) {
            return res.status(404).send({
                success: false,
                message: `No enquiry found with id ${id}`
            });
        }

        return res.status(200).send({
            success: true,
            data: rows[0] 
        });
    } catch (error) {
        console.error('Error in getById enquiry:', error);
        return res.status(500).send({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

exports.getByPanditId = async (req, res) => {
    const { panditId } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT * FROM enquiry 
            WHERE pandit_id = ? OR pandit_id IN (SELECT id FROM pandit WHERE id = ?)
            ORDER BY id DESC
        `, [panditId, panditId]);

        return res.status(200).send({
            success: true,
            count: rows ? rows.length : 0,
            data: rows || []
        });
    } catch (error) {
        console.error('Error in getByPanditId enquiry:', error);
        return res.status(500).send({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

exports.getByUserId = async (req, res) => {
    const { userId } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT * FROM enquiry 
            WHERE user_id = ?
            ORDER BY id DESC
        `, [userId]);

        return res.status(200).send({
            success: true,
            count: rows ? rows.length : 0,
            data: rows || []
        });
    } catch (error) {
        console.error('Error in getByUserId enquiry:', error);
        return res.status(500).send({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

exports.updateStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
        return res.status(400).send({ success: false, message: "Status is required" });
    }

    try {
        await db.query(`UPDATE enquiry SET status = ? WHERE id = ?`, [status, id]);
        return res.status(200).send({
            success: true,
            message: "Enquiry status updated successfully"
        });
    } catch (error) {
        console.error('Error in updateStatus enquiry:', error);
        return res.status(500).send({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

exports.reply = async (req, res) => {
    const { id } = req.params;         
    const { reply, email } = req.body; 

    if (!reply || !email) {
      return res.status(400).send({
        success: false,
        message: "Reply and email are required"
      });
    }
  
    try {
      await db.query('UPDATE enquiry SET reply=?, status="Replied" WHERE id=?', [reply, id]);
  
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.email, 
            pass: process.env.pass
          }
        });
        
        const mailOptions = {
          from: process.env.email || 'prabhupooja2024@gmail.com',
          to: email,  
          subject: 'Your Inquiry has been Replied - Prabhu Pooja',
          html: `
            <h2>Inquiry Response</h2>
            <p>Dear User,</p>
            <p>Your inquiry has been replied to:</p>
            <p style="background-color: #f4f4f4; padding: 10px; border-radius: 5px;"><strong>Reply:</strong> ${reply}</p>
            <p>Thank you for reaching out to Prabhu Pooja!</p>
          `
        };
        
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error('Error sending reply email:', error.message);
          } else {
            console.log('Reply email sent: ' + info.response);
          }
        });
      } catch (mErr) {
        console.error('Mail setup error in enquiry reply:', mErr.message);
      }
    
      return res.json({
        success: true,
        message: 'Reply saved and email sent successfully',
      });
    } catch (error) {
      console.error('Error in reply enquiry:', error);
      return res.status(500).json({
        success: false,
        message: 'Error saving reply',
        error: error.message
      });
    }
};
  