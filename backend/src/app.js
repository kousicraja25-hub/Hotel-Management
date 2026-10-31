import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { z, ZodError } from "zod";
import { connectDatabase } from "./db.js";
import { Bill, Category, DailySpecial, ItemStock, KitchenQueue, MenuItem, Order, Sequence, User } from "./models.js";

const app = express();
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID");
const idParams = z.object({ id: objectId });
const pageParams = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
const safeUser = (user) => ({ id: user._id, name: user.name, email: user.email, role: user.role });

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    const allowed = [process.env.FRONTEND_URL || "http://localhost:5173", "http://localhost:5173"];
    if (!origin || allowed.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS"));
  },
  credentials: false,
}));
app.use(express.json({ limit: "1mb" }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }));

function requireAuth(req, _res, next) {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return next(new HttpError(401, "Authentication required"));
  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired token"));
  }
}

const requireAdmin = (req, _res, next) => {
  if (req.auth?.role !== "admin") return next(new HttpError(403, "Administrator access required"));
  next();
};

const parseBody = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) return next(result.error);
  req.body = result.data;
  next();
};

const categoryInput = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).default(""),
});
const menuInput = z.object({
  category: objectId,
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).default(""),
  price: z.number().finite().min(0),
  imageUrl: z.string().trim().url().or(z.literal("")).default(""),
  isAvailable: z.boolean().default(true),
});
const specialInput = z.object({
  menuItem: objectId,
  specialDate: z.coerce.date(),
  specialPrice: z.number().finite().min(0).nullable().default(null),
  description: z.string().trim().max(500).default(""),
});
const stockInput = z.object({
  menuItem: objectId,
  quantityAvailable: z.number().int().min(0),
});

app.get("/api/health", asyncRoute(async (_req, res) => {
  if (!process.env.MONGODB_URI) {
    return res.status(503).json({ status: "error", database: "not configured", error: "Set MONGODB_URI in the backend environment." });
  }
  if (mongoose.connection.readyState !== 1) {
    try {
      await connectDatabase();
    } catch {
      return res.status(503).json({ status: "error", database: "unavailable", error: "MongoDB could not be reached. Check the connection string and Atlas network access." });
    }
  }
  res.json({ status: "ok", database: "connected", timestamp: new Date().toISOString() });
}));

const requireDatabase = asyncRoute(async (_req, _res, next) => {
  await connectDatabase();
  next();
});
app.use("/api", (req, res, next) => {
  if (req.path === "/health") return next();
  requireDatabase(req, res, next);
});

app.post("/api/auth/register", parseBody(z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(72),
})), asyncRoute(async (req, res) => {
  const email = req.body.email.toLowerCase();
  if (await User.exists({ email })) throw new HttpError(409, "An account with this email already exists");
  const user = await User.create({ name: req.body.name, email, passwordHash: await bcrypt.hash(req.body.password, 12) });
  res.status(201).json({ user: safeUser(user), token: issueToken(user) });
}));

app.post("/api/auth/login", parseBody(z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(72),
})), asyncRoute(async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) throw new HttpError(401, "Email or password is incorrect");
  res.json({ user: safeUser(user), token: issueToken(user) });
}));

function issueToken(user) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET must be at least 32 characters");
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "12h" });
}

app.get("/api/auth/me", requireAuth, asyncRoute(async (req, res) => {
  const user = await User.findById(req.auth.sub);
  if (!user) throw new HttpError(401, "Account no longer exists");
  res.json({ user: safeUser(user) });
}));

app.get("/api/categories", asyncRoute(async (_req, res) => {
  res.json({ categories: await Category.find().sort({ name: 1 }).lean() });
}));
app.post("/api/categories", requireAuth, requireAdmin, parseBody(categoryInput), asyncRoute(async (req, res) => {
  res.status(201).json({ category: await Category.create(req.body) });
}));
app.put("/api/categories/:id", requireAuth, requireAdmin, parseBody(categoryInput), asyncRoute(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!category) throw new HttpError(404, "Category not found");
  res.json({ category });
}));
app.delete("/api/categories/:id", requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new HttpError(404, "Category not found");
  if (await MenuItem.exists({ category: category._id })) throw new HttpError(409, "Move or remove this category's menu items first");
  await category.deleteOne();
  res.json({ message: "Category deleted" });
}));

