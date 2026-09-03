const express = require('express');
const router = express.Router();
const rudraAbhishek = require("../Controllers/rudraAbhishekControler");


router.post("/create-rudra-abhishek", rudraAbhishek.addRudraAbhishek);
router.get("/getAll-rudra-abhishek", rudraAbhishek.getAllRudraAbhishekBookings);
router.get("/get-rudra-abhishek/:id", rudraAbhishek.getRudraAbhishekDetails);
router.put("/update-rudra-abhishek/:id", rudraAbhishek.updateRudraAbhishekStatus);
router.delete("/delete-rudra-abhishek/:id", rudraAbhishek.deleteRudraAbhishek);

module.exports=router;