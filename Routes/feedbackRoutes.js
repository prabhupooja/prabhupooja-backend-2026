const express= require('express');
const feedback=require('../Controllers/feedbackControler');
const { verifyToken } = require('../config/genratetokenConfig');
const { AdminverifyToken } = require('../config/admintoken');
const router= express.Router()

router.post('/create',verifyToken,feedback.create);
router.get('/getfeedback',AdminverifyToken,feedback.getAllFeedback);
router.get('/rating/:pujaId/:problem_name',feedback.getPujaRatings);
router.get('/Problemrating/:pujaId/:problem_name',feedback.getProblemRatings);

module.exports=router;