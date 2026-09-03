const express=require('express');
const router= express.Router();
const productCouponsController = require("../Controllers/productCouponController");
const {AdminverifyToken} = require("../config/admintoken");
const { sellerVerifyToken } = require('../config/sellerToken');

router.post('/create',AdminverifyToken,productCouponsController.createCoupon);
router.post('/createSeller',sellerVerifyToken,productCouponsController.createCoupon);
router.get('/get', sellerVerifyToken, productCouponsController.getSellersCoupon);
router.get('/get/:sellerId',productCouponsController.getSellersCoupon);
router.get('/getValidat-coupon/:code',productCouponsController.getValidateCoupon);
router.put('/updateCoupan/:id',AdminverifyToken,productCouponsController.updateCoupon);
router.put('/updateCoupanSeller/:id',sellerVerifyToken,productCouponsController.updateCoupon);
router.delete('/deleteCoupan/:id',AdminverifyToken,productCouponsController.deleteCoupon);
router.delete('/deleteCoupanSeller/:id',sellerVerifyToken,productCouponsController.deleteCoupon);
module.exports = router;