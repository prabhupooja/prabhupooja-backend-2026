const express = require("express");
const multerS3 = require("multer-s3");
const multer = require('multer');
const s3 = require("../config/s3Config");

const userController = require("../Controllers/customerController")

const {verifyToken,generateToken } = require('../config/genratetokenConfig');
const { AdminverifyToken } = require("../config/admintoken");

const passport = require('passport');


const router = express.Router()



let upload;

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.S3_BUCKET_NAME) {
  try {
    upload = multer({
      storage: multerS3({
        s3: s3,
        bucket: process.env.S3_BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: function (req, file, cb) {
          cb(null, `users/${Date.now().toString()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`);
        },
      }),
    });
  } catch (err) {
    console.warn("Multer S3 init fallback:", err.message);
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
      cb(null, "user-" + uniqueSuffix + path.extname(file.originalname));
    }
  });
  upload = multer({ storage });
}

// Support multiple image field names (profileImage, image, file)
const userImageUpload = upload.fields([
  { name: "profileImage", maxCount: 1 },
  { name: "image", maxCount: 1 },
  { name: "file", maxCount: 1 },
]);

router.post("/register", upload.single("image"), userController.register);
router.get("/getAll", AdminverifyToken, userController.getUser);
router.get("/getuserbyid/:id", userController.getUserByid);
router.post("/login", userController.login);
router.post("/app-google/login", userController.AppGoogleLogin);
router.post("/verifyOtp", userController.verifyOtp);

// User Profile Updates (support both /update/:id and /update/:userId)
router.put("/update/:id", verifyToken, userController.update);
router.put("/updateUser/:id", verifyToken, userController.update);

// User Image Updates (support profileImage, image, file)
router.put("/updateimage/:id", userImageUpload, verifyToken, userController.updateProfilePicture);
router.put("/updateImage/:id", userImageUpload, verifyToken, userController.updateProfilePicture);
router.put("/updateimageAdmin/:id", userImageUpload, AdminverifyToken, userController.updateProfilePictureAdmin);

router.get("/balance/:id", verifyToken, userController.getUserBalance);
router.get("/membershipbalance/:id", verifyToken, userController.getMembershipBalance);
router.post("/deductBalance", userController.deductBalance);
router.get("/verifytoken", userController.protected);
router.get("/getUserByToken", verifyToken, userController.getUserByToken);
router.get("/getPanditByToken", verifyToken, userController.getPanditByToken);
router.delete("/deleteProfile/:id", verifyToken, userController.deleteUser);
router.post("/createTicket", verifyToken, userController.ticketCreate);
router.get("/getAllTickets/:userId", verifyToken, userController.getUserTickets);
router.post("/addAddress", verifyToken, userController.addAddress);
router.get("/getAddress/:userId", verifyToken, userController.getAddressbyId);
router.get("/getOneTicket/:ticketId", verifyToken, userController.getUserSingleTicket);
router.put("/updateAddress/:id", userController.updateAddress);
router.delete("/deleteAddress/:id", userController.deleteAddress);
router.get("/leads", AdminverifyToken, userController.leads);
router.post("/offerBanners", AdminverifyToken, upload.single("file"), userController.offerBanners);
router.get("/getOfferBanners", AdminverifyToken, userController.getOffersBanners);
router.get("/getPublicOfferBanners", userController.getOffersByTypeBanners);
router.delete("/deleteOfferBanner/:bannerId", AdminverifyToken, userController.deleteOfferBanner);

router.get('/google', (req, res, next) => {
  const state = req.query.state || "/";
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: state
  })(req, res, next);
});
router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  userController.googleAuthCallback
);


module.exports = router;



