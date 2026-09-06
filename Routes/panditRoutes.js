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

let upload;

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.S3_BUCKET_NAME) {
  try {
    upload = multer({
      storage: multerS3({
        s3: s3,
        bucket: process.env.S3_BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: function (req, file, cb) {
          cb(null, `panditDocs/${Date.now().toString()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`);
        },
      }),
    });
  } catch (err) {
    console.warn("Multer S3 fallback in panditRoutes:", err.message);
  }
}

if (!upload) {
  const path = require("path");
  const fs = require("fs");
  const uploadDir = path.join(__dirname, "../uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, "pandit-" + uniqueSuffix + path.extname(file.originalname));
    }
  });
  upload = multer({ storage });
}

const panditDocUpload = upload.fields([
  { name: 'gurukulCertificate', maxCount: 1 },
  { name: 'gurukul_certificate', maxCount: 1 },
  { name: 'aadharCard', maxCount: 1 },
  { name: 'aadhaar_card', maxCount: 1 },
  { name: 'panCard', maxCount: 1 },
  { name: 'pan_card', maxCount: 1 },
  { name: 'profileImage', maxCount: 1 },
  { name: 'profile_image', maxCount: 1 },
  { name: 'image', maxCount: 1 },
  { name: 'extra_documents', maxCount: 5 },
  { name: 'documents', maxCount: 5 },
]);

const router = express.Router();

// Pandit Registration & Profile
router.post("/register", panditDocUpload, panditController.createPandit);
router.post("/registerPandit", panditDocUpload, panditController.createPandit);
router.post("/CreatePandit", panditDocUpload, panditController.createPandit);

router.get("/getProfile", verifyToken, panditController.getPanditProfile);
router.get("/checkStatus/:panditId", panditController.checkPanditStatus);
router.get("/checkStatus", verifyToken, panditController.checkPanditStatus);

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
router.put('/updateStatus/:id', AdminOrAgentVerifyToken, panditController.updatePanditStatus);

router.put("/update/:id", panditDocUpload, verifyToken, panditController.updatePandit);

// Admin / Verification Endpoints
router.post("/verifyPandit/:id", AdminOrAgentVerifyToken, panditController.verifyPandit);
router.put("/verifyPandit/:id", AdminOrAgentVerifyToken, panditController.verifyPandit);
router.put("/verify/:id", AdminOrAgentVerifyToken, panditController.verifyPandit);
router.post("/rejectPandit/:id", AdminOrAgentVerifyToken, panditController.rejectPandit);
router.put("/rejectPandit/:id", AdminOrAgentVerifyToken, panditController.rejectPandit);
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


