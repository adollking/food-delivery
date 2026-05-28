# Food Delivery App

A full-stack food delivery application with JWT authentication, real-time delivery tracking, and API request logging.

**Stack:** React + Vite (frontend) · Express + MongoDB (backend) · Docker Compose

---

## Quick Start

### Option A — Docker (recommended, no local setup needed)

```bash
docker compose up --build
```

| Service  | URL                     |
|----------|-------------------------|
| Frontend | http://localhost        |
| Backend  | http://localhost:3000   |
| MongoDB  | localhost:27017         |

Set a custom JWT secret:
```bash
JWT_SECRET=your_secret docker compose up --build
```

---

### Option B — Run locally

**Prerequisites:** Node.js 18+, a MongoDB instance (local or Atlas)

#### 1. Backend

```bash
cd backend
```

Create `backend/.env`:
```env
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/foodweb?retryWrites=true&w=majority
JWT_SECRET=your_secret_here
PORT=3000
```

```bash
npm install
npm run dev        # auto-reload with nodemon → http://localhost:3000
# or
npm start          # production mode
```

#### 2. Frontend

```bash
# from repo root
npm install
npm run dev        # Vite dev server → http://localhost:5173
```

The Vite dev server proxies `/api/*` requests to the backend automatically (configured via nginx in Docker; point your frontend's fetch calls to `http://localhost:3000` when running locally without Docker).

---

## Running Tests

```bash
cd backend
npm test
```

Uses **Jest** + **Supertest** + **MongoDB Memory Server** (no real database needed). The in-memory server downloads a MongoDB binary on first run — this takes a minute the first time.

```bash
npm run test:watch   # re-run on file changes
```

---

## API Overview

Base URL: `http://localhost:3000/api`

All protected endpoints require:
```
Authorization: Bearer <token>
```

Obtain a token via `POST /api/auth/login` or `POST /api/auth/register`.

### Roles

| Role | Can do |
|---|---|
| `customer` | place orders, track deliveries |
| `restaurant_owner` | manage own restaurant, menu, and incoming orders |
| `driver` | update delivery location and status |
| `admin` | full access + view API logs |

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Create account |
| POST | `/auth/login` | — | Get JWT token |
| GET | `/auth/me` | any | Current user profile |
| GET | `/restaurants` | — | List all restaurants |
| POST | `/restaurants` | restaurant_owner | Create restaurant |
| PUT | `/restaurants/:id` | owner / admin | Update restaurant |
| DELETE | `/restaurants/:id` | owner / admin | Delete restaurant |
| GET | `/menu-items/restaurant/:id` | — | Menu for a restaurant |
| POST | `/menu-items` | restaurant_owner | Add menu item |
| PUT | `/menu-items/:id` | owner / admin | Update menu item |
| DELETE | `/menu-items/:id` | owner / admin | Delete menu item |
| POST | `/orders` | customer | Place an order |
| GET | `/orders/my` | customer | My orders |
| GET | `/orders/restaurant/:id` | restaurant_owner | Incoming orders |
| PATCH | `/orders/:id/status` | restaurant_owner | Advance order status |
| POST | `/deliveries` | restaurant_owner | Assign driver to order |
| GET | `/deliveries/order/:orderId` | any | Track delivery (map polling) |
| GET | `/deliveries/my` | driver | My assigned deliveries |
| PATCH | `/deliveries/:id/location` | driver | Push GPS coordinates |
| PATCH | `/deliveries/:id/status` | driver | Advance delivery status |
| GET | `/logs` | admin | Paginated API request logs |
| GET | `/logs/stats` | admin | Top routes / users / status codes |

### Order status flow

```
pending → confirmed → preparing → delivering → delivered
       ↘ cancelled  ↗ cancelled
```

### Delivery status flow

```
assigned → picked_up → on_the_way → arrived → delivered
```

When delivery reaches `delivered`, the linked order is automatically set to `delivered`.

---

## Delivery Tracking Map

Open `/track/:orderId` in the browser. The page polls the backend every 10 seconds and shows the driver's live position on an OpenStreetMap map (no API key required).

---

## Postman

Import both files from the `postman/` directory:

- `Food_Delivery_API.postman_collection.json`
- `Food_Delivery_Local.postman_environment.json`

Select the **Food Delivery – Local** environment. Calling **Auth → Login** auto-saves `{{token}}`; creating a restaurant, menu item, order, or delivery auto-saves the respective ID variable.

---

## Project Structure

```
/
├── src/                        # React frontend
│   ├── components/
│   │   └── DeliveryMap.jsx     # Leaflet map with live driver position
│   └── pages/
│       └── TrackDelivery.jsx   # Polling tracking page
├── backend/
│   ├── controllers/            # Business logic
│   ├── middleware/
│   │   ├── auth.js             # protect + requireRole
│   │   └── logger.js           # morgan + winston + MongoDB logging
│   ├── models/                 # Mongoose schemas
│   ├── routes/                 # Express routers
│   ├── __tests__/              # Jest test suite
│   └── app.js                  # Express app (no listen)
├── postman/                    # Postman collection + environment
├── docker-compose.yml          # mongo + backend + frontend
└── nginx.conf                  # SPA routing + /api proxy
```
