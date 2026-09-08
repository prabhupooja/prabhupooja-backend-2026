const db = require("../config/db");
const axios = require("axios");
const twilio = require("twilio");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const { parsePhoneNumberFromString } = require("libphonenumber-js");
const { v4: uuidv4 } = require("uuid");
const { generateToken } = require("../config/genratetokenConfig");

dotenv.config();

const jwt_secret_key = process.env.JWT_SECRET_KEY;

exports.register = async (req, res) => {
  try {
    const { name, lastname, mobile, email, role } = req.body;
    const image = req.file ? req.file.location : null;
    const uuid = uuidv4();
    if (!name || !mobile || !email || !role) {
      return res.status(400).send({
        success: false,
        message: "Please provide all details",
      });
    }
    const cleanMobile = String(mobile || "").replace(/\D/g, "").slice(-10);
    if (!cleanMobile || cleanMobile.length !== 10 || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      return res.status(400).send({
        success: false,
        message: "Please provide a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.",
      });
    }
    const [existingUser] = await db.query(
      `SELECT mobile, email FROM users WHERE mobile = ? OR email = ? 
       UNION ALL 
       SELECT mobile, email FROM pandit WHERE mobile = ? OR email = ?`,
      [cleanMobile, email, cleanMobile, email]
    );

    if (existingUser && existingUser.length > 0) {
      return res.status(409).send({
        success: false,
        message: "You already have an account with this number or email",
      });
    }
    let data;
    if (role === "1") {
      [data] = await db.query(
        `INSERT INTO pandit (name, lastname, mobile, email, role,uuid) VALUES (?, ?, ?, ?, ?,?)`,
        [name, lastname, cleanMobile, email, role, uuid]
      );

      const panditId = data.insertId;
      await db.query(
        `INSERT INTO pandit_status (pandit_id, status, chat_mode) VALUES (?, ?, ?)`,
        [panditId, 0, 0]
      );

      if (panditId) {
        const transporter = nodemailer.createTransport({
          service: "Gmail",
          auth: {
            user: process.env.email,
            pass: process.env.pass,
          },
        });
        const mailOptions = {
          from: process.env.email,
          to: "birtharedivakar1990@gmail.com",
          subject: "New Pandit Registered",
          html: `
  <p>Dear Admin,</p>
  <p>A new Pandit <strong>${name}</strong> has registered on Prabhu Pooja.</p>
  <p>Please review and verify the profile in the admin panel.</p>
  <p>email - ${email}</p>
  <p>number - ${mobile}</p>
  <p>🙏 Regards,<br/>Prabhu Pooja System</p>`,
        };
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error("Error sending email:", error);
          } else {
            console.log("Email sent: " + info.response);
          }
        });
      }
    } else if (role === "0") {
      [data] = await db.query(
        `INSERT INTO users (name,lastname, mobile, email, role, image,uuid,created_at) VALUES (?,?, ?, ?, ?, ?,?,NOW())`,
        [name, lastname, cleanMobile, email, role, image, uuid]
      );

      const userId = data.insertId;
      await db.query(
        `INSERT INTO user_status (user_id, status, chat_mode) VALUES (?, ?, ?)`,
        [userId, 0, 0]
      );
    } else {
      return res.status(400).send({
        success: false,
        message: "Invalid role specified",
      });
    }
    if (!data || !data.insertId) {
      return res.status(500).send({
        success: false,
        message: "Error in insert query",
      });
    }
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.email,
        pass: process.env.pass,
      },
    });
    const mailOptions = {
      from: process.env.email,
      to: email,
      subject: "Registration Successful",
      html: `
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>Prabhu Pooja - Registration Successful</title>
    <style>
      /* Main Email Container */
      .mail-container {
        width: 100%;
        max-width: 600px;
        margin: auto;
        background: linear-gradient(135deg, #ffb300, #ff7043);
        padding: 20px;
        border-radius: 15px;
        text-align: center;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        animation: fadeIn 1.5s ease-in-out;
      }

      /* Header */
      .mail-header {
        padding-bottom: 20px;
      }

      .mail-header img {
        height: 60px;
        animation: slideDown 1.2s ease-in-out;
      }

      /* Content */
      .mail-content {
        background: #fff3e0;
        padding: 25px;
        border-radius: 10px;
        text-align: center;
        animation: fadeInUp 1.5s ease-in-out;
      }

      /* Button */
      .mail-btn {
        display: inline-block;
        padding: 14px 28px;
        background: linear-gradient(45deg, #d84315, #ff6f00);
        color: white;
        text-decoration: none;
        border-radius: 8px;
        font-weight: bold;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
        transition: transform 0.3s ease-in-out;
      }

      .mail-btn:hover {
        background: linear-gradient(45deg, #ff6f00, #d84315);
        transform: scale(1.1);
      }

      /* Footer */
      .mail-footer {
        text-align: center;
        font-size: 14px;
        color: #4e342e;
        margin-top: 25px;
        animation: fadeIn 2s ease-in-out;
      }

      .mail-footer a {
        color: #bf360c;
        text-decoration: none;
        font-weight: bold;
      }

      /* Animations */
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    </style>
  </head>
  <body>
    <div class="mail-container">
      <div class="mail-header">
        <img src="https://prabhupooja.s3.ap-south-1.amazonaws.com/onlinePooja/prabhupooja-logo.png" alt="Prabhu Pooja">
      </div>
      <div class="mail-content">
        <h2 style="color: #bf360c;">🌟 Welcome ${name}! 🌟</h2>
        <p style="color: #4e342e;">Thank you for registering with Prabhu Pooja.</p>
        <p style="color: #5d4037;">🌿 Experience authentic Hindu rituals and poojas from the comfort of your home.</p>
        <p style="color: #6d4c41;">📜 Book your personalized pooja services now and receive divine blessings.</p>
        <p style="text-align: center;"><a href="https://www.prabhupooja.com/onlinepooja" class="mail-btn">📅 Book a Pooja Now</a></p>
        <p style="text-align: center; font-weight: bold; color: #bf360c;">🙏 Thank you, ${name}, for registering with Prabhu Pooja! We appreciate your trust in our services. May you receive divine blessings! 🌸</p>
      </div>
      <div class="mail-footer">
        <p>&copy; 2025 Prabhu Pooja. All Rights Reserved.</p>
        <p><a href="https://www.prabhupooja.com">Unsubscribe</a></p>
      </div>
    </div>
  </body>
</html>`,
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });

    return res.status(201).send({
      success: true,
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Error in register function:", error);
    return res.status(500).send({
      success: false,
      message: "Error in creating user",
      error: error.message,
    });
  }
};
exports.getUser = async (req, res) => {
  try {
    const data = await db.query(
      "select *  from users  ORDER BY created_at DESC"
    );
    if (!data) {
      return res.status(404).send({
        success: false,
        message: "data not found",
      });
    }
    return res.status(200).send({
      success: true,
      message: "All users record",
      data: data[0],
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error in get all users",
      error,
    });
  }
};
exports.getUserByid = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id);
    if (!id) {
      return res.status(401).send({
        success: false,
        message: "Unauthorized access",
      });
    }
    const [userResult] = await db.query("SELECT * FROM users WHERE id = ?", [
      id,
    ]);

    if (userResult.length === 0) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }
    return res.status(200).send({
      success: true,
      message: "User record retrieved successfully",
      data: userResult[0],
    });
  } catch (error) {
    console.error("Error in getUser function:", error);
    return res.status(500).send({
      success: false,
      message: "Error in fetching user data",
      error,
    });
  }
};
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
const twilioClient = (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;
exports.login = async (req, res) => {
  try {
    const rawInput = req.body?.input || req.body?.mobile || req.body?.number || req.body?.phone || req.body?.email || req.body?.contact;
    const otp = generateOTP();

    if (!rawInput || !String(rawInput).trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter your mobile number or email address."
      });
    }

    const input = String(rawInput).trim();
    const isEmail = input.includes("@");
    let clean10Digit = null;
    let formattedMobile = null;

    let user = null;
    let isPandit = false;

    if (isEmail) {
      // Validate Email Format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid email address format (e.g. user@example.com)."
        });
      }

      // Check users table
      const [usersResult] = await db.query(
        `SELECT * FROM users WHERE email = ?`,
        [input]
      );
      if (usersResult.length > 0) {
        user = usersResult[0];
        isPandit = false;
      } else {
        // Check pandit table
        const [panditResult] = await db.query(
          `SELECT * FROM pandit WHERE email = ?`,
          [input]
        );
        if (panditResult.length > 0) {
          user = panditResult[0];
          isPandit = true;
        }
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "This email address is not registered. Please register first to continue."
        });
      }
    } else {
      // Mobile Number Validation
      const digitsOnly = input.replace(/\D/g, "");

      if (digitsOnly.length < 10 || digitsOnly.length > 13) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid 10-digit mobile number."
        });
      }

      clean10Digit = digitsOnly.slice(-10);

      // Validate Indian 10-digit mobile number starting digit (6, 7, 8, 9)
      if (!/^[6-9]\d{9}$/.test(clean10Digit)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9."
        });
      }

      formattedMobile = `+91${clean10Digit}`;

      // Check users table for mobile
      const [usersResult] = await db.query(
        `SELECT * FROM users WHERE mobile = ? OR mobile = ? OR mobile = ? OR mobile = ?`,
        [clean10Digit, formattedMobile, input, digitsOnly]
      );
      if (usersResult.length > 0) {
        user = usersResult[0];
        isPandit = false;
      } else {
        // Check pandit table for mobile
        const [panditResult] = await db.query(
          `SELECT * FROM pandit WHERE mobile = ? OR mobile = ? OR mobile = ? OR mobile = ?`,
          [clean10Digit, formattedMobile, input, digitsOnly]
        );
        if (panditResult.length > 0) {
          user = panditResult[0];
          isPandit = true;
        }
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "This mobile number is not registered. Please register first to continue."
        });
      }
    }

    // Generate Token & Save OTP
    const token = generateToken(user.id);
    const targetTable = isPandit ? "pandit" : "users";

    const [updateResult] = await db.query(
      `UPDATE ${targetTable} SET token = ?, otp = ? WHERE id = ?`,
      [token, otp, user.id]
    );

    if (updateResult.affectedRows === 0) {
      return res.status(500).json({
        success: false,
        error: `Failed to update OTP for ${isPandit ? "pandit" : "user"}`
      });
    }

    // Auto Expire OTP after 5 Minutes
    setTimeout(async () => {
      try {
        await db.query(
          `UPDATE ${targetTable} SET otp = NULL WHERE id = ? AND otp = ?`,
          [user.id, otp]
        );
      } catch (expErr) {}
    }, 5 * 60 * 1000);

    console.log(`\n========================================\n🔑 ${isPandit ? "PANDIT" : "USER"} LOGIN OTP FOR [${input} / ${user.name || "User"}]: ${otp}\n========================================\n`);

    // Dispatch SMS if mobile is available
    if (formattedMobile) {
      // 1. Try Twilio
      if (process.env.TWILIO_PHONE_NUMBER && twilioClient) {
        try {
          await twilioClient.messages.create({
            body: `Dear user, your OTP for login to Prabhupooja is ${otp}. Please do not share this OTP with anyone.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: formattedMobile,
          });
        } catch (twilioError) {
          console.warn("Twilio SMS Warning:", twilioError.message);
        }
      }

      // 2. Try MSG91
      try {
        await axios.post("https://api.msg91.com/api/v5/otp", {
          mobile: formattedMobile,
          otp,
          authkey: "429244AwFH2ZM3FNN66d2d451P1",
          sender: "Prabhupooja",
          message: `Dear user, your OTP for login to Prabhupooja is ${otp}. Please do not share this OTP with anyone.`,
        });
      } catch (msg91Err) {
        console.warn("MSG91 SMS Warning:", msg91Err.message);
      }
    }

    // Dispatch Email if email is available
    const recipientEmail = isEmail ? input : user.email;
    if (recipientEmail && process.env.email && process.env.pass) {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: { user: process.env.email, pass: process.env.pass },
        });

        const mailOptions = {
          from: process.env.email,
          to: recipientEmail,
          subject: "OTP for Login - Prabhu Pooja",
          html: `<html>
  <body style="font-family: Arial, sans-serif; background: #ffffff; margin: 0; padding: 20px; text-align: center;">
    <div style="max-width: 600px; margin: auto; border: 1px solid #ffe0b2; border-radius: 12px; padding: 24px; background: #fffbf5;">
      <img src="https://prabhupooja.s3.ap-south-1.amazonaws.com/onlinePooja/prabhupooja-logo.png" alt="Prabhu Pooja" height="40" style="margin-bottom: 20px;">
      <h2 style="color: #bf360c; margin-top: 0;">Prabhu Pooja Login Verification</h2>
      <p style="color: #333; font-size: 15px;">Hello <b>${user.name || (isPandit ? "Pandit Ji" : "User")}</b>,</p>
      <p style="color: #555;">Your One-Time Password (OTP) for login is:</p>
      <div style="font-size: 30px; font-weight: bold; color: #e65100; letter-spacing: 4px; background: #ffe0b2; padding: 12px 24px; border-radius: 8px; display: inline-block; margin: 15px 0;">${otp}</div>
      <p style="font-size: 13px; color: #777;">This OTP is valid for <b>5 minutes</b>. Please do not share this OTP with anyone.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #999;">© 2026 Prabhu Pooja. All rights reserved.</p>
    </div>
  </body>
</html>`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.warn("⚠️ SMTP Notice (Gmail App Password invalid or expired):", error.message);
            console.log(`ℹ️ [FALLBACK OTP] Use OTP '${otp}' to login.`);
          } else {
            console.log("✅ Email sent successfully to:", recipientEmail);
          }
        });
      } catch (err) {
        console.warn("Mail transport error:", err.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `OTP sent successfully to ${input}`,
      Otp: otp,
      role: user.role !== undefined ? user.role : (isPandit ? "1" : "0"),
      userType: isPandit ? "pandit" : "user",
      userId: user.id,
      user: {
        id: user.id,
        name: user.name,
        lastname: user.lastname,
        mobile: user.mobile,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Error in login function:", error.message, error.stack);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message
    });
  }
};
exports.googleAuthCallback = (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Authentication failed" });
  }
  const redirectPath = req.query.state || "/";
  const frontendUrl = process.env.FRONTEND_URL || 'https://www.prabhupooja.com';
  return res.redirect(
    `${frontendUrl}${redirectPath}?token=${token}`
  );
};
exports.AppGoogleLogin = async (req, res) => {
  try {
    const { googleId, email, firstName, lastName, photoUrl } = req.body;

    const [rows] = await db.query(
      `SELECT * FROM users WHERE google_id = ? OR email = ?`,
      [googleId, email]
    );
    if (rows.length > 0) {
      const user = rows[0];
      const token = generateToken(user.id);
      return res.status(200).json({ success: true, token: token });
    }

    const [result] = await db.query(
      `INSERT INTO users (google_id, email, name, lastname, image, role) VALUES (?, ?, ?, ?, ?,?)`,
      [googleId, email, firstName, lastName, photoUrl, 0]
    );

    console.log(result, "lklklklkl");

    const token = generateToken(result.insertId);

    res.status(201).json({ success: true, token: token });
  } catch (error) {
    console.error("Error during Google login:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
exports.verifyOtp = async (req, res) => {
  const { otp } = req.body;
  if (!otp || !String(otp).trim()) {
    return res.status(400).json({
      success: false,
      error: "Please enter the 6-digit OTP."
    });
  }

  try {
    let [usersData] = await db.query("SELECT * FROM users WHERE otp = ?", [
      String(otp).trim(),
    ]);

    if (usersData.length > 0) {
      const matchedUser = usersData[0];
      // OTP verified, now set OTP to NULL in the database
      await db.query("UPDATE users SET otp = NULL WHERE id = ?", [
        matchedUser.id,
      ]);

      return res.status(200).json({
        success: true,
        message: "OTP verified successfully for user",
        auth: matchedUser.token,
        token: matchedUser.token,
        userType: "user",
        user: {
          id: matchedUser.id,
          name: matchedUser.name,
          lastname: matchedUser.lastname,
          mobile: matchedUser.mobile,
          email: matchedUser.email,
          role: matchedUser.role
        }
      });
    }

    let [panditsData] = await db.query("SELECT * FROM pandit WHERE otp = ?", [
      String(otp).trim(),
    ]);

    if (panditsData.length > 0) {
      const matchedPandit = panditsData[0];
      // OTP verified, now set OTP to NULL in the database
      await db.query("UPDATE pandit SET otp = NULL WHERE id = ?", [
        matchedPandit.id,
      ]);

      await db.query(
        "UPDATE pandit_status SET status = 1 WHERE pandit_id = ?",
        [matchedPandit.id]
      );

      return res.status(200).json({
        success: true,
        message: "OTP verified successfully for pandit",
        auth: matchedPandit.token,
        token: matchedPandit.token,
        userType: "pandit",
        user: {
          id: matchedPandit.id,
          name: matchedPandit.name,
          lastname: matchedPandit.lastname,
          mobile: matchedPandit.mobile,
          email: matchedPandit.email,
          role: matchedPandit.role
        }
      });
    }

    return res.status(400).json({
      success: false,
      error: "Invalid or expired OTP. Please try again."
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
};
const formatUserImage = (img) => {
  if (!img || img === "null" || img === "undefined") return null;
  const clean = typeof img === "string" ? img.trim() : "";
  if (!clean || clean === "null" || clean === "undefined") return null;
  if (clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("data:")) return clean;
  const baseUrl = process.env.BACKEND_URL || "https://api.prabhupooja.com";
  const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBase}/uploads/${clean.replace(/^\/+/, "")}`;
};

exports.update = async (req, res) => {
  const id = req.params.id || req.params.userId || req.user?.id;
  const {
    name,
    email,
    mobile,
    city,
    country,
    address,
    lastname,
    state,
    postalCode,
    gender,
  } = req.body;

  try {
    if (!id) {
      return res.status(400).send({
        success: false,
        message: "User ID is required",
      });
    }

    // 🔹 Get Existing User Data
    const [existingUserRows] = await db.query(
      `SELECT * FROM users WHERE id = ?`,
      [id]
    );

    if (!existingUserRows.length) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    const existingUser = existingUserRows[0];

    // 🔹 Preserve Old Values If New Value Is Undefined
    const updatedData = {
      name: name !== undefined ? name : existingUser.name,
      email: email !== undefined ? email : existingUser.email,
      mobile: mobile !== undefined ? mobile : existingUser.mobile,
      city: city !== undefined ? city : existingUser.city,
      country: country !== undefined ? country : existingUser.country,
      address: address !== undefined ? address : existingUser.address,
      lastname: lastname !== undefined ? lastname : existingUser.lastname,
      state: state !== undefined ? state : existingUser.state,
      postalCode: postalCode !== undefined ? postalCode : existingUser.postalCode,
      gender: gender !== undefined ? gender : existingUser.gender,
    };

    // 🔹 Update Query
    const updateQuery = `
       UPDATE users 
       SET name = ?, email = ?, mobile = ?, city = ?, country = ?, address = ?, lastname = ?, state = ?, postalCode = ?, gender = ?
       WHERE id = ?`;

    const updateParams = [
      updatedData.name,
      updatedData.email,
      updatedData.mobile,
      updatedData.city,
      updatedData.country,
      updatedData.address,
      updatedData.lastname,
      updatedData.state,
      updatedData.postalCode,
      updatedData.gender,
      id,
    ];

    await db.query(updateQuery, updateParams);

    const [refetched] = await db.query("SELECT * FROM users WHERE id = ?", [id]);
    const formattedUser = refetched.length > 0 ? {
      ...refetched[0],
      balance: parseFloat(refetched[0].balance || 0),
      image: formatUserImage(refetched[0].image),
    } : null;

    return res.status(200).send({
      success: true,
      message: "Profile updated successfully",
      data: formattedUser,
    });
  } catch (error) {
    console.error("Error in update profile:", error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.updateProfilePicture = async (req, res) => {
  const id = req.params.id || req.params.userId || req.user?.id;
  
  // Extract image from any possible upload field
  const uploadedFile = 
    req.files?.['profileImage']?.[0] ||
    req.files?.['image']?.[0] ||
    req.files?.['file']?.[0] ||
    req.file;

  const image = uploadedFile?.location || uploadedFile?.filename || req.body.profileImage || req.body.image;

  try {
    if (!id) {
      return res.status(400).send({
        success: false,
        message: "User ID is required",
      });
    }

    if (!image) {
      return res.status(400).send({
        success: false,
        message: "No image uploaded",
      });
    }

    const [existingUser] = await db.query(`SELECT * FROM users WHERE id = ?`, [
      id,
    ]);

    if (!existingUser || existingUser.length === 0) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    const updateQuery = `UPDATE users SET image = ? WHERE id = ?`;
    await db.query(updateQuery, [image, id]);

    const finalImageUrl = formatUserImage(image);

    return res.status(200).send({
      success: true,
      message: "Profile picture updated successfully",
      image: finalImageUrl,
    });
  } catch (error) {
    console.error("Error in updateProfilePicture:", error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.updateProfilePictureAdmin = async (req, res) => {
  const id = req.params.id || req.params.userId;
  const uploadedFile = 
    req.files?.['profileImage']?.[0] ||
    req.files?.['image']?.[0] ||
    req.files?.['file']?.[0] ||
    req.file;

  const image = uploadedFile?.location || uploadedFile?.filename || req.body.profileImage || req.body.image;

  try {
    if (!image) {
      return res.status(400).send({
        success: false,
        message: "No image uploaded",
      });
    }

    const [existingUser] = await db.query(`SELECT * FROM users WHERE id = ?`, [
      id,
    ]);

    if (!existingUser || existingUser.length === 0) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    const updateQuery = `UPDATE users SET image = ? WHERE id = ?`;
    await db.query(updateQuery, [image, id]);

    const finalImageUrl = formatUserImage(image);

    return res.status(200).send({
      success: true,
      message: "Profile picture updated successfully",
      image: finalImageUrl,
    });
  } catch (error) {
    console.error("Error in updateProfilePictureAdmin:", error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.getUserBalance = async (req, res) => {
  const { id } = req.params;
  try {
    const [balanceQuery] = await db.query(
      "SELECT balance FROM users WHERE id = ?",
      [id]
    );
    if (balanceQuery.length > 0) {
      return res.status(200).send({
        success: true,
        balance: balanceQuery[0].balance,
      });
    } else {
      return res.status(200).send({
        success: true,
        balance: 0,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};
exports.getMembershipBalance = async (req, res) => {
  const { id } = req.params;
  try {
    const [balanceQuery] = await db.query(
      "SELECT membershipBalance FROM users WHERE id = ?",
      [id]
    );
    if (balanceQuery.length > 0) {
      return res.status(200).send({
        success: true,
        balance: balanceQuery[0].balance,
      });
    } else {
      return res.status(200).send({
        success: true,
        balance: 0,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};
exports.deductBalance = async (req, res) => {
  try {
    const { userId, astrologerId, minutes, type } = req.body;

    if (!userId || !astrologerId || !minutes) {
      return res.status(400).send({
        success: false,
        message: "Please provide all details (userId, astrologerId, minutes)",
      });
    }

    // Fetch user balance
    const userQuery = "SELECT balance FROM users WHERE id = ?";
    const [userResult] = await db.query(userQuery, [userId]);

    if (userResult.length === 0) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    const userBalance = parseFloat(userResult[0].balance || 0);

    // Fetch astrologer prices
    const astrologerQuery = "SELECT price, chat_price, voice_price, video_price, wallet FROM pandit WHERE id = ?";
    const [astrologerResult] = await db.query(astrologerQuery, [astrologerId]);

    if (astrologerResult.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Astrologer not found",
      });
    }

    const astro = astrologerResult[0];
    let perMinuteCharge = parseFloat(astro.price || 15);

    if (type === "chat" && astro.chat_price) {
      perMinuteCharge = parseFloat(astro.chat_price);
    } else if ((type === "voice" || type === "call") && astro.voice_price) {
      perMinuteCharge = parseFloat(astro.voice_price);
    } else if (type === "video" && astro.video_price) {
      perMinuteCharge = parseFloat(astro.video_price);
    }

    const totalCharge = parseFloat((perMinuteCharge * parseFloat(minutes)).toFixed(2));

    console.log(`[DeductBalance] Type: ${type}, PerMin: ₹${perMinuteCharge}, Minutes: ${minutes}, Total: ₹${totalCharge}, UserBalance: ₹${userBalance}`);

    if (userBalance < totalCharge) {
      return res.status(400).send({
        success: false,
        message: "Insufficient balance in wallet",
        requiredBalance: totalCharge,
        currentBalance: userBalance
      });
    }

    // Deduct balance from user
    const newUserBalance = parseFloat((userBalance - totalCharge).toFixed(2));
    await db.query("UPDATE users SET balance = ? WHERE id = ?", [newUserBalance, userId]);

    // Astrologer gets 70% share of consultation
    const astrologerEarnings = parseFloat((totalCharge * 0.7).toFixed(2));
    const astrologerWallet = parseFloat(astro.wallet || 0.0);
    const newAstrologerWallet = parseFloat((astrologerWallet + astrologerEarnings).toFixed(2));

    // Update astrologer's wallet
    await db.query("UPDATE pandit SET wallet = ? WHERE id = ?", [newAstrologerWallet, astrologerId]);

    return res.status(200).send({
      success: true,
      userNewBalance: newUserBalance,
      astrologerNewWallet: newAstrologerWallet,
      deductedAmount: totalCharge,
      earnedAmount: astrologerEarnings,
      message: "Balance deducted and astrologer wallet updated successfully",
    });
  } catch (error) {
    console.error("Error deducting balance:", error);
    return res.status(500).send({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
exports.protected = (req, res) => {
  const token = req.headers["authorization"];
  console.log(token);
  if (!token)
    return res.status(401).send("Access Denied  please provide token");

  try {
    const verified = jwt.verify(token, jwt_secret_key);
    req.user = verified;
    return res.send("Access Granted");
  } catch (error) {
    return res.status(400).send("Invalid Token");
  }
};
exports.getUserByToken = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).send({
        success: false,
        message: "Unauthorized access",
      });
    }

    let [userResult] = await db.query("SELECT * FROM users WHERE id = ?", [
      userId,
    ]);

    if (userResult.length === 0) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    const rawUser = userResult[0];
    const formattedUser = {
      id: rawUser.id,
      name: rawUser.name || "",
      lastname: rawUser.lastname || "",
      mobile: rawUser.mobile || "",
      email: rawUser.email || "",
      gender: rawUser.gender || "",
      image: formatUserImage(rawUser.image),
      profileImage: formatUserImage(rawUser.image),
      balance: parseFloat(rawUser.balance || 0),
      member: rawUser.member || 0,
      membershipBalance: parseFloat(rawUser.membershipBalance || 0),
      address: rawUser.address || "",
      city: rawUser.city || "",
      state: rawUser.state || "",
      postalCode: rawUser.postalCode || "",
      country: rawUser.country || "India",
      role: rawUser.role,
      uuid: rawUser.uuid,
      created_at: rawUser.created_at,
    };

    return res.status(200).send({
      success: true,
      message: "User record retrieved successfully",
      data: formattedUser,
    });
  } catch (error) {
    console.error("Error in getUserByToken function:", error);
    return res.status(500).send({
      success: false,
      message: "Error in fetching user data",
      error: error.message,
    });
  }
};
exports.getPanditByToken = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).send({
        success: false,
        message: "Unauthorized access",
      });
    }
    const [userResult] = await db.query(`
      SELECT 
        p.*,
        COALESCE(ps.status, 0) AS is_online,
        COALESCE(ps.chat_mode, 0) AS chat_mode
      FROM pandit p
      LEFT JOIN pandit_status ps ON p.id = ps.pandit_id
      WHERE p.id = ?
    `, [userId]);

    if (userResult.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Pandit not found",
      });
    }

    return res.status(200).send({
      success: true,
      message: "Pandit record retrieved successfully",
      data: userResult[0],
    });
  } catch (error) {
    console.error("Error in getPanditByToken function:", error);
    return res.status(500).send({
      success: false,
      message: "Error in fetching pandit data",
      error: error.message,
    });
  }
};
exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    // Check if user exists
    const [existingUser] = await db.query(`SELECT * FROM users WHERE id=?`, [
      id,
    ]);
    if (!existingUser.length) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Delete user
    await db.query(`DELETE FROM users WHERE id=?`, [id]);

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting user:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
exports.getUserTickets = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).send({
        success: false,
        message: "User ID is required",
        data: [],
      });
    }

    const [tickets] = await db.query(
      "SELECT * FROM user_support_ticket WHERE user_id = ? ORDER BY submitted_date DESC",
      [userId]
    );

    return res.status(200).send({
      success: true,
      message: "Tickets retrieved successfully",
      data: tickets || [],
    });
  } catch (error) {
    console.error("Error in getUserTickets function:", error);
    return res.status(500).send({
      success: false,
      message: "Error in fetching tickets",
      data: [],
      error: error.message,
    });
  }
};
exports.ticketCreate = async (req, res) => {
  const { issue_type, description, user_id, email, phone } = req.body;

  try {
    if (!issue_type || !description || !user_id) {
      return res.status(400).send({
        success: false,
        message: "Please provide all required details (issue_type, description, user_id)",
      });
    }

    // Fetch user details if email/phone not provided
    let userEmail = email;
    let userPhone = phone;
    if (!userEmail || !userPhone) {
      const [uRows] = await db.query("SELECT email, mobile FROM users WHERE id = ?", [user_id]);
      if (uRows.length > 0) {
        userEmail = userEmail || uRows[0].email;
        userPhone = userPhone || uRows[0].mobile;
      }
    }

    const [insertResult] = await db.query(
      `INSERT INTO user_support_ticket (issue_type, submitted_date, description, user_id, email, phone, status, response)
       VALUES (?, NOW(), ?, ?, ?, ?, 'Pending', 'Your ticket is under review with Devotee Care team.')`,
      [issue_type, description, user_id, userEmail || null, userPhone || null]
    );

    const insertId = insertResult.insertId;

    if (!insertId) {
      return res.status(500).send({
        success: false,
        message: "Error in insert query",
      });
    }

    const ticket_id = `PBTKC${String(insertId).padStart(5, "0")}`;

    await db.query(
      `UPDATE user_support_ticket SET ticket_id = ? WHERE id = ?`,
      [ticket_id, insertId]
    );

    return res.status(201).send({
      success: true,
      message: "Support ticket created successfully",
      ticket_id: ticket_id,
      data: {
        id: insertId,
        ticket_id: ticket_id,
        issue_type: issue_type,
        status: "Pending",
        submitted_date: new Date(),
        description: description,
        response: "Your ticket is under review with Devotee Care team."
      }
    });
  } catch (err) {
    console.error("Error in ticketCreate function:", err);
    return res.status(500).send({
      success: false,
      message: "Error in creating ticket",
      error: err.message,
    });
  }
};
exports.getUserSingleTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    if (!ticketId) {
      return res.status(404).send({
        success: false,
        message: "ticket not found",
      });
    }

    const [ticket] = await db.query(
      "SELECT * FROM user_support_ticket WHERE id = ?",
      [ticketId]
    );

    if (ticket.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No ticket found",
      });
    }

    return res.status(200).send({
      success: true,
      message: "Ticket retrieved successfully",
      data: ticket[0],
    });
  } catch (error) {
    console.error("Error in getUserSingleTicket function:", error);
    return res.status(500).send({
      success: false,
      message: "Error in fetching ticket",
      error,
    });
  }
};
exports.addAddress = async (req, res) => {
  try {
    const {
      name,
      lastname,
      email,
      address,
      number,
      country,
      state,
      city,
      postalCode,
      userId,
    } = req.body;

    if (
      !name ||
      !email ||
      !number ||
      !address ||
      !country ||
      !state ||
      !city ||
      !postalCode ||
      !userId
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    const Address = {
      ...(address !== undefined && { address }),
      ...(country !== undefined && { country }),
      ...(state !== undefined && { state }),
      ...(city !== undefined && { city }),
      ...(postalCode !== undefined && { postalCode }),
    };
    if (Object.keys(Address).length === 0) {
      return res.status(400).json({ message: "No shipping data provided" });
    }

    const [user_address] = await db.query(
      `INSERT INTO user_delivery_address(user_id,name,lastname,email,number,address)  
  VALUES (?,?,?,?,?,?)`,
      [userId, name, lastname, email, number, JSON.stringify(Address)]
    );

    return res.status(201).json({
      success: true,
      message: "Address added successfully",
    });
  } catch (error) {
    console.error("Error adding address:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
exports.getAddressbyId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    const [rows] = await db.query(
      "SELECT id, user_id, name, lastname, email, number, address FROM user_delivery_address WHERE user_id = ?",
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Address not found for this user.",
      });
    }

    // Parse address only if it's a string
    const result = rows.map((row) => ({
      ...row,
      address:
        typeof row.address === "string" ? JSON.parse(row.address) : row.address,
    }));

    return res.status(200).json({
      success: true,
      message: "Address fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching address:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
exports.updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      lastname,
      email,
      number,
      address,
      country,
      state,
      city,
      postalCode,
    } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Address ID is required to update the record.",
      });
    }

    // Step 1: Fetch existing address
    const [rows] = await db.query(
      `SELECT address FROM user_delivery_address WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Address not found.",
      });
    }

    let existingAddress = {};
    try {
      existingAddress = JSON.parse(rows[0].address || "{}");
    } catch (e) {
      console.warn("Invalid JSON in existing address field:", e);
    }

    // Step 2: Collect address updates
    const updatedAddressFields = {
      ...(address !== undefined && { address }),
      ...(country !== undefined && { country }),
      ...(state !== undefined && { state }),
      ...(city !== undefined && { city }),
      ...(postalCode !== undefined && { postalCode }),
    };

    // Step 3: Merge with existing
    const mergedAddress = { ...existingAddress, ...updatedAddressFields };

    // Step 4: Prepare top-level update fields
    const updateFields = {
      ...(name !== undefined && { name }),
      ...(lastname !== undefined && { lastname }),
      ...(email !== undefined && { email }),
      ...(number !== undefined && { number }),
      ...(Object.keys(updatedAddressFields).length > 0 && {
        address: JSON.stringify(mergedAddress),
      }),
    };

    // If no updates at all
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields provided to update.",
      });
    }

    const setClause = Object.keys(updateFields)
      .map((field) => `${field} = ?`)
      .join(", ");
    const values = Object.values(updateFields);
    values.push(id);

    const [result] = await db.query(
      `UPDATE user_delivery_address SET ${setClause} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Address not found or no changes made.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Address updated successfully",
    });
  } catch (error) {
    console.error("Error updating address:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
exports.deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Address ID is required to delete the record.",
      });
    }

    const [rows] = await db.query(
      "SELECT * FROM user_delivery_address WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Address not found.",
      });
    }

    // Step 3: Delete the address
    const [result] = await db.query(
      "DELETE FROM user_delivery_address WHERE id = ?",
      [id]
    );

    return res.status(200).json({
      success: true,
      message: "Address deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting address:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
exports.leads = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT * FROM users 
      WHERE created_at >= CURDATE() - INTERVAL 1 DAY
    `);

    res.status(200).json({ success: true, data: rows, total: rows.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
exports.offerBanners = async (req, res) => {
  try {
    const bannerFile = req?.file?.location;
    const { bannerName, isMobile } = req.body;

    if (!bannerFile || !bannerName || typeof isMobile === 'undefined') {
      return res.status(400).json({
        message: "Banner name, image file, and isMobile flag are required.",
      });
    }
    const isMobileFlag = isMobile === true || isMobile === 'true' ? 1 : 0;

    const [result] = await db.execute(
      `INSERT INTO offer_banners (name, image, isMobile) VALUES (?, ?, ?)`,
      [bannerName, bannerFile, isMobileFlag]
    );
    res.status(201).json({
      success: true,
      message: "Banner uploaded and saved successfully",
      data: {
        id: result.insertId,
      },
    });
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during banner upload.",
    });
  }
};
exports.getOffersBanners = async (req, res) => {
  try {
    const [rows] = await db.execute(`SELECT * FROM offer_banners ORDER BY created_at DESC`);

    res.status(200).json({
      success: true,
      data: rows,
      total: rows.length,
    });
  } catch (error) {
    console.error("Error fetching offer banners:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching offer banners.",
    });
  }
};
exports.getOffersByTypeBanners = async (req, res) => {
  try {
    const { isMobile } = req.query;

    if (typeof isMobile === "undefined") {
      return res.status(400).json({
        success: false,
        message: "Missing required query parameter: isMobile",
      });
    }

    const [rows] = await db.execute(
      `SELECT * FROM offer_banners WHERE isMobile = ? ORDER BY created_at DESC`,
      [isMobile]
    );

    res.status(200).json({
      success: true,
      data: rows,
      total: rows.length,
    });
  } catch (error) {
    console.error("Error fetching offer banners:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching offer banners.",
    });
  }
};
exports.deleteOfferBanner = async (req, res) => {
  try {
    const { bannerId } = req.params;

    if (!bannerId) {
      return res.status(400).json({ message: "Banner ID is required" ,success:false });
    }

    const [result] = await db.query(`DELETE FROM offer_banners WHERE id = ?`, [bannerId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Banner not found", success:false });
    }

    return res.status(200).json({ message: "Banner deleted successfully" , success:true});
  } catch (error) {
    console.error("Error deleting banner:", error);
    return res.status(500).json({ message: "Internal server error", success:false });
  }
};
