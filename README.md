# 🛒 AgentCart — Phase 1: TechKart Merchant Foundation

> **Razorpay AI Buildathon Project**
> An AI-native commerce layer designed for autonomous AI buyer agents to discover, verify, and purchase products through authoritative merchant APIs.

---

## 📌 Phase 1 Scope

This repository contains **Phase 1 (Merchant Foundation)** of AgentCart:
- **Simulated Merchant**: TechKart Electronics (Consumer Electronics & Computing Store).
- **Product Catalog**: 25+ structured products across 8 categories with deep machine-readable attributes.
- **Inventory & Pricing**: Real-time stock availability and server-authoritative integer INR pricing stored in PostgreSQL.
- **Merchant REST APIs**: Fastify v1 endpoints designed for AI agents without HTML scraping.
- **Rule Engine**: Condition-based (IF/THEN) retail policy engine for validation, cart optimization, security, caching, and accessibility.
- **Catalog UI**: Polished Next.js & Tailwind CSS catalog interface with an interactive **AI JSON Inspector**.

> **Note on Future Phases**: Phase 1 strictly implements the Merchant Foundation. AI Buyer Agents, LLM shopping loops, ACP/AP2 authorization, and Razorpay payment integration will be implemented in subsequent phases.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend API** | Node.js, Fastify, TypeScript (Strict Mode) |
| **Database** | PostgreSQL 18, Prisma ORM |
| **Validation** | Zod |
| **Frontend Catalog** | Next.js 14 (App Router), React 18, Tailwind CSS, Lucide Icons |
| **Testing** | Vitest |
| **Orchestration** | NPM Workspaces |

---

## 🏗️ Architecture

```text
                 TECHKART
                    │
          ┌─────────┴─────────┐
          ↓                   ↓
     Frontend UI          Merchant API (Fastify)
     (Next.js)                │
          │                   ↓
          │            Condition Rule Engine
          │                   │
          │                   ↓
          │              PostgreSQL (Prisma)
          │                   │
          └─────────┬─────────┘
                    ↓
              Product Catalog
              Real-Time Inventory
              Authoritative Pricing
```

Detailed architectural specifications are documented in [`docs/architecture.md`](./docs/architecture.md).

---

## 📦 Project Structure

```text
Agentic_Commerce/
├── apps/
│   ├── api/                          # Fastify + TypeScript + Prisma + Zod backend
│   │   ├── src/
│   │   │   ├── config/               # Env parsing, Prisma singleton
│   │   │   ├── middleware/           # Request ID, rate limiter, error handler
│   │   │   ├── repositories/         # Prisma repositories (Product, Merchant, Inventory)
│   │   │   ├── routes/               # /api/v1/merchant, /api/v1/products, /api/v1/inventory, /api/v1/rules
│   │   │   ├── rules/                # Condition-based Retail Rule Engine
│   │   │   ├── schemas/              # Zod schemas for AI-readable DTOs
│   │   │   ├── services/             # Catalog, Merchant, Inventory, Cache services
│   │   │   ├── app.ts                # Fastify app builder
│   │   │   └── server.ts             # Backend entry point
│   │   └── tests/                    # Vitest integration and unit tests
│   │
│   └── web/                          # Next.js + Tailwind CSS catalog UI
│       ├── src/
│       │   ├── app/                  # App router (Catalog page & layout)
│       │   ├── components/           # Navbar, MetricsBar, ProductCard, FilterBar, JsonDrawer, RuleDrawer
│       │   └── lib/                  # API client, types, formatters
│
├── prisma/
│   ├── schema.prisma                 # Merchant, Product, Inventory models
│   └── seed.ts                       # Idempotent seed script (25 products)
│
├── docs/
│   └── architecture.md               # Architecture documentation
├── .env.example
├── .env
├── package.json                      # Workspace root orchestrator
└── README.md
```

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- **Node.js**: `v20+` (v22 recommended)
- **PostgreSQL**: Running locally or via Docker on port `5432`

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and adjust the PostgreSQL connection string if needed:

```bash
cp .env.example .env
```

Default `.env`:
```env
DATABASE_URL="postgresql://VAIBHAV@localhost:5432/agentcart"
PORT=4000
HOST="0.0.0.0"
NODE_ENV="development"
CORS_ORIGIN="http://localhost:3000"
NEXT_PUBLIC_API_BASE_URL="http://localhost:4000"
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Setup Database Schema & Seed Data
```bash
# Push Prisma schema to PostgreSQL
npm run db:push

# Seed TechKart Merchant and 25 realistic electronics products
npm run db:seed
```

### 5. Start Development Servers

Run both Backend API and Frontend simultaneously:
```bash
npm run dev
```

Or run individually:
```bash
# Start Fastify Merchant API on port 4000
npm run dev:api

# Start Next.js Frontend Catalog on port 3000
npm run dev:web
```

---

## 🧪 Running Tests & Typechecks

```bash
# Run all Vitest test suites (API, Search, Inventory, Rule Engine)
npm run test

