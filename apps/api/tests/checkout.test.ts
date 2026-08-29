import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import crypto from "crypto";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { ToolRegistry, ALLOWED_TOOLS } from "../src/buyer/tools/tool-registry.js";

describe("Phase 3: Agentic Checkout Layer & ACP Specification", () => {
  let app: FastifyInstance;
  let validProduct: any;
  let oosProduct: any;
  let activeCart: any;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    // Fetch in-stock product
    validProduct = await prisma.product.findFirst({
      where: {
        status: "ACTIVE",
        inventory: { availableQuantity: { gte: 5 } }
      },
      include: { inventory: true }
    });

    // Fetch out-of-stock product
    oosProduct = await prisma.product.findFirst({
      where: {
        status: "ACTIVE",
        inventory: { availableQuantity: 0 }
      },
      include: { inventory: true }
    });

    // Create an active cart for testing
    const cartRes = await app.inject({
      method: "POST",
      url: "/api/v1/cart",
      payload: {
        product_id: validProduct.id,
        quantity: 1
      }
    });
    activeCart = JSON.parse(cartRes.payload);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  // 1. Create Checkout Session from Cart
  it("POST /checkout_sessions creates session with server-authoritative calculations and integrity hash", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/checkout_sessions",
      payload: {
        cart_id: activeCart.cart_id
      }
    });

    expect(res.statusCode).toBe(201);
    const session = JSON.parse(res.payload);

    expect(session.checkout_id).toBeDefined();
    expect(session.cart_id).toBe(activeCart.cart_id);
    expect(session.status).toBe("READY_FOR_PAYMENT");
    expect(session.currency).toBe("INR");

    // Server-calculated totals verification
    const expectedSubtotal = validProduct.price;
    const expectedTax = Math.round(expectedSubtotal * 0.1);
    const expectedShipping = expectedSubtotal >= 1000 ? 0 : 100;
    const expectedDiscount = expectedSubtotal > 3000 ? Math.round(expectedSubtotal * 0.05) : 0;
    const expectedTotal = expectedSubtotal + expectedTax + expectedShipping - expectedDiscount;

    expect(session.subtotal).toBe(expectedSubtotal);
    expect(session.tax).toBe(expectedTax);
    expect(session.shipping).toBe(expectedShipping);
    expect(session.discount).toBe(expectedDiscount);
    expect(session.total).toBe(expectedTotal);

    // Cryptographic integrity hash verification
    expect(session.integrity_hash).toBeDefined();
    expect(session.integrity_hash.length).toBe(64); // SHA-256 hex string length

    // Capabilities verification
    expect(session.capabilities.can_update_quantity).toBe(true);
    expect(session.capabilities.can_complete).toBe(true);
  });

  // 2. Retrieve Checkout Session
  it("GET /checkout_sessions/:id retrieves existing checkout session", async () => {
    // Create session
    const createRes = await app.inject({
      method: "POST",
      url: "/checkout_sessions",
      payload: { cart_id: activeCart.cart_id }
    });
    const created = JSON.parse(createRes.payload);

    // Fetch session
    const getRes = await app.inject({
      method: "GET",
      url: `/checkout_sessions/${created.checkout_id}`
    });

    expect(getRes.statusCode).toBe(200);
    const fetched = JSON.parse(getRes.payload);
    expect(fetched.checkout_id).toBe(created.checkout_id);
    expect(fetched.total).toBe(created.total);
    expect(fetched.integrity_hash).toBe(created.integrity_hash);
  });

  // 3. Update Checkout Session Quantity
  it("POST /checkout_sessions/:id updates item quantity with authoritative recalculation", async () => {
    // Create session
    const createRes = await app.inject({
      method: "POST",
      url: "/checkout_sessions",
      payload: { cart_id: activeCart.cart_id }
    });
    const created = JSON.parse(createRes.payload);

    // Update quantity: 1 -> 2
    const updateRes = await app.inject({
      method: "POST",
      url: `/checkout_sessions/${created.checkout_id}`,
      payload: {
        items: [{ product_id: validProduct.id, quantity: 2 }]
      }
    });

    expect(updateRes.statusCode).toBe(200);
    const updated = JSON.parse(updateRes.payload);

    const newSubtotal = validProduct.price * 2;
    const newTax = Math.round(newSubtotal * 0.1);
    const newShipping = newSubtotal >= 1000 ? 0 : 100;
    const newDiscount = newSubtotal > 3000 ? Math.round(newSubtotal * 0.05) : 0;
    const newTotal = newSubtotal + newTax + newShipping - newDiscount;

    expect(updated.subtotal).toBe(newSubtotal);
    expect(updated.total).toBe(newTotal);
    expect(updated.items[0].quantity).toBe(2);
    // Hash must have changed
    expect(updated.integrity_hash).not.toBe(created.integrity_hash);
  });

  // 4. Update Fulfillment to Express Shipping
  it("POST /checkout_sessions/:id updates fulfillment to express delivery with fee recalculation", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/checkout_sessions",
      payload: { cart_id: activeCart.cart_id }
    });
    const created = JSON.parse(createRes.payload);

    const updateRes = await app.inject({
      method: "POST",
      url: `/checkout_sessions/${created.checkout_id}`,
      payload: {
        fulfillment: { selected_shipping_option_id: "exp_delivery" }
      }
    });

    expect(updateRes.statusCode).toBe(200);
    const updated = JSON.parse(updateRes.payload);
    expect(updated.shipping).toBe(200);
    expect(updated.fulfillment.selected_shipping_option_id).toBe("exp_delivery");
  });

  // 5. Complete Checkout Session
  it("POST /checkout_sessions/:id/complete transitions status to COMPLETED without executing payment", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/checkout_sessions",
      payload: { cart_id: activeCart.cart_id }
    });
    const created = JSON.parse(createRes.payload);

    const completeRes = await app.inject({
      method: "POST",
      url: `/checkout_sessions/${created.checkout_id}/complete`
    });

    expect(completeRes.statusCode).toBe(200);
    const completed = JSON.parse(completeRes.payload);
    expect(completed.status).toBe("COMPLETED");

    // Cannot modify completed session
    const failUpdateRes = await app.inject({
      method: "POST",
      url: `/checkout_sessions/${created.checkout_id}`,
      payload: { items: [{ product_id: validProduct.id, quantity: 3 }] }
    });
    expect(failUpdateRes.statusCode).toBe(400);
    const failBody = JSON.parse(failUpdateRes.payload);
    expect(failBody.error.code).toBe("INVALID_STATE_TRANSITION");
  });

  // 6. Cancel Checkout Session
  it("POST /checkout_sessions/:id/cancel cancels session and prevents further mutations", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/checkout_sessions",
      payload: { cart_id: activeCart.cart_id }
    });
    const created = JSON.parse(createRes.payload);

    const cancelRes = await app.inject({
      method: "POST",
      url: `/checkout_sessions/${created.checkout_id}/cancel`
    });

    expect(cancelRes.statusCode).toBe(200);
    const canceled = JSON.parse(cancelRes.payload);
    expect(canceled.status).toBe("CANCELED");

    // Cannot complete canceled session
    const failCompleteRes = await app.inject({
      method: "POST",
      url: `/checkout_sessions/${created.checkout_id}/complete`
    });
    expect(failCompleteRes.statusCode).toBe(400);
  });

  // 7. Inventory Validation
  it("POST /checkout_sessions rejects out-of-stock product safely", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/checkout_sessions",
      payload: {
        items: [{ product_id: oosProduct.id, quantity: 1 }]
      }
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.error.code).toBe("PRODUCT_OUT_OF_STOCK");
  });

  // 8. Price Changed Detection
  it("POST /checkout_sessions detects material price change and returns PRICE_CHANGED", async () => {
    // 1. Create a cart with current price
    const cartRes = await app.inject({
      method: "POST",
      url: "/api/v1/cart",
      payload: { product_id: validProduct.id, quantity: 1 }
    });
    const testCart = JSON.parse(cartRes.payload);

    // 2. Temporarily alter cart item snapshot unit price to simulate a past price in cart
    await prisma.cartItem.updateMany({
      where: { cartId: testCart.cart_id },
      data: { unitPrice: validProduct.price - 500 }
    });

    // 3. Attempt to create checkout from cart with altered price
    const chkRes = await app.inject({
      method: "POST",
      url: "/checkout_sessions",
      payload: { cart_id: testCart.cart_id }
    });

    expect(chkRes.statusCode).toBe(409);
    const errBody = JSON.parse(chkRes.payload);
    expect(errBody.error.code).toBe("PRICE_CHANGED");
    expect(errBody.error.details.current_price).toBe(validProduct.price);
  });

  // 9. Idempotency Support
  it("Repeated POST /checkout_sessions with Idempotency-Key returns cached response", async () => {
    const idempotencyKey = `idem_${crypto.randomUUID()}`;

    const res1 = await app.inject({
      method: "POST",
      url: "/checkout_sessions",
      headers: { "Idempotency-Key": idempotencyKey },
      payload: {
        items: [{ product_id: validProduct.id, quantity: 1 }]
      }
    });

    expect(res1.statusCode).toBe(201);
    const body1 = JSON.parse(res1.payload);

    // Repeat with identical key
    const res2 = await app.inject({
      method: "POST",
      url: "/checkout_sessions",
      headers: { "Idempotency-Key": idempotencyKey },
      payload: {
        items: [{ product_id: validProduct.id, quantity: 1 }]
      }
    });

    expect(res2.statusCode).toBe(201);
    expect(res2.headers["x-idempotent-replay"]).toBe("true");
    const body2 = JSON.parse(res2.payload);
    expect(body2.checkout_id).toBe(body1.checkout_id);
    expect(body2.integrity_hash).toBe(body1.integrity_hash);
  });

  // 10. AI Buyer Sandboxed Checkout Tools
  it("ToolRegistry executes create_checkout and rejects unauthorized tool names", async () => {
    const toolRegistry = new ToolRegistry();

    // Valid authorized tool
    const checkoutResult = await toolRegistry.executeTool("create_checkout", {
      items: [{ product_id: validProduct.id, quantity: 1 }]
    });
    expect(checkoutResult.checkout_id).toBeDefined();
    expect(checkoutResult.status).toBe("READY_FOR_PAYMENT");

    // Retrieve tool
    const getResult = await toolRegistry.executeTool("get_checkout", {
      checkout_id: checkoutResult.checkout_id
    });
    expect(getResult.checkout_id).toBe(checkoutResult.checkout_id);

    // Cancel tool
    const cancelResult = await toolRegistry.executeTool("cancel_checkout", {
      checkout_id: checkoutResult.checkout_id
    });
    expect(cancelResult.status).toBe("CANCELED");

    // Security violation on unauthorized tool
    await expect(
      toolRegistry.executeTool("execute_payment", { amount: 1000 })
    ).rejects.toThrow(/Security Violation/);
  });

  // 11. Audit Events Verification
  it("Records structured audit events in PostgreSQL for checkout lifecycle", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/checkout_sessions",
      payload: { items: [{ product_id: validProduct.id, quantity: 1 }] }
    });
    const session = JSON.parse(createRes.payload);

    const auditEvents = await prisma.auditEvent.findMany({
      where: { checkoutId: session.checkout_id }
    });

    expect(auditEvents.length).toBeGreaterThan(0);
    const createdEvent = auditEvents.find((e) => e.eventType === "CHECKOUT_CREATED");
    expect(createdEvent).toBeDefined();
    expect(createdEvent?.result).toBe("SUCCESS");
  });

  // 12. Security Boundary: Client / LLM cannot manipulate prices or final totals
  it("Security Boundary: Injected total or unit price in request body is ignored and backend calculates authoritatively", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/checkout_sessions",
      payload: {
        items: [{ product_id: validProduct.id, quantity: 1 }],
        // Malicious client / LLM injection attempts:
        total: 1,
        subtotal: 1,
        tax: 0,
        unit_price: 1,
        discount: 5000
      } as any
    });

    expect(res.statusCode).toBe(201);
    const session = JSON.parse(res.payload);

    // Injected values must be completely ignored
    expect(session.subtotal).toBe(validProduct.price);
    expect(session.total).not.toBe(1);
    expect(session.items[0].unit_price).toBe(validProduct.price);
  });

  // 13. Security Boundary: Tool Registry Allowlist contains NO payment execution tools
  it("Security Boundary: Gemini Tool Registry contains NO payment tools or Razorpay triggers", () => {
    const paymentKeywords = ["razorpay", "capture", "refund", "execute_payment", "approve_authorization", "sign_mandate"];
    for (const tool of ALLOWED_TOOLS) {
      for (const keyword of paymentKeywords) {
        expect(tool.toLowerCase()).not.toContain(keyword);
      }
    }
  });
});
