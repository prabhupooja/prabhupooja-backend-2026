const express = require("express");
const puja = require("../Controllers/onlinePujaController");
const { AdminverifyToken } = require("../config/admintoken");
const { createCloudinaryUpload } = require("../config/cloudinary");

const router = express.Router();
const upload = createCloudinaryUpload("onlinePooja");

router.post("/create", upload.single('image'),AdminverifyToken, puja.create)
router.get("/get", puja.get)
router.get("/get/:id", puja.getById)
router.put("/update/:id", upload.single('image'),AdminverifyToken, puja.updatePuja)
router.delete("/delete/:id",AdminverifyToken, puja.delete)
router.get("/search", puja.searchPooja)
router.post("/poojaDetailsforpandit", puja.poojaDetailsforpandit)
router.get("/:poojaId/pandits", puja.getPanditsByPoojaId)
router.get("/getuser/:userId", puja.getUserBookings)
router.get("/getUser/:userId", puja.getUserBookings)

module.exports = router