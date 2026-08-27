import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";

describe("TechKart Merchant API Integration Tests", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe("Health & Merchant Profile", () => {
    it("GET /health should return 200 and healthy status", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/health"
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload);
      expect(json.status).toBe("healthy");
      expect(json.database).toBe("connected");
    });

    it("GET /api/v1/merchant should return TechKart merchant info and AI-readiness metrics", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/merchant"
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload);
      expect(json.name).toBe("TechKart Electronics");
      expect(json.currency).toBe("INR");
      expect(json.metrics.total_products).toBeGreaterThanOrEqual(20);
      expect(json.ai_readiness.structured_catalog).toBe(true);
      expect(json.ai_readiness.machine_readable_pricing).toBe(true);
    });
  });

  describe("Products API", () => {
    it("GET /api/v1/products should list products with AI-readable structure", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/products"
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload);
      expect(Array.isArray(json.products)).toBe(true);
      expect(json.total).toBeGreaterThanOrEqual(20);

      const first = json.products[0];
      expect(first).toHaveProperty("id");
      expect(first).toHaveProperty("sku");
      expect(first).toHaveProperty("name");
      expect(first).toHaveProperty("category");
      expect(first).toHaveProperty("price");
      expect(first).toHaveProperty("currency", "INR");
      expect(first).toHaveProperty("availability");
      expect(first.availability).toHaveProperty("in_stock");
      expect(first.availability).toHaveProperty("quantity");
      expect(first).toHaveProperty("attributes");
      expect(first).toHaveProperty("rating");
      expect(first).toHaveProperty("delivery_estimate");
    });

    it("GET /api/v1/products/:id should return single product", async () => {
      // First get all to pick an ID
      const listRes = await app.inject({
        method: "GET",
        url: "/api/v1/products?limit=1"
      });
      const sampleProduct = JSON.parse(listRes.payload).products[0];

      const res = await app.inject({
        method: "GET",
        url: `/api/v1/products/${sampleProduct.id}`
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.id).toBe(sampleProduct.id);
      expect(json.sku).toBe(sampleProduct.sku);
      expect(json.price).toBe(sampleProduct.price);
    });

    it("GET /api/v1/products/:id with non-existent UUID should return 404 with structured error", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/products/00000000-0000-0000-0000-999999999999"
      });

      expect(res.statusCode).toBe(404);
      const json = JSON.parse(res.payload);
      expect(json.error.code).toBe("PRODUCT_NOT_FOUND");
      expect(json.error.request_id).toBeDefined();
    });

    it("GET /api/v1/products/:id with invalid non-UUID format should return 400 INVALID_PARAMETER", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/products/invalid-id-format"
      });

      expect(res.statusCode).toBe(400);
      const json = JSON.parse(res.payload);
      expect(json.error.code).toBe("INVALID_PARAMETER");
    });
  });

  describe("Search and Filter API", () => {
    it("GET /api/v1/products/search with headphones under ₹5,000 in-stock returns only matching products", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/products/search?category=headphones&max_price=5000&in_stock=true"
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.products.length).toBeGreaterThan(0);

      for (const prod of json.products) {
        expect(prod.category).toBe("headphones");
        expect(prod.price).toBeLessThanOrEqual(5000);
        expect(prod.availability.in_stock).toBe(true);
        expect(prod.availability.quantity).toBeGreaterThan(0);
      }
    });

    it("GET /api/v1/products/search with query < 2 chars triggers validation rule rejection", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/products/search?query=a"
      });

      expect(res.statusCode).toBe(400);
      const json = JSON.parse(res.payload);
      expect(json.error.code).toBe("INVALID_PARAMETER");
      expect(json.error.message).toContain("at least 2 characters");
    });

    it("GET /api/v1/products/search with invalid non-numeric max_price should return 400 INVALID_PARAMETER", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/products/search?max_price=abc"
      });

      expect(res.statusCode).toBe(400);
      const json = JSON.parse(res.payload);
      expect(json.error.code).toBe("INVALID_PARAMETER");
    });
  });

  describe("Inventory & Stock Level API", () => {
    it("GET /api/v1/inventory/:productId returns real-time inventory level", async () => {
      const listRes = await app.inject({
        method: "GET",
        url: "/api/v1/products?limit=1"
      });
      const sample = JSON.parse(listRes.payload).products[0];

      const res = await app.inject({
        method: "GET",
        url: `/api/v1/inventory/${sample.id}`
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.product_id).toBe(sample.id);
      expect(json.sku).toBe(sample.sku);
      expect(typeof json.available_quantity).toBe("number");
      expect(typeof json.in_stock).toBe("boolean");
    });

    it("Out-of-stock product is represented accurately", async () => {
      // Find out-of-stock product seeded: HP-OOS-005
      const searchRes = await app.inject({
        method: "GET",
        url: "/api/v1/products/search?query=EchoZero"
      });

      const json = JSON.parse(searchRes.payload);
      expect(json.products.length).toBeGreaterThan(0);
      const oosProd = json.products[0];
      expect(oosProd.availability.in_stock).toBe(false);
      expect(oosProd.availability.quantity).toBe(0);
    });
  });
});
