const express = require("express")
const router = express.Router()

const booking = require("../Controllers/bookpujaControler");
const { AdminverifyToken } = require('../config/admintoken');

router.post("/booking/create", booking.create);
router.post("/book", booking.create);
router.post("/create", booking.create);
router.get('/bookingDate/:pooja_id/:user_id', booking.getBookingDate);
router.get('/getbookingid/:userId', booking.getBookingsByUserId);
router.get('/getbooking', AdminverifyToken, booking.getAllBookings);
router.put('/updatebooking/:id', AdminverifyToken, booking.updateBooking);
router.delete('/deletebooking/:id', AdminverifyToken, booking.deleteBooking);

module.exports = router