# Canteen API

Base URL: `http://localhost:5000/api`. Protected calls use `Authorization: Bearer <JWT>`. JSON errors use `{ "error": "..." }`; validation errors also include `details`. List endpoints accept `page` (default 1) and `limit` (default 20, max 100).

## Authentication

- `POST /auth/register` — `{ "name": "A Student", "email": "student@example.com", "password": "StrongPass123" }`
- `POST /auth/login` — `{ "email": "student@example.com", "password": "StrongPass123" }`
- `GET /auth/me` — current account

Registration always creates a customer account. Create the initial administrator with the seed command and backend environment variables; never accept a role from a public registration request.

## Menu and management

- `GET /menu?search=dosa&category=<id>&page=1&limit=20` — available items; admins may set `available=false` to include unavailable entries.
- `GET /menu/:id`
- Admin: `POST /menu`, `PUT /menu/:id`, `DELETE /menu/:id`
- `GET /categories`; admin `POST /categories`, `PUT /categories/:id`, `DELETE /categories/:id`
- `GET /specials` — today's specials; admin `GET /specials/manage`, `POST /specials`, `PUT /specials/:id`, `DELETE /specials/:id`
- Admin: `GET /stock`, `POST /stock`, `PUT /stock/:id`, `DELETE /stock/:id`

Menu body: `{ "category": "<category id>", "name": "Masala Dosa", "description": "...", "price": 65, "imageUrl": "", "isAvailable": true }`. Stock body: `{ "menuItem": "<menu item id>", "quantityAvailable": 25 }`.

## Orders and bills

- Customer `POST /orders` — `{ "items": [{ "menuItem": "<id>", "quantity": 2 }] }`. Prices and totals are always read/calculated on the server.
- `GET /orders`, `GET /orders/:id` — customer-scoped; admins see all. Admin list filters include `status`, `token`, and `date=YYYY-MM-DD`.
- Customer `POST /orders/:id/cancel` — only Pending or Confirmed orders can be cancelled; stock is released.
- Admin `PATCH /orders/:id/status` — `{ "status": "Preparing" }`, permitted values Pending, Confirmed, Preparing, Ready, Completed, Cancelled. Closing/cancelling also updates the kitchen queue; cancellation restores inventory.
- `GET /bills`, `GET /bills/:id` — customer bills are ownership-scoped; admins see all.
- Admin `PATCH /bills/:id` — `{ "paymentStatus": "Voided" }` only after the linked order is cancelled. Admin `DELETE /bills/:id` is also limited to cancelled orders. Bills are immutable snapshots otherwise; payment cannot be marked Paid without a real provider confirmation.
- Admin `GET /admin/dashboard`
- `GET /health`

Bills are immutable snapshots in this demo and payment is explicitly `Pending` with method `Simulated (college demo)`. There is no payment provider and no endpoint claims a payment is complete. Order placement uses a MongoDB transaction; therefore the database must support transactions (MongoDB Atlas or a local replica set, not a standalone mongod).

## Postman smoke test

1. Import `postman_collection.json` and set collection variable `baseUrl` to the backend API URL.
2. Register a customer, then set `customerToken` to the returned `token`.
3. Log in using the seeded admin and set `adminToken` to the returned `token`.
4. As admin, create a category and menu item; create stock for that item's ID.
5. As customer, create an order using the item's ID. Verify order number/token/amount in the response.
6. Refresh `GET /orders`, `GET /bills`, and `GET /menu`; confirm order/bill exist and stock was reduced.
7. As admin, update the order status, then verify the customer tracking view reflects it.
8. Try admin routes without a token (401), with the customer token (403), and try reading another customer's bill (404).
9. Run `npm test` from the backend workspace with `MONGODB_URI` set to a transaction-capable test database for the automated API integration test.
