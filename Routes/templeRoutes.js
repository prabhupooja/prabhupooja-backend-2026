const express = require("express");
const router = express.Router();
const multer = require("multer")
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");

const templeController = require('../Controllers/templeControler');
const { AdminverifyToken } = require("../config/admintoken");
const { verifyToken } = require("../config/genratetokenConfig");

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
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      cb(null, `temple/${Date.now().toString()}-${sanitizedName}`);
    },
  })
});

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