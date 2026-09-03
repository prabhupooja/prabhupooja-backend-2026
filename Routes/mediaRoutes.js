const express = require('express');
const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");
const media = require('../Controllers/mediaControler');
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
      cb(null, `media/${Date.now().toString()}-${file.originalname}`);
    },
  }),
});

router.post('/createImage', upload.array('file', 10), media.create);
router.post('/createVideo', upload.array('file', 1), media.video);
router.get('/getAll', media.getAll);
router.get('/getAllUser',media.getPostingUsers);
router.get('/get/:user_id', media.getByUserId);
router.put('/updateMedia/:id', media.update);
router.delete('/deleteMedia/:id', media.delete);
router.post('/like/:id', media.like);
router.post('/comment/:id', media.comment);
router.get('/getByType/:type', media.getByType);
router.get('/getMedia/:id',media.getMediaSummary);
router.get('/related', media.relatedMedia);
router.delete('/deleteComment/:commentId/:userId',media.deleteComment);
module.exports = router;