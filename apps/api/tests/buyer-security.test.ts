import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { ToolRegistry } from "../src/buyer/tools/tool-registry.js";

describe("Phase 2: AI Buyer Tool Security & Sandboxing", () => {
  let app: FastifyInstance;
  const toolRegistry = new ToolRegistry();

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("strictly rejects unauthorized tools outside the allowlist", async () => {
    await expect(
      toolRegistry.executeTool("execute_payment_now", { amount: 5000 })
    ).rejects.toThrow(/Security Violation: Tool 'execute_payment_now' is not in the authorized tool allowlist/);
  });

  it("POST /api/v1/buyer/tools/execute rejects unauthorized tool calls with 403 or 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/buyer/tools/execute",
      payload: {
        tool_name: "delete_database",
        parameters: {}
      }
    });

    expect([400, 403, 500]).toContain(res.statusCode);
    const json = JSON.parse(res.payload);
    expect(json.error).toBeDefined();
  });

  it("validates tool parameters with Zod before executing", async () => {
    await expect(
      toolRegistry.executeTool("create_cart", {
        product_id: "not-a-uuid",
        quantity: -5
      })
    ).rejects.toThrow();
  });

  it("POST /api/v1/buyer/chat processes full AI buyer loop", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/buyer/chat",
      payload: {
        prompt: "Find wireless ANC headphones under 5000"
      }
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.payload);
    expect(json.intent.category).toBe("headphones");
    expect(json.intent.constraints.anc).toBe(true);
    expect(json.timeline.length).toBeGreaterThanOrEqual(3);
    expect(json.ranking.selected_product_id).toBeDefined();
    expect(json.recommended_product).toBeDefined();
    expect(json.recommended_product.name).toContain("SoundMax");
  });
});
