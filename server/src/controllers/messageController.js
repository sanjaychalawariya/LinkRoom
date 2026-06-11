const mongoose = require('mongoose');
const Room = require('../models/Room');
const Message = require('../models/Message');

// @desc    Save a new message
// @route   POST /api/messages
// @access  Private (or Public depending on request structure, but typically we want it flexible)
const saveMessage = async (req, res, next) => {
  try {
    const { roomId, senderId, content } = req.body;

    if (!roomId || !senderId || !content) {
      res.status(400);
      throw new Error('roomId, senderId, and content are required');
    }

    const message = await Message.create({
      room: roomId,
      sender: senderId,
      text: content,
    });

    const populatedMessage = await message.populate('sender', 'username email avatar');

    res.status(201).json({
      success: true,
      message: populatedMessage,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all messages for a room sorted by creation date ascending
// @route   GET /api/messages/:roomId
// @access  Private
const getMessagesByRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      res.status(400);
      throw new Error('Room ID or Code is required');
    }

    // Resolve room ID if a 6-character roomCode is passed instead
    let targetRoomId = roomId;
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      const room = await Room.findOne({ roomCode: roomId.toUpperCase() });
      if (!room) {
        res.status(404);
        throw new Error('Room not found');
      }
      targetRoomId = room._id;
    }

    // Query messages by resolved room ID, sorted by creation date ascending
    const messages = await Message.find({ room: targetRoomId })
      .populate('sender', 'username email avatar')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  saveMessage,
  getMessagesByRoom,
};
