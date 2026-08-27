# 🛒 AgentCart — AI-Native Commerce Layer

> **Razorpay AI Buildathon Project**
> An autonomous AI-powered shopping layer that allows AI buyers to discover products, evaluate fit, rank options, and create authoritative merchant carts through deterministic APIs.

---

## 📌 Project Phases & Status

| Phase | Description | Status |
|---|---|---|
| **Phase 1** | **TechKart Merchant Foundation** (Catalog, PostgreSQL, Real-Time Inventory, Pricing, Rule Engine) | ✅ **Completed** |
| **Phase 2** | **AI Buyer Layer** (Gemini Natural Language Intent, Tool Sandboxing, Product Ranking, Cart Service) | ✅ **Completed** |
| **Phase 3** | **Agentic Checkout & Razorpay Payments** (ACP, AP2, Checkout Locking, Razorpay Gateway) | ⏳ *Planned* |

---

## 🚀 Key Features in Phase 2

- **Natural Language Intent Parsing**: Translates unstructured user shopping prompts into strictly validated Zod intent objects with category detection and budget/feature constraints.
- **Ambiguity Detection**: Formulates helpful clarification questions when the user's intent is too vague.
- **Sandboxed Tool Layer**: Controls and enforces safe AI tool execution (`search_products`, `get_product`, `create_cart`, `get_cart`) with timeout guards and prompt injection defenses.
- **Candidate Ranking & Scoring**: Evaluates candidate products against price, rating, features, and live stock, returning concise human-readable explanations.
- **Authoritative Merchant Cart Service**: Server-side stock check and price snapshot calculation persisted in PostgreSQL.
- **Interactive AI Shopping Interface**: Next.js interface with real-time agent execution timelines, extracted requirement chips, spotlight recommendations, and one-click cart creation.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **AI Intelligence** | Google Gemini API (`@google/generative-ai`), Fallback Deterministic Engine |
| **Backend API** | Node.js, Fastify, TypeScript (Strict Mode) |
| **Database** | PostgreSQL 18, Prisma ORM |
| **Validation** | Zod |
| **Frontend UI** | Next.js 14 (App Router), React 18, Tailwind CSS, Lucide Icons |
| **Testing** | Vitest (38 unit and integration tests) |
| **Orchestration** | NPM Workspaces |

---

## 🏗️ Architecture Flow

```text
USER (Natural Language)
  ↓
Next.js AI Buyer Interface
  ↓
Gemini Service (Intent Understanding)
  ↓
Tool Sandbox (search_products)
  ↓
Fastify Merchant API & PostgreSQL
  ↓
Candidate Products Returned
  ↓
Gemini Service (Ranking & Reasoning)
  ↓
User Accepts Product
  ↓
Tool Sandbox (create_cart)
  ↓
Authoritative Cart Created in PostgreSQL
```

Detailed architectural diagrams and data contracts are documented in [`docs/architecture.md`](./docs/architecture.md).

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- **Node.js**: `v20+` (v22 recommended)
- **PostgreSQL**: Running locally or via Docker on port `5432`

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

`.env` configuration:
```env
DATABASE_URL="postgresql://VAIBHAV@localhost:5432/agentcart"
PORT=4000
HOST="0.0.0.0"
NODE_ENV="development"
CORS_ORIGIN="http://localhost:3000"
NEXT_PUBLIC_API_BASE_URL="http://localhost:4000"

# Optional: Add Google Gemini API Key for live LLM reasoning (has deterministic offline fallback if omitted)
GEMINI_API_KEY=""
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Setup Database Schema & Seed Data
```bash
# Push Prisma schema (Products, Inventory, Carts, CartItems)
npm run db:push

# Seed 25 realistic electronics products
npm run db:seed
```

### 5. Start Development Servers
```bash
# Start both Backend (:4000) and Frontend (:3000) simultaneously
npm run dev
```

---

## 🧪 Running Tests & Typechecks

```bash
# Run all 38 Vitest test suites (Intent, Ranking, Cart, Security, API, Rules)
npm run test

# Run TypeScript strict typechecks
npm run typecheck

# Build Next.js web application
npm run build
```

---

## 🔌 API & Tool Reference

### AI Buyer & Cart Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/buyer/chat` | Natural-language shopping assistant (intent extraction, tool execution, ranking, timeline) |
| `GET` | `/api/v1/buyer/tools` | List authorized tool definitions |
| `POST` | `/api/v1/buyer/tools/execute` | Sandboxed tool execution endpoint |
| `POST` | `/api/v1/cart` | Create cart or add product with server-side pricing & stock validation |
| `GET` | `/api/v1/cart/:id` | Fetch existing cart details and subtotal |

### Authorized AI Tool Sandbox

| Tool Name | Parameters | Description |
|---|---|---|
| `search_products` | `category`, `min_price`, `max_price`, `in_stock`, `rating`, `query` | Queries merchant database with structured filters |
| `get_product` | `product_id` (UUID) | Retrieves single product details & stock level |
| `create_cart` | `product_id` (UUID), `quantity` (Int), `cart_id?` (UUID) | Verifies stock & creates cart in PostgreSQL |
| `get_cart` | `cart_id` (UUID) | Returns cart items and calculated subtotal |

---

## 💡 Example AI Buyer Requests

### 1. Natural Language Shopping Prompt
```bash
curl -X POST "http://localhost:4000/api/v1/buyer/chat" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Find me wireless ANC headphones under 5000 deliverable tomorrow"}'
```

**Response:**
```json
{
  "session_id": "sess_8c72a1",
  "intent": {
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
  },
  "timeline": [
    { "title": "Intent understood", "status": "completed" },
    { "title": "Searching merchant catalog", "status": "completed" },
    { "title": "Comparing & ranking products", "status": "completed" },
    { "title": "Product selected", "status": "completed" }
  ],
  "recommended_product": {
    "id": "8a22b61b-99b1-4f96-84b8-93a408923d99",
    "name": "SoundMax ANC Pro",
    "price": 4499,
    "currency": "INR",
    "availability": { "in_stock": true, "quantity": 12 }
  },
  "ranking": {
    "selected_product_id": "8a22b61b-99b1-4f96-84b8-93a408923d99",
    "summary_reasoning": "Selected SoundMax ANC Pro as the best match for your requirements with high rating and immediate stock availability."
  }
}
```

### 2. Create Cart via Tool or API
```bash
curl -X POST "http://localhost:4000/api/v1/cart" \
  -H "Content-Type: application/json" \
  -d '{"product_id": "8a22b61b-99b1-4f96-84b8-93a408923d99", "quantity": 1}'
```

**Response:**
```json
{
  "cart_id": "9f27c841-e972-4d2b-bbbb-f2416b9a8421",
  "status": "ACTIVE",
  "subtotal": 4499,
  "currency": "INR",
  "item_count": 1,
  "items": [
    {
      "product_id": "8a22b61b-99b1-4f96-84b8-93a408923d99",
      "product_name": "SoundMax ANC Pro",
      "sku": "HP-ANC-001",
      "unit_price": 4499,
      "quantity": 1,
      "total_price": 4499
    }
  ]
}
```

---

## 🔒 Security & Sandboxing Guarantees

- **No Direct Database Access**: Gemini only interacts through validated functions in the Tool Registry.
- **Tool Allowlist**: Any unlisted tool call is rejected with a 403 status.
- **Untrusted Content Sanitization**: Product descriptions and reviews are sanitized to prevent indirect prompt injection attacks.
- **Authoritative Truth**: All pricing and stock quantities are resolved directly inside PostgreSQL.
