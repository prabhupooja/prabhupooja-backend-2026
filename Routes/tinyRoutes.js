const express = require('express');
const tinyController = require('../Controllers/tinyControler');
const { AdminverifyToken } = require('../config/admintoken');
const { createCloudinaryUpload } = require('../config/cloudinary');
const router = express.Router();

const upload = createCloudinaryUpload('tiny_blogs');



router.post('/create',upload.single('image'),AdminverifyToken, tinyController.create);
router.get('/getAll', tinyController.getAll);
router.get('/getblogby/:id', tinyController.getById);
// router.post('/uploadImage/:id', upload.array('images', 10), AdminverifyToken, tinyController.uploadImages);
module.exports = router