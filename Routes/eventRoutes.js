const express = require('express');
const router = express.Router();
const eventController = require('../Controllers/eventController');
const { createCloudinaryUpload } = require('../config/cloudinary');

const upload = createCloudinaryUpload('events');
const uploadMiddleware = upload.any();

// --- EVENT ROUTES ---

// 1. Devotee Event Registration / Booking
router.post('/register', eventController.registerEvent);
router.post('/book', eventController.registerEvent);

// 2. Event Bookings Management (Admin)
router.get('/bookings/all', eventController.getAllBookings);
router.get('/bookings', eventController.getAllBookings);
router.get('/bookings/event/:eventId', eventController.getEventBookingsByEventId);
router.get('/bookings/:id', eventController.getBookingById);
router.put('/bookings/status/:id', eventController.updateBookingStatus);
router.patch('/bookings/status/:id', eventController.updateBookingStatus);
router.delete('/bookings/:id', eventController.deleteBooking);

// 3. Create Event (Latest, Past, Single, Bulk)
router.post('/create', uploadMiddleware, eventController.create);
router.post('/create-past', uploadMiddleware, eventController.createPast);
router.post('/past/create', uploadMiddleware, eventController.createPast);
router.post('/past', uploadMiddleware, eventController.createPast);
router.post('/create-latest', uploadMiddleware, eventController.createLatest);
router.post('/latest/create', uploadMiddleware, eventController.createLatest);
router.post('/latest', uploadMiddleware, eventController.createLatest);
router.post('/bulk', uploadMiddleware, eventController.create);
router.post('/create-bulk', uploadMiddleware, eventController.create);
router.post('/', uploadMiddleware, eventController.create);

// 4. Fetch Events
router.get('/getall', eventController.getAll);
router.get('/all', eventController.getAll);
router.get('/latest', eventController.getLatest);
router.get('/past', eventController.getPast);
router.get('/stats', eventController.getStats);
router.get('/', eventController.getAll);

// 5. Fetch Single Event
router.get('/get/:id', eventController.getById);
router.get('/:id', eventController.getById);

// 6. Update Event
router.put('/update/:id', uploadMiddleware, eventController.update);
router.put('/:id', uploadMiddleware, eventController.update);
router.patch('/:id', uploadMiddleware, eventController.update);

// 7. Update Status / Toggle Past State
router.put('/update-status/:id', eventController.updateStatus);
router.patch('/update-status/:id', eventController.updateStatus);
router.patch('/toggle-past/:id', eventController.togglePast);
router.put('/toggle-past/:id', eventController.togglePast);

// 8. Delete Event
router.delete('/delete/:id', eventController.delete);
router.delete('/:id', eventController.delete);

module.exports = router;

