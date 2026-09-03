const express = require("express")


const paymentController = require("../Controllers/paymentController");
const { verifyToken } = require("../config/genratetokenConfig");

const router = express.Router()

router.post("/create-payment",verifyToken,paymentController.createOrder)
router.post('/verify-payment',verifyToken, paymentController.verifyPayment);
router.get("/status/:user_id/:puja_id",verifyToken,paymentController.paymentStatus);

module.exports = router