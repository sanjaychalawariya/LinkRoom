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

// @desc    Join an existing chat room by roomCode
// @route   POST /api/rooms/join
// @access  Private
const joinRoom = async (req, res, next) => {
  try {
    const { roomCode } = req.body;

    if (!roomCode) {
      res.status(400);
      throw new Error('Room code is required');
    }

    // Find the room by roomCode
    const room = await Room.findOne({ roomCode });

    if (!room) {
      res.status(404);
      throw new Error('Room not found');
    }

    // Add user to participants if not already present
    if (!room.participants.includes(req.user._id)) {
      room.participants.push(req.user._id);
      await room.save();
    }

    res.status(200).json({
      success: true,
      message: 'Joined room successfully',
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
  joinRoom,
};
