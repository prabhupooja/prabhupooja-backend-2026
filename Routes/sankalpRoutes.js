const express = require('express');
const router = express.Router();
const sankalpController = require('../Controllers/sankalpControler');
const { AdminverifyToken } = require('../config/admintoken');

// ==========================================
// 1. PUBLIC ENDPOINTS (For Client Website)
// ==========================================

// Form 1: मार्गदर्शन अथवा प्रश्न पूछें
router.post('/inquiry/create', sankalpController.createEnquiry);
router.post('/enquiry/create', sankalpController.createEnquiry);

// Form 2 & 3: ऑनलाइन अनुष्ठान व परामर्श संकल्प (Multi-step booking)
router.post('/booking/create', sankalpController.createBooking);
router.post('/create', sankalpController.createBooking);


// ==========================================
// 2. ADMIN ENDPOINTS (For PrabhuPooja Admin)
// ==========================================

// Enquiries List & Management
router.get('/inquiry/list', AdminverifyToken, sankalpController.getAllEnquiries);
router.get('/inquiry/all', AdminverifyToken, sankalpController.getAllEnquiries);
router.put('/inquiry/status/:id', AdminverifyToken, sankalpController.updateEnquiryStatus);
router.delete('/inquiry/:id', AdminverifyToken, sankalpController.deleteEnquiry);

// Bookings List & Management
router.get('/booking/list', AdminverifyToken, sankalpController.getAllBookings);
router.get('/booking/all', AdminverifyToken, sankalpController.getAllBookings);
router.get('/booking/:id', AdminverifyToken, sankalpController.getBookingById);
router.put('/booking/status/:id', AdminverifyToken, sankalpController.updateBookingStatus);
router.delete('/booking/:id', AdminverifyToken, sankalpController.deleteBooking);

module.exports = router;
