// routes/forecast.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

const PY_URL = process.env.PY_URL || 'http://127.0.0.1:6000';

router.get('/orders', async (req, res) => {
  try {
    const days = req.query.days || 2;
    const resp = await axios.get(`${PY_URL}/forecast/orders?days=${days}`);
    res.json(resp.data);
  } catch (err) {
    console.error('Forecast orders error', err.message);
    res.status(500).json({ error: 'Forecast service error' });
  }
});

router.get('/items', async (req, res) => {
  try {
    const days = req.query.days || 2;
    const top = req.query.top || 5;
    const resp = await axios.get(`${PY_URL}/forecast/items?days=${days}&top=${top}`);
    res.json(resp.data);
  } catch (err) {
    console.error('Forecast items error', err.message);
    res.status(500).json({ error: 'Forecast service error' });
  }
});

module.exports = router;
