const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  image: { type: String, default: '' },
  available: { type: Boolean, default: true },
  special: { type: Boolean, default: false },
  combo: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('MenuItem', menuItemSchema);
