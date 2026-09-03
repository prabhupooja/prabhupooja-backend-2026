const express=require('express');
const router= express.Router();
const adminController=require('../Controllers/adminControler');
const {AdminverifyToken}=require('../config/admintoken');

router.post('/login',adminController.login);
router.put('/update/:id',AdminverifyToken,adminController.updateAdmin);
router.get("/getAdmin",AdminverifyToken, adminController.getAdminByToken);

module.exports=router;
