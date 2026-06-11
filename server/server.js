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

// Setup Sockets
const chatSocket = require('./src/sockets/chatSocket');
chatSocket(io);

// Database connection & Server start
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

