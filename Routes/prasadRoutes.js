const express = require("express")
const multer = require("multer")
const path = require("path")
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");
const prasad = require("../Controllers/prasadController");
const { verifyToken } = require("../config/genratetokenConfig");
const { AdminverifyToken } = require("../config/admintoken");


const router = express.Router()

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
      cb(null, `prasad/${Date.now().toString()}-${file.originalname}`);
    },

  })
});


router.post("/create", upload.single('image'), AdminverifyToken,prasad.create);
router.get("/get", prasad.get);
router.get("/get/:id", prasad.getById);
router.put("/update/:id", upload.single('image'),AdminverifyToken, prasad.update);
router.delete("/delete/:id",AdminverifyToken, prasad.delete);
router.put('/updateStatus/:id',verifyToken,prasad.statusUpdate);
router.post('/booking', verifyToken, prasad.booking);
router.post('/book', verifyToken, prasad.booking);
router.get('/getbooking', AdminverifyToken, prasad.getAllBookingDetails);
router.get('/demandSummary', AdminverifyToken, prasad.getPrasadDemandSummary);
router.put('/updatebooking/:id', AdminverifyToken, prasad.updateBooking);
router.delete('/deletebooking/:id', AdminverifyToken, prasad.deleteBooking);
router.get('/getuser/:userId', verifyToken, prasad.getBookingByUserId);

module.exports = router