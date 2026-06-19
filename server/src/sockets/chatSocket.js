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
    socket.on('join_room', ({ roomId, user }) => {
      socket.join(roomId);
      console.log(`User ${user.username} (${socket.id}) joined room: ${roomId}`);

      // Notify other participants in the room
      socket.to(roomId).emit('user_joined', {
        user,
        message: `${user.username} has joined the chat.`,
      });
    });

    // User sends a message
    socket.on('send_message', async ({ roomId, content, sender }) => {
      try {
        // Save the message to the database directly using roomId
        const message = await Message.create({
          sender: sender.id,
          room: roomId,
          text: content,
        });

        // Prepare payload to broadcast
        const messageData = {
          _id: message._id,
          content: message.text,
          sender: {
            id: sender.id,
            username: sender.username,
          },
          createdAt: message.createdAt,
        };

        // Broadcast message ONLY to clients inside that room
        io.to(roomId).emit('receive_message', messageData);
      } catch (error) {
        console.error('Socket error saving message:', error.message);
      }
    });

    // User leaves a room
    socket.on('leave_room', ({ roomId, user }) => {
      socket.leave(roomId);
      console.log(`User ${user.username} (${socket.id}) left room: ${roomId}`);

      // Notify others in the room
      socket.to(roomId).emit('user_left', {
        user,
        message: `${user.username} has left the chat.`,
      });
    });

    // User is typing
    socket.on('typing', ({ roomId, user }) => {
      socket.to(roomId).emit('user_typing', { user });
    });

    // User stopped typing
    socket.on('stop_typing', ({ roomId, user }) => {
      socket.to(roomId).emit('user_stop_typing', { user });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};

module.exports = chatSocket;
