import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";

describe("Phase 2: Merchant Cart APIs & Service", () => {
  let app: FastifyInstance;
  let validProductId: string;
  let oosProductId: string;
  let validProductPrice: number;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    // Fetch a valid in-stock product and out-of-stock product from DB
    const inStock = await prisma.product.findFirst({
      where: {
        status: "ACTIVE",
        inventory: { availableQuantity: { gt: 0 } }
      }
    });
    validProductId = inStock!.id;
    validProductPrice = inStock!.price;

    const oos = await prisma.product.findFirst({
      where: {
        status: "ACTIVE",
        inventory: { availableQuantity: 0 }
      }
    });
    oosProductId = oos!.id;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("POST /api/v1/cart creates a new cart with server-authoritative pricing", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/cart",
      payload: {
        product_id: validProductId,
        quantity: 1
      }
    });

    expect(res.statusCode).toBe(201);
    const json = JSON.parse(res.payload);
    expect(json.cart_id).toBeDefined();
    expect(json.subtotal).toBe(validProductPrice);
    expect(json.currency).toBe("INR");
    expect(json.items.length).toBe(1);
    expect(json.items[0].product_id).toBe(validProductId);
    expect(json.items[0].unit_price).toBe(validProductPrice);
  });

  it("POST /api/v1/cart with out-of-stock product returns 400 PRODUCT_OUT_OF_STOCK", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/cart",
      payload: {
        product_id: oosProductId,
        quantity: 1
      }
    });

    expect(res.statusCode).toBe(400);
    const json = JSON.parse(res.payload);
    expect(json.error.code).toBe("PRODUCT_OUT_OF_STOCK");
  });

  it("POST /api/v1/cart with invalid UUID returns 400 INVALID_PARAMETER", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/cart",
      payload: {
        product_id: "non-uuid-string",
        quantity: 1
      }
    });

    expect(res.statusCode).toBe(400);
    const json = JSON.parse(res.payload);
    expect(json.error.code).toBe("INVALID_PARAMETER");
  });

  it("GET /api/v1/cart/:id retrieves existing cart", async () => {
    // 1. Create cart
    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/cart",
      payload: {
        product_id: validProductId,
        quantity: 2
      }
    });
    const createdCart = JSON.parse(createRes.payload);

    // 2. Fetch cart
    const getRes = await app.inject({
      method: "GET",
      url: `/api/v1/cart/${createdCart.cart_id}`
    });

    expect(getRes.statusCode).toBe(200);
    const fetched = JSON.parse(getRes.payload);
    expect(fetched.cart_id).toBe(createdCart.cart_id);
    expect(fetched.subtotal).toBe(validProductPrice * 2);
    expect(fetched.item_count).toBe(2);
  });
});
