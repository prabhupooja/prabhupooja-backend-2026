const express = require('express');
const router = express.Router();
const eventController = require('../Controllers/eventController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure upload storage (Supports S3 if credentials exist, falls back to disk storage safely)
let upload;

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.S3_BUCKET_NAME) {
    try {
        const multerS3 = require('multer-s3');
        const { S3Client } = require('@aws-sdk/client-s3');
        const s3 = new S3Client({
            region: process.env.AWS_REGION || 'ap-south-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        });
        upload = multer({
            storage: multerS3({
                s3: s3,
                bucket: process.env.S3_BUCKET_NAME,
                contentType: multerS3.AUTO_CONTENT_TYPE,
                key: function (req, file, cb) {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    cb(null, `events/${uniqueSuffix}${path.extname(file.originalname)}`);
                }
            })
        });
    } catch (e) {
        console.warn('S3 Multer initialization failed, falling back to local disk storage:', e.message);
    }
}

if (!upload) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, 'event-' + uniqueSuffix + path.extname(file.originalname));
        }
    });
    upload = multer({ storage: storage });
}

// Support single & multiple file uploads under any field names (image, banner, photo, gallery, file, etc.)
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

