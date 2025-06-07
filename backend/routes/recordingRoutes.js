const express = require('express');
const router = express.Router();
const recordingController = require('../controllers/recordingController');
const authMiddleware = require('../middleware/auth');

// Public routes
router.get('/', recordingController.getRecordings);

// Protected routes
router.post('/start', authMiddleware, recordingController.startRecording);
router.post('/stop', authMiddleware, recordingController.stopRecording);
router.delete('/:filename', authMiddleware, recordingController.deleteRecording);

module.exports = router; 