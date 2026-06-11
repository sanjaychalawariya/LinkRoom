const express = require('express');
const router = express.Router();
const { saveMessage, getMessagesByRoom } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, saveMessage);
router.get('/:roomId', protect, getMessagesByRoom);

module.exports = router;
