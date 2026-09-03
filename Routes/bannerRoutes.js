const express = require("express");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3")
const Banner=require('../Controllers/bannerControler');
const{AdminverifyToken}=require('../config/admintoken');
const router = express.Router();

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  
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
  
  // Create Banner
router.post('/create', upload.single("image"), AdminverifyToken, Banner.create);
router.post('/add', upload.single("image"), AdminverifyToken, Banner.create);
router.post('/', upload.single("image"), AdminverifyToken, Banner.create);

// Get All Banners (Public - Frontend & Admin)
router.get('/getbanner', Banner.getAll);
router.get('/all', Banner.getAll);
router.get('/get', Banner.getAll);
router.get('/list', Banner.getAll);
router.get('/', Banner.getAll);

// Get Single Banner
router.get('/get/:id', Banner.getById);
router.get('/:id', Banner.getById);

// Update Banner
router.put('/update/:id', upload.single("image"), AdminverifyToken, Banner.update);
router.put('/:id', upload.single("image"), AdminverifyToken, Banner.update);

// Delete Banner
router.delete('/delete/:id', AdminverifyToken, Banner.delete);
router.delete('/deleteBanner/:id', AdminverifyToken, Banner.delete);
router.delete('/:id', AdminverifyToken, Banner.delete);

module.exports = router;