const express = require('express');
const muhuratController = require('../Controllers/muhuratControler');
const { verifyToken } = require('../config/genratetokenConfig');
const { AdminverifyToken } = require('../config/admintoken');
const { createCloudinaryUpload } = require('../config/cloudinary');

const router = express.Router();
const upload = createCloudinaryUpload('muhurat'); 
router.post('/create',upload.single('image'),AdminverifyToken,muhuratController.create);
router.get('/get',muhuratController.getAll);
router.get('/member/:userId',verifyToken,muhuratController.membership);
router.get('/members',AdminverifyToken,muhuratController.getMembership);
router.put('/updatemember/:id',AdminverifyToken,muhuratController.updateMembership);
router.delete('/deletemember/:id',AdminverifyToken,muhuratController.deleteMembership);
module.exports=router;