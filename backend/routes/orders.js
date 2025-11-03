const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');

/* ============================
   ✅ CREATE ORDER (with full menu item info)
   ============================ */
router.post('/', async (req, res) => {
  try {
    const { username, items, preference } = req.body;

    if (!username || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Missing or invalid order data' });
    }

    const populatedItems = [];

    // Loop through all items and fetch proper menu details
    for (const i of items) {
      const itemId =
        i.id ||
        i._id ||
        i.menuItem ||
        (typeof i === 'string' ? i : null);

      if (!itemId) continue;

      const menuItem = await MenuItem.findById(itemId);
      if (menuItem) {
        populatedItems.push({
          menuItem: menuItem._id,
          name: menuItem.name,
          qty: i.qty || 1,
          price: menuItem.price,
          image: menuItem.image || '',
        });
      }
    }

    if (populatedItems.length === 0) {
      return res.status(400).json({ message: 'No valid menu items found' });
    }

    const order = new Order({
      user: username,
      items: populatedItems,
      preference: preference || 'No preference',
      status: 'Pending',
      createdAt: new Date(),
    });

    await order.save();
    return res.status(201).json(order);
  } catch (err) {
    console.error('❌ Order creation error:', err);
    return res.status(500).json({ message: 'Server error while creating order' });
  }
});

/* ============================
   ✅ GET ORDERS (optionally filter by ?user=username)
   ============================ */
router.get('/', async (req, res) => {
  try {
    const userFilter = req.query.user;
    const query = userFilter ? { user: userFilter } : {};
    const orders = await Order.find(query).sort({ createdAt: -1 }).lean();
    return res.json(orders);
  } catch (err) {
    console.error('❌ Get orders error:', err);
    return res.status(500).json({ message: 'Server error while fetching orders' });
  }
});

/* ============================
   ✅ UPDATE ORDER STATUS
   ============================ */
router.patch('/:id/status', async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;

    if (!status) return res.status(400).json({ message: 'Missing status' });

    const allowed = ['Pending', 'Started', 'Ready', 'Collected', 'Cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.status = status;
    await order.save();

    return res.json(order);
  } catch (err) {
    console.error('❌ Update order status error:', err);
    return res.status(500).json({ message: 'Server error while updating order status' });
  }
});

module.exports = router;
