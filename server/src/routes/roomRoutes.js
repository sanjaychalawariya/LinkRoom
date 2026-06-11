const express = require('express');
const { createRoom, joinRoom, getRoomDetails } = require('../controllers/roomController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/create', protect, createRoom);
router.post('/join', protect, joinRoom);
router.get('/:roomId', protect, getRoomDetails);

module.exports = router;
