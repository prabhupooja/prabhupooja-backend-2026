const express = require("express");
const panditComment = require('../Controllers/panditComment');
const router = express.Router();

router.post('/create/:id',panditComment.comment);
router.get('/get/:id',panditComment.getCommentsByPandit);

module.exports=router;
