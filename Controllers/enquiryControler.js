const db = require('../config/db');
const dotenv=require('dotenv')
dotenv.config();
const twilio=require('twilio');
const nodemailer=require('nodemailer');
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

exports.create = async (req, res) => {
    let { name, email, phone_no, message, address, reason } = req.body;
    if (!name || !email || !phone_no || !message) {
        return res.status(400).send({
            success: false,
            message: 'Name, email, phone number, and message are required'
        });
    }
    address = address || 'N/A';
    reason = reason || 'General Enquiry';
    try {
        const [data] = await db.query(
            `INSERT INTO enquiry (name, email, phone_no, message, address, reason) VALUES (?, ?, ?, ?, ?, ?)`,
            [name.trim(), email.trim(), phone_no.trim(), message.trim(), address, reason]
        );
        if (!data) {
            return res.status(404).send({
                success: false,
                message: 'Error in insert query'
            });
        }
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.email, 
                pass: process.env.pass 
            }
        });

        const mailOptions = {
            from: email,
            to: 'prabhupooja2024@gmail.com',
            subject: 'New Enquiry Submitted',
            html: `
                <h1>New Enquiry</h1>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Phone Number:</strong> ${phone_no}</p>
                <p><strong>Message:</strong> ${message}</p>
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });

        return res.status(201).send({ 
            success: true,
            message: 'Enquiry created successfully'
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success: false,
            message: 'Internal server error'
        });
    }
};

exports.getAll = async (req, res) => {
    try {
        const data = await db.query(`SELECT * FROM enquiry ORDER BY createdAt DESC`);
        
        if (!data.length) {
            return res.status(404).send({
                success: false,
                message: 'No enquiry found'
            });
        }

        return res.status(200).send({
            success: true,
            data: data
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: 'Internal server error'
        });
    }
};


exports.getById = async (req, res) => {
    const { id } = req.params; 
    try {
   
        const data = await db.query(`SELECT * FROM enquiry WHERE id = ?`, [id]);
        
        if (!data.length) {
            return res.status(404).send({
                success: false,
                message: `No enquiry found with id ${id}`
            });
        }

        return res.status(200).send({
            success: true,
            data: data[0] 
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: 'Internal server error'
        });
    }
};

exports.reply = async (req, res) => {
    const { id } = req.params;         
    const { reply,email } = req.body; 
  console.log(reply,email);

    if (!reply ||!email) {
      return res.status(400).send("Reply and phone number , email are required");
    }
  
    try {
   
      await db.query('UPDATE enquiry SET reply=? WHERE id=?', [reply, id]);
  
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.email, 
          pass: process.env.pass
        }
      });
      
      const mailOptions = {
        from: process.env.email,
        to: email,  
        subject: 'Your Inquiry has been Replied',
        html: `
          <h1>Inquiry Response</h1>
          <p>Dear User,</p>
          <p>Your inquiry has been replied to:</p>
          <p><strong>Reply:</strong> ${reply}</p>
          <p>Thank you for reaching out!</p>
        `
      };
  
      console.log('Sending email with the following details:', mailOptions);
      
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email:', error);
          return;
        }
        console.log('Email sent: ' + info.response);
      });
    
      return res.json({
        message: 'reply sent ',
        success: true,
      });
  
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({
        message: 'Error saving reply or sending SMS.',
        success: false,
      });
    }
  };
  