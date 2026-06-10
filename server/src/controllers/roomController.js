const Room = require('../models/Room');
const generateRoomCode = require('../utils/generateRoomCode');

// @desc    Create a new chat room
// @route   POST /api/rooms
// @access  Private
const createRoom = async (req, res, next) => {
  try {
    const { roomName } = req.body;

    if (!roomName) {
      res.status(400);
      throw new Error('Room name is required');
    }

    if (!req.user) {
      res.status(401);
      throw new Error('Not authorized, user missing');
    }

    // Generate unique 6-character room code
    const roomCode = await generateRoomCode();

    // Create the room
    const room = await Room.create({
      roomName,
      roomCode,
      owner: req.user._id,
      participants: [req.user._id],
    });

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      room: {
        id: room._id,
        roomName: room.roomName,
        roomCode: room.roomCode,
        owner: room.owner,
        participants: room.participants,
        createdAt: room.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRoom,
};
