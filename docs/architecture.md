# Architecture Documentation: AgentCart Merchant Foundation (Phase 1)

## Overview

AgentCart is an **AI-native commerce layer** being developed for the Razorpay AI Buildathon.

**Phase 1 focuses exclusively on the Merchant Foundation**: simulating an authoritative electronics merchant (**TechKart**) that exposes structured, AI-readable APIs, real-time inventory, strict pricing rules, and a condition-based retail policy engine.

---

## High-Level Architecture

```text
                     +---------------------------------------+
                     |         FUTURE AI AGENT LAYER         |
                     |  (Discovery, Reasoning, Auth, ACP)    |
                     |        [Planned for Phase 2]          |
                     +---------------------------------------+
                                         │
                         (REST v1 / JSON Schema Contract)
                                         ▼
+-----------------------------------------------------------------------------------+
|                            TECHKART MERCHANT PLATFORM                             |
|                                                                                   |
|  +--------------------------------+       +------------------------------------+  |
|  |       Frontend Catalog UI      |       |       Fastify Merchant API         |  |
|  |     (Next.js + Tailwind CSS)   |       |      (Node.js + TypeScript)        |  |
|  +--------------------------------+       +------------------------------------+  |
|                 │                                    │                            |
|                 └───────────────────┬────────────────┘                            |
|                                     │ (REST API & Rule Engine)                    |
|                                     ▼                                             |
|                   +------------------------------------+                          |
|                   |    Condition-Based Rule Engine     |                          |
|                   |  (Validation, Cart, Security, etc) |                          |
|                   +------------------------------------+                          |
|                                     │                                             |
|                                     ▼                                             |
|                   +------------------------------------+                          |
|                   |       Prisma ORM & Data Layer      |                          |
|                   +------------------------------------+                          |
|                                     │                                             |
+-------------------------------------┼---------------------------------------------+
                                      │
                                      ▼
                       +-----------------------------+
                       |    PostgreSQL Database      |
                       |  (Authoritative Truth)      |
                       +-----------------------------+
```

---

## Core Architecture Principles

### 1. Merchant as Authoritative Source of Truth
- **Never trust client state**: Product pricing, real-time availability, and stock decrements are verified and resolved server-side.
- **Relational Integrity**: The `Product` model strictly ties to `Inventory` via 1-to-1 foreign keys and unique SKU constraints.

### 2. AI-Readable Data Models (Machine-Readable by Design)
Traditional e-commerce platforms embed critical specifications inside free-form HTML descriptions, requiring screen scrapers or vision models to parse product details. TechKart normalizes all core attributes into explicit, typed JSON payloads:

```json
{
  "id": "c1f7b0e1-4c6e-44db-a88a-2c83c271295b",
  "sku": "HP-ANC-001",
  "name": "SoundMax ANC Pro",
  "category": "headphones",
  "price": 4499,
  "currency": "INR",
  "availability": {
    "in_stock": true,
    "quantity": 12
  },
  "attributes": {
    "brand": "SoundMax",
    "wireless": true,
    "anc": true,
    "battery_hours": 35,
    "bluetooth_version": "5.3",
    "codec": ["LDAC", "AAC", "SBC"]
  },
  "rating": 4.5,
  "delivery_estimate": "1-2 days"
}
```

### 3. Layer Separation
- **`apps/web` (Frontend)**: Pure consumer of the Fastify REST APIs (`@agentcart/web`). Contains no hardcoded product catalogues or database credentials.
- **`apps/api` (Backend)**: Fastify server exposing deterministic, Zod-validated endpoints with rate limiting, request ID tracing, and consistent error envelopes.
- **`prisma/` (Database & Seed)**: PostgreSQL schema definitions and idempotent seeding mechanism for 25+ realistic consumer electronics.

---

## Database Entity Relationship Model

```text
+-----------------------+              +------------------------------------+
|       Merchant        |              |              Product               |
+-----------------------+              +------------------------------------+
| id (UUID, PK)         | 1          * | id (UUID, PK)                      |
| name (String)         |<------------>| merchantId (UUID, FK -> Merchant)  |
| description (String)  |              | sku (String, Unique, Indexed)      |
| currency (String)     |              | name (String)                      |
| status (String)       |              | description (String)               |
| createdAt (DateTime)  |              | category (String, Indexed)         |
| updatedAt (DateTime)  |              | price (Int, INR, Indexed)          |
+-----------------------+              | currency (String)                  |
                                       | attributes (Json)                  |
                                       | rating (Float, Indexed)            |
                                       | imageUrl (String)                  |
                                       | deliveryEstimate (String)          |
                                       | status (String, Indexed)           |
                                       | createdAt (DateTime)               |
                                       | updatedAt (DateTime)               |
                                       +------------------------------------+
                                                         │ 1
                                                         │
                                                         │ 1
                                       +------------------------------------+
                                       |             Inventory              |
                                       +------------------------------------+
                                       | id (UUID, PK)                      |
                                       | productId (UUID, Unique, FK)       |
                                       | availableQuantity (Int)            |
                                       | reservedQuantity (Int)             |
                                       | updatedAt (DateTime)               |
                                       +------------------------------------+
```

---

## Condition-Based Retail Rule Engine

The platform incorporates a modular, condition-based (`IF <condition> THEN <action>`) rule engine:

```text
                   Context (Query, Cart, Rate, Inactivity, A11Y)
                                         │
                                         ▼
                            +--------------------------+
                            |     RuleEngine.eval()    |
                            +--------------------------+
                                         │
             ┌───────────────────────────┼───────────────────────────┐
             ▼                           ▼                           ▼
    [1. Validation]               [2. Cart Opt.]            [3. User Behavior]
  - Query length >= 2           - Cart < 1000: Add-ons     - Inactive 10s: Popup
  - Input Sanitization          - Cart > 3000: 10% Off     - Returning user boost
             │                           │                           │
             ▼                           ▼                           ▼
    [4. Security]                 [5. Performance]          [6. Accessibility]
  - Rate limiting (429)         - Query Caching (TTL)      - Keyboard operability
  - Malformed payload (400)     - Cap recommendations: 6   - ARIA labels required
```

---

## API Contract & Error Handling

All API errors return a uniform envelope containing a unique `request_id` for deterministic debugging:

```json
{
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "Search query must be at least 2 characters long",
    "request_id": "req_8b9a1e4c",
    "details": [
      {
        "field": "query",
        "value": "x"
      }
    ]
  }
}
```

---

## Phase 2 Readiness

In Phase 2, the AI Buyer Agent will interact directly with:
1. `GET /api/v1/merchant` — Verify seller credentials and catalog readiness.
2. `GET /api/v1/products/search` — Search by natural constraints (`category`, `max_price`, `in_stock`, `attributes`).
3. `GET /api/v1/inventory/:productId` — Confirm real-time item availability before initiating checkout.
