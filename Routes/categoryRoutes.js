const express=require('express');
const router= express.Router();
const categoryContorller=require('../Controllers/categoryController');
const {AdminverifyToken}=require('../config/admintoken');
const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3")

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
  
router.post ('/create',upload.single("image"),AdminverifyToken,categoryContorller.create);
router.get('/getall',AdminverifyToken,categoryContorller.getAll);
router.get('/getbyid/:id',AdminverifyToken,categoryContorller.getById);
router.put('/update/:id',upload.single("image"),AdminverifyToken,categoryContorller.update);
router.delete('/delete/:id',AdminverifyToken,categoryContorller.delete);

module.exports=router;