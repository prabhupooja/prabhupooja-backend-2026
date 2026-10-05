const express = require('express');
const router = express.Router();
const categoryContorller = require('../Controllers/categoryController');
const { AdminverifyToken } = require('../config/admintoken');
const { createCloudinaryUpload } = require('../config/cloudinary');

const upload = createCloudinaryUpload('categories');
  
// Category public fetch routes
router.get('/', categoryContorller.getAll);
router.get('/get', categoryContorller.getAll);
router.get('/getall', categoryContorller.getAll);
router.get('/all', categoryContorller.getAll);
router.get('/:id', categoryContorller.getById);
router.get('/getbyid/:id', categoryContorller.getById);
router.get('/get/:id', categoryContorller.getById);

// Category Admin protected management routes
router.post('/create', upload.single("image"), AdminverifyToken, categoryContorller.create);
router.put('/update/:id', upload.single("image"), AdminverifyToken, categoryContorller.update);
router.delete('/delete/:id', AdminverifyToken, categoryContorller.delete);
router.delete('/:id', AdminverifyToken, categoryContorller.delete);

module.exports=router;