const express = require('express');
const router = express.Router();
const requestController = require('../Controllers/requestController');

router.post('/', requestController.createRequest);
router.get('/status/:requestId', requestController.getRequests);
router.get('/showforpandit/:id/:type',requestController.getPanditRequests)
router.get('/showforuser/:id/:type',requestController.getUserRequests);
router.put('/:requestId', requestController.updateRequestStatus);


module.exports = router;
