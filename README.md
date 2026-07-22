# FreshWorldSystem — Export ERP

A full-stack ERP built for a Sri Lankan agricultural export company operating on a **buy-to-order** model: produce is sourced only after a confirmed export order, so the system tracks no standing produce inventory — only **packaging materials** are held as stock. Everything else (procurement, dispatch, exports, approvals, reporting) is built around that constraint.

## Tech Stack

| Layer      | Technology |
|------------|------------|
| Frontend   | React (Vite) |
| Backend    | Node.js / Express |
| Database   | MySQL |
| Auth       | JWT + bcrypt |
| Docs/Email | Puppeteer (PDF generation), Nodemailer |
| Messaging  | Twilio / WhatsApp Business API (notifications) |

## Features

**Procurement**
- Purchase Orders, Goods Receiving Notes (GRN), and Returns — each with sequential, auditable numbering
- Manager approval workflow for POs

**Clients & Dispatch**
- Global (export) customer management
- Global dispatch records and export document generation/printing

**Inventory (Packaging-only)**
- Item & category management, scoped to packaging stock
- Low stock alerts, expiry tracking, physical stock counts, stock adjustments, stock valuation, stock movement history

**Approvals**
- Centralized manager approval queue spanning Purchase Orders, Returns, Wastage, Export Release, and Dispatch Override — single workflow, multiple source modules

**Supplier Portal**
- Dedicated supplier-facing views for orders, returns, and messages

**Admin & Reporting**
- Role-based dashboards (Admin, Manager, Operations, Supervisor, Logistics, Supplier)
- Role-based notifications
- User management
- System-wide Activity Log (audit trail)
- Reports & Analytics

## Project Structure

```
FreshWorldSystem/
├── frontend/          # React + Vite app
│   └── src/
│       ├── pages/     # One file per screen (Dashboard, Purchase Orders, Approvals, etc.)
│       ├── components/# Shared UI (Layout, modals, etc.)
│       └── context/    # Auth, Toast, and other app-wide context
├── backend/           # Express API
│   ├── routes/        # One router per module (approvals, purchaseOrders, grn, etc.)
│   └── controllers/   # Business logic + MySQL queries
└── database/          # Schema and migration SQL files
```


## Getting Started

### Prerequisites
- Node.js 18+
- MySQL 8+

### 1. Clone the repo
```bash
git clone https://github.com/Hiruni-21/FreshWorldSystem.git
cd FreshWorldSystem
```

### 2. Set up the database
Import the schema into a local MySQL database:
```bash
mysql -u root -p -e "CREATE DATABASE fresh_world_system"
mysql -u root -p fresh_world_system < database/freshworld_erp_final_schema.sql
```
Apply any additional migration files in `database/migrations/` if present.

### 3. Configure environment variables
```bash
cd backend
cp .env.example .env
```
Fill in your local DB credentials, JWT secret, and (optionally) mail/WhatsApp credentials in `.env`.

### 4. Install dependencies and run the backend
```bash
cd backend
npm install
npm run dev
```
Backend runs on `http://localhost:5001` by default.

### 5. Install dependencies and run the frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173` by default (Vite).

## Author

**Hiruni** — IT Undergraduate, Department of Industrial Management, University of Kelaniya
