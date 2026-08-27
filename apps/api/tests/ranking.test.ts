import { describe, it, expect } from "vitest";
import { GeminiService } from "../src/buyer/services/gemini.service.js";
import { StructuredIntent } from "../src/buyer/schemas/intent.schema.js";

describe("Phase 2: Product Ranking and Scoring", () => {
  const gemini = new GeminiService();

  const mockCandidates = [
    {
      id: "11111111-1111-1111-1111-111111111111",
      sku: "HP-ANC-001",
      name: "SoundMax ANC Pro",
      category: "headphones",
      price: 4499,
      rating: 4.5,
      availability: { in_stock: true, quantity: 12 },
      attributes: { wireless: true, anc: true, battery_hours: 35 },
      delivery_estimate: "1-2 days"
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      sku: "HP-BT-003",
      name: "PulseBass HD Wireless",
      category: "headphones",
      price: 2999,
      rating: 4.2,
      availability: { in_stock: true, quantity: 18 },
      attributes: { wireless: true, anc: false, battery_hours: 40 },
      delivery_estimate: "1-2 days"
    },
    {
      id: "33333333-3333-3333-3333-333333333333",
      sku: "HP-OOS-005",
      name: "EchoZero Wireless ANC (OOS)",
      category: "headphones",
      price: 4999,
      rating: 4.9,
      availability: { in_stock: false, quantity: 0 },
      attributes: { wireless: true, anc: true },
      delivery_estimate: "5-7 days"
    }
  ];

  it("selects SoundMax ANC Pro as the highest scored product when ANC and wireless under ₹5000 is requested", async () => {
    const intent: StructuredIntent = {
      category: "headphones",
      raw_query: "wireless ANC headphones under 5000",
      constraints: {
        wireless: true,
        anc: true,
        max_price: 5000,
        currency: "INR"
      },
      quantity: 1,
      purchase_intent: true,
      is_ambiguous: false
    };

    const report = await gemini.rankProducts(intent, mockCandidates);

    expect(report.selected_product_id).toBe("11111111-1111-1111-1111-111111111111");
    expect(report.ranked_products.length).toBe(3);

    const soundMax = report.ranked_products.find(
      (r) => r.product_id === "11111111-1111-1111-1111-111111111111"
    );
    expect(soundMax?.score).toBeGreaterThan(0.8);
    expect(soundMax?.is_recommended).toBe(true);
  });

  it("penalizes out-of-stock products in ranking score", async () => {
    const intent: StructuredIntent = {
      category: "headphones",
      raw_query: "ANC headphones",
      constraints: {
        anc: true,
        currency: "INR"
      },
      quantity: 1,
      purchase_intent: true,
      is_ambiguous: false
    };

    const report = await gemini.rankProducts(intent, mockCandidates);
    const oosProduct = report.ranked_products.find(
      (r) => r.product_id === "33333333-3333-3333-3333-333333333333"
    );

    const inStockProduct = report.ranked_products.find(
      (r) => r.product_id === "11111111-1111-1111-1111-111111111111"
    );

    expect(inStockProduct?.score).toBeGreaterThan(oosProduct?.score || 0);
  });

  it("returns clean empty report if candidate list is empty", async () => {
    const intent: StructuredIntent = {
      category: "headphones",
      raw_query: "headphones under 100",
      constraints: { max_price: 100, currency: "INR" },
      quantity: 1,
      purchase_intent: true,
      is_ambiguous: false
    };

    const report = await gemini.rankProducts(intent, []);
    expect(report.selected_product_id).toBeNull();
    expect(report.ranked_products).toEqual([]);
    expect(report.summary_reasoning).toBeDefined();
  });
});
