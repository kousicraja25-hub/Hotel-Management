import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/db.js";
import { Bill, Category, ItemStock, KitchenQueue, MenuItem, Order, User } from "../src/models.js";

test("authenticated order flow, stock reservation, kitchen token, and bill", { skip: !process.env.MONGODB_URI }, async (t) => {
  await connectDatabase();
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const marker = `test-${Date.now()}@example.test`;
  const otherMarker = `other-${marker}`;
  let category;
  let menuItem;
  let customer;
  let admin;
  const orders = [];
  let bill;
  t.after(async () => {
    if (orders.length) {
      await Bill.deleteMany({ order: { $in: orders.map((entry) => entry._id) } });
      await KitchenQueue.deleteMany({ order: { $in: orders.map((entry) => entry._id) } });
      await Order.deleteMany({ _id: { $in: orders.map((entry) => entry._id) } });
    }
    if (menuItem) {
      await ItemStock.deleteMany({ menuItem: menuItem._id });
      await MenuItem.deleteMany({ _id: menuItem._id });
    }
    if (category) await Category.deleteMany({ _id: category._id });
    await User.deleteMany({ email: { $in: [marker, `admin-${marker}`, otherMarker] } });
    await new Promise((resolve) => server.close(resolve));
    await disconnectDatabase();
  });

  const request = async (path, { method = "GET", token, body } = {}) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { ...(body ? { "content-type": "application/json" } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, data: await response.json() };
  };

  const registration = await request("/auth/register", {
    method: "POST",
    body: { name: "Test Customer", email: marker, password: "StrongPassword123" },
  });
  assert.equal(registration.status, 201);
  const customerToken = registration.data.token;
  const customerId = registration.data.user.id;
  assert.equal((await request("/auth/login", { method: "POST", body: { email: marker, password: "StrongPassword123" } })).status, 200);

  const unauthenticated = await request("/stock");
  assert.equal(unauthenticated.status, 401);
  assert.equal((await request("/stock", { token: customerToken })).status, 403);

  admin = await User.create({ name: "Test Admin", email: `admin-${marker}`, role: "admin", passwordHash: await bcrypt.hash("StrongPassword123", 10) });
  const adminToken = jwt.sign({ sub: admin.id, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "5m" });
  category = (await request("/categories", { method: "POST", token: adminToken, body: { name: `Test ${Date.now()}`, description: "API test" } })).data.category;
  menuItem = (await request("/menu", {
    method: "POST", token: adminToken,
    body: { category: String(category._id), name: `Test item ${Date.now()}`, description: "Test", price: 10, imageUrl: "", isAvailable: true },
  })).data.item;
  const menuRead = await request("/menu");
  assert.equal(menuRead.status, 200);
  assert.equal(menuRead.data.items.some((entry) => entry._id === String(menuItem._id)), true);
  const menuUpdate = await request(`/menu/${menuItem._id}`, {
    method: "PUT", token: adminToken,
    body: { category: String(category._id), name: menuItem.name, description: "Updated test item", price: 12, imageUrl: "", isAvailable: true },
  });
  assert.equal(menuUpdate.status, 200);
  await ItemStock.findOneAndUpdate({ menuItem: menuItem._id }, { quantityAvailable: 5 }, { upsert: true });

  const orderResponse = await request("/orders", { method: "POST", token: customerToken, body: { items: [{ menuItem: String(menuItem._id), quantity: 2 }] } });
  assert.equal(orderResponse.status, 201);
  const order = orderResponse.data.order;
  orders.push(order);
  bill = orderResponse.data.bill;
  assert.equal(order.customer, customerId);
  assert.equal(order.tokenNumber > 0, true);
  assert.equal(order.totalAmount, 25.2);
  assert.equal((await ItemStock.findOne({ menuItem: menuItem._id })).quantityAvailable, 3);
  assert.equal(await Bill.exists({ order: order._id }), true);
  assert.equal((await request("/orders", { method: "POST", token: customerToken, body: { items: [{ menuItem: String(menuItem._id), quantity: 0 }] } })).status, 400);
  assert.equal((await request("/orders", { method: "POST", token: customerToken, body: { items: [{ menuItem: String(menuItem._id), quantity: 4 }] } })).status, 409);
  assert.equal((await ItemStock.findOne({ menuItem: menuItem._id })).quantityAvailable, 3);
  assert.equal((await request(`/orders/${order.id}`, { token: customerToken })).status, 200);

  const otherRegistration = await request("/auth/register", {
    method: "POST",
    body: { name: "Other Customer", email: otherMarker, password: "StrongPassword123" },
  });
  assert.equal((await request(`/orders/${order.id}`, { token: otherRegistration.data.token })).status, 404);
  assert.equal((await request(`/bills/${bill._id}`, { token: otherRegistration.data.token })).status, 404);
  assert.equal((await request(`/bills/${order.id}`, { token: customerToken })).status, 200);

  assert.equal((await request(`/orders/${order.id}/status`, { method: "PATCH", token: adminToken, body: { status: "Confirmed" } })).status, 200);
  assert.equal((await request(`/orders/${order.id}/cancel`, { method: "POST", token: customerToken })).status, 200);
  assert.equal((await ItemStock.findOne({ menuItem: menuItem._id })).quantityAvailable, 5);
  assert.equal((await request(`/bills/${bill._id}`, { method: "PATCH", token: adminToken, body: { paymentStatus: "Voided" } })).status, 200);
  assert.equal((await request(`/bills/${bill._id}`, { method: "DELETE", token: adminToken })).status, 200);

  const preparingResponse = await request("/orders", { method: "POST", token: customerToken, body: { items: [{ menuItem: String(menuItem._id), quantity: 1 }] } });
  assert.equal(preparingResponse.status, 201);
  orders.push(preparingResponse.data.order);
  assert.notEqual(preparingResponse.data.order.tokenNumber, order.tokenNumber);
  assert.equal((await request(`/orders/${preparingResponse.data.order._id}/status`, { method: "PATCH", token: adminToken, body: { status: "Preparing" } })).status, 200);
  assert.equal((await request(`/orders/${preparingResponse.data.order._id}/cancel`, { method: "POST", token: customerToken })).status, 409);
});
