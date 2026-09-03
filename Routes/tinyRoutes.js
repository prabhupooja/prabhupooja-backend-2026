const express = require('express');
const tinyController = require('../Controllers/tinyControler');
const { AdminverifyToken } = require('../config/admintoken');
const router = express.Router();
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



router.post('/create',upload.single('image'),AdminverifyToken, tinyController.create);
router.get('/getAll', tinyController.getAll);
router.get('/getblogby/:id', tinyController.getById);
// router.post('/uploadImage/:id', upload.array('images', 10), AdminverifyToken, tinyController.uploadImages);
module.exports = router