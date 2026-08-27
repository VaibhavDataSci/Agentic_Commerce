import { describe, it, expect } from "vitest";
import { GeminiService } from "../src/buyer/services/gemini.service.js";

describe("Phase 2: Natural-Language Intent Understanding", () => {
  const gemini = new GeminiService();

  it("extracts structured constraints from a standard shopping query", async () => {
    const prompt = "Find me wireless ANC headphones under ₹5,000 preferably deliverable tomorrow";
    const intent = await gemini.extractIntent(prompt);

    expect(intent.category).toBe("headphones");
    expect(intent.constraints.wireless).toBe(true);
    expect(intent.constraints.anc).toBe(true);
    expect(intent.constraints.max_price).toBe(5000);
    expect(intent.constraints.delivery_preference).toBe("tomorrow");
    expect(intent.is_ambiguous).toBe(false);
    expect(intent.purchase_intent).toBe(true);
  });

  it("handles queries with missing budget gracefully", async () => {
    const prompt = "Looking for a mechanical keyboard";
    const intent = await gemini.extractIntent(prompt);

    expect(intent.category).toBe("keyboards");
    expect(intent.constraints.max_price).toBeUndefined();
    expect(intent.is_ambiguous).toBe(false);
  });

  it("detects ambiguous requests and formulates a clarification question", async () => {
    const prompt = "I want to buy some tech stuff";
    const intent = await gemini.extractIntent(prompt);

    expect(intent.is_ambiguous).toBe(true);
    expect(intent.clarification_question).toBeDefined();
    expect(typeof intent.clarification_question).toBe("string");
  });

  it("extracts constraints for gaming laptops", async () => {
    const prompt = "Need a high refresh rate gaming laptop below 90000";
    const intent = await gemini.extractIntent(prompt);

    expect(intent.category).toBe("laptops");
    expect(intent.constraints.max_price).toBe(90000);
    expect(intent.is_ambiguous).toBe(false);
  });
});
