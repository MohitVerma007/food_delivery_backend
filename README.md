Here is a comprehensive, production-grade **README.md** tailored for your GitHub repository based on the complete Food Delivery System architecture you've built through Phase 5.46.

---

```markdown
# 🍔 Food Delivery Backend Service

A high-performance, resilient, and production-grade food delivery backend API built with **Node.js, Express, TypeScript, PostgreSQL, and Redis**. 

This repository implements a full-lifecycle food delivery engine—from authentication and real-time menu management to atomic checkout, idempotent payments, restaurant management, delivery partner lifecycle tracking, and caching optimizations.

---

## 🛠️ Tech Stack

* **Runtime:** Node.js (v18+)
* **Language:** TypeScript
* **Web Framework:** Express.js
* **Primary Database:** PostgreSQL
* **Caching & Rate Limiting:** Redis
* **ORM / Database Driver:** `pg` (node-postgres) with raw SQL & transactions
* **Testing:** Vitest & Supertest
* **Data Validation:** Zod
* **Authentication:** JWT & bcrypt

---

## 🚀 Key Features & Architectural Highlights

### 🛡️ 1. Idempotent Order & Payment Processing
* **Prevent Duplicate Orders:** Implements `Idempotency-Key` headers on POST requests to ensure network retries never create duplicate orders or double-charge users.
* **Transactional Integrity:** Row-level locking (`FOR UPDATE`) in PostgreSQL ensures atomic state transitions across carts, inventory, orders, and outbox events.
* **Strict Price Verification:** Server-side price resolution directly from PostgreSQL at checkout, preventing client-side or cached price tampering.

### 💳 2. Payment Gateway & Webhook Security
* **Asynchronous Webhook Processing:** Securely verifies HMAC SHA-256 signatures using raw request bodies before processing webhooks.
* **Webhook Deduplication:** Stores provider event IDs in a dedicated `payment_webhook_events` table to handle duplicate delivery retries seamlessly.
* **Outbox Pattern:** Publishes business events (`PAYMENT_SUCCESS`, `ORDER_CONFIRMED`) via an transactional Outbox table to guarantee event consistency.

### 🏪 3. Restaurant Management & Access Control
* **Role-Based Authorization:** Strict resource-level security verifying `RESTAURANT_OWNER` permissions against specific `restaurant_id` fields.
* **Order Lifecycle Machine:** Explicit state transitions (`CONFIRMED` ➔ `RESTAURANT_ACCEPTED` ➔ `PREPARING` ➔ `READY_FOR_PICKUP`).

### 🛵 4. Delivery Partner Module & Concurrency Safeguards
* **Atomic Job Acceptance:** Uses database-level row locking (`FOR UPDATE`) to resolve race conditions when multiple delivery partners attempt to accept the same delivery simultaneously.
* **Dual State Machines:** Decouples order statuses (`READY_FOR_PICKUP`, `OUT_FOR_DELIVERY`, `DELIVERED`) from partner statuses (`ONLINE`, `BUSY`).

### ⚡ 5. Performance Optimization & Abuse Protection
* **Cache-Aside Caching:** High-speed menu reads backed by Redis with TTL jitter to prevent cache stampedes.
* **Atomic Rate Limiting:** Lua-scripted fixed-window rate limiter in Redis protecting sensitive endpoints (`/login`, `/register`, payment triggers).

---

## 🗄️ Database Architecture

The core data model consists of the following key tables:

* `users` — Base user profiles with assigned roles (`CUSTOMER`, `RESTAURANT_OWNER`, `DELIVERY_PARTNER`).
* `restaurants` & `menu_items` — Restaurant metadata and dynamic catalog listings.
* `carts` & `cart_items` — Persistent customer cart storage.
* `orders` & `order_items` — Order snapshots tracking state, amounts, and cancellations.
* `payments` & `payment_webhook_events` — Payment attempt records and webhook idempotency tracking.
* `delivery_partners` & `deliveries` — Partner status tracking and order assignment logs.
* `outbox_events` — Transactional event log for event-driven async workflows.

---

## 📂 Project Structure

```text
food-delivery-backend/
├── src/
│   ├── config/             # Database (pg Pool), Redis, and environment configs
│   ├── middlewares/        # Auth, Role Authorization, Rate Limiting, Error Handler
│   ├── modules/
│   │   ├── auth/           # Login, Registration, Password hashing
│   │   ├── restaurant/     # Restaurant profiles & Order processing
│   │   ├── menu/           # Menu management & Redis caching
│   │   ├── cart/           # Cart operations & validation
│   │   ├── orders/         # Order creation, state transitions, total calculations
│   │   ├── payments/       # Payment flows, HMAC Webhook handlers
│   │   └── deliveries/     # Partner assignment, atomic acceptance, tracking
│   ├── app.ts              # Express application setup
│   └── server.ts           # DB connection bootstrap & server startup
├── tests/
│   ├── integration/        # Database & API endpoint integration tests
│   └── e2e/                # Multi-step checkout & delivery journey tests
├── vitest.config.ts        # Test runner configuration
└── package.json

