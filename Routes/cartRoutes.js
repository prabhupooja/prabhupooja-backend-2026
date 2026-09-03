  const express = require("express");
const cartController = require("../Controllers/cartController");
const {verifyToken}=require('../config/genratetokenConfig');
const {AdminverifyToken}=require('../config/admintoken');
const router = express.Router();


router.post("/create",verifyToken, cartController.create);
router.post("/createOrUpdate", verifyToken,cartController.createOrUpdateCart);
router.get('/getcart/:user_id',verifyToken,cartController.getCartItemsByUserId);
router.get("/get",AdminverifyToken, cartController.getAll);
router.get("/get/:id",AdminverifyToken, cartController.getById);
router.put("/update/:id", AdminverifyToken,cartController.update);
router.delete("/delete/:id",AdminverifyToken, cartController.delete);
router.post('/update-quantity',verifyToken,cartController.updateQuantity);

module.exports = router;