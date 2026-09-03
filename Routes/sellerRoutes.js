const express = require('express');
const multer = require("multer")
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");
const seller  = require("../Controllers/sellerControler");
const { sellerVerifyToken } = require('../config/sellerToken');
const { AdminOrAgentVerifyToken } = require('../config/adminOrAgentToken');
const router = express.Router();

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
        cb(null, `services/${Date.now().toString()}-${file.originalname}`);
      },
  
    })
  });

  router.post("/create-seller", seller.createSeller);
  router.get("/getSellerbyToken", sellerVerifyToken, seller.getSellerByToken);
  
  // Admin & Agent Shared Seller Management Endpoints
  router.get("/getAll-seller", AdminOrAgentVerifyToken, seller.getAllSellers);
  router.get("/get-seller/:id", AdminOrAgentVerifyToken, seller.getSellerById);
  router.put("/update-status/:id", AdminOrAgentVerifyToken, seller.updateSellerStatus);
  router.post("/approve-seller/:id", AdminOrAgentVerifyToken, seller.approveSeller);
  router.post("/reject-seller/:id", AdminOrAgentVerifyToken, seller.rejectSeller);

  router.put("/update-seller", sellerVerifyToken, upload.fields([
    { name: "aadhaar_photo", maxCount: 1 },
    { name: "pan_photo", maxCount: 1 },
    { name: "shop_photo", maxCount: 1 },
    { name: "address_proof", maxCount: 1 }
  ]), seller.updateSellerDetails);
  router.put("/update-seller/:id", sellerVerifyToken, upload.fields([
    { name: "aadhaar_photo", maxCount: 1 },
    { name: "pan_photo", maxCount: 1 },
    { name: "shop_photo", maxCount: 1 },
    { name: "address_proof", maxCount: 1 }
  ]), seller.updateSellerDetails);

  router.put('/update-profile', upload.single('shop_photo'), sellerVerifyToken, seller.updateSeller);
  router.put('/update-profile/:id', upload.single('shop_photo'), sellerVerifyToken, seller.updateSeller);
  router.put('/admin-update-profile/:id', upload.single('shop_photo'), AdminOrAgentVerifyToken, seller.updateSeller);

  router.delete('/delete-seller', sellerVerifyToken, seller.deleteSeller);
  router.delete('/delete-seller/:id', sellerVerifyToken, seller.deleteSeller);
  router.delete('/admin-delete-seller/:id', AdminOrAgentVerifyToken, seller.deleteSeller);
  router.get('/getSellerTicket', seller.getSellerTicket);

  router.post('/login', seller.login);
  router.post('/verifyOtp', seller.verifyOtp);

  module.exports = router;