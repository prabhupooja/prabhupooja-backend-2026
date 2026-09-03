const express = require("express");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");
const problem = require('../Controllers/problemControler');
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

router.post('/create', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'banner', maxCount: 1 }]),AdminverifyToken, problem.create);
router.put('/update/:id', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), AdminverifyToken,problem.update);
router.get('/get/:problem', problem.getByProblemName);
router.get('/getid/:id',problem.getByProblemId);
router.post('/booking',verifyToken,problem.bookingPooja);
router.get('/getbookingdate/:pooja_id/:user_id',AdminverifyToken,problem.getBookingDate);
router.get('/getbooking/:userId',verifyToken,problem.getbookingbyid);
module.exports = router;