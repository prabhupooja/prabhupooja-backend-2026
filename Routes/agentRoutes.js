const express = require('express');
const router = express.Router();
const agentController = require('../Controllers/agentControler');
const { AdminverifyToken } = require('../config/admintoken');
const { createCloudinaryUpload } = require('../config/cloudinary');

const upload = createCloudinaryUpload('agents');

const { AdminOrAgentVerifyToken, RequireAdmin } = require('../config/adminOrAgentToken');

// Public
router.post('/login', agentController.login);

// Agent Dashboard & Self-Service
router.get('/stats', AdminOrAgentVerifyToken, agentController.getAgentDashboardStats);
router.get('/logs', AdminOrAgentVerifyToken, agentController.getAgentLogs);
router.get('/agentProfile', AdminOrAgentVerifyToken, agentController.getAgentProfileByToken);
router.put('/updateProfile', upload.single("profile"), AdminOrAgentVerifyToken, agentController.updateAgentProfile);
router.put('/change-password', AdminOrAgentVerifyToken, agentController.changePassword);

// Admin-Only Agent Management
router.post('/newcreate', upload.single("profile"), AdminverifyToken, agentController.create);
router.get('/getall', AdminverifyToken, agentController.getAllAgents);
router.get('/get/:id', AdminverifyToken, agentController.getAgentById);
router.put('/update/:id', upload.single("profile"), AdminverifyToken, agentController.updateAgentById);
router.put('/status/:id', AdminverifyToken, agentController.toggleAgentStatus);
router.delete('/delete/:id', AdminverifyToken, agentController.deleteAgentById);

module.exports = router;