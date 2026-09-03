const express = require("express");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3")
const Footer=require('../Controllers/footerControler');
const { verifyToken } = require("../config/genratetokenConfig");
const { AdminverifyToken } = require("../config/admintoken");
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
  
  router.post('/create',upload.single("image"),AdminverifyToken,Footer.create);
  router.get('/getfooter',Footer.getAll);
  router.put('/update/:id',upload.single("image"),AdminverifyToken,Footer.update);

  module.exports=router;