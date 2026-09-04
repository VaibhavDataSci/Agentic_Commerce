# AgentCart – Razorpay AI Buildathon 

Build a production-quality prototype for **Razorpay's AI Growth & Agentic Commerce** track.

## Objective

Build **AgentCart** – an AI-native commerce layer that makes a traditional merchant **buyable by an AI agent**.

The user should be able to say:

> "Find wireless ANC headphones under ₹5,000 and buy the best one."

The system should complete the entire flow:

**Natural language → Product search → Merchant checkout → User authorization → Razorpay Test Mode payment → Order → Audit trail**

## Core Problem

Today's e-commerce is designed for humans clicking through websites. AI agents need a **structured, machine-readable commerce interface**. Instead of scraping webpages, the AI should interact with the merchant through APIs.

## What to Build

### Merchant (TechKart)

Create a simulated electronics merchant with 30–50 products.

Backend should expose ACP-style commerce APIs:

* `GET /products`
* `GET /products/search`
* `POST /checkout_sessions`
* `GET /checkout_sessions/:id`
* `POST /checkout_sessions/:id`
* `POST /checkout_sessions/:id/complete`
* `POST /checkout_sessions/:id/cancel`

The **merchant backend is the source of truth** for price, tax, shipping, inventory, and checkout totals.

### AI Shopping Agent

The agent should:

* Understand user intent
* Extract constraints (budget, category, features)
* Search products
* Compare and recommend
* Create/update checkout
* Request user approval
* Trigger payment through backend tools only

The LLM must **never** directly call Razorpay.

## Razorpay Integration

Use **Razorpay Test Mode** with the latest official APIs.

Flow:

`AI Agent → Policy Engine → Razorpay Order → Payment → Verify Payment → Create Order`

Never fake payment success.

## Security (Big Differentiator)

Implement deterministic controls inspired by ACP/AP2 principles:

* Spending limit enforcement
* Merchant-controlled checkout
* User approval before payment
* Authorization tied to checkout
* Idempotency (prevent duplicate payments)
* Inventory validation
* Price-change detection
* Prompt injection protection (treat product descriptions as untrusted)

**Principle:** *LLM reasons. Backend controls money.*

## Required Failure Scenarios

Demonstrate these gracefully:

1. Final price exceeds budget → Block payment.
2. Product goes out of stock → Suggest alternative.
3. Price changes after checkout → Require re-validation.
4. Duplicate payment request → Prevent second payment.
5. Payment failure → Recover without creating an order.

## Tech Stack

* **Frontend:** Next.js + TypeScript + Tailwind
* **Backend:** Node.js + TypeScript + Fastify
* **Database:** PostgreSQL + Prisma
* **Validation:** Zod

## Deliverables

* Working full-stack application
* AI shopping interface
* ACP-style checkout flow
* Razorpay Test Mode integration
* Policy & authorization engine
* Audit dashboard showing every transaction event
* Automated tests for checkout, authorization, payments, and security scenarios
* Clean architecture and README explaining ACP-inspired checkout, AP2-inspired authorization, and Razorpay integration.

## Development Rule

Build **incrementally**. Complete and test each phase before moving on:

1. Merchant backend
2. Catalog APIs
3. Checkout flow
4. AI agent
5. Policy engine
6. Razorpay integration
7. Audit dashboard
8. Failure scenarios
9. Security hardening
10. Documentation
