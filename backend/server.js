// server.js
require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const path = require('path');

// Import Routes
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');

// Initialize App
const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

// Connect to MongoDB
const MONGO = process.env.MONGO_URI || process.env.MONGO || 'mongodb://127.0.0.1:27017/smartcanteen';
connectDB(MONGO).then(() => {
  console.log('✅ Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error', err);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);

const forecastRoutes = require('./routes/forecast');
app.use('/api/forecast', forecastRoutes);


// Serve frontend static (optional)
const frontendPath = path.join(__dirname, '../frontend_old/public');
app.use(express.static(frontendPath));
app.use('/src', express.static(path.join(__dirname, '../frontend_old/src')));

// Test Route
app.get('/', (req, res) => {
  res.send('🚀 SmartCanteen API is running...');
});

// Start Server
app.listen(PORT, () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);
});