# Run TypeScript strict typechecks across all workspaces
npm run typecheck

# Build production bundles
npm run build
```

---

## 🔌 Merchant API Reference

### Base URL: `http://localhost:4000/api/v1`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service and database health check |
| `GET` | `/api/v1/merchant` | Merchant profile and AI-readiness metrics |
| `GET` | `/api/v1/products` | Paginated product list |
| `GET` | `/api/v1/products/:id` | Get single product by UUID |
| `GET` | `/api/v1/products/search` | Search & filter products (query, category, price, stock, rating) |
| `GET` | `/api/v1/inventory/:productId` | Real-time stock level for a product |
| `GET` | `/api/v1/rules` | List registered Retail Rule Engine policies |
| `POST` | `/api/v1/rules/evaluate` | Evaluate context against condition-based rules |

---

## 💡 Example API Requests & Responses

### 1. Filter Headphones under ₹5,000 in Stock
```bash
curl -X GET "http://localhost:4000/api/v1/products/search?category=headphones&max_price=5000&in_stock=true"
```

**Response:**
```json
{
  "products": [
    {
      "id": "78ec584b-01ee-48c5-927a-e4905df00fa8",
      "sku": "HP-ANC-001",
      "name": "SoundMax ANC Pro",
      "description": "Flagship hybrid active noise cancelling wireless over-ear headphones with 40mm beryllium drivers.",
      "category": "headphones",
      "price": 4499,
      "currency": "INR",
      "availability": {
        "in_stock": true,
        "quantity": 12
      },
      "attributes": {
        "anc": true,
        "brand": "SoundMax",
        "codec": ["LDAC", "AAC", "SBC"],
        "wireless": true,
        "battery_hours": 35,
        "weight_grams": 250
      },
      "rating": 4.5,
      "imageUrl": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
      "delivery_estimate": "1-2 days"
    }
  ],
  "total": 3,
  "page": 1,
  "limit": 20,
  "filters": {
    "category": "headphones",
    "max_price": 5000,
    "in_stock": true
  }
}
```

### 2. Invalid Query Validation Error (Rule VAL_001)
```bash
curl -X GET "http://localhost:4000/api/v1/products/search?query=a"
```

**Response:**
```json
{
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "Search query must be at least 2 characters long",
    "request_id": "req_a4c9b20e",
    "details": [
      {
        "valid": false,
        "code": "INVALID_QUERY_LENGTH",
        "message": "Search query must be at least 2 characters long",
        "field": "query",
        "value": "a"
      }
    ]
  }
}
```

---

## ⚡ Condition-Based Rule Engine Modules

| Category | Rule ID | Condition (IF) | Action (THEN) |
|---|---|---|---|
| **Validation** | `VAL_001_MIN_QUERY_LENGTH` | `query.length < 2` | Reject request with structured 400 error |
| **Validation** | `VAL_002_SANITIZE_INPUT` | Special / SQL chars detected | Sanitize unsafe characters from input string |
| **Cart** | `CART_001_LOW_VALUE_ADDONS` | `cart_value < 1000` | Recommend complementary accessory add-ons |
| **Cart** | `CART_002_PREMIUM_DISCOUNT` | `cart_value > 3000` | Apply flat 10% premium discount |
| **User Behavior** | `BEHAVIOR_001_INACTIVITY_POPUP` | User inactive for 10 seconds | Trigger 5% instant discount coupon popup (`TECHKART5`) |
| **User Behavior** | `BEHAVIOR_002_RETURNING_USER_PERSONALIZATION` | Returning user detected | Prioritize recommendations from previous browsing categories |
| **Security** | `SEC_001_RATE_LIMIT_EXCEEDED` | Request rate > threshold | Return 429 Rate Limit Exceeded with retry timer |
| **Security** | `SEC_002_MALFORMED_REQUEST` | Malformed payload | Return 400 Malformed Request with validation issues |
| **Performance** | `PERF_001_CACHED_QUERY` | Repeated search query | Return cached response with low latency |
| **Performance** | `PERF_002_LIMIT_RECOMMENDATIONS` | Recommendations requested | Cap payload to max 6 items for optimal AI inference context |
| **Accessibility** | `A11Y_001_KEYBOARD_ACCESSIBILITY` | Action lacks keyboard handler | Enforce keyboard navigation standards (WCAG 2.1 AA) |
| **Accessibility** | `A11Y_002_PROPER_LABELS` | Element lacks ARIA label | Enforce accessible labels and descriptors |

---

## 🔒 Security & Quality Standards

- **Input Validation**: All query parameters, route params, and payloads are strictly parsed and validated using Zod.
- **SQL Injection Prevention**: All queries execute through Prisma's parameterized query engine.
- **Error Obfuscation**: Internal database error details and stack traces are never exposed to clients; structured `request_id` logs are kept internally.
- **CORS & Headers**: Managed via `@fastify/cors` and `@fastify/helmet`.
- **Strict TypeScript**: 100% strict typing with zero unvalidated `any` leaks in API boundaries.
