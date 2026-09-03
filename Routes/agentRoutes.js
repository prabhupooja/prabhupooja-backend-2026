const express=require('express');
const router= express.Router();
const agentController=require('../Controllers/agentControler');
const {AdminverifyToken}=require('../config/admintoken');
const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3")

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  
  const upload = multer({
    storage: multerS3({
      s3: s3,
      bucket: process.env.S3_BUCKET_NAME,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: function (req, file, cb) {
        cb(null, `products/${Date.now().toString()}-${file.originalname}`);
      },
    }),
  });

const { AdminOrAgentVerifyToken } = require('../config/adminOrAgentToken');

router.post('/login', agentController.login);
router.post('/newcreate', upload.single("profile"), AdminOrAgentVerifyToken, agentController.create);
router.get('/getall', AdminOrAgentVerifyToken, agentController.getAllAgents);
router.get('/get/:id', AdminOrAgentVerifyToken, agentController.getAgentById);
router.put('/update/:id', upload.single("profile"), AdminOrAgentVerifyToken, agentController.updateAgentById);
router.delete('/delete/:id', AdminOrAgentVerifyToken, agentController.deleteAgentById);
router.get('/agentProfile', AdminOrAgentVerifyToken, agentController.getAgentProfileByToken);
router.put('/updateProfile', upload.single("profile"), AdminOrAgentVerifyToken, agentController.updateAgentProfile);

module.exports = router;