app.get("/api/menu", asyncRoute(async (req, res) => {
  const { page, limit } = pageParams.parse(req.query);
  const filter = {};
  if (req.query.available !== "false") filter.isAvailable = true;
  if (req.query.category && objectId.safeParse(req.query.category).success) filter.category = req.query.category;
  if (req.query.search) filter.name = { $regex: String(req.query.search).slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  const [items, total] = await Promise.all([
    MenuItem.find(filter).populate("category", "name").sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    MenuItem.countDocuments(filter),
  ]);
  const stocks = await ItemStock.find({ menuItem: { $in: items.map((item) => item._id) } }).lean();
  const stockByItem = new Map(stocks.map((stock) => [String(stock.menuItem), stock.quantityAvailable]));
  res.json({ items: items.map((item) => ({ ...item, stockQuantity: stockByItem.get(String(item._id)) ?? 0 })), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));
app.get("/api/menu/:id", asyncRoute(async (req, res) => {
  const item = await MenuItem.findById(req.params.id).populate("category", "name").lean();
  if (!item) throw new HttpError(404, "Menu item not found");
  const stock = await ItemStock.findOne({ menuItem: item._id }).lean();
  res.json({ item: { ...item, stockQuantity: stock?.quantityAvailable ?? 0 } });
}));
app.post("/api/menu", requireAuth, requireAdmin, parseBody(menuInput), asyncRoute(async (req, res) => {
  if (!(await Category.exists({ _id: req.body.category }))) throw new HttpError(400, "Category not found");
  const item = await MenuItem.create(req.body);
  await ItemStock.create({ menuItem: item._id, quantityAvailable: 0 });
  res.status(201).json({ item });
}));
app.put("/api/menu/:id", requireAuth, requireAdmin, parseBody(menuInput), asyncRoute(async (req, res) => {
  if (!(await Category.exists({ _id: req.body.category }))) throw new HttpError(400, "Category not found");
  const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!item) throw new HttpError(404, "Menu item not found");
  res.json({ item });
}));
app.delete("/api/menu/:id", requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const item = await MenuItem.findById(req.params.id);
  if (!item) throw new HttpError(404, "Menu item not found");
  await Promise.all([
    ItemStock.deleteOne({ menuItem: item._id }),
    DailySpecial.deleteMany({ menuItem: item._id }),
    item.deleteOne(),
  ]);
  res.json({ message: "Menu item deleted" });
}));

app.get("/api/specials", asyncRoute(async (_req, res) => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start.getTime() + 86400000);
  const specials = await DailySpecial.find({ specialDate: { $gte: start, $lt: end } }).populate({ path: "menuItem", populate: { path: "category", select: "name" } }).sort({ createdAt: -1 }).lean();
  const stocks = await ItemStock.find({ menuItem: { $in: specials.map((special) => special.menuItem?._id).filter(Boolean) } }).lean();
  const stockByItem = new Map(stocks.map((stock) => [String(stock.menuItem), stock.quantityAvailable]));
  res.json({ specials: specials.map((special) => ({
    ...special,
    menuItem: special.menuItem ? { ...special.menuItem, stockQuantity: stockByItem.get(String(special.menuItem._id)) ?? 0 } : null,
  })) });
}));
app.get("/api/specials/manage", requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const { page, limit } = pageParams.parse(req.query);
  const [specials, total] = await Promise.all([
    DailySpecial.find().populate("menuItem", "name price").sort({ specialDate: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    DailySpecial.countDocuments(),
  ]);
  res.json({ specials, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));
app.post("/api/specials", requireAuth, requireAdmin, parseBody(specialInput), asyncRoute(async (req, res) => {
  if (!(await MenuItem.exists({ _id: req.body.menuItem }))) throw new HttpError(400, "Menu item not found");
  res.status(201).json({ special: await DailySpecial.create(req.body) });
}));
app.put("/api/specials/:id", requireAuth, requireAdmin, parseBody(specialInput), asyncRoute(async (req, res) => {
  if (!(await MenuItem.exists({ _id: req.body.menuItem }))) throw new HttpError(400, "Menu item not found");
  const special = await DailySpecial.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!special) throw new HttpError(404, "Special not found");
  res.json({ special });
}));
app.delete("/api/specials/:id", requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const result = await DailySpecial.findByIdAndDelete(req.params.id);
  if (!result) throw new HttpError(404, "Special not found");
  res.json({ message: "Special deleted" });
}));

