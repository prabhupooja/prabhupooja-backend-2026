const express = require("express");
const prasad = require("../Controllers/prasadController");
const { verifyToken } = require("../config/genratetokenConfig");
const { AdminverifyToken } = require("../config/admintoken");
const { createCloudinaryUpload } = require("../config/cloudinary");

const router = express.Router();
const upload = createCloudinaryUpload("prasad");


router.post("/create", upload.single('image'), AdminverifyToken,prasad.create);
router.get("/get", prasad.get);
router.get("/get/:id", prasad.getById);
router.put("/update/:id", upload.single('image'),AdminverifyToken, prasad.update);
router.delete("/delete/:id",AdminverifyToken, prasad.delete);
router.put('/updateStatus/:id',verifyToken,prasad.statusUpdate);
router.post('/booking', verifyToken, prasad.booking);
router.post('/book', verifyToken, prasad.booking);
router.get('/getbooking', AdminverifyToken, prasad.getAllBookingDetails);
router.get('/getBooking', AdminverifyToken, prasad.getAllBookingDetails);
router.get('/getAllBookings', AdminverifyToken, prasad.getAllBookingDetails);
router.get('/all', AdminverifyToken, prasad.getAllBookingDetails);
router.get('/demandSummary', AdminverifyToken, prasad.getPrasadDemandSummary);
router.put('/updatebooking/:id', AdminverifyToken, prasad.updateBooking);
router.delete('/deletebooking/:id', AdminverifyToken, prasad.deleteBooking);
router.get('/getuser/:userId', verifyToken, prasad.getBookingByUserId);

module.exports = router