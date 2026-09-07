# AgentCart — Developer Architecture Guide

> **For developers building on top of AgentCart.**
> This document explains the full system design: how every component is built, how they communicate, what they own, and the security invariants they enforce.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Repository Structure](#2-repository-structure)
3. [Technology Stack](#3-technology-stack)
4. [Phase-by-Phase Architecture](#4-phase-by-phase-architecture)
5. [Full End-to-End Data Flow](#5-full-end-to-end-data-flow)
6. [Database Schema](#6-database-schema-all-models)
7. [API Route Map](#7-api-route-map)
8. [Security Boundaries & Invariants](#8-security-boundaries--invariants)
9. [Rule Engine](#9-rule-engine)
10. [Audit & Observability](#10-audit--observability)
11. [How to Extend the System](#11-how-to-extend-the-system)

---

## 1. System Overview

AgentCart is a **5-phase AI-native commerce system** that lets a Gemini AI agent autonomously shop for a user — from natural-language query through product discovery, ranked selection, merchant checkout, multi-layer security authorization, and finally a real payment — all while enforcing deterministic, server-authoritative pricing and security controls.

```
USER (Natural Language)
        │
        ▼
 ┌─────────────────────────────────┐
 │   Next.js Frontend (Port 3000)  │
 │   AI Buyer Interface            │
 └──────────────┬──────────────────┘
                │  HTTP REST
                ▼
 ┌─────────────────────────────────┐
 │   Fastify API Server (Port 4000)│
 │                                 │
 │  ┌──────────┐  ┌─────────────┐  │
 │  │ Gemini   │  │  Rule       │  │
 │  │ AI Agent │  │  Engine     │  │
 │  └────┬─────┘  └─────────────┘  │
 │       │ Tool Calls              │
 │  ┌────▼──────────────────────┐  │
 │  │     Tool Registry         │  │
 │  │  (Allowlisted, Sandboxed) │  │
 │  └────┬──────────────────────┘  │
 │       │                         │
 │  ┌────▼──────────────────────┐  │
 │  │  Services Layer           │  │
 │  │  Catalog / Cart /         │  │
 │  │  Checkout / Policy /      │  │
 │  │  Mandate / Payment        │  │
 │  └────┬──────────────────────┘  │
 │       │ Prisma ORM              │
 └───────┼─────────────────────────┘
         │
         ▼
 ┌──────────────────┐
 │   PostgreSQL DB  │
 └──────────────────┘
         │
         ▼ (Phase 5 only)
 ┌──────────────────────┐
 │  Razorpay Test Mode  │
 └──────────────────────┘
```

**Core design principles:**
- **Server-authoritative pricing**: The AI agent never dictates prices. All prices, taxes, shipping, and discounts are computed by the backend from live database records.
- **Deterministic security**: The Policy Engine evaluates a fixed set of 11 checks. There is no probabilistic judgment in the security layer.
- **Cryptographic integrity**: Every checkout snapshot is hashed (SHA-256). Every authorization mandate is signed (HMAC-SHA256). Any modification to prices or quantities invalidates the authorization.
- **Strict tool isolation**: Gemini only has access to an explicit allowlist of 10 tools. It cannot access the database, call Razorpay, or trigger payments directly.

---

## 2. Repository Structure

```
Agentic_Commerce/
├── apps/
│   ├── api/                        # Fastify Backend
│   │   └── src/
│   │       ├── app.ts              # App factory: registers all plugins & routes
│   │       ├── server.ts           # Entry point: starts HTTP server
│   │       ├── config/
│   │       │   ├── env.ts          # Validated env variables (Zod)
│   │       │   └── prisma.ts       # Singleton Prisma client
│   │       ├── middleware/
│   │       │   ├── request-id.middleware.ts    # Attaches UUID request ID to every request
│   │       │   └── error-handler.middleware.ts # Centralized error responses
│   │       ├── routes/             # HTTP route handlers (thin, delegates to services)
│   │       │   ├── health.routes.ts
│   │       │   ├── merchant.routes.ts
│   │       │   ├── product.routes.ts
│   │       │   ├── inventory.routes.ts
│   │       │   ├── cart.routes.ts
│   │       │   ├── buyer.routes.ts
│   │       │   ├── checkout.routes.ts
│   │       │   ├── authorization.routes.ts
│   │       │   ├── payment.routes.ts
│   │       │   ├── webhook.routes.ts
│   │       │   └── rules.routes.ts
│   │       ├── services/           # Core business logic (server-authoritative)
│   │       │   ├── catalog.service.ts
│   │       │   ├── inventory.service.ts
│   │       │   ├── merchant.service.ts
│   │       │   ├── checkout.service.ts         # ACP checkout lifecycle & integrity hash
│   │       │   ├── policy-engine.service.ts    # 11-check deterministic authorization
│   │       │   ├── mandate.service.ts          # Mandate issue/sign/verify/approve
│   │       │   ├── payment.service.ts          # Preflight + Razorpay + Order creation
│   │       │   ├── razorpay.provider.ts        # Razorpay API wrapper (test/mock/live)
│   │       │   ├── audit.service.ts            # Structured event logging
│   │       │   ├── cache.service.ts            # In-memory result cache
│   │       │   ├── idempotency.service.ts      # Duplicate request protection
│   │       │   └── prompt-injection.service.ts # Adversarial input detection
│   │       ├── buyer/              # AI Agent subsystem
│   │       │   ├── services/
│   │       │   │   ├── gemini.service.ts       # Intent parse + product ranking
│   │       │   │   ├── buyer.service.ts        # Orchestrates the AI buyer turn
│   │       │   │   └── cart.service.ts         # Agent-specific cart operations
│   │       │   ├── tools/
│   │       │   │   └── tool-registry.ts        # Allowlisted tool definitions
│   │       │   └── schemas/
│   │       │       ├── intent.schema.ts
│   │       │       ├── ranking.schema.ts
│   │       │       └── cart.schema.ts
│   │       └── rules/              # Retail Rule Engine
│   │           ├── core/engine.ts
│   │           ├── validation.rules.ts
│   │           ├── cart.rules.ts
│   │           ├── user-behavior.rules.ts
│   │           ├── security.rules.ts
│   │           ├── performance.rules.ts
│   │           ├── accessibility.rules.ts
│   │           └── index.ts
│   │
│   └── web/                        # Next.js 14 Frontend (App Router)
│       └── src/
│           ├── app/page.tsx         # Root page; mounts AiBuyerInterface
│           ├── components/
│           │   ├── buyer/
│           │   │   ├── AiBuyerInterface.tsx         # Chat + timeline orchestrator
│           │   │   ├── CheckoutView.tsx             # ACP checkout session viewer
│           │   │   ├── PurchaseAuthorizationModal.tsx
│           │   │   ├── RazorpayPaymentModal.tsx
│           │   │   ├── ActiveCartView.tsx
│           │   │   ├── ActivityTimeline.tsx
│           │   │   ├── ExtractedRequirements.tsx
│           │   │   └── RankedProductList.tsx
│           │   ├── CartOptimizerModal.tsx
│           │   ├── RuleEngineDrawer.tsx
│           │   └── InactivityPopup.tsx
│           └── lib/
│               ├── api.ts           # Typed API client functions
│               ├── types.ts         # All TypeScript interfaces
│               └── utils.ts
│
├── prisma/
│   ├── schema.prisma               # PostgreSQL schema (13 models)
│   └── seed.ts                     # Seeds 1 Merchant + 36 Products + Inventory
│
├── docs/                           # Developer documentation
├── docker-compose.yml              # PostgreSQL + pgAdmin local setup
└── package.json                    # npm workspaces monorepo root
```

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 14 (App Router) | React SSR, UI, typed API client |
| Backend | Fastify 5 + TypeScript | HTTP API, route handling, middleware |
| AI | Google Gemini 1.5 Flash | Natural language intent + ranking |
| ORM | Prisma 6 | Type-safe PostgreSQL access |
| Database | PostgreSQL 16 | All persistent state |
| Payment | Razorpay (Test Mode) | Payment order + webhook verification |
| Validation | Zod | All request/response schema enforcement |
| Cryptography | Node.js `crypto` module | SHA-256 hashing, HMAC-SHA256 signing |
| Testing | Vitest | 68 unit + integration tests |
| Security | @fastify/helmet, @fastify/rate-limit | HTTP headers, rate limiting |

---

## 4. Phase-by-Phase Architecture

### Phase 1 — Merchant Foundation

**Goal**: A production-grade, machine-readable product catalog with real-time inventory and server-authoritative pricing.

**Key components:**

| Component | File | Responsibility |
|---|---|---|
| Merchant Service | `merchant.service.ts` | Returns merchant profile + AI-readiness metadata |
| Catalog Service | `catalog.service.ts` | Structured product search with filters |
| Inventory Service | `inventory.service.ts` | Real-time stock check and reservation |
| Rule Engine | `rules/` | Modular IF/THEN retail rules per request |

**Data flow:**

```
GET /api/v1/products?category=headphones&max_price=5000
        │
        ▼
  catalog.service.ts
        │  (Prisma query, indexed filters)
        ▼
  PostgreSQL: products JOIN inventories
        │
        ▼
  Returns: ProductResponse[] (max 6 items — performance rule)
```

**Key invariants:**
- All prices stored as **integer INR** (no floating point drift).
- Inventory fetched live per request (no stale cache for stock checks).
- Product `status` must be `ACTIVE` to appear in search results.

---

### Phase 2 — AI Buyer Layer

**Goal**: Gemini parses natural language, searches catalog, ranks products, and builds a merchant-verified cart — without ever touching the database directly.

```
User Prompt (string)
        │
        ▼
  buyer.service.ts  (orchestrator)
        │
   ┌────┴─────────────────────────┐
   │                              │
   ▼                              ▼
gemini.extractIntent()    gemini.rankProducts()
   StructuredIntent         ProductRankingReport
        │
        ▼
   ToolRegistry.execute()
   (10-tool allowlist, Zod-validated params)
        │
   ┌────┴────────────────────────────────────┐
   │   search_products → CatalogService      │
   │   get_product     → CatalogService      │
   │   create_cart     → CartService (agent) │
   │   get_cart        → CartService (agent) │
   │   create_checkout → CheckoutService     │
   │   get_checkout    → CheckoutService     │
   │   update_checkout → CheckoutService     │
   │   cancel_checkout → CheckoutService     │
   │   request_authorization → MandateService│
   │   get_authorization_status → Mandate   │
   └─────────────────────────────────────────┘
```

**Prompt injection protection** (`prompt-injection.service.ts`):

All product text (name + description) is sanitized before it reaches Gemini. Seven adversarial regex patterns are detected and replaced with `[FILTERED_INSTRUCTION]`:

| Pattern ID | What it catches |
|---|---|
| `instruction_override` | "ignore previous/all instructions" |
| `system_role_override` | "system:" / "developer:" prefixes |
| `budget_manipulation` | "override/bypass spending limit" |
| `quantity_manipulation` | "set quantity to N" |
| `auto_authorize` | "buy immediately without asking" |
| `tool_injection` | "call_tool", "invoke_tool" |
| `prompt_leak` | "reveal your system prompt" |

Each detection is written to the `AuditEvent` table as `PROMPT_INJECTION_DETECTED`.

**Tool allowlist (enforced at runtime):**

```typescript
export const ALLOWED_TOOLS = [
  "search_products", "get_product", "create_cart", "get_cart",
  "create_checkout", "get_checkout", "update_checkout", "cancel_checkout",
  "request_authorization", "get_authorization_status"
] as const;
```

Any tool name outside this list returns a 403. Payment endpoints, webhook handlers, and mandate approval are entirely unreachable from the AI layer.

---

### Phase 3 — Agentic Checkout Protocol (ACP)

**Goal**: Stateful, integrity-protected checkout from the agent's cart. All totals are server-computed and locked with a cryptographic snapshot hash.

**Checkout status machine:**

```
CREATED ──► INCOMPLETE ──► READY_FOR_PAYMENT ──► COMPLETED (terminal)
   │              │                │
   └──────────────┴────────────────┴──► CANCELED (terminal)
                                        EXPIRED  (terminal)
```

State transitions enforced by `VALID_STATE_TRANSITIONS` map in `checkout.service.ts`. Invalid transitions throw immediately.

**Server-authoritative total calculation** (`calculateAuthoritativeTotals()`):

```
subtotal  = Σ (DB product.price × quantity)
tax       = subtotal × 10%                    (10% GST on electronics)
shipping  = subtotal >= ₹1000 ? ₹0 : ₹100    (₹200 for express)
discount  = subtotal >  ₹3000 ? subtotal × 5% (premium cart rule)
total     = subtotal + tax + shipping - discount
```

All values stored as integer INR in the `CheckoutSession` table. The client cannot supply these values.

**SHA-256 Integrity Hash** (`generateIntegrityHash()`):

When a checkout reaches `READY_FOR_PAYMENT`, this JSON is constructed, sorted by `product_id`, serialized, and SHA-256 hashed:

```json
{
  "items": [{ "product_id": "uuid", "quantity": 1, "unit_price": 4999 }],
  "currency": "INR",
  "fulfillment": { "selected_option": "std_delivery", "address": null },
  "total": 5499
}
```

The resulting hex string is stored as `CheckoutSession.integrityHash`. Any change to items, quantities, prices, or fulfillment produces a different hash, immediately invalidating all downstream authorizations.

> **Important**: `POST /checkout_sessions/:id/complete` transitions status to `COMPLETED` but does **not** execute payment. Payment is initiated only through `POST /payments/initiate`.

---

### Phase 4 — Security & Authorization Layer

**Goal**: Prove with cryptographic certainty — before any payment — what the user authorized, and that nothing has changed since.

**Authorization pipeline:**

```
ACP Checkout (READY_FOR_PAYMENT)
        │
        ▼
[1] UserConstraints created
    (max_amount, currency, merchants, categories, max_qty, features, TTL)
        │
        ▼
[2] PolicyEngine.evaluate() — 11 deterministic checks:

    ┌──────────────────────────────────────────────────────────────────┐
    │ Check 1:  SESSION_EXISTS       Does checkout exist in DB?        │
    │ Check 2:  EXPIRATION           Are constraints still within TTL? │
    │ Check 3:  CHECKOUT_STATE       Is status READY_FOR_PAYMENT?      │
    │ Check 4:  CURRENCY_MATCH       Do currencies match?              │
    │ Check 5:  AMOUNT_LIMIT         Is total ≤ maxAmount?             │
    │ Check 6:  MERCHANT_ALLOWLIST   Is this merchant authorized?      │
    │ Check 7:  CATEGORY_ALLOWLIST   Are all product categories OK?    │
    │ Check 8:  QUANTITY_LIMIT       Is total qty ≤ maxQuantity?       │
    │ Check 9:  FEATURE_REQUIREMENTS Are required product features met?│
    │ Check 10: INVENTORY_AVAILABLE  Is stock live and sufficient?     │
    │ Check 11: INTEGRITY_VERIFIED   Does SHA-256 hash match DB?       │
    └──────────────────────────────────────────────────────────────────┘
        │
        ▼
[3] AuthorizationMandate created
    (mandateId, nonce, issuedAt, expiresAt=+10min, constraintsSnapshot, decisionReport)
        │
        ▼
[4] Mandate HMAC-SHA256 signed
    Key: MANDATE_SECRET env var
    Payload (canonicalized JSON):
      mandate_id | user_id | merchant_id | checkout_id |
      checkout_hash | amount | currency | nonce | issued_at | expires_at
        │
        ▼
[5] User reviews PolicyEvaluationReport in UI
    Clicks "Approve" → mandate.status: PENDING → AUTHORIZED
        │
        ▼
[6] On every use, verifyMandate() runs:
    a. Not expired (10-minute TTL)
    b. Nonce not in UsedNonce table (replay protection)
    c. HMAC signature re-computed and matched (timing-safe compare)
    d. checkout.integrityHash in DB == mandate.checkoutIntegrityHash
        │
        ▼
AUTHORIZED_FOR_PAYMENT
```

**Mandate status machine:**

```
PENDING    ──► AUTHORIZED  (user approved)
PENDING    ──► DENIED      (user rejected / policy failed)
AUTHORIZED ──► CONSUMED    (nonce burned on payment initiation)
*          ──► EXPIRED     (TTL elapsed)
*          ──► INVALIDATED (checkout hash changed post-issuance)
```

---

### Phase 5 — Razorpay Payment Execution

**Goal**: Safely execute the AUTHORIZED transaction through Razorpay Test Mode with idempotency, pre-flight, webhook confirmation, and automatic order + inventory update.

**Payment flow:**

```
POST /payments/initiate { mandate_id, checkout_id }
        │
        ▼
PaymentService.preflightCheck()
  1. Fetch mandate, verify status === "AUTHORIZED"
  2. Re-run mandateService.verifyMandate() (full 4-step verification)
  3. Re-run policyEngine.evaluate() (all 11 checks — defence in depth)
  4. Re-verify checkout.integrityHash still matches
  5. Confirm checkout.status === "READY_FOR_PAYMENT"
  6. Idempotency check (no duplicate payment orders)
        │
        ▼
RazorpayProvider.createOrder({ amountPaise: total × 100, currency })
        │
        ▼
Payment record created (status: ORDER_CREATED)
Nonce written to UsedNonce (replay lock)
        │
        ▼
Response: { razorpay_order_id, razorpay_key_id, amount_paise }

[Frontend: Razorpay.js widget opens — user completes test payment]

        │
        ▼
POST /payments/verify { payment_id, razorpay_payment_id, razorpay_signature }
        │
        ▼
PaymentService.verifyPayment()
  1. HMAC-SHA256: HMAC(order_id|payment_id, keySecret) — timingSafeEqual
  2. Payment → PAID
  3. CheckoutSession → COMPLETED
  4. Inventory decremented for each line item
  5. MerchantOrder created (full snapshot: items, totals, fulfillment)

[Async] POST /webhooks/razorpay
  - Verify X-Razorpay-Signature
  - Deduplicate by eventId (WebhookEvent table)
  - Handle payment.captured / payment.failed
```

**`RazorpayProvider` mode selection:**

| Condition | Behavior |
|---|---|
| `NODE_ENV === "test"` | In-memory mock (no HTTP call) |
| Key contains `"test"` | In-memory mock |
| Key contains `"secret"` | In-memory mock (placeholder key) |
| Real Razorpay Test keys | HTTPS call to `api.razorpay.com/v1/orders` |
| Network failure | Graceful fallback to in-memory mock |

---

## 5. Full End-to-End Data Flow

```
User: "Find me wireless ANC headphones under ₹5,000"
│
▼
[Frontend: AiBuyerInterface]
POST /api/v1/buyer/chat { prompt: "..." }
│
├─► gemini.extractIntent() → StructuredIntent
│     { category: "headphones", constraints: { wireless, anc, max_price: 5000 } }
│
├─► ToolRegistry.execute("search_products", { category, max_price, in_stock })
│     → CatalogService → PostgreSQL → Product[] (max 6)
│
├─► promptInjectionService.sanitizeProduct()  [each product]
│
├─► gemini.rankProducts() → ProductRankingReport
│     { selected_product_id, ranked_products[], summary_reasoning }
│
└─► BuyerChatResponse { products, ranking, timeline, latency_ms }

[User: "Add to Cart & Checkout"]
│
▼
POST /api/v1/checkout_sessions { product_id, quantity, merchant_id, address }
│
├─► Fetch product.price from DB (authoritative)
├─► calculateAuthoritativeTotals() → { subtotal, tax, shipping, discount, total }
├─► generateIntegrityHash() → SHA-256 hex
└─► CheckoutSession created (status: READY_FOR_PAYMENT, integrityHash stored)

[User: Sets constraints → "Authorize Purchase"]
│
▼
POST /api/v1/authorization/mandate { checkout_id, user_constraints }
│
├─► createOrGetConstraints() → UserConstraint record
├─► policyEngine.evaluate() → PolicyEvaluationReport (11 checks)
├─► generateMandateSignature() → HMAC-SHA256 hex
└─► AuthorizationMandate created (status: PENDING)

[User reviews policy report — all 11 checks green — "Approve"]
│
▼
POST /api/v1/authorization/mandate/:id/approve
│
└─► verifyMandate() + status: PENDING → AUTHORIZED

[User: "Pay Now" in RazorpayPaymentModal]
│
▼
POST /payments/initiate { mandate_id, checkout_id }
│
├─► preflightCheck() — re-verify everything (defence in depth)
├─► RazorpayProvider.createOrder({ amountPaise })
├─► Payment record created (ORDER_CREATED)
└─► Nonce written to UsedNonce

[Razorpay.js widget → User completes test payment]
│
▼
POST /payments/verify { razorpay_order_id, razorpay_payment_id, razorpay_signature }
│
├─► Signature verified (timingSafeEqual HMAC)
├─► Payment → PAID
├─► CheckoutSession → COMPLETED
├─► Inventory decremented
└─► MerchantOrder created

[Frontend: Success banner with order summary]
```

---

## 6. Database Schema (All Models)

### Relationship Map

```
Merchant (1) ─── (*) Product (1) ─── (1) Inventory
Merchant (1) ─── (*) Cart (1) ─── (*) CartItem ─── (*) Product
Merchant (1) ─── (*) CheckoutSession
                        │
                        ├─── (*) CheckoutItem ─── (*) Product
                        ├─── (*) AuditEvent
                        ├─── (*) AuthorizationMandate
                        │         │
                        │         └─── (*) Payment
                        │                   │
                        │                   └─── (1) MerchantOrder ─── (*) OrderItem
                        └─── (*) MerchantOrder

UserConstraint (1) ─── (*) AuthorizationMandate
UsedNonce           (standalone — unique nonce registry)
IdempotencyRecord   (standalone — duplicate request guard)
WebhookEvent        (standalone — webhook dedup registry)
```

### Key Fields by Model

| Model | Critical Fields | Notes |
|---|---|---|
| `Product` | `price` (Int), `attributes` (Json), `status` | Price = integer INR. Never floats. |
| `Inventory` | `availableQuantity`, `reservedQuantity` | Always fetched live for stock checks |
| `CheckoutSession` | `integrityHash`, `status`, `total` | Hash locks the commercial snapshot |
| `CheckoutItem` | `unitPrice` | Authoritative price at checkout creation |
| `UserConstraint` | `maxAmount`, `allowedMerchants`, `expiresAt` | TTL-bound spending policy |
| `AuthorizationMandate` | `signature`, `nonce`, `status`, `checkoutIntegrityHash` | Core security record |
| `UsedNonce` | `nonce` (unique) | Prevents replay attacks |
| `Payment` | `razorpayOrderId`, `razorpayPaymentId`, `amountPaise` | Razorpay correlation IDs |
| `MerchantOrder` | `itemsSnapshot`, `fulfillment`, all totals | Immutable order record |
| `AuditEvent` | `eventType`, `result`, `metadata` | Append-only event log |
| `IdempotencyRecord` | `key`, `requestHash`, `responseBody` | Full response cached |
| `WebhookEvent` | `eventId` (unique), `status` | Razorpay dedup |

---

## 7. API Route Map

### Merchant & Catalog

```
GET  /api/v1/merchants/:id            Merchant profile + AI readiness
GET  /api/v1/products                 Search products (filters: category, price, stock, rating)
GET  /api/v1/products/:id             Single product detail
GET  /api/v1/inventory/:productId     Live inventory status
```

### AI Buyer

```
POST /api/v1/buyer/chat               Full AI turn: intent → search → rank → cart
```

### Cart

```
POST /api/v1/cart                     Create cart + item
GET  /api/v1/cart/:id                 Get cart
POST /api/v1/cart/:id/items           Add item to cart
```

### ACP Checkout (Phase 3)

```
POST   /api/v1/checkout_sessions              Create checkout session
GET    /api/v1/checkout_sessions/:id          Get session state
PATCH  /api/v1/checkout_sessions/:id          Update fulfillment / items
POST   /api/v1/checkout_sessions/:id/complete Mark COMPLETED (no payment trigger)
POST   /api/v1/checkout_sessions/:id/cancel   Cancel session
GET    /api/v1/checkout_sessions/:id/audit    Full audit trail
```

### Authorization (Phase 4)

```
POST /api/v1/authorization/constraints          Create user spending constraints
POST /api/v1/authorization/mandate              Request mandate (runs policy engine)
GET  /api/v1/authorization/mandate/:id          Get mandate
POST /api/v1/authorization/mandate/:id/approve  User approves
POST /api/v1/authorization/mandate/:id/deny     User denies
GET  /api/v1/authorization/mandate/:id/verify   Verify validity
```

### Payment (Phase 5)

```
POST /payments/initiate               Pre-flight + create Razorpay order
POST /payments/verify                 Verify signature + create merchant order
GET  /payments/:id/status             Payment + order status
POST /webhooks/razorpay               Razorpay webhook receiver
```

### System

```
GET  /health                          Server health + DB ping
GET  /api/v1/rules                    List all registered rules
POST /api/v1/rules/evaluate           Evaluate rules against a context
```

---

## 8. Security Boundaries & Invariants

### Invariant 1 — Gemini never touches payments or the database directly

`GeminiService` only calls `model.generateContent()`. All data access goes through the `ToolRegistry` → typed service methods. Razorpay, payment, webhook, and mandate approval code is unreachable from the AI layer.

### Invariant 2 — All prices are server-authoritative

The client (browser or AI agent) never sets prices. Every `unitPrice` in `CartItem` and `CheckoutItem` is read from `Product.price` in PostgreSQL at the moment of creation.

### Invariant 3 — Checkout totals are server-computed

`calculateAuthoritativeTotals()` in `checkout.service.ts` is the **sole** source of tax, shipping, discount, and total. The values are persisted in the database and re-verified by the Policy Engine before any payment.

### Invariant 4 — Mandates are cryptographically bound to checkout state

At mandate issuance time, the current `checkoutIntegrityHash` is captured in the mandate record. Before payment, `verifyMandate()` re-fetches the live checkout and compares hashes. A mismatch → `INVALIDATED`, payment blocked.

### Invariant 5 — Nonces are single-use

Each mandate has a unique cryptographic nonce. On payment initiation, the nonce is written to `UsedNonce`. Any reuse returns `REPLAY_ATTEMPT_BLOCKED`.

### Invariant 6 — Policy Engine runs twice before payment

1. At `POST /authorization/mandate` (mandate request).
2. At `POST /payments/initiate` (payment pre-flight).

Double evaluation ensures conditions changed between issuance and payment (e.g. product goes out of stock) still block the transaction.

### Invariant 7 — Webhook events are deduplicated

`WebhookEvent.eventId` has a unique database constraint. Duplicate Razorpay webhooks are stored as `DUPLICATE_IGNORED` with no further processing.

### Invariant 8 — Signature comparisons are timing-safe

Both payment signature verification (`verifyPaymentSignature`) and webhook signature verification (`verifyWebhookSignature`) use `crypto.timingSafeEqual()` to prevent timing-based side-channel attacks.

---

## 9. Rule Engine

The retail Rule Engine (`apps/api/src/rules/`) implements modular IF/THEN rules evaluated per request context.

**Core interface:**

```typescript
interface Rule {
  id: string;
  name: string;
  category: RuleCategory;
  condition: (context: RuleContext) => boolean;
  action: (context: RuleContext) => RuleActionResult;
  priority?: number;
}
```

**Registered rule modules:**

| Module | File | Example Rules |
|---|---|---|
| Validation | `validation.rules.ts` | Query length ≥ 2, sanitize invalid chars |
| Cart | `cart.rules.ts` | Suggest add-ons (subtotal < ₹1,000), 5% discount (> ₹3,000) |
| User Behavior | `user-behavior.rules.ts` | Inactivity discount popup (10s idle), returning user personalization |
| Security | `security.rules.ts` | Rate limit block, malformed request rejection |
| Performance | `performance.rules.ts` | Cache repeated queries, max 6 results |
| Accessibility | `accessibility.rules.ts` | Keyboard navigation checks, label presence |

**Adding a new rule:**

1. Create `apps/api/src/rules/my-domain.rules.ts`
2. Export: `export const myRules: Rule[] = [{ id, name, category, condition, action }]`
3. Import and register in `rules/index.ts`:
   ```typescript
   import { myRules } from './my-domain.rules.js';
   defaultRuleEngine.registerRules(myRules);
   ```

---

## 10. Audit & Observability

Every security-relevant action is written to `AuditEvent` via `audit.service.ts`. Events are also emitted as structured JSON to stdout for log aggregation.

**Key event types and triggers:**

| Event Type | Trigger |
|---|---|
| `CHECKOUT_CREATED` | New ACP checkout session |
| `CHECKOUT_UPDATED` | Fulfillment or items updated |
| `CONSTRAINTS_CREATED` | UserConstraint record created |
| `POLICY_CHECK_STARTED` | Policy Engine begins |
| `POLICY_CHECK_PASSED` | All 11 checks passed |
| `POLICY_DENIED` | At least one check failed |
| `MANDATE_CREATED` | Authorization mandate issued |
| `MANDATE_SIGNED` | HMAC signature generated |
| `MANDATE_VERIFIED` | Mandate passed all 4 verifications |
| `USER_AUTHORIZED` | User approved mandate |
| `USER_DENIED` | User denied mandate |
| `MANDATE_EXPIRED` | Mandate TTL elapsed |
| `MANDATE_INVALIDATED` | Checkout hash changed post-issuance |
| `REPLAY_ATTEMPT_BLOCKED` | Nonce already consumed |
| `PAYMENT_PRECHECK_STARTED` | Pre-flight checks begin |
| `PAYMENT_INITIATED` | Razorpay order created |
| `PAYMENT_VERIFIED` | Signature verified, funds captured |
| `MERCHANT_ORDER_CREATED` | MerchantOrder persisted |
| `INVENTORY_DECREMENTED` | Stock reduced post-payment |
| `PROMPT_INJECTION_DETECTED` | Adversarial pattern in product text |
| `CHECKOUT_HASH_MISMATCH` | Hash changed between mandate and payment |

**Querying a checkout's audit trail:**

```
GET /api/v1/checkout_sessions/:id/audit
```

Returns all `AuditEvent` records in chronological order — a complete forensic history from creation through payment.

**Sensitive field exclusion:**

`AuditService.logEvent()` automatically strips `password`, `token`, `secret`, and `card_number` from metadata before any write to the database.

---

## 11. How to Extend the System

### Add a new AI tool

1. Add the tool name to `ALLOWED_TOOLS` in `tool-registry.ts`.
2. Define a `ToolDefinition` (Zod `parameters` schema + `handler`).
3. Register inside `registerTools()`.

> The handler must only call existing services. It must not import Razorpay, mandate approval, or raw Prisma.

### Add a new product category

1. Update the Gemini system prompt category enum in `gemini.service.ts`.
2. Update `StructuredIntentSchema` category enum in `buyer/schemas/intent.schema.ts`.
3. Add seed products in `prisma/seed.ts` and run `npm run db:seed`.

### Add a new Policy Engine check

1. Open `policy-engine.service.ts`.
2. Add `checks.push({ check: "MY_CHECK", ... })` with your boolean.
3. Include it in `allPassed`.
4. Add `reasonCode` and `reasonMessage` to the decision block.
5. Write tests in `apps/api/src/__tests__/` for the new check.

### Add a new payment provider

1. Create `stripe.provider.ts` (or similar) with:
   - `createOrder()` returning a provider order object
   - `verifyPaymentSignature()` using `timingSafeEqual`
   - `verifyWebhookSignature()` using `timingSafeEqual`
2. Inject into `PaymentService` alongside or replacing `razorpayProvider`.
3. Add a webhook route in `webhook.routes.ts`.

### Add a new API endpoint

1. Create a route file in `apps/api/src/routes/`.
2. Register in `app.ts` (directly or under `/api/v1` prefix).
3. Add Zod request validation in the handler.
4. Call a service method — never write business logic in routes.

---

## Security Checklist for New Developers

Before shipping any new feature:

- [ ] All prices come from the database — never from the request body
- [ ] New tools in `ToolRegistry` do not expose payment, mandate approval, or direct DB access
- [ ] New checkout state transitions are added to `VALID_STATE_TRANSITIONS`
- [ ] New monetary operations re-run the Policy Engine before executing
- [ ] New external API calls are gated behind environment variables
- [ ] New audit event types are added to `AuditService.LogAuditParams.eventType`
- [ ] Sensitive fields (tokens, secrets, card numbers) are excluded from audit logs
- [ ] Idempotency keys are used for all mutating payment operations
- [ ] Tests are written for every new security-critical path
