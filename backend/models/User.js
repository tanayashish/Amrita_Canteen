const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['student','staff'], default: 'student' }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
