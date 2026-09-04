const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const db = require('../config/db');
const {generateToken} = require("../config/genratetokenConfig")

const googleMobileClientId = process.env.GOOGLE_MOBILE_CLIENT_ID;
const client = new OAuth2Client(googleMobileClientId);

router.post('/google', async (req, res) => {

  const { idToken } = req.body;

  console.log("Received ID Token:", req.body.idToken);


  if (!idToken) {
    return res.status(400).json({ error: 'ID Token is required' });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: googleMobileClientId,
    });

    const payload = ticket.getPayload();

    const googleId = payload.sub;
    const name = payload.given_name || '';
    const lastname = payload.family_name || '';
    const email = payload.email;
    const image = payload.picture;

    let [rows] = await db.query(
      'SELECT * FROM users WHERE google_id = ? OR email = ?',
      [googleId, email]
    );

    if (rows.length === 0) {
      await db.query(
        'INSERT INTO users (google_id, name, lastname, email, image) VALUES (?, ?, ?, ?, ?)',
        [googleId, name, lastname, email, image]
      );
      [rows] = await db.query('SELECT * FROM users WHERE google_id = ?', [googleId]);
    }

    const user = rows[0];
    const token = generateToken(user.id); 

    return res.json({
      message: 'Login successful',
      token,
      user,
    });

  } catch (err) {
    console.error('Mobile Google Auth Error:', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
