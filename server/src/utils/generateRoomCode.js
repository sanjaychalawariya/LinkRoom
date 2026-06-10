const Room = require('../models/Room');

/**
 * Generates a unique 6-character alphanumeric room code using uppercase letters and numbers.
 * Verifies with the database to guarantee uniqueness.
 * @returns {Promise<string>} The unique room code.
 */
const generateRoomCode = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let isUnique = false;
  let code = '';

  while (!isUnique) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Verify uniqueness in database
    const existingRoom = await Room.findOne({ roomCode: code });
    if (!existingRoom) {
      isUnique = true;
    }
  }

  return code;
};

module.exports = generateRoomCode;
