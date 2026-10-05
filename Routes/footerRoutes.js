const express = require("express");
const Footer = require('../Controllers/footerControler');
const { verifyToken } = require("../config/genratetokenConfig");
const { AdminverifyToken } = require("../config/admintoken");
const { createCloudinaryUpload } = require("../config/cloudinary");
const router = express.Router();

const upload = createCloudinaryUpload('footer');
  
  router.post('/create',upload.single("image"),AdminverifyToken,Footer.create);
  router.get('/getfooter',Footer.getAll);
  router.put('/update/:id',upload.single("image"),AdminverifyToken,Footer.update);

  module.exports=router;