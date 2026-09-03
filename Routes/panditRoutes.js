const express = require("express");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");
const panditController = require("../Controllers/panditController");
const { verifyToken } = require("../config/genratetokenConfig");
const { AdminOrAgentVerifyToken } = require("../config/adminOrAgentToken");

console.log("here are the cred", process.env.AWS_REGION)

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      cb(null, `panditDocs/${Date.now().toString()}-${file.originalname}`);
    },

  })
});

const router = express.Router();


router.get("/astrologer", panditController.getAstrologer);
router.get('/verifiedAstrologer', panditController.getVerifiedAstrologers);
router.get('/rejectedAstrologer', panditController.getRejectedAstrologers);
router.get('/getAstrologer/:id', panditController.getAstrologerById);


router.get('/mahuratPandit', panditController.getMahurat);
router.get('/mahurat/:id', panditController.getMahuratId);
router.get('/verifiedMuhuratPandit', panditController.getVerifiedMahurat);
router.get('/rejectedMuhuratPandit', panditController.getRejectedMahurat);


router.get("/verifiedPandit", panditController.getVerifiedPandit);
router.get("/rejectedPandit", panditController.getRejectedPandit);
router.get("/get", panditController.get);
router.get("/pandit", panditController.getPandit);
router.get("/search", panditController.searchPandit);
router.get('/searchAstro', panditController.searchAstro);
router.get('/searchMuhurat', panditController.searchMuhurat);

router.get("/mobile/:mobile", panditController.getPanditByMobile);
router.get("/id/:id", panditController.getPanditId);
router.put('/updateStatus/:id',panditController.updatePanditStatus)


router.post("/CreatePandit", upload.fields([
  { name: 'gurukulCertificate', maxCount: 1 },
  { name: 'aadharCard', maxCount: 1 },
  { name: 'panCard', maxCount: 1 },
  { name: 'profileImage', maxCount: 1 },
]), panditController.createPandit);


router.put("/update/:id", upload.fields([
  { name: 'gurukulCertificate', maxCount: 1 },
  { name: 'aadharCard', maxCount: 1 },
  { name: 'panCard', maxCount: 1 },
  { name: 'profileImage', maxCount: 1 },
]),verifyToken, panditController.updatePandit);

router.post("/verifyPandit/:id", AdminOrAgentVerifyToken, panditController.verifyPandit);
router.post("/rejectPandit/:id", AdminOrAgentVerifyToken, panditController.rejectPandit);
router.put('/updateStatus/:id', AdminOrAgentVerifyToken, panditController.updatePanditStatus);
router.delete('/delete/:id', AdminOrAgentVerifyToken, panditController.deletePandit);

// Online Status Endpoints
router.post('/toggleOnline', panditController.toggleOnline);
router.get('/status/:panditId', panditController.getPanditStatus);
router.post('/panditOnline', async (req, res) => {
  const { pandit_id } = req.body;
  const result = await panditController.panditOnline(pandit_id);

  if (result) {
    return res.status(result.status).json({
      success: result.success,
      message: result.message,
    });
  } else {
    return res.status(500).json({
      success: false,
      message: "No response from controller",
    });
  }
});

// Dashboard & Stats for Pandit Panel
router.get("/dashboard-stats/:panditId", panditController.getDashboardStats);

// Wallet & Earnings for Pandit Panel
router.get("/wallet/:panditId", panditController.getPanditWallet);
router.get("/earnings/:panditId", panditController.getPanditEarnings);

// Assigned Bookings for Pandit Panel
router.get("/assignedBookings/:id", panditController.getAssignedBookings);
router.put("/updateBookingStatus/:bookingId", panditController.updateAssignedBookingStatus);

module.exports = router;


