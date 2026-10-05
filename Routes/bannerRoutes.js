const express = require("express");
const Banner = require('../Controllers/bannerControler');
const { AdminverifyToken } = require('../config/admintoken');
const { createCloudinaryUpload } = require('../config/cloudinary');
const router = express.Router();

const upload = createCloudinaryUpload('banners');
  
  // Create Banner
router.post('/create', upload.single("image"), AdminverifyToken, Banner.create);
router.post('/add', upload.single("image"), AdminverifyToken, Banner.create);
router.post('/', upload.single("image"), AdminverifyToken, Banner.create);

// Get All Banners (Public - Frontend & Admin)
router.get('/getbanner', Banner.getAll);
router.get('/all', Banner.getAll);
router.get('/get', Banner.getAll);
router.get('/list', Banner.getAll);
router.get('/', Banner.getAll);

// Get Single Banner
router.get('/get/:id', Banner.getById);
router.get('/:id', Banner.getById);

// Update Banner
router.put('/update/:id', upload.single("image"), AdminverifyToken, Banner.update);
router.put('/:id', upload.single("image"), AdminverifyToken, Banner.update);

// Delete Banner
router.delete('/delete/:id', AdminverifyToken, Banner.delete);
router.delete('/deleteBanner/:id', AdminverifyToken, Banner.delete);
router.delete('/:id', AdminverifyToken, Banner.delete);

module.exports = router;