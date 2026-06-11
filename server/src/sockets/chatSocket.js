const mongoose = require('mongoose');
const Room = require('../models/Room');
const Message = require('../models/Message');

/**
 * Socket.IO room-based chat event handler module.
 * @param {import('socket.io').Server} io - The Socket.IO server instance.
 */
const chatSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // User joins a room
    socket.on('join_room', ({ roomCode, user }) => {
      socket.join(roomCode);
      console.log(`User ${user.username} (${socket.id}) joined room: ${roomCode}`);

      // Notify other participants in the room
      socket.to(roomCode).emit('user_joined', {
        user,
        message: `${user.username} has joined the chat.`,
      });
    });

    // User sends a message
    socket.on('send_message', async ({ roomCode, text, sender }) => {
      try {
        // Find room by roomCode to obtain its ObjectId
        const room = await Room.findOne({ roomCode });

        if (room) {
          // Save the message to the database
          const message = await Message.create({
            sender: sender.id,
            room: room._id,
            text: text,
          });

          // Prepare payload to broadcast
          const messageData = {
            _id: message._id,
            text: message.text,
            sender: {
              id: sender.id,
              username: sender.username,
            },
            createdAt: message.createdAt,
          };

          // Broadcast message ONLY to clients inside that room
          io.to(roomCode).emit('receive_message', messageData);
        } else {
          console.error(`Socket Error: Room not found for code ${roomCode}`);
        }
      } catch (error) {
        console.error('Socket error saving message:', error.message);
      }
    });

    // User leaves a room
    socket.on('leave_room', ({ roomCode, user }) => {
      socket.leave(roomCode);
      console.log(`User ${user.username} (${socket.id}) left room: ${roomCode}`);

      // Notify others in the room
      socket.to(roomCode).emit('user_left', {
        user,
        message: `${user.username} has left the chat.`,
      });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};

module.exports = chatSocket;
