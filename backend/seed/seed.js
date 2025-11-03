// backend/seed/seed.js
const mongoose = require("mongoose");
const MenuItem = require("../models/MenuItem");

const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/smartcanteen";

async function seed() {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("✅ Connected to MongoDB");

    // remove old menu items
    await MenuItem.deleteMany({});
    console.log("🧹 Cleared old menu items");

    // insert clean items (no _id provided)
    await MenuItem.insertMany([
      {
        name: "Chicken Biryani",
        price: 120,
        available: true,
        image: "https://images.unsplash.com/photo-1600891964599-f61ba0e24092"
      },
      {
        name: "Veg Noodles",
        price: 80,
        available: true,
        image: "https://images.unsplash.com/photo-1604908177522-6d2956e4c54b"
      }
    ]);

    console.log("🌱 Menu items seeded successfully!");
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    try { await mongoose.connection.close(); } catch (e) {}
    process.exit(1);
  }
}

seed();
