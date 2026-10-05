const express = require("express");
const problem = require('../Controllers/problemControler');
const { verifyToken } = require("../config/genratetokenConfig");
const { AdminverifyToken } = require("../config/admintoken");
const { createCloudinaryUpload } = require("../config/cloudinary");

const router = express.Router();
const upload = createCloudinaryUpload('problems');

router.post('/create', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'banner', maxCount: 1 }]),AdminverifyToken, problem.create);
router.put('/update/:id', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), AdminverifyToken,problem.update);
router.get('/get/:problem', problem.getByProblemName);
router.get('/getid/:id',problem.getByProblemId);
router.post('/booking',verifyToken,problem.bookingPooja);
router.get('/getbookingdate/:pooja_id/:user_id',AdminverifyToken,problem.getBookingDate);
router.get('/getbooking/:userId',verifyToken,problem.getbookingbyid);
router.get('/getbookings/:userId',verifyToken,problem.getbookingbyid);
module.exports = router;