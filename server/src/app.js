const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to LinkRoom API' });
});

// Import and use routes here later
// app.use('/api/auth', authRoutes);

module.exports = app;
