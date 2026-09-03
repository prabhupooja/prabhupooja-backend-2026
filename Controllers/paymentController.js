const Razorpay = require('razorpay');
const db = require('../config/db');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const razorpayInstance = new Razorpay({
  key_id: process.env.RazorPay_Key_Id,
  key_secret: process.env.RazorPay_Key_Secret
});
console.log(process.env.RazorPay_Key_Id);

exports.createOrder = async (req, res) => {
  let { amount, currency, user_id, puja, puja_id } = req.body;

  try {
    if (puja_id) {
      const [pujaRows] = await db.query('SELECT price, discount, final_price FROM puja WHERE id = ?', [puja_id]);
      if (pujaRows && pujaRows.length > 0) {
        const p = pujaRows[0];
        const pPrice = Number(p.price) || 0;
        const pDiscount = Number(p.discount) || 0;
        const pFinalPrice = Number(p.final_price) || 0;

        let calculatedAmount = pFinalPrice;
        if (!calculatedAmount || calculatedAmount <= 0 || calculatedAmount > pPrice) {
          calculatedAmount = pDiscount > 0 ? Math.round(pPrice - (pPrice * pDiscount / 100)) : pPrice;
        }
        if (calculatedAmount > 0) {
          amount = calculatedAmount;
        }
      }
    }

    const options = {
      amount: Math.round(Number(amount) * 100),
      currency: currency || 'INR',
      receipt: `receipt_order_${Date.now()}`,
    };

    const order = await razorpayInstance.orders.create(options);
    const createdAt = order.created_at;

    const data = await db.query(
      'INSERT INTO payments (order_id, amount, currency, user_id, puja, puja_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [order.id, amount, currency || 'INR', user_id, puja, puja_id, createdAt]
    );

    if (!data) {
      return res.status(404).send({
        success: false,
        message: "Error in insert query"
      });
    }

    return res.status(201).send({
      success: true,
      message: "Order created successfully",
      key_id: process.env.RazorPay_Key_Id,
      data: order
    });

  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};


exports.verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  console.log('API triggered from frontend:', req.body);
  const key_secret = process.env.RazorPay_Key_Secret;

  const generated_signature = crypto.createHmac('sha256', key_secret)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');

  console.log('Generated Signature:', generated_signature);

  if (generated_signature === razorpay_signature) {
    try {
      const paymentData = await db.query(
        'UPDATE payments SET status = ?, payment_id = ? WHERE order_id = ?',
        ['success', razorpay_payment_id, razorpay_order_id]
      );
      

      if (paymentData.affectedRows === 0) {
        return res.status(404).send({
          success: false,
          message: "Error in update query"
        });
      }

      const [payment] = await db.query('SELECT amount, user_id, puja ,puja_id,created_at FROM payments WHERE order_id = ?', [razorpay_order_id]);

      if (payment[0].puja_id) {
        const [user] = await db.query('SELECT name, email FROM users WHERE id = ?', [payment[0].user_id]);

        if (user && user[0].email) {

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
            subject: 'Pooja Booking Confirmation',
            text: `Dear ${user[0].name},\n\nYour payment of ₹${payment[0].amount} has been successfully processed, and your Pooja has been booked.\n\nThank you for booking with PrabhuPooja!\n\nBest regards,\nPrabhuPooja`
          };

          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.error('Error sending email:', error);
            } else {
              console.log('Pooja booking confirmation email sent: ' + info.response);
            }
          });
        }
      }
      if (payment[0].puja === 'Astrology') {
        // Update balance for Astrology payment
        const userData = await db.query(
          'UPDATE users SET balance = COALESCE(balance, 0) + ? WHERE id = ?',
          [payment[0].amount, payment[0].user_id]
        );

        // Fetch user details
        const [user] = await db.query('SELECT name, email FROM users WHERE id = ?', [payment[0].user_id]);

        if (user && user[0].email) {
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: process.env.email,
              pass: process.env.pass,
            }
          });

          // Decide email content based on success or failure of balance update
          let subject, text;

          if (!userData || userData.affectedRows === 0) {
            subject = 'Balance Update Failed';
            text = `Dear ${user[0].name},\n\nYour payment of ₹${payment[0].amount} was successful, but we encountered an issue while updating your balance. Our team has been notified, and we're working to resolve it.\n\nBest regards,\nPrabhuPooja`;
          } else {
            subject = 'Astrology Balance Updated';
            text = `Dear ${user[0].name},\n\nYour payment of ₹${payment[0].amount} has been successfully processed and your balance has been updated.\n\nThank you for choosing PrabhuPooja!\n\nBest regards,\nPrabhuPooja`;
          }

          const mailOptions = {
            from: process.env.email,
            to: user[0].email,
            subject,
            text
          };

          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.error('Error sending email:', error);
            } else {
              console.log('Email sent: ' + info.response);
            }
          });
        }

        if (!userData || userData.affectedRows === 0) {
          return res.status(404).send({
            success: false,
            message: "Error in user update query"
          });
        }

      }
      else if (payment[0].puja === 'Membership') {

        const timestamp = payment[0].created_at * 1000; // Convert seconds to milliseconds
        console.log("Timestamp:", timestamp);

        if (!timestamp || isNaN(timestamp)) {
          return res.status(400).send({
            success: false,
            message: "Invalid or missing payment timestamp"
          });
        }

        // Update the user's membership details
        const userData = await db.query(
          'UPDATE users SET membershipBalance = COALESCE(membershipBalance, 0) + ?, member = 1 WHERE id = ?',
          [payment[0].amount, payment[0].user_id]
        );

        if (!userData) {
          return res.status(404).send({
            success: false,
            message: "Error in user update query"
          });
        }

        // Format the payment date
        const formattedDate = new Date(timestamp).toISOString().split('T')[0]; // YYYY-MM-DD format

        // Calculate the expiry date
        const expiryDateObj = new Date(timestamp); // Create a Date object
        expiryDateObj.setDate(expiryDateObj.getDate() + 2); // Add 2 days to the payment date
        const expiryDate = expiryDateObj.toISOString().split('T')[0]; // Format expiry date as YYYY-MM-DD

        // Insert membership data into the memberships table
        const membershipData = await db.query(
          'INSERT INTO membership (user_id, amount, payment_date, expiry_date) VALUES (?, ?, ?, ?)',
          [payment[0].user_id, payment[0].amount, formattedDate, expiryDate]
        );

        if (!membershipData) {
          return res.status(500).send({
            success: false,
            message: "Error in membership insert query"
          });
        }

        // Fetch user details and send confirmation email
        const [user] = await db.query('SELECT name, email FROM users WHERE id = ?', [payment[0].user_id]);
        if (user && user[0].email) {
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
            subject: 'Membership Purchase Confirmation',
            html: `
                    <p>Dear ${user[0].name},</p>
                    <p>Thank you for purchasing a 1-year membership. Your membership balance has been updated with an amount of <strong>${payment[0].amount}</strong>.</p>
                    <p>Enjoy the exclusive benefits of being a member!</p>
                    <br />
                    <p>Best regards,</p>
                    <p>PrabhuPooja</p>`
          };

          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.error('Error sending email:', error);
            } else {
              console.log('Membership confirmation email sent: ' + info.response);
            }
          });
        }
      }
      else if (payment[0].puja === 'Yoga') {
        const [user] = await db.query('SELECT id, name, email, mobile FROM users WHERE id = ?', [payment[0].user_id]);

        if (user && user[0].email) {
          const currentDate = new Date();

          await db.query(
            'INSERT INTO yoga_users (user_id, name, email, mobile, payment_id, amount, booking_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [user[0].id, user[0].name, user[0].email, user[0].mobile, razorpay_payment_id, payment[0].amount, currentDate]
          );


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
            subject: 'Yoga Class Booking Confirmation',
            text: `Dear ${user[0].name},\n\nYour payment has been successfully processed and your Yoga class has been booked for ${currentDate.toLocaleDateString()}.\n\nThank you for booking with us!\n\nBest regards,\nPrabhuPooja.`,
          };

          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.error('Error sending email:', error);
            } else {
              console.log('Email sent: ' + info.response);
            }
          });
        }
      }
      else if (payment[0].puja === 'temple') {
        const [user] = await db.query('SELECT name, email FROM users WHERE id = ?', [payment[0].user_id]);

        if (user && user[0].email) {
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
            subject: 'Temple Booking Confirmation',
            text: `Dear ${user[0].name},\n\nYour payment has been successfully processed, and temple is booked for you.\n\nBest regards,\nPrabhuPooja`
          };

          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.error('Error sending email:', error);
            } else {
              console.log('Order confirmation email sent: ' + info.response);
            }
          });
        }
      } else if (payment[0].puja === 'problem_pooja') {
        const [user] = await db.query('SELECT name, email FROM users WHERE id = ?', [payment[0].user_id]);

        if (user && user[0].email) {
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
            subject: 'Pooja Booking Confirmation',
            text: `Dear ${user[0].name},\n\nYour payment has been successfully
             processed, and pooja is booked for you.\n\nBest regards,\nPrabhuPooja`
          };

          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.error('Error sending email:', error);
            } else {
              console.log('Order confirmation email sent: ' + info.response);
            }
          });
        }
      }

      return res.status(201).send({
        status: payment[0].status,
        success: true,
        message: "Payment successful"
      });

    } catch (error) {
      console.error(error);
      return res.status(500).send({
        success: false,
        message: "Internal Server Error",
      });
    }
  } else {
    // Send email on payment verification failure
    try {
      const [user] = await db.query('SELECT name, email FROM users WHERE id = (SELECT user_id FROM payments WHERE order_id = ?)', [razorpay_order_id]);

      if (user && user[0].email) {
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
          subject: 'Payment Failed',
          text: `Dear ${user[0].name},\n\n
          Your recent payment attempt has failed due to 
          a verification issue. If any amount has been deducted
           from your account, it will be refunded by your bank 
           shortly.\n\nFor further assistance, please contact our support team.
           \n\nBest regards,\nPrabhuPooja`
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error('Error sending failure email:', error);
          } else {
            console.log('Failure email sent: ' + info.response);
          }
        });
      }
    } catch (err) {
      console.error('Error fetching user for failure email:', err);
    }

    return res.status(400).send({
      success: false,
      message: 'Payment verification failed'
    });
  }
};


exports.paymentStatus = async (req, res) => {
  const { user_id, puja_id } = req.params;

  try {
    const [payment] = await db.query(
      `SELECT status 
      FROM payments 
      WHERE user_id = ? AND puja_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1`
      ,
      [user_id, puja_id]
    );

    if (!payment || payment.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Payment not found",
        user_id,
        puja_id,
      });
    }

    return res.status(200).send({
      success: true,
      status: payment[0].status,
    });
  } catch (error) {
    console.error('Database Query Error:', error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

