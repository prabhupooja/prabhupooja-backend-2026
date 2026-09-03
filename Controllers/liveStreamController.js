const twilio = require('twilio');
const db = require('../config/db');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const apiKey = process.env.TWILIO_API_KEY;
const apiSecret = process.env.TWILIO_API_SECRET;

const AccessToken = twilio.jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;

exports.generateToken = async (req, res) => {
  const {user_id,room}= req.body
  

    const token = new AccessToken(accountSid, apiKey, apiSecret, {
        identity: user_id,
        ttl: 3600
    });

    const videoGrant = new VideoGrant({ room: room });
    token.addGrant(videoGrant);

    
    const data = await db.query(
        `INSERT INTO live_streams (user_id, room_name, status, start_time) VALUES (?, ?, ?, ?)`,
        [user_id, room, 'live', new Date()]
    );

    const jwtToken = token.toJwt();

    jwt.verify(jwtToken, apiSecret, (err, decoded) => {
        if (err) {
            console.error('Token verification failed:', err);
            return res.status(500).send({
                success: false,
                message: 'Token verification failed',
                error: err
            });
        }

        console.log('Token is valid:', decoded);
        console.log(jwtToken)

        return  res.status(201).send({
            success: true,
            message: 'Token generated successfully',
            token: jwtToken,
            stream_id: data[0].insertId
        });
    });
};


exports.updateStreamStatus = async (req, res) => {
    const { stream_id, status } = req.body;
    const stopTime = status === 'offline' ? new Date() : null;

    await db.query(
        `UPDATE live_streams 
        SET status = ?, stop_time = ? 
        WHERE id = ?`,
        [status, stopTime, stream_id]
    );

    return res.status(201).send({
        success: true,
        message: 'Stream status updated successfully',
    });
};
