const express =require('express');
const enquiryController=require('../Controllers/enquiryControler');
const { AdminverifyToken } = require('../config/admintoken');

const router=express.Router();

router.post('/create',enquiryController.create);
router.get('/get',AdminverifyToken,enquiryController.getAll);
router.get('/getbyid/:id',AdminverifyToken,enquiryController.getById);
router.post('/reply/:id',AdminverifyToken,enquiryController.reply); 

module.exports=router;