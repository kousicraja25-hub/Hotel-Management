import mongoose from "mongoose";

const { Schema, model } = mongoose;
const timestamps = { timestamps: true, versionKey: false };

export const User = model("User", new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["customer", "admin"], default: "customer", required: true },
}, timestamps));

export const Category = model("Category", new Schema({
  name: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
  description: { type: String, trim: true, maxlength: 500, default: "" },
}, timestamps));

const menuItemSchema = new Schema({
  category: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 1000, default: "" },
  price: { type: Number, required: true, min: 0 },
  imageUrl: { type: String, trim: true, default: "" },
  isAvailable: { type: Boolean, default: true, index: true },
}, timestamps);
menuItemSchema.index({ name: "text", description: "text" });
export const MenuItem = model("MenuItem", menuItemSchema);

const dailySpecialSchema = new Schema({
  menuItem: { type: Schema.Types.ObjectId, ref: "MenuItem", required: true },
  specialDate: { type: Date, required: true, index: true },
  specialPrice: { type: Number, min: 0, default: null },
  description: { type: String, trim: true, maxlength: 500, default: "" },
}, timestamps);
dailySpecialSchema.index({ menuItem: 1, specialDate: 1 }, { unique: true });
export const DailySpecial = model("DailySpecial", dailySpecialSchema);

export const ItemStock = model("ItemStock", new Schema({
  menuItem: { type: Schema.Types.ObjectId, ref: "MenuItem", required: true, unique: true },
  quantityAvailable: { type: Number, required: true, min: 0, default: 0 },
}, timestamps));

const OrderItemSchema = new Schema({
  menuItem: { type: Schema.Types.ObjectId, ref: "MenuItem", required: true },
  itemNameSnapshot: { type: String, required: true },
  unitPrice: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
  lineTotal: { type: Number, required: true, min: 0 },
}, { _id: false });

export const Order = model("Order", new Schema({
  orderNumber: { type: String, required: true, unique: true, index: true },
  customer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tokenNumber: { type: Number, required: true, index: true },
  status: { type: String, enum: ["Pending", "Confirmed", "Preparing", "Ready", "Completed", "Cancelled"], default: "Pending", index: true },
  items: { type: [OrderItemSchema], required: true, validate: [(v) => v.length > 0, "Order must include an item"] },
  subtotal: { type: Number, required: true, min: 0 },
  tax: { type: Number, required: true, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
}, timestamps).index({ createdAt: -1 }));

export const KitchenQueue = model("KitchenQueue", new Schema({
  order: { type: Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
  tokenNumber: { type: Number, required: true, index: true },
  queueStatus: { type: String, enum: ["Pending", "Confirmed", "Preparing", "Ready", "Completed", "Cancelled"], default: "Pending", index: true },
}, timestamps));

export const Bill = model("Bill", new Schema({
  order: { type: Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
  billNumber: { type: String, required: true, unique: true },
  subtotal: { type: Number, required: true, min: 0 },
  tax: { type: Number, required: true, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  paymentMethod: { type: String, default: "Simulated (college demo)", maxlength: 80 },
  paymentStatus: { type: String, enum: ["Pending", "Voided"], default: "Pending" },
}, timestamps));

export const Sequence = model("Sequence", new Schema({
  _id: { type: String, required: true },
  value: { type: Number, default: 0 },
}));
