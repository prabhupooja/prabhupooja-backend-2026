const express = require("express");
const EcommerceBanner = require("../Controllers/ecommerceBannerController");
const { AdminverifyToken } = require("../config/admintoken");
const { createCloudinaryUpload } = require("../config/cloudinary");
const router = express.Router();

const upload = createCloudinaryUpload("ecommerce_banners");

// Create E-Commerce Banner
router.post("/create", upload.single("image"), AdminverifyToken, EcommerceBanner.create);
router.post("/add", upload.single("image"), AdminverifyToken, EcommerceBanner.create);
router.post("/", upload.single("image"), AdminverifyToken, EcommerceBanner.create);

// Get All E-Commerce Banners (Public & Admin)
router.get("/get", EcommerceBanner.getAll);
router.get("/getbanner", EcommerceBanner.getAll);
router.get("/all", EcommerceBanner.getAll);
router.get("/list", EcommerceBanner.getAll);
router.get("/", EcommerceBanner.getAll);

// Get Single Banner
router.get("/get/:id", EcommerceBanner.getById);
router.get("/:id", EcommerceBanner.getById);

// Update E-Commerce Banner (Supports PUT, POST, PATCH with /update/:id, /:id, or /update)
router.put("/update/:id", upload.single("image"), AdminverifyToken, EcommerceBanner.update);
router.put("/update", upload.single("image"), AdminverifyToken, EcommerceBanner.update);
router.put("/:id", upload.single("image"), AdminverifyToken, EcommerceBanner.update);
router.post("/update/:id", upload.single("image"), AdminverifyToken, EcommerceBanner.update);
router.post("/update", upload.single("image"), AdminverifyToken, EcommerceBanner.update);
router.patch("/update/:id", upload.single("image"), AdminverifyToken, EcommerceBanner.update);
router.patch("/:id", upload.single("image"), AdminverifyToken, EcommerceBanner.update);

// Delete E-Commerce Banner
router.delete("/delete/:id", AdminverifyToken, EcommerceBanner.delete);
router.delete("/deleteBanner/:id", AdminverifyToken, EcommerceBanner.delete);
router.delete("/delete", AdminverifyToken, EcommerceBanner.delete);
router.delete("/:id", AdminverifyToken, EcommerceBanner.delete);

module.exports = router;
