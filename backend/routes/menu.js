const express = require('express');
const MenuItem = require('../models/MenuItem');
const router = express.Router();

/* ===========================
   ✅ GET ALL MENU ITEMS
   =========================== */
router.get('/', async (req, res) => {
  try {
    const items = await MenuItem.find().select('_id name price image available special combo');
    res.json(items);
  } catch (err) {
    console.error('Error fetching menu:', err);
    res.status(500).json({ message: 'Server error fetching menu' });
  }
});

/* ===========================
   ✅ ALIAS ROUTE /all
   =========================== */
router.get('/all', async (req, res) => {
  try {
    const items = await MenuItem.find().select('_id name price image available special combo');
    res.json(items);
  } catch (err) {
    console.error('Error fetching all menu:', err);
    res.status(500).json({ message: 'Server error fetching menu' });
  }
});

/* ===========================
   ✅ TODAY'S SPECIALS
   =========================== */
router.get('/specials', async (req, res) => {
  try {
    const items = await MenuItem.find({ special: true }).select('_id name price image available special combo');
    res.json(items);
  } catch (err) {
    console.error('Error fetching specials:', err);
    res.status(500).json({ message: 'Server error fetching specials' });
  }
});

/* ===========================
   ✅ COMBO OFFERS
   =========================== */
router.get('/combos', async (req, res) => {
  try {
    const items = await MenuItem.find({ combo: true }).select('_id name price image available special combo');
    res.json(items);
  } catch (err) {
    console.error('Error fetching combos:', err);
    res.status(500).json({ message: 'Server error fetching combos' });
  }
});

/* ===========================
   ✅ ADD NEW MENU ITEM
   =========================== */
router.post('/', async (req, res) => {
  try {
    console.log('📦 Incoming item data:', req.body);

    const { name, price, image, available, special, combo } = req.body;

    // Basic validation
    if (!name || price == null || isNaN(price)) {
      console.log('⚠️ Invalid data received:', req.body);
      return res.status(400).json({ message: 'Name and valid price are required.' });
    }

    // Create a new MenuItem document
    const newItem = new MenuItem({
      name: name.trim(),
      price: parseFloat(price),
      image: image?.trim() || '',
      available: available ?? true,
      special: special ?? false,
      combo: combo ?? false
    });

    // Save to MongoDB
    const savedItem = await newItem.save();

    console.log('✅ New item saved successfully:', savedItem);
    res.status(201).json({
      message: '✅ Menu item added successfully',
      item: savedItem
    });
  } catch (err) {
    console.error('❌ Error saving new menu item:', err);

    if (err.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation failed. Check required fields.',
        details: err.message
      });
    }

    res.status(500).json({
      message: 'Server error adding menu item',
      error: err.message
    });
  }
});

/* ===========================
   ✅ UPDATE AVAILABILITY
   =========================== */
router.patch('/:id/availability', async (req, res) => {
  try {
    const { available } = req.body;
    const item = await MenuItem.findByIdAndUpdate(req.params.id, { available }, { new: true });

    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (err) {
    console.error('Update availability error:', err);
    res.status(500).json({ message: 'Server error updating availability' });
  }
});

/* ===========================
   ✅ UPDATE PRICE
   =========================== */
router.patch('/:id/price', async (req, res) => {
  try {
    const { price } = req.body;
    if (price == null || price < 0) {
      return res.status(400).json({ message: 'Invalid price' });
    }

    const item = await MenuItem.findByIdAndUpdate(req.params.id, { price }, { new: true });
    if (!item) return res.status(404).json({ message: 'Item not found' });

    res.json(item);
  } catch (err) {
    console.error('Update price error:', err);
    res.status(500).json({ message: 'Server error updating price' });
  }
});

/* ===========================
   ✅ UPDATE IMAGE
   =========================== */
router.patch('/:id/image', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ message: 'Image URL required' });

    const item = await MenuItem.findByIdAndUpdate(req.params.id, { image }, { new: true });
    if (!item) return res.status(404).json({ message: 'Item not found' });

    res.json(item);
  } catch (err) {
    console.error('Update image error:', err);
    res.status(500).json({ message: 'Server error updating image' });
  }
});

/* ===========================
   ✅ FULL ITEM EDIT (PUT)
   =========================== */
router.put('/:id', async (req, res) => {
  try {
    const { name, price, image, available, special, combo } = req.body;
    const item = await MenuItem.findById(req.params.id);

    if (!item) return res.status(404).json({ message: 'Menu item not found' });

    // Update only provided fields
    if (name !== undefined) item.name = name.trim();
    if (price !== undefined && !isNaN(price)) item.price = parseFloat(price);
    if (image !== undefined) item.image = image.trim();
    if (available !== undefined) item.available = available;
    if (special !== undefined) item.special = special;
    if (combo !== undefined) item.combo = combo;

    const updated = await item.save();
    console.log('✅ Menu item updated successfully:', updated);
    res.json({ message: '✅ Menu item updated successfully', item: updated });
  } catch (err) {
    console.error('Full item update error:', err);
    res.status(500).json({ message: 'Server error updating item' });
  }
});

module.exports = router;