app.get("/api/stock", requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const { page, limit } = pageParams.parse(req.query);
  const [stock, total] = await Promise.all([
    ItemStock.find().populate("menuItem", "name price isAvailable").sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ItemStock.countDocuments(),
  ]);
  res.json({ stock, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));
app.post("/api/stock", requireAuth, requireAdmin, parseBody(stockInput), asyncRoute(async (req, res) => {
  if (!(await MenuItem.exists({ _id: req.body.menuItem }))) throw new HttpError(400, "Menu item not found");
  res.status(201).json({ stock: await ItemStock.create(req.body) });
}));
app.put("/api/stock/:id", requireAuth, requireAdmin, parseBody(stockInput), asyncRoute(async (req, res) => {
  if (!(await MenuItem.exists({ _id: req.body.menuItem }))) throw new HttpError(400, "Menu item not found");
  const stock = await ItemStock.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!stock) throw new HttpError(404, "Stock record not found");
  res.json({ stock });
}));
app.delete("/api/stock/:id", requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const result = await ItemStock.findByIdAndDelete(req.params.id);
  if (!result) throw new HttpError(404, "Stock record not found");
  res.json({ message: "Stock record deleted" });
}));

const orderInput = z.object({
  items: z.array(z.object({ menuItem: objectId, quantity: z.number().int().min(1).max(50) })).min(1).max(30),
});
app.post("/api/orders", requireAuth, parseBody(orderInput), asyncRoute(async (req, res) => {
  const ids = req.body.items.map((item) => item.menuItem);
  if (new Set(ids).size !== ids.length) throw new HttpError(400, "Combine duplicate menu items into a single quantity");
  const session = await mongoose.startSession();
  let createdOrder;
  let createdBill;
  try {
    await session.withTransaction(async () => {
      const menuItems = await MenuItem.find({ _id: { $in: ids }, isAvailable: true }).session(session);
      if (menuItems.length !== ids.length) throw new HttpError(400, "One or more items are unavailable");
      const itemMap = new Map(menuItems.map((item) => [String(item._id), item]));
      let subtotal = 0;
      const orderItems = [];
      for (const requested of req.body.items) {
        const menuItem = itemMap.get(requested.menuItem);
        const stock = await ItemStock.findOneAndUpdate(
          { menuItem: menuItem._id, quantityAvailable: { $gte: requested.quantity } },
          { $inc: { quantityAvailable: -requested.quantity } },
          { new: true, session },
        );
        if (!stock) throw new HttpError(409, `${menuItem.name} is out of stock or has insufficient quantity`);
        const lineTotal = Number((menuItem.price * requested.quantity).toFixed(2));
        subtotal += lineTotal;
        orderItems.push({ menuItem: menuItem._id, itemNameSnapshot: menuItem.name, unitPrice: menuItem.price, quantity: requested.quantity, lineTotal });
      }
      subtotal = Number(subtotal.toFixed(2));
      const taxRate = Number(process.env.TAX_RATE ?? 0.05);
      if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 1) throw new Error("TAX_RATE must be between 0 and 1");
      const tax = Number((subtotal * taxRate).toFixed(2));
      const totalAmount = Number((subtotal + tax).toFixed(2));
      const tokenSequence = await Sequence.findOneAndUpdate({ _id: "kitchen-token" }, { $inc: { value: 1 } }, { upsert: true, new: true, session });
      const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
      [createdOrder] = await Order.create([{
        orderNumber, customer: req.auth.sub, tokenNumber: tokenSequence.value, status: "Pending",
        items: orderItems, subtotal, tax, totalAmount,
      }], { session });
      await KitchenQueue.create([{ order: createdOrder._id, tokenNumber: tokenSequence.value, queueStatus: "Pending" }], { session });
      const billNumber = `BILL-${orderNumber.slice(4)}`;
      [createdBill] = await Bill.create([{
        order: createdOrder._id, billNumber, subtotal, tax, totalAmount,
        paymentMethod: "Simulated (college demo)", paymentStatus: "Pending",
      }], { session });
    });
  } finally {
    await session.endSession();
  }
  res.status(201).json({ order: createdOrder, bill: createdBill, message: "Order placed. Payment is pending and simulated for this demo." });
}));

