const express = require('express');
const seller = require("../Controllers/sellerControler");
const { sellerVerifyToken } = require('../config/sellerToken');
const { AdminOrAgentVerifyToken } = require('../config/adminOrAgentToken');
const { AdminverifyToken } = require('../config/admintoken');
const { createCloudinaryUpload } = require('../config/cloudinary');
const router = express.Router();

const upload = createCloudinaryUpload('sellers');
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

// 6. Delete, Returns & Support Tickets (Registered before wildcard :id)
router.get('/returns', sellerVerifyToken, require('../Controllers/orderController').getSellerReturns);
router.get('/my-returns', sellerVerifyToken, require('../Controllers/orderController').getSellerReturns);
router.get('/getSellerTicket', seller.getSellerTicket);
router.get('/tickets', seller.getSellerTicket);
router.delete('/delete-seller', sellerVerifyToken, seller.deleteSeller);
router.delete('/delete-seller/:id', sellerVerifyToken, seller.deleteSeller);
router.delete('/admin-delete-seller/:id', AdminverifyToken, seller.deleteSeller);

// 7. Admin & Agent Shared Seller Management Endpoints
router.get("/getAll-seller", AdminOrAgentVerifyToken, seller.getAllSellers);
router.get("/all", AdminOrAgentVerifyToken, seller.getAllSellers);
router.get("/get-seller/:id", AdminOrAgentVerifyToken, seller.getSellerById);
router.put("/update-status/:id", AdminOrAgentVerifyToken, seller.updateSellerStatus);
router.put("/update-doc-status/:id", AdminOrAgentVerifyToken, seller.updateSellerStatus);
router.post("/approve-seller/:id", AdminOrAgentVerifyToken, seller.approveSeller);
router.put("/approve-seller/:id", AdminOrAgentVerifyToken, seller.approveSeller);
router.post("/reject-seller/:id", AdminOrAgentVerifyToken, seller.rejectSeller);
router.put("/reject-seller/:id", AdminOrAgentVerifyToken, seller.rejectSeller);
router.put('/admin-update-profile/:id', uploadDocs, AdminOrAgentVerifyToken, seller.updateSeller);
router.get("/:id", AdminOrAgentVerifyToken, seller.getSellerById);

module.exports = router;