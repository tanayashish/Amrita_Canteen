const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

// register
router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Missing fields' });
  const existing = await User.findOne({ username });
  if (existing) return res.status(409).json({ message: 'Username exists' });
  const hash = await bcrypt.hash(password, 10);
  const user = new User({ username, passwordHash: hash, role });
  await user.save();
  res.json({ message: 'registered' });
});

// login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, username: user.username, role: user.role });
});

module.exports = router;
