const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  user: { type: String, required: true }, // store username

  items: [
    {
      menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
      name: String,
      qty: Number,
      price: Number
    }
  ],

  preference: { type: String, default: "No preference" },

  // extended statuses
  status: { type: String, enum: ['Pending', 'Started', 'Ready', 'Collected', 'Cancelled'], default: 'Pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);
