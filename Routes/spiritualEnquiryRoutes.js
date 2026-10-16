const express = require("express");
const router = express.Router();
const controller = require("../Controllers/spiritualEnquiryController");

// Public Endpoint: Submit Enquiry (From external project / website frontend)
router.post("/", controller.create);
router.post("/create", controller.create);

// Admin / Dashboard Endpoints: Fetch All with search & pagination
router.get("/", controller.getAll);
router.get("/all", controller.getAll);

// Detail, Update, and Delete endpoints
router.get("/:id", controller.getById);
router.put("/:id", controller.update);
router.put("/update/:id", controller.update);
router.delete("/:id", controller.delete);
router.delete("/delete/:id", controller.delete);

module.exports = router;
