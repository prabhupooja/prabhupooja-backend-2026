const express = require("express");
const panditController = require("../Controllers/panditController");
const { verifyToken } = require("../config/genratetokenConfig");
const { AdminOrAgentVerifyToken } = require("../config/adminOrAgentToken");
const { AdminverifyToken } = require("../config/admintoken");
const { createCloudinaryUpload } = require("../config/cloudinary");

const upload = createCloudinaryUpload("panditDocs");

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
router.delete('/delete/:id', AdminverifyToken, panditController.deletePandit);

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


