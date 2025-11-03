const mongoose = require('mongoose');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const connectDB = require('../config/db');
require('dotenv').config();

async function run() {
  await connectDB(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartcanteen');
  const orders = await Order.find();
  const counts = {};
  orders.forEach(o => {
    o.items.forEach(i => {
      counts[i.name] = (counts[i.name] || 0) + i.qty;
    });
  });
  const ranked = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5);
  console.log('Top items:', ranked);
  process.exit(0);
}
run();
