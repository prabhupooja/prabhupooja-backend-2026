const express= require('express');
const yogaController=require('../Controllers/yogaControler');
const { AdminverifyToken } = require('../config/admintoken');
const { verifyToken } = require('../config/genratetokenConfig');

const router=express.Router();

router.post('/book', yogaController.createYogaBooking);
router.post('/create', yogaController.createYogaBooking);
router.get('/get', AdminverifyToken, yogaController.getAllusers);
router.get('/getuser/:userId', verifyToken, yogaController.getUserById);
router.put('/updateBooking/:id', AdminverifyToken, yogaController.updateYogaBooking);
router.delete('/deleteBooking/:id', AdminverifyToken, yogaController.deleteYogaBooking);
module.exports=router;