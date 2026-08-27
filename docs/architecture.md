# Architecture Documentation: AgentCart AI Commerce Platform

## Overview

AgentCart is an **AI-native commerce platform** designed for autonomous shopping agents to discover products, evaluate fit, create carts, and ultimately execute payments over merchant APIs.

- **Phase 1**: Merchant Foundation (TechKart electronic catalog, PostgreSQL persistence, real-time inventory, strict INR pricing, rule engine).
- **Phase 2**: AI Buyer Layer (Gemini natural-language intent parser, sandboxed tool execution, candidate ranking engine, and merchant-authoritative cart service).

---

## High-Level Architecture (Phase 1 & Phase 2)

```text
                                  USER
                                   │
                         (Natural Language Prompt)
                                   ▼
             +-------------------------------------------+
             |    AI Buyer Shopping Interface (Next.js)  |
             +-------------------------------------------+
                                   │
                    (POST /api/v1/buyer/chat)
                                   ▼
+───────────────────────────────────────────────────────────────────+
│                       AI BUYER LAYER (GEMINI)                     │
│                                                                   │
│  +-----------------------+           +-------------------------+  │
│  |  Intent Understanding |           | Product Ranking Engine  |  │
│  | (Category/Constraints)|           | (Score 0.00-1.00 & Why) |  │
│  +-----------------------+           +-------------------------+  │
│             │                                     ▲               │
│             ▼                                     │               │
│  +─────────────────────────────────────────────────────────────+  │
│  |                Controlled Tool Sandbox Layer                |  │
│  |   - search_products (Filters)                               |  │
│  |   - get_product (UUID)                                      |  │
│  |   - create_cart (Product UUID, Quantity)                    |  │
│  |   - get_cart (Cart UUID)                                    |  │
│  +─────────────────────────────────────────────────────────────+  │
+───────────────────────────────────┬───────────────────────────────+
                                    │ (Internal Service Invocations)
                                    ▼
+───────────────────────────────────────────────────────────────────+
│                    TECHKART MERCHANT CORE (FASTIFY)               │
│                                                                   │
│  +--------------------+   +-------------------+   +------------+  │
│  |  Catalog Service   |   |   Cart Service    |   | RuleEngine |  │
│  +--------------------+   +-------------------+   +------------+  │
│            │                        │                   │         │
│            └────────────────────────┼───────────────────┘         │
│                                     ▼                             │
│                         +-----------------------+                 │
│                         |       Prisma ORM      |                 │
│                         +-----------------------+                 │
+─────────────────────────────────────┼─────────────────────────────+
                                      │
                                      ▼
                       +-----------------------------+
                       |    PostgreSQL Database      |
                       | (Products, Inventory, Carts)|
                       +-----------------------------+
```

---

## 1. Natural Language to Structured Intent Flow

When a user submits a shopping query (e.g. *"Find me wireless ANC headphones under ₹5,000 preferably deliverable tomorrow"*):

1. **Intent Extraction (`gemini.service.ts`)**:
   - Parses the request into a strictly validated Zod object:
     ```json
     {
       "category": "headphones",
       "constraints": {
         "wireless": true,
         "anc": true,
         "max_price": 5000,
         "currency": "INR",
         "delivery_preference": "tomorrow"
       },
       "quantity": 1,
       "purchase_intent": true,
       "is_ambiguous": false
     }
     ```
   - If the request is too vague (e.g. *"buy me tech stuff"*), the engine flags `is_ambiguous: true` and generates a clarification question without hallucinating.

2. **Tool Execution (`tool-registry.ts`)**:
   - Calls `search_products({ category: "headphones", max_price: 5000, in_stock: true })`.
   - The tool executes against `CatalogService`, ensuring live availability checks directly from PostgreSQL.

3. **Candidate Ranking & Scoring**:
   - Evaluates each candidate against constraint fulfillment, stock, pricing, ratings, and delivery estimates.
   - Assigns a match confidence score ($0.00$ to $1.00$).
   - Returns concise, user-facing reasoning for why the top product was selected.

---

## 2. Controlled Tool Layer & Sandboxing

Gemini does **NOT** directly execute arbitrary code, database queries, or external network requests. All actions are routed through a sandboxed **Tool Registry** enforcing:

| Tool | Parameters (Zod Validated) | Execution Service | Behavior |
|---|---|---|---|
| `search_products` | `category`, `min/max_price`, `in_stock`, `rating`, `query` | `CatalogService` | Queries active database products |
| `get_product` | `product_id` (UUID) | `CatalogService` | Retrieves single product & live stock |
| `create_cart` | `product_id` (UUID), `quantity`, `cart_id?` | `CartService` | Authoritative stock check + DB cart creation |
| `get_cart` | `cart_id` (UUID) | `CartService` | Fetches active cart summary |

**Security Guarantees**:
- Strict allowlist: Any unlisted tool call (e.g. `delete_db`, `pay_now`, `fetch_url`) is immediately rejected with a 403 error.
- Max execution timeout: 10,000 ms limit per tool call.
- Untrusted product text sanitization: Product descriptions are scrubbed to neutralize indirect prompt injection attacks.

---

## 3. Authoritative Cart Lifecycle & Pricing Truth

The AI Buyer is **incapable of dictating product prices or falsifying inventory**:
- When `create_cart` is triggered, the `CartService` looks up the product directly in PostgreSQL.
- Unit prices and total subtotals are calculated strictly on the backend.
- If an item's `availableQuantity < requestedQuantity`, the cart addition is aborted with a `PRODUCT_OUT_OF_STOCK` error.

---

## 4. Entity Relationship Diagram (Phase 1 + Phase 2)

```text
+-----------------------+              +------------------------------------+
|       Merchant        |              |              Product               |
+-----------------------+              +------------------------------------+
| id (UUID, PK)         | 1          * | id (UUID, PK)                      |
| name (String)         |<------------>| merchantId (UUID, FK -> Merchant)  |
| currency (String)     |              | sku (String, Unique, Indexed)      |
+-----------------------+              | name (String)                      |
           │ 1                         | category (String, Indexed)         |
           │                           | price (Int, INR, Indexed)          |
           │                           | attributes (Json)                  |
           │ *                         | rating (Float, Indexed)            |
+-----------------------+              | deliveryEstimate (String)          |
|         Cart          |              +------------------------------------+
+-----------------------+                                │ 1
| id (UUID, PK)         |                                │
| merchantId (UUID, FK) |                                │ 1
| status (String)       |              +------------------------------------+
| subtotal (Int, INR)   |              |             Inventory              |
| currency (String)     |              +------------------------------------+
+-----------------------+              | productId (UUID, Unique, FK)       |
           │ 1                         | availableQuantity (Int)            |
           │                           | reservedQuantity (Int)             |
           │ *                         +------------------------------------+
+-----------------------+                                │ 1
|       CartItem        |                                │
+-----------------------+                                │
| id (UUID, PK)         |                                │ *
| cartId (UUID, FK)     |                                │
| productId (UUID, FK)  |<───────────────────────────────┘
| quantity (Int)        |
| unitPrice (Int, INR)  |
| totalPrice (Int, INR) |
+-----------------------+
```

---

## 5. Phase 3 Integration Readiness

With the AI Buyer capable of translating natural language requests into ranked candidates and verified merchant carts, Phase 3 will introduce:
- **Agent Checkout Protocol (ACP)**: Locking cart state and creating an ephemeral checkout session.
- **Agent Payment Protocol (AP2)**: User payment authorization and spending limit validation.
- **Razorpay Settlement**: Executing programmatic Razorpay payment verification and order confirmation.
