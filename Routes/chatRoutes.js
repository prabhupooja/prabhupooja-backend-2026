const express = require("express")
const router = express.Router()

const astroController = require("../Controllers/chatController")
const { verifyToken } = require("../config/genratetokenConfig")

router.post("/messages/create",astroController.createMessage)
router.get("/messages/:userId/:astrologerId/",astroController.getMessages)

router.post("/calls/create",astroController.createCall)
router.put("/calls/:callId",astroController.updateCall)

router.post("/videoCall/create",astroController.createVideoCall)
router.put("/videoCall/:videoCallId",astroController.updateVideoCall);

router.post('/chatform',verifyToken,astroController.chatForm);
router.post('/chatEnd',astroController.endChat);
router.get('/userMode/:user_id',astroController.userMode);
router.get('/panditMode/:pandit_id',astroController.panditMode);
router.get('/chathistory/:request_id',astroController.chatHistory);
module.exports = router