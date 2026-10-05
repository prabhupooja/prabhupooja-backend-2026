const express = require("express");
const router = express.Router();
const templeController = require('../Controllers/templeControler');
const { AdminverifyToken } = require("../config/admintoken");
const { verifyToken } = require("../config/genratetokenConfig");
const { createCloudinaryUpload } = require("../config/cloudinary");

const upload = createCloudinaryUpload("temple");

const templeUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'gallery', maxCount: 10 }
]);

router.post('/create', templeUpload, AdminverifyToken, templeController.create);
router.post('/booking', verifyToken, templeController.booking);
router.post('/book', verifyToken, templeController.booking);
router.post('/createBooking', verifyToken, templeController.booking);
router.get('/get', templeController.getAll);
router.get('/gettemple/:templeId', templeController.getById);
router.get('/getbooking', AdminverifyToken, templeController.getAllBookings);
router.put('/updatebooking/:id', AdminverifyToken, templeController.updateTempleBooking);
router.delete('/deletebooking/:id', AdminverifyToken, templeController.deleteBooking);
router.get('/user/:userId', templeController.getByUserId);
router.put('/update/:id', templeUpload, AdminverifyToken, templeController.update);
router.delete('/delete/:id', AdminverifyToken, templeController.delete);
module.exports = router;