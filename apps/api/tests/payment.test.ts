import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import crypto from "crypto";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { razorpayProvider } from "../src/services/razorpay.provider.js";
import { ToolRegistry } from "../src/buyer/tools/tool-registry.js";
import { env } from "../src/config/env.js";

describe("Phase 5: Razorpay Test-Mode Payment & Merchant Order Execution", () => {
  let app: FastifyInstance;
  let testProduct: any;
  let testCheckout: any;
  let testMandate: any;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    // 1. Fetch valid product with plenty of inventory
    testProduct = await prisma.product.findFirst({
      where: {
        status: "ACTIVE",
        inventory: { availableQuantity: { gte: 20 } }
      },
      include: { inventory: true, merchant: true }
    });

    // 2. Create an ACP Checkout Session
    const chkRes = await app.inject({
      method: "POST",
      url: "/checkout_sessions",
      payload: {
        items: [{ product_id: testProduct.id, quantity: 1 }]
      }
    });
    testCheckout = JSON.parse(chkRes.payload);

    // 3. Request and Approve Authorization Mandate (Phase 4)
    const mandateRes = await app.inject({
      method: "POST",
      url: "/api/v1/authorizations/mandates",
      payload: {
        checkout_id: testCheckout.checkout_id,
        user_constraints: {
          max_amount: testCheckout.total + 1000,
          currency: "INR"
        }
      }
    });
    const issuedMandate = JSON.parse(mandateRes.payload);

    const approveRes = await app.inject({
      method: "POST",
      url: `/api/v1/authorizations/mandates/${issuedMandate.mandate_id}/approve`,
      payload: { confirmation: true }
    });
    const approvedBody = JSON.parse(approveRes.payload);
    testMandate = approvedBody.mandate;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  // 1. Razorpay Order Creation & Currency Unit Conversion (INR -> Paise)
  it("A. Razorpay Order Creation: Converts authoritative INR total to integer paise and records Payment", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/payments/initiate",
      payload: {
        mandate_id: testMandate.mandate_id,
        checkout_id: testCheckout.checkout_id
      }
    });

    expect(res.statusCode).toBe(201);
    const payment = JSON.parse(res.payload);

    expect(payment.payment_id).toBeDefined();
    expect(payment.razorpay_order_id).toBeDefined();
    expect(payment.razorpay_order_id).toMatch(/^order_/);
    expect(payment.amount).toBe(testCheckout.total);
    expect(payment.amount_paise).toBe(testCheckout.total * 100);
    expect(payment.currency).toBe("INR");
    expect(payment.status).toBe("ORDER_CREATED");

    // Verify DB record
    const dbPayment = await prisma.payment.findUnique({
      where: { id: payment.payment_id }
    });
    expect(dbPayment).toBeDefined();
    expect(dbPayment?.amountPaise).toBe(testCheckout.total * 100);
  });

  // 2. Amount Tampering Defense
  it("B. Amount Tampering: Client cannot dictate payment amount; backend strictly enforces authoritative checkout total", async () => {
    // Attempt to inject arbitrary amount or currency in request body
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/payments/initiate",
      payload: {
        mandate_id: testMandate.mandate_id,
        checkout_id: testCheckout.checkout_id,
        amount: 1, // Malicious injection attempt
        amount_paise: 100
      } as any
    });

    expect(res.statusCode).toBe(201);
    const payment = JSON.parse(res.payload);
    expect(payment.amount).toBe(testCheckout.total);
    expect(payment.amount_paise).toBe(testCheckout.total * 100);
  });

  // 3. Mandate Tampering Defense (Hash Mismatch)
  it("C. Mandate Tampering: Altering checkout snapshot after mandate authorization blocks payment initiation", async () => {
    // 1. Create fresh checkout and authorize mandate
    const chkRes = await app.inject({
      method: "POST",
      url: "/checkout_sessions",
      payload: { items: [{ product_id: testProduct.id, quantity: 1 }] }
    });
    const chk = JSON.parse(chkRes.payload);

    const mandateRes = await app.inject({
      method: "POST",
      url: "/api/v1/authorizations/mandates",
      payload: {
        checkout_id: chk.checkout_id,
        user_constraints: { max_amount: 50000, currency: "INR" }
      }
    });
    const issuedMandate = JSON.parse(mandateRes.payload);

    await app.inject({
      method: "POST",
      url: `/api/v1/authorizations/mandates/${issuedMandate.mandate_id}/approve`,
      payload: { confirmation: true }
    });

    // 2. Tamper checkout session line item
    await app.inject({
      method: "POST",
      url: `/checkout_sessions/${chk.checkout_id}`,
      payload: { items: [{ product_id: testProduct.id, quantity: 2 }] }
    });

    // 3. Attempt to initiate payment
    const payRes = await app.inject({
      method: "POST",
      url: "/api/v1/payments/initiate",
      payload: {
        mandate_id: issuedMandate.mandate_id,
        checkout_id: chk.checkout_id
      }
    });

    expect(payRes.statusCode).toBe(400);
    const body = JSON.parse(payRes.payload);
    expect(body.error.code).toBe("AUTHORIZATION_INVALIDATED");
  });

  // 4. Mandate Expiration Defense
  it("D. Mandate Expiration: Expired authorization mandate is rejected during pre-flight check", async () => {
    // 1. Create fresh checkout and authorize mandate
    const chkRes = await app.inject({
      method: "POST",
      url: "/checkout_sessions",
      payload: { items: [{ product_id: testProduct.id, quantity: 1 }] }
    });
    const chk = JSON.parse(chkRes.payload);

    const mandateRes = await app.inject({
      method: "POST",
      url: "/api/v1/authorizations/mandates",
      payload: {
        checkout_id: chk.checkout_id,
        user_constraints: { max_amount: 50000, currency: "INR" }
      }
    });
    const issuedMandate = JSON.parse(mandateRes.payload);

    await app.inject({
      method: "POST",
      url: `/api/v1/authorizations/mandates/${issuedMandate.mandate_id}/approve`,
      payload: { confirmation: true }
    });

    // 2. Artificially expire the mandate
    await prisma.authorizationMandate.update({
      where: { id: issuedMandate.mandate_id },
      data: { expiresAt: new Date(Date.now() - 60 * 1000) }
    });

    // 3. Attempt to initiate payment
    const payRes = await app.inject({
      method: "POST",
      url: "/api/v1/payments/initiate",
      payload: {
        mandate_id: issuedMandate.mandate_id,
        checkout_id: chk.checkout_id
      }
    });

    expect(payRes.statusCode).toBe(400);
    const body = JSON.parse(payRes.payload);
    expect(body.error.code).toBe("AUTHORIZATION_EXPIRED");
  });

  // 5. Payment Verification Success & Atomic Merchant Order Creation
  it("E. Payment Verification Success: Valid signature decrements inventory, marks payment PAID, and creates MerchantOrder", async () => {
    // 1. Create checkout and authorize
    const chkRes = await app.inject({
      method: "POST",
      url: "/checkout_sessions",
      payload: { items: [{ product_id: testProduct.id, quantity: 1 }] }
    });
    const chk = JSON.parse(chkRes.payload);

    const mandateRes = await app.inject({
      method: "POST",
      url: "/api/v1/authorizations/mandates",
      payload: {
        checkout_id: chk.checkout_id,
        user_constraints: { max_amount: 50000, currency: "INR" }
      }
    });
    const issuedMandate = JSON.parse(mandateRes.payload);

    await app.inject({
      method: "POST",
      url: `/api/v1/authorizations/mandates/${issuedMandate.mandate_id}/approve`,
      payload: { confirmation: true }
    });

    // 2. Initiate Payment
    const initRes = await app.inject({
      method: "POST",
      url: "/api/v1/payments/initiate",
      payload: {
        mandate_id: issuedMandate.mandate_id,
        checkout_id: chk.checkout_id
      }
    });
    const payment = JSON.parse(initRes.payload);

    // Initial stock
    const preStock = await prisma.inventory.findUnique({
      where: { productId: testProduct.id }
    });

    // 3. Generate Valid Signature
    const dummyPaymentId = `pay_${crypto.randomBytes(8).toString("hex")}`;
    const validSignature = razorpayProvider.generatePaymentSignature(
      payment.razorpay_order_id,
      dummyPaymentId
    );

    // 4. Verify Payment
    const verifyRes = await app.inject({
      method: "POST",
      url: "/api/v1/payments/verify",
      payload: {
        payment_id: payment.payment_id,
        razorpay_order_id: payment.razorpay_order_id,
        razorpay_payment_id: dummyPaymentId,
        razorpay_signature: validSignature
      }
    });

    expect(verifyRes.statusCode).toBe(200);
    const verifyBody = JSON.parse(verifyRes.payload);

    expect(verifyBody.status).toBe("PAID");
    expect(verifyBody.order).toBeDefined();
    expect(verifyBody.order.order_id).toBeDefined();
    expect(verifyBody.order.status).toBe("PLACED");
    expect(verifyBody.order.total).toBe(chk.total);

    // 5. Verify Inventory Decrement
    const postStock = await prisma.inventory.findUnique({
      where: { productId: testProduct.id }
    });
    expect(postStock!.availableQuantity).toBe(preStock!.availableQuantity - 1);

    // 6. Verify Checkout Completed
    const updatedChk = await prisma.checkoutSession.findUnique({
      where: { id: chk.checkout_id }
    });
    expect(updatedChk?.status).toBe("COMPLETED");
  });

  // 6. Payment Verification Failure (Invalid Signature)
  it("F. Payment Verification Failure: Tampered/invalid signature rejects payment without creating merchant order", async () => {
    // 1. Create checkout and authorize
    const chkRes = await app.inject({
      method: "POST",
      url: "/checkout_sessions",
      payload: { items: [{ product_id: testProduct.id, quantity: 1 }] }
    });
    const chk = JSON.parse(chkRes.payload);

    const mandateRes = await app.inject({
      method: "POST",
      url: "/api/v1/authorizations/mandates",
      payload: {
        checkout_id: chk.checkout_id,
        user_constraints: { max_amount: 50000, currency: "INR" }
      }
    });
    const issuedMandate = JSON.parse(mandateRes.payload);

    await app.inject({
      method: "POST",
      url: `/api/v1/authorizations/mandates/${issuedMandate.mandate_id}/approve`,
      payload: { confirmation: true }
    });

    // 2. Initiate Payment
    const initRes = await app.inject({
      method: "POST",
      url: "/api/v1/payments/initiate",
      payload: {
        mandate_id: issuedMandate.mandate_id,
        checkout_id: chk.checkout_id
      }
    });
    const payment = JSON.parse(initRes.payload);

    // 3. Attempt verification with forged signature
    const verifyRes = await app.inject({
      method: "POST",
      url: "/api/v1/payments/verify",
      payload: {
        payment_id: payment.payment_id,
        razorpay_order_id: payment.razorpay_order_id,
        razorpay_payment_id: "pay_forged_999",
        razorpay_signature: "forged_signature_hex_value_with_mismatch"
      }
    });

    expect(verifyRes.statusCode).toBe(400);
    const errBody = JSON.parse(verifyRes.payload);
    expect(errBody.error.code).toBe("INVALID_PAYMENT_SIGNATURE");

    // No order should exist
    const order = await prisma.merchantOrder.findFirst({
      where: { paymentId: payment.payment_id }
    });
    expect(order).toBeNull();
  });

  // 7. Webhook Signature Verification & Idempotent Processing
  it("G. Webhook Processing: Verifies webhook HMAC signature and blocks duplicate replays", async () => {
    const rawPayload = JSON.stringify({
      event: "payment.captured",
      event_id: `evt_${crypto.randomUUID()}`,
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        payment: {
          entity: {
            id: `pay_${crypto.randomBytes(6).toString("hex")}`,
            order_id: `order_${crypto.randomBytes(6).toString("hex")}`,
            amount: 472400,
            status: "captured"
          }
        }
      }
    });

    // 1. Valid Signature
    const validSignature = razorpayProvider.generateWebhookSignature(rawPayload);

    const res1 = await app.inject({
      method: "POST",
      url: "/webhooks/razorpay",
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": validSignature
      },
      payload: rawPayload
    });

    expect(res1.statusCode).toBe(200);
    const body1 = JSON.parse(res1.payload);
    expect(body1.status).toBe("SUCCESS");

    // 2. Duplicate Webhook Replay (Must be safely ignored)
    const res2 = await app.inject({
      method: "POST",
      url: "/webhooks/razorpay",
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": validSignature
      },
      payload: rawPayload
    });

    expect(res2.statusCode).toBe(200);
    const body2 = JSON.parse(res2.payload);
    expect(body2.status).toBe("DUPLICATE_IGNORED");

    // 3. Invalid Webhook Signature (Must be rejected)
    const res3 = await app.inject({
      method: "POST",
      url: "/webhooks/razorpay",
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": "invalid_webhook_signature"
      },
      payload: rawPayload
    });

    expect(res3.statusCode).toBe(400);
  });

  // 8. Gemini Agent Security Boundary Verification
  it("H. Security Boundary: Gemini Tool Registry contains NO payment execution triggers or secret credentials", () => {
    const toolRegistry = new ToolRegistry();
    const tools = toolRegistry.getToolDefinitions();

    const sensitiveWords = [
      "razorpay",
      "execute_payment",
      "capture_payment",
      "secret",
      "webhook_secret",
      "sign_mandate"
    ];

    for (const tool of tools) {
      for (const word of sensitiveWords) {
        expect(tool.name.toLowerCase()).not.toContain(word);
      }
    }
  });
});
