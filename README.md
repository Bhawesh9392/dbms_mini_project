# Trading Cards Inventory & Exchange System

A full-stack Next.js application for card collectors to track their inventory, manage trading availability, and exchange cards with fellow collectors.

## 🌟 Features

- **Collector Accounts & Authentication**: Secure registration and login using bcrypt password hashing and JWT authentication (HTTP-only cookies + Bearer token support).
- **Cards Catalog**: Browse available trading cards with attributes such as set, rarity, HP, card types, and evolution stages.
- **Inventory Management**:
  - Add and update card quantities and conditions (`Mint`, `Near Mint`, `Excellent`, `Good`, etc.).
  - Set trade availability (`available_qty`).
  - View paginated collections (`GET /api/inventory?page=1&limit=20`).
  - Single-item inspection, editing, and deletion (`GET/PATCH/DELETE /api/inventory/:id`).
- **Card Exchanges**:
  - Propose multi-item trades to other collectors with `OFFERED` and `REQUESTED` cards.
  - Review incoming and outgoing proposals with pagination and status filters (`GET /api/exchanges?role=sent&status=PENDING`).
  - Detailed proposal inspection with cards breakdown (`/exchange/:id`).
  - Atomic acceptance flow: accepts trades in a PostgreSQL transaction, automatically validating available stock, decrementing the sender's inventory, and incrementing or creating receiver inventory rows.
- **Responsive User Interface**:
  - Built with React 19 & Next.js Server & Client Components.
  - Clean Tailwind CSS UI for inventory management, trade proposal creation, and trade resolution.

---

## 🛠️ Tech Stack

- **Framework**: Next.js (App Router)
- **Database**: PostgreSQL (`pg` pool)
- **Auth**: JWT (`jsonwebtoken`) & `bcrypt`
- **Styling**: Tailwind CSS

---

## 🚀 Getting Started

### 1. Database Setup
Ensure PostgreSQL is running and initialize the database schema:
```bash
psql -U postgres -d trading_cards -f db/schema.sql
```

### 2. Environment Variables
Create `.env.local` in the project root:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trading_cards
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📡 API Overview

### Authentication & Collectors
- `POST /api/collectors` — Register a new collector.
- `POST /api/login` — Sign in and obtain JWT (and session cookie).
- `POST /api/logout` — Clear session cookie.

### Inventory
- `GET /api/inventory?page=1&limit=20&condition=Mint&available=true` — Get paginated collection.
- `POST /api/inventory` — Add or upsert card to inventory.
- `GET /api/inventory/:id` — View single inventory item.
- `PATCH /api/inventory/:id` — Update quantity or available quantity.
- `DELETE /api/inventory/:id` — Remove item from inventory.

### Exchanges
- `GET /api/exchanges?page=1&limit=20&role=sent&status=PENDING` — Get paginated exchanges.
- `POST /api/exchanges` — Propose trade with one or more items.
- `GET /api/exchanges/:id` — View exchange details and line items.
- `PATCH /api/exchanges/:id` — Accept, reject, or cancel exchange (`{ action: "accept" | "reject" | "cancel" }`).

---

## 🧪 Testing

Run the automated integration test:
```bash
node test_phase4.js
```
