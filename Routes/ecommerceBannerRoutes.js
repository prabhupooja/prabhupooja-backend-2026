const express = require("express");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");
const EcommerceBanner = require("../Controllers/ecommerceBannerController");
const { AdminverifyToken } = require("../config/admintoken");
const router = express.Router();

const s3 = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME || "prabhupooja1",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      const sanitizedName = file.originalname ? file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_') : 'banner.png';
      cb(null, `products/${Date.now().toString()}-${sanitizedName}`);
    },
  }),
});

const handleUpload = (req, res, next) => {
  upload.any()(req, res, function (err) {
    if (err) {
      console.error("Multer/S3 Upload Error:", err);
      return res.status(400).json({
        success: false,
        message: "Failed to upload banner image: " + (err.message || "S3 Upload Error"),
        error: err.message
      });
    }
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      req.file = req.files.find(f => f.fieldname === "image" || f.fieldname === "banner" || f.fieldname === "banner_image") || req.files[0];
    }
    next();
  });
};

// Create E-Commerce Banner
router.post("/create", AdminverifyToken, handleUpload, EcommerceBanner.create);
router.post("/add", AdminverifyToken, handleUpload, EcommerceBanner.create);
router.post("/", AdminverifyToken, handleUpload, EcommerceBanner.create);

// Get All E-Commerce Banners (Public & Admin)
router.get("/get", EcommerceBanner.getAll);
router.get("/getbanner", EcommerceBanner.getAll);
router.get("/all", EcommerceBanner.getAll);
router.get("/list", EcommerceBanner.getAll);
router.get("/", EcommerceBanner.getAll);

// Get Single Banner
router.get("/get/:id", EcommerceBanner.getById);
router.get("/:id", EcommerceBanner.getById);

// Update E-Commerce Banner
router.put("/update/:id", AdminverifyToken, handleUpload, EcommerceBanner.update);
router.put("/:id", AdminverifyToken, handleUpload, EcommerceBanner.update);

// Delete E-Commerce Banner
router.delete("/delete/:id", AdminverifyToken, EcommerceBanner.delete);
router.delete("/deleteBanner/:id", AdminverifyToken, EcommerceBanner.delete);
router.delete("/:id", AdminverifyToken, EcommerceBanner.delete);

module.exports = router;
