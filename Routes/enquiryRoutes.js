const express = require('express');
const enquiryController = require('../Controllers/enquiryControler');
const { AdminverifyToken } = require('../config/admintoken');
const { verifyToken } = require('../config/genratetokenConfig');

const router = express.Router();

router.post('/create', enquiryController.create);
router.get('/get', AdminverifyToken, enquiryController.getAll);
router.get('/all', enquiryController.getAll);
router.get('/getbyid/:id', enquiryController.getById);
router.get('/pandit/:panditId', enquiryController.getByPanditId);
router.get('/user/:userId', enquiryController.getByUserId);
router.put('/status/:id', enquiryController.updateStatus);
router.post('/reply/:id', AdminverifyToken, enquiryController.reply); 

module.exports = router;