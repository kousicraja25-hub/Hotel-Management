# Smart Canteen Management System

A full-stack canteen ordering and administration website. The React client uses an Express REST API; MongoDB is the source of truth for users, menu data, inventory, orders, kitchen tokens, and bills. The API can run as Vercel serverless functions alongside the Vite website.

## Project structure

```text
api/                 Vercel serverless API entry point
backend/src/         Express API, MongoDB models, and database connection
backend/test/        API integration tests
frontend/            React + Vite customer and administrator application
vercel.json          Vercel build, function, and SPA routing configuration
```

## Requirements

- Node.js 20 or newer and npm
- MongoDB Atlas database for deployment (MongoDB replica set / Atlas is required for transactions)

## Run locally

1. Create a MongoDB Atlas cluster and database user, or use a local MongoDB replica set. Add your development IP address to Atlas Network Access.
2. Copy `backend/.env.example` to `backend/.env`; set `MONGODB_URI`, a random `JWT_SECRET` of at least 32 characters, and a private admin password. The example values are placeholders, not working credentials.
3. Copy `frontend/.env.example` to `frontend/.env`. Its API URL points to the local backend.
4. From the project root:

   ```sh
   npm install
   npm run seed --workspace backend
   npm run dev --workspace backend
   ```

5. In another terminal, start Vite:

   ```sh
   npm run dev --workspace frontend
   ```

The website is at `http://localhost:5173`; the API health check is `http://localhost:5000/api/health`. The seed command idempotently adds demo menu/categories/stock/special and creates the admin account from the backend environment variables. Admin registration is not public.

MongoDB collections and indexes are defined by the Mongoose models in `backend/src/models.js`; unlike the original PostgreSQL version, there are no SQL migration scripts.

The customer and administrator sign-in/registration pages have been removed from the website. Protected checkout, order history, tracking, bills, and admin pages remain blocked unless a valid session already exists; use API tooling to register/login when testing those flows.

## Deploy the website and API to Vercel

1. Push this project to a Git provider and import the repository into Vercel. Keep the **project root at the repository root** so Vercel can use the npm workspaces.
2. Create a MongoDB Atlas cluster. Allow network access from Vercel (Atlas supports allowing access from anywhere; use strong database credentials and least privilege because Vercel function egress IPs can change). Atlas is the remote database; Vercel's filesystem and function memory are not used for persistence.
3. In Vercel **Project → Settings → Environment Variables**, add:
   - `MONGODB_URI` — Atlas connection string for the database
   - `JWT_SECRET` — unique random secret of at least 32 characters
   - `FRONTEND_URL` — the exact deployed website origin, e.g. `https://your-project.vercel.app`
   - `NODE_ENV` — `production`
   - `TAX_RATE` — optional, defaults to `0.05`
   - `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` — optional, only needed when running the seed script to provision an administrator
4. Leave the Vercel build command as configured by `vercel.json` (`npm run build`) and output directory `frontend/dist`. The API function is exposed under `/api/*`; the frontend defaults to the same-origin `/api`, so no API URL or cross-origin setup is needed on Vercel.
5. Deploy. For initial sample data, run `npm run seed --workspace backend` once from a trusted local machine with the production `MONGODB_URI` and seed admin environment values set, or seed a staging cluster first. Do not put database credentials in frontend `VITE_*` variables, source files, or client bundles.
6. Verify `https://your-project.vercel.app/api/health` reports `"status":"ok"` and `"database":"connected"`. Register a customer, place an order, and verify the same order/bill remains after refreshing the page and redeploying. Vercel deployment is not performed automatically from this workspace; configure the Vercel project and credentials to publish it.

For local development only, `frontend/.env.example` points to `http://localhost:5000/api`. The deployed frontend uses `/api` on the same Vercel domain. The authentication token is held in session-scoped browser storage for login continuity; all application records are stored in MongoDB, not browser storage.

## Security and business behavior

- Customer registration only creates customer accounts; admin routes require a JWT with the admin role.
- Passwords are bcrypt-hashed. MongoDB queries use Mongoose filters and schemas; request bodies are validated.
- Order totals are calculated by the API from current menu prices. Stock deduction, unique kitchen token allocation, order, kitchen queue, and bill creation are committed in a MongoDB transaction. Use Atlas or a transaction-capable MongoDB replica set.
- Customers can only read their own orders and bills. Cancellation is limited to Pending/Confirmed orders and returns reserved stock.
- Bills are immutable order-time snapshots. Payment is explicitly labelled `Pending` and `Simulated (college demo)`; there is no payment provider or card data.
- Administrators can void or delete bills only after the linked order is cancelled; ordinary order-time billing snapshots cannot be edited or deleted.
- Set a restrictive Atlas database user, rotate secrets, and never commit `.env` files.

## API, tests, and demonstration

See [backend/API.md](./backend/API.md) for routes, request examples, and Postman instructions. Import [backend/postman_collection.json](./backend/postman_collection.json) to exercise the API. With `MONGODB_URI` and `JWT_SECRET` set to a transaction-capable test database, run:

```sh
npm test --workspace backend
npm run build
```

### College evaluation checklist

- [ ] Confirm health reports a live MongoDB connection.
- [ ] Register/login as a customer; confirm invalid credentials and unauthorized admin requests are rejected.
- [ ] Search and filter the menu, view today's special, and verify unavailable/out-of-stock items cannot be ordered.
- [ ] Place an order; verify server-calculated totals, stock reduction, unique order number/token, kitchen queue, and bill.
- [ ] Refresh the browser and verify menu/orders/bills are reloaded from the API and MongoDB.
- [ ] As admin, CRUD menu items, categories, specials, and stock; manage orders and view billing records.
- [ ] Confirm one customer cannot access another customer's orders or bills, and cancellation is denied after preparation starts.
- [ ] Check the responsive website on mobile, tablet, and desktop.
- [ ] Redeploy the Vercel project and confirm records persist in MongoDB Atlas.
# Hotel-Management
