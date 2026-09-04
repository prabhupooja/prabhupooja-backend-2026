const twilio = require('twilio');
const db = require('../config/db');
const dotenv = require('dotenv');

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const apiKey =process.env.TWILIO_API_KEY;
const client = (accountSid && authToken) ? twilio(accountSid, authToken) : null;

const generateAccessToken = (identity) => {
    const AccessToken = twilio.jwt.AccessToken;
    const VideoGrant = AccessToken.VideoGrant;

console.log("here is the identity",identity)
   
const token = new AccessToken(accountSid, apiKey, apiSecret, { identity });


  const videoGrant = new VideoGrant();
  token.addGrant(videoGrant);

  return token.toJwt();
};

exports.initiateCall = async (req, res) => {
    const { request_id, callerId, receiverId, type, callerPhoneNumber, receiverPhoneNumber } = req.body;
console.log("reciever number",receiverPhoneNumber)
console.log("caller number",callerPhoneNumber)
    try {
        let twilioCall;
        let response;

        if (type === 'voice') {
            console.log(type)
            const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3002}`;
            twilioCall = await client.calls.create({
                from: process.env.TWILIO_PHONE_NUMBER,  
                to: receiverPhoneNumber,            
                url: `${backendUrl}/api/v1/call/twiml?receiverPhoneNumber=${encodeURIComponent(receiverPhoneNumber)}`, 
                statusCallback: `${backendUrl}/api/v1/call/status`, 
                statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'] 
            });

            response = {
                callerId,
                receiverId,
                type,
                startTime: new Date(),
                twilioCallSid: twilioCall.sid
            };
        } else if (type === 'video') {
            const roomName = `video_room_${request_id}`;

            let existingRoom = null;
            try {
                existingRoom = await client.video.rooms(roomName).fetch();
            } catch (error) {
                if (error.code !== 20404) {  
                    throw error;
                }
            }

            if (!existingRoom) {
                existingRoom = await client.video.rooms.create({
                    uniqueName: roomName,
                    type: 'peer-to-peer'
                });
            }

            const callerToken = generateAccessToken(callerId);
            const receiverToken = generateAccessToken(receiverId);

            twilioCall = { roomName, callerToken, receiverToken };
            response = {
                callerId,
                receiverId,
                type,
                roomName,
                callerToken,
                receiverToken,
                startTime: new Date(),
            };
        }

        const [result] = await db.query(
            `INSERT INTO calls (request_id, caller_id, receiver_id, type, start_time, twilio_call_sid, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [request_id, callerId, receiverId, type, new Date(), twilioCall.sid, 'initiated']
        );

        if (!result) {
            return res.status(404).json({
                success: false,
                message: "Error inserting data into the database"
            });
        }

        console.log('Here is the response of backend:', response);

    return res.status(200).json({
            success: true,
            message: 'Call initiated successfully',
            call: response
        });
    } catch (error) {
        console.error(error);
      return  res.status(500).json({
            success: false,
            message: 'Failed to initiate call',
            error: error.message
        });
    }
}; 


exports.endCall = async (req, res) => {
    const { callId } = req.body;

    try {
        const [result] = await db.query(
            `UPDATE calls SET end_time = ?, status = 'completed'  WHERE id = ?`,
            [new Date(), callId]
        );

        if (!result) {
            return res.status(404).json({
                success: false,
                message: "Error updating call record in the database"
            });
        }

     return   res.status(200).json({
            success: true,
            message: 'Call ended successfully',
            call: {
                id: callId,
                endTime: new Date()
            }
        });
    } catch (error) {
        console.error(error);
       return res.status(500).json({
            success: false,
            message: 'Failed to end call',
            error: error.message
        });
    }
};

exports.getCallStatus = async (req, res) => {
    const { callSid } = req.params;
  
    try {
      const data = await db.query(
        `SELECT status FROM calls WHERE twilio_call_sid = ?`,
        [callSid]
      );
  
      if (!data || data.length === 0) {
        return res.status(404).send({
          success: false,
          message: 'Call not found'
        });
      }
      console.log("Here is the status of caal ",data)
      console.log("Here is the status of caal ",data[0][0].status)
  
  return res.status(200).send({
        success: true,
        status: data[0][0].status
      });
    } catch (error) {
      console.error(error);
     return res.status(500).send({
        success: false,
        message: 'Failed to fetch call status',
        error: error.message
      });
    }
  };

  exports.statusCallback = async (req, res) => {
    const { CallSid, CallStatus } = req.body;

    try {
        const [result] = await db.query(
            `UPDATE calls SET status = ? WHERE twilio_call_sid = ?`,
            [CallStatus, CallSid]
        );

        if (!result) {
            return res.status(404).json({
                success: false,
                message: "Error updating call status in the database"
            });
        }

      return  res.status(200).json({
            success: true,
            message: 'Call status updated successfully'
        });
    } catch (error) {
        console.error(error);
      return  res.status(500).json({
            success: false,
            message: 'Failed to update call status',
            error: error.message
        });
    }
};

exports.generateTwiml = (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    const { receiverPhoneNumber } = req.query; 

    if (!receiverPhoneNumber) {
        return res.status(400).send('Receiver phone number is required.');
    }

    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3002}`;
    twiml.dial({
        action: `${backendUrl}/api/v1/call/status`, 
        timeout: 20 
    }).number(receiverPhoneNumber);

    res.type('text/xml');
    res.send(twiml.toString());
};
