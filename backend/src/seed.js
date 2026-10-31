import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDatabase, disconnectDatabase } from "./db.js";
import { Category, DailySpecial, ItemStock, MenuItem, User } from "./models.js";

await connectDatabase();

try {
  const categories = await Promise.all([
    ["Breakfast", "Fresh starts and morning favorites"],
    ["Meals", "Hearty meals prepared fresh"],
    ["Snacks", "Quick bites between classes"],
    ["Drinks", "Cold and hot refreshments"],
  ].map(([name, description]) => Category.findOneAndUpdate(
    { name },
    { $setOnInsert: { name, description } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )));
  const menu = [
    { name: "Masala Dosa", category: "Breakfast", price: 65, description: "Crispy rice crepe with spiced potato, coconut chutney and sambar.", imageUrl: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=1000&q=85" },
    { name: "Veg Thali", category: "Meals", price: 120, description: "A balanced meal with seasonal vegetables, rice, dal, roti and pickle.", imageUrl: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=85" },
    { name: "Paneer Wrap", category: "Snacks", price: 85, description: "Grilled paneer, crunchy vegetables and mint yogurt in a soft wrap.", imageUrl: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=1000&q=85" },
    { name: "Filter Coffee", category: "Drinks", price: 30, description: "South Indian filter coffee, freshly brewed and served hot.", imageUrl: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=1000&q=85" },
    { name: "Fresh Lime Soda", category: "Drinks", price: 40, description: "Fresh lime, soda and a hint of mint. Choose sweet or salted.", imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765edfd7?auto=format&fit=crop&w=1000&q=85" },
    { name: "Samosa", category: "Snacks", price: 25, description: "Golden pastry filled with spiced potato and peas.", imageUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1000&q=85" },
  ];
  for (const data of menu) {
    const category = categories.find((entry) => entry.name === data.category);
    const { category: _categoryName, ...details } = data;
    const item = await MenuItem.findOneAndUpdate(
      { name: data.name },
      { $setOnInsert: { ...details, category: category._id, isAvailable: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    await ItemStock.findOneAndUpdate(
      { menuItem: item._id },
      { $setOnInsert: { menuItem: item._id, quantityAvailable: 40 } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const email = process.env.ADMIN_EMAIL.toLowerCase();
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
    await User.findOneAndUpdate(
      { email },
      { $setOnInsert: { name: process.env.ADMIN_NAME || "Canteen Administrator", email, passwordHash, role: "admin" } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    console.log(`Administrator ready: ${email}`);
  } else {
    console.log("Set ADMIN_EMAIL and ADMIN_PASSWORD to create the demo administrator.");
  }
  const today = new Date();
  const specialDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const dosa = await MenuItem.findOne({ name: "Masala Dosa" });
  await DailySpecial.findOneAndUpdate(
    { menuItem: dosa._id, specialDate },
    { $setOnInsert: { menuItem: dosa._id, specialDate, specialPrice: 55, description: "Today's breakfast favorite, at a special price." } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log("Demo categories, menu, stock, and today's special are ready.");
} finally {
  await disconnectDatabase();
}
