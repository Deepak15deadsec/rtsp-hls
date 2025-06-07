const express = require('express');
const router = express.Router();
const streamController = require('../controllers/streamController');
const authMiddleware = require('../middleware/auth');

// Public routes
router.get('/status', streamController.getStreamStatus);
router.get('/health', streamController.getStreamHealth);

// Protected routes
router.post('/start', authMiddleware, streamController.startStream);
router.post('/stop', authMiddleware, streamController.stopStream);

module.exports = router; 