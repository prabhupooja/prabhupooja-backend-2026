const express = require('express');
const media = require('../Controllers/mediaControler');
const { createCloudinaryUpload } = require('../config/cloudinary');
const router = express.Router();

const upload = createCloudinaryUpload('media', ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'mov', 'webm']);

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