const express = require('express');
const multer = require("multer");
const path = require('path');
const fs = require('fs');
const seller = require("../Controllers/sellerControler");
const { sellerVerifyToken } = require('../config/sellerToken');
const { AdminOrAgentVerifyToken } = require('../config/adminOrAgentToken');
const router = express.Router();

// Configure upload storage (Supports S3 if credentials exist, falls back to disk storage safely)
let upload;

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.S3_BUCKET_NAME) {
  try {
    const { S3Client } = require("@aws-sdk/client-s3");
    const multerS3 = require("multer-s3");
    const s3 = new S3Client({
      region: process.env.AWS_REGION || "ap-south-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });

    upload = multer({
      storage: multerS3({
        s3: s3,
        bucket: process.env.S3_BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: function (req, file, cb) {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          cb(null, `sellers/${uniqueSuffix}-${file.originalname}`);
        },
      }),
      limits: { fileSize: 25 * 1024 * 1024 } // 25MB max file size
    });
  } catch (e) {
    console.warn('S3 Multer initialization failed for sellers, falling back to local disk storage:', e.message);
  }
}

if (!upload) {
  const uploadDir = path.join(__dirname, '../uploads/sellers');
  const fs = require('fs');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'seller-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
  upload = multer({ storage: storage, limits: { fileSize: 25 * 1024 * 1024 } });
}

// Support single & multiple document file uploads under any field names
const uploadDocs = upload.any();

// 1. Seller Registration & Authentication
router.post("/register", uploadDocs, seller.createSeller);
router.post("/create-seller", uploadDocs, seller.createSeller);
router.post('/login', seller.login);
router.post('/verifyOtp', seller.verifyOtp);

// 2. Seller Profile & KYC Document Management
router.get("/getSellerbyToken", sellerVerifyToken, seller.getSellerByToken);
router.get("/profile", sellerVerifyToken, seller.getSellerByToken);
router.get("/me", sellerVerifyToken, seller.getSellerByToken);

router.put("/update-seller", sellerVerifyToken, uploadDocs, seller.updateSellerDetails);
router.put("/update-seller/:id", sellerVerifyToken, uploadDocs, seller.updateSellerDetails);
router.post("/upload-documents", sellerVerifyToken, uploadDocs, seller.updateSellerDetails);
router.put("/upload-documents", sellerVerifyToken, uploadDocs, seller.updateSellerDetails);

router.put('/update-profile', upload.single('shop_photo'), sellerVerifyToken, seller.updateSeller);
router.put('/update-profile/:id', upload.single('shop_photo'), sellerVerifyToken, seller.updateSeller);

// 3. Seller Dashboard & Analytics Endpoints
router.get("/dashboard-stats", sellerVerifyToken, seller.getSellerDashboardStats);
router.get("/dashboard", sellerVerifyToken, seller.getSellerDashboardStats);
router.get("/stats", sellerVerifyToken, seller.getSellerDashboardStats);

// 4. Seller Orders Management
router.get("/my-orders", sellerVerifyToken, seller.getSellerOrders);
router.get("/orders", sellerVerifyToken, seller.getSellerOrders);
router.put("/order-status/:id", sellerVerifyToken, seller.updateSellerOrderStatus);
router.put("/orders/update-status/:id", sellerVerifyToken, seller.updateSellerOrderStatus);

// 5. Seller Products Management
router.get("/my-products", sellerVerifyToken, seller.getSellerProducts);
router.get("/products", sellerVerifyToken, seller.getSellerProducts);

// 6. Admin & Agent Shared Seller Management Endpoints
router.get("/getAll-seller", AdminOrAgentVerifyToken, seller.getAllSellers);
router.get("/all", AdminOrAgentVerifyToken, seller.getAllSellers);
router.get("/get-seller/:id", AdminOrAgentVerifyToken, seller.getSellerById);
router.get("/:id", AdminOrAgentVerifyToken, seller.getSellerById);
router.put("/update-status/:id", AdminOrAgentVerifyToken, seller.updateSellerStatus);
router.put("/update-doc-status/:id", AdminOrAgentVerifyToken, seller.updateSellerStatus);
router.post("/approve-seller/:id", AdminOrAgentVerifyToken, seller.approveSeller);
router.put("/approve-seller/:id", AdminOrAgentVerifyToken, seller.approveSeller);
router.post("/reject-seller/:id", AdminOrAgentVerifyToken, seller.rejectSeller);
router.put("/reject-seller/:id", AdminOrAgentVerifyToken, seller.rejectSeller);
router.put('/admin-update-profile/:id', uploadDocs, AdminOrAgentVerifyToken, seller.updateSeller);

// 7. Delete, Returns & Support Tickets
router.get('/returns', sellerVerifyToken, require('../Controllers/orderController').getSellerReturns);
router.get('/my-returns', sellerVerifyToken, require('../Controllers/orderController').getSellerReturns);
router.delete('/delete-seller', sellerVerifyToken, seller.deleteSeller);
router.delete('/delete-seller/:id', sellerVerifyToken, seller.deleteSeller);
router.delete('/admin-delete-seller/:id', AdminOrAgentVerifyToken, seller.deleteSeller);
router.get('/getSellerTicket', seller.getSellerTicket);

module.exports = router;