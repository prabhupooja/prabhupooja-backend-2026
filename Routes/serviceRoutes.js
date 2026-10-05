const express = require("express");
const service = require("../Controllers/serviceController");
const { AdminverifyToken } = require("../config/admintoken");
const { createCloudinaryUpload } = require("../config/cloudinary");
const router = express.Router();

const upload = createCloudinaryUpload("services");


router.post(
  "/create",
  upload.single("image"),
  AdminverifyToken,
  service.create
);
router.get("/get", service.get);
router.get("/get/:id", service.getById);

router.put(
  "/update/:id",
  AdminverifyToken,
  upload.single("image"),
  service.update
);

router.delete("/delete/:id", AdminverifyToken, service.delete);
router.get("/search", service.searchServices);

module.exports = router;