```

---

## ⚙️ Getting Started

### Prerequisites

* Node.js (v18 or higher)
* PostgreSQL (v14 or higher)
* Redis (v7 or higher)
* Docker (Optional, recommended for local services)

### 1. Local Infrastructure Setup (using Docker)

You can quickly run PostgreSQL and Redis containers using Docker:

```bash
# Run PostgreSQL
docker run -d --name food-postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=food_delivery postgres:15

# Run Redis
docker run -d --name food-redis -p 6379:6379 redis:7-alpine

```

### 2. Installation & Environment Config

Clone the repository and install dependencies:

```bash
git clone [https://github.com/your-username/food-delivery-backend.git](https://github.com/your-username/food-delivery-backend.git)
cd food-delivery-backend
npm install

```

Create a `.env` file in the root directory:

```env
PORT=5000
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/food_delivery

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=1d

# Webhook Secrets
PAYMENT_WEBHOOK_SECRET=your_razorpay_or_stripe_webhook_secret

```

### 3. Database Migration

Run your PostgreSQL migration scripts or raw SQL schemas against your database instance:

```bash
npm run migrate # or execute your SQL schema scripts

```

### 4. Running the Application

```bash
# Start in development mode (with hot reloading)
npm run dev

# Build TypeScript to JavaScript
npm run build

# Start production server
npm start

```

---

## 🧪 Running Tests

The application uses **Vitest** for unit testing and **Supertest** for integration tests against a real PostgreSQL test database.

```bash
# Run unit and integration tests once
npm test

# Run tests in watch mode
npm run test:watch

```

> **Note:** Ensure a separate test database (`food_delivery_test`) is specified in your `.env.test` file before running integration tests to avoid modifying local development data.

---

## 📌 Critical Test Scenarios Covered

* ✅ **Duplicate Order Prevention:** Validates that concurrent requests with identical idempotency keys yield a single order record.
* ✅ **Race Condition Handling:** Verifies that when two delivery partners attempt to accept an offer simultaneously, only one succeeds (`200 OK`) and the other receives a conflict (`409 Conflict`).
* ✅ **Webhook Idempotency:** Ensures duplicate provider events do not trigger duplicate order confirmation or side effects.
* ✅ **Transaction Rollback Safeguards:** Confirms that if an event insertion fails, the order status changes are completely rolled back.
* ✅ **Role & Domain Ownership:** Confirms that restaurant owners can only accept/reject orders assigned to their owned restaurant IDs.

---

## 🔒 Production Security Checklist

* [x] All requests use JWT Bearer Token authorization.
* [x] Payment verification is locked behind HMAC-SHA256 signature checks.
* [x] Sensitive endpoints (Login/Register/Checkout) are protected by Redis rate limiters.
* [x] All database mutations use strict parameterization (`$1, $2`) to prevent SQL injection.
* [x] Client payload trust is eliminated for monetary and stock/price fields.

```

```