const express = require("express");
const multerS3 = require("multer-s3");
const multer = require('multer');
const s3 = require("../config/s3Config");

const userController = require("../Controllers/customerController")

const {verifyToken,generateToken } = require('../config/genratetokenConfig');
const { AdminverifyToken } = require("../config/admintoken");

const passport = require('passport');


const router = express.Router()



const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      cb(null, `products/${Date.now().toString()}-${file.originalname}`);
    },
  }),
});

router.post("/register", upload.single("image"), userController.register);
router.get("/getAll",AdminverifyToken, userController.getUser);
router.get('/getuserbyid/:id',userController.getUserByid);
router.post("/login", userController.login);
router.post('/app-google/login', userController.AppGoogleLogin);
router.post("/verifyOtp", userController.verifyOtp)
router.put("/update/:id", verifyToken,userController.update);
router.put('/updateimage/:id',upload.single("image"),verifyToken,userController.updateProfilePicture);
router.put('/updateimageAdmin/:id',upload.single("image"),AdminverifyToken,userController.updateProfilePictureAdmin);
router.get("/balance/:id",verifyToken, userController.getUserBalance)
router.get("/membershipbalance/:id", verifyToken,userController.getMembershipBalance)
router.post("/deductBalance", userController.deductBalance)
router.get("/verifytoken", userController.protected)
router.get("/getUserByToken",verifyToken, userController.getUserByToken);
router.get("/getPanditByToken",verifyToken, userController.getPanditByToken);
router.delete('/deleteProfile/:id',verifyToken,userController.deleteUser);
router.post('/createTicket',verifyToken,userController.ticketCreate);
router.get('/getAllTickets/:userId',verifyToken,userController.getUserTickets);
router.post('/addAddress',verifyToken,userController.addAddress);
router.get('/getAddress/:userId',verifyToken,userController.getAddressbyId);
router.get('/getOneTicket/:ticketId',verifyToken,userController.getUserSingleTicket);
router.put('/updateAddress/:id',userController.updateAddress);
router.delete('/deleteAddress/:id',userController.deleteAddress);
router.get('/leads',AdminverifyToken,userController.leads);
router.post('/offerBanners',AdminverifyToken,upload.single("file"),userController.offerBanners);
router.get('/getOfferBanners',AdminverifyToken,userController.getOffersBanners);
router.get('/getPublicOfferBanners',userController.getOffersByTypeBanners);
router.delete('/deleteOfferBanner/:bannerId',AdminverifyToken,userController.deleteOfferBanner);

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



