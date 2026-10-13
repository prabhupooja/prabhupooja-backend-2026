const express = require("express");
const translationController = require("../Controllers/translationController");

const router = express.Router();

router.post("/translate", translationController.translateTexts);

module.exports = router;
