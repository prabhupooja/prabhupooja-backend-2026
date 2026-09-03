const express = require("express");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");
const blog = require('../Controllers/blogControler');
const { AdminverifyToken } = require('../config/admintoken');

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
router.post("/createImage", upload.array("image", 10), AdminverifyToken, blog.create);
router.get('/getImage', blog.getAll);
router.get('/getImageby/:id', blog.getById);
router.put('/updateImage/:id',AdminverifyToken,blog.updateBlog);
router.delete('/deleteImage/:id',AdminverifyToken,blog.deleteBlog);
router.put('/update/:id',upload.single('image'), AdminverifyToken, blog.update);
router.delete('/delete/:id', AdminverifyToken, blog.delete);
router.post('/comment/:id', blog.comment);
router.post('/like/:id', blog.likeBlog);
router.get('/blogdetail/:id', blog.getBlogDetails);
router.get('/getRelatedblog', blog.getRecommendationBlog);
module.exports = router;
