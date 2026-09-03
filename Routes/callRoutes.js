const express = require('express');
const router = express.Router();
const callControler = require("../Controllers/callControler")

router.post("/initiate",callControler.initiateCall)
router.post("/twiml",callControler.generateTwiml)
router.post("/end",callControler.endCall)
router.get("/status/:callSid",callControler.getCallStatus)
router.post("/status",callControler.statusCallback)
module.exports = router;