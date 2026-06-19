const express = require('express');
const { createRoom, joinRoom, getRoomDetails, getUserRooms, deleteRoom } = require('../controllers/roomController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', protect, getUserRooms);
router.post('/create', protect, createRoom);
router.post('/join', protect, joinRoom);
router.get('/:roomId', protect, getRoomDetails);
router.delete('/:roomId', protect, deleteRoom);

module.exports = router;
