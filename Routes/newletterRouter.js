const express=require('express');
const newletter= require('../Controllers/newletterControler');
const { AdminverifyToken } = require('../config/admintoken');
const router= express.Router();

router.post('/create',newletter.create);
router.post('/subscribe',newletter.create);
router.get('/getAll',AdminverifyToken,newletter.getAll);

module.exports=router;