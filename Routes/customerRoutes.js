const express = require("express");
const userController = require("../Controllers/customerController");
const { verifyToken, generateToken } = require('../config/genratetokenConfig');
const { AdminverifyToken } = require("../config/admintoken");
const { createCloudinaryUpload } = require("../config/cloudinary");
const passport = require('passport');

const router = express.Router();
const upload = createCloudinaryUpload("users");

// Support multiple image field names (profileImage, image, file)
const userImageUpload = upload.fields([
  { name: "profileImage", maxCount: 1 },
  { name: "image", maxCount: 1 },
  { name: "file", maxCount: 1 },
]);

router.post("/sendRegistrationOtp", userController.sendRegistrationOtp);
router.post("/send-registration-otp", userController.sendRegistrationOtp);
router.post("/verifyRegistrationOtp", userController.verifyRegistrationOtp);
router.post("/verify-registration-otp", userController.verifyRegistrationOtp);
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