app.get("/api/orders", requireAuth, asyncRoute(async (req, res) => {
  const { page, limit } = pageParams.parse(req.query);
  const filter = req.auth.role === "admin" ? {} : { customer: req.auth.sub };
  if (req.query.status) filter.status = String(req.query.status);
  if (req.auth.role === "admin" && req.query.token) filter.tokenNumber = Number(req.query.token);
  if (req.auth.role === "admin" && req.query.date) {
    const date = new Date(String(req.query.date));
    if (!Number.isNaN(date.valueOf())) {
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      filter.createdAt = { $gte: date, $lt: end };
    }
  }
  const [orders, total] = await Promise.all([
    Order.find(filter).populate("customer", "name email").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);
  res.json({ orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));
app.get("/api/orders/:id", requireAuth, asyncRoute(async (req, res) => {
  const filter = { _id: req.params.id };
  if (req.auth.role !== "admin") filter.customer = req.auth.sub;
  const order = await Order.findOne(filter).populate("customer", "name email").lean();
  if (!order) throw new HttpError(404, "Order not found");
  res.json({ order });
}));
const validStatuses = ["Pending", "Confirmed", "Preparing", "Ready", "Completed", "Cancelled"];
app.patch("/api/orders/:id/status", requireAuth, requireAdmin, parseBody(z.object({ status: z.enum(validStatuses) })), asyncRoute(async (req, res) => {
  const session = await mongoose.startSession();
  let order;
  try {
    await session.withTransaction(async () => {
      order = await Order.findById(req.params.id).session(session);
      if (!order) throw new HttpError(404, "Order not found");
      if (order.status === "Completed" || order.status === "Cancelled") throw new HttpError(409, "This order is already closed");
      if (req.body.status === "Pending") throw new HttpError(400, "Orders cannot move back to Pending");
      if (req.body.status === "Cancelled") {
        for (const item of order.items) {
          await ItemStock.findOneAndUpdate({ menuItem: item.menuItem }, { $inc: { quantityAvailable: item.quantity } }, { upsert: true, new: true, session });
        }
      }
      order.status = req.body.status;
      await order.save({ session });
      await KitchenQueue.findOneAndUpdate({ order: order._id }, { queueStatus: order.status }, { session });
    });
  } finally {
    await session.endSession();
  }
  res.json({ order });
}));
app.post("/api/orders/:id/cancel", requireAuth, asyncRoute(async (req, res) => {
  const session = await mongoose.startSession();
  let order;
  try {
    await session.withTransaction(async () => {
      order = await Order.findOne({ _id: req.params.id, customer: req.auth.sub }).session(session);
      if (!order) throw new HttpError(404, "Order not found");
      if (!["Pending", "Confirmed"].includes(order.status)) throw new HttpError(409, "Order can no longer be cancelled");
      for (const item of order.items) {
        await ItemStock.findOneAndUpdate({ menuItem: item.menuItem }, { $inc: { quantityAvailable: item.quantity } }, { upsert: true, new: true, session });
      }
      order.status = "Cancelled";
      await order.save({ session });
      await KitchenQueue.findOneAndUpdate({ order: order._id }, { queueStatus: "Cancelled" }, { session });
    });
  } finally {
    await session.endSession();
  }
  res.json({ order });
}));

app.get("/api/bills", requireAuth, asyncRoute(async (req, res) => {
  const { page, limit } = pageParams.parse(req.query);
  const filter = {};
  if (req.auth.role !== "admin") {
    const customerOrders = await Order.find({ customer: req.auth.sub }).select("_id");
    filter.order = { $in: customerOrders.map((order) => order._id) };
  }
  const [bills, total] = await Promise.all([
    Bill.find(filter).populate({ path: "order", select: "orderNumber tokenNumber customer status createdAt", ...(req.auth.role === "admin" ? { populate: { path: "customer", select: "name email" } } : {}) }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Bill.countDocuments(filter),
  ]);
  res.json({ bills, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));
app.get("/api/bills/:id", requireAuth, asyncRoute(async (req, res) => {
  const bill = await Bill.findOne({ $or: [{ _id: req.params.id }, { order: req.params.id }] }).populate({ path: "order", select: "orderNumber tokenNumber customer status items createdAt" }).lean();
  if (!bill) throw new HttpError(404, "Bill not found");
  if (req.auth.role !== "admin" && String(bill.order.customer) !== req.auth.sub) throw new HttpError(404, "Bill not found");
  res.json({ bill });
}));

app.patch("/api/bills/:id", requireAuth, requireAdmin, parseBody(z.object({ paymentStatus: z.literal("Voided") })), asyncRoute(async (req, res) => {
  const bill = await Bill.findById(req.params.id).populate("order");
  if (!bill) throw new HttpError(404, "Bill not found");
  if (bill.order.status !== "Cancelled") throw new HttpError(409, "A bill can only be voided after its order is cancelled");
  bill.paymentStatus = req.body.paymentStatus;
  await bill.save();
  res.json({ bill });
}));

app.delete("/api/bills/:id", requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const bill = await Bill.findById(req.params.id).populate("order");
  if (!bill) throw new HttpError(404, "Bill not found");
  if (bill.order.status !== "Cancelled") throw new HttpError(409, "Only bills for cancelled orders can be deleted");
  await bill.deleteOne();
  res.json({ message: "Bill deleted" });
}));

app.get("/api/admin/dashboard", requireAuth, requireAdmin, asyncRoute(async (_req, res) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const [totalOrders, pendingOrders, availableMenuItems, sales] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ status: { $in: ["Pending", "Confirmed", "Preparing"] } }),
    MenuItem.countDocuments({ isAvailable: true }),
    Order.aggregate([{ $match: { createdAt: { $gte: start }, status: { $ne: "Cancelled" } } }, { $group: { _id: null, total: { $sum: "$totalAmount" } } }]),
  ]);
  res.json({ totalOrders, todaySales: sales[0]?.total ?? 0, pendingOrders, availableMenuItems });
}));

app.use((_req, _res, next) => next(new HttpError(404, "Route not found")));
app.use((error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: "Validation failed", details: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) });
  }
  if (error?.code === 11000) return res.status(409).json({ error: "A record with that unique value already exists" });
  if (error instanceof mongoose.Error.CastError) return res.status(400).json({ error: "Invalid identifier or value" });
  if (error instanceof mongoose.Error.ValidationError) return res.status(400).json({ error: error.message });
  const status = error.status || (error.message === "MONGODB_URI is required" ? 503 : 500);
  if (status >= 500) console.error("API error:", { name: error.name, code: error.code || "UNEXPECTED" });
  const message = status === 503 && error.message === "MONGODB_URI is required"
    ? "MongoDB is not configured. Set MONGODB_URI in the backend environment."
    : status >= 500 ? "Internal server error" : error.message;
  res.status(status).json({ error: message });
});

export default app;
