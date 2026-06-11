require('dotenv').config();
const http = require('http');
const connectDB = require('./src/config/db');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

// Create HTTP Server
const server = http.createServer(app);

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*', // We can restrict this to the frontend URL later
    methods: ['GET', 'POST'],
  },
});

// Socket connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // User joins a room
  socket.on('join_room', ({ roomCode, user }) => {
    socket.join(roomCode);
    console.log(`User ${user.username} (${socket.id}) joined room: ${roomCode}`);

    // Notify others in the room
    socket.to(roomCode).emit('user_joined', {
      user,
      message: `${user.username} has joined the chat.`,
    });
  });

  // User sends a message
  socket.on('send_message', ({ roomCode, text, sender }) => {
    const messageData = {
      _id: new mongoose.Types.ObjectId(), // Generate unique ID for message
      text,
      sender,
      createdAt: new Date(),
    };

    // Broadcast message to everyone in the room (including sender)
    io.to(roomCode).emit('receive_message', messageData);
  });

  // User leaves a room
  socket.on('leave_room', ({ roomCode, user }) => {
    socket.leave(roomCode);
    console.log(`User ${user.username} (${socket.id}) left room: ${roomCode}`);

    socket.to(roomCode).emit('user_left', {
      user,
      message: `${user.username} has left the chat.`,
    });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Database connection & Server start
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

