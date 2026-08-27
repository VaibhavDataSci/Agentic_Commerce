import { describe, it, expect } from "vitest";
import { defaultRuleEngine } from "../src/rules/index.js";

describe("Retail Platform Rule Engine Tests", () => {
  describe("1. Input Validation Rules", () => {
    it("rejects query length < 2", async () => {
      const report = await defaultRuleEngine.evaluate({ query: "x" }, "validation");
      const matched = report.results.find((r) => r.ruleId === "VAL_001_MIN_QUERY_LENGTH");
      expect(matched?.matched).toBe(true);
      expect(matched?.actionResult.valid).toBe(false);
    });

    it("sanitizes invalid characters in query", async () => {
      const report = await defaultRuleEngine.evaluate({ query: "laptop<script>alert(1)</script>" }, "validation");
      const matched = report.results.find((r) => r.ruleId === "VAL_002_SANITIZE_INPUT");
      expect(matched?.matched).toBe(true);
      expect(matched?.actionResult.sanitized).toBe(true);
      expect(matched?.actionResult.cleanValue).not.toContain("<");
    });
  });

  describe("2. Cart Optimization Rules", () => {
    it("suggests add-ons if cart_value < 1000", async () => {
      const report = await defaultRuleEngine.evaluate({ cartValue: 650, itemCount: 1 }, "cart");
      const matched = report.results.find((r) => r.ruleId === "CART_001_LOW_VALUE_ADDONS");
      expect(matched?.matched).toBe(true);
      expect(matched?.actionResult.suggestAddons).toBe(true);
      expect(matched?.actionResult.amountNeeded).toBe(350);
    });

    it("applies premium discount if cart_value > 3000", async () => {
      const report = await defaultRuleEngine.evaluate({ cartValue: 5000, itemCount: 2 }, "cart");
      const matched = report.results.find((r) => r.ruleId === "CART_002_PREMIUM_DISCOUNT");
      expect(matched?.matched).toBe(true);
      expect(matched?.actionResult.discountPercentage).toBe(10);
      expect(matched?.actionResult.discountAmount).toBe(500);
      expect(matched?.actionResult.finalCartValue).toBe(4500);
    });
  });

  describe("3. User Behavior Rules", () => {
    it("triggers discount popup if user inactive for 10 seconds", async () => {
      const report = await defaultRuleEngine.evaluate({ inactivitySeconds: 12, isReturningUser: false }, "user_behavior");
      const matched = report.results.find((r) => r.ruleId === "BEHAVIOR_001_INACTIVITY_POPUP");
      expect(matched?.matched).toBe(true);
      expect(matched?.actionResult.triggerPopup).toBe(true);
      expect(matched?.actionResult.discountCode).toBe("TECHKART5");
    });

    it("prioritizes personalized recommendations for returning users", async () => {
      const report = await defaultRuleEngine.evaluate(
        { inactivitySeconds: 2, isReturningUser: true, viewedCategories: ["keyboards", "mice"] },
        "user_behavior"
      );
      const matched = report.results.find((r) => r.ruleId === "BEHAVIOR_002_RETURNING_USER_PERSONALIZATION");
      expect(matched?.matched).toBe(true);
      expect(matched?.actionResult.prioritizePersonalized).toBe(true);
      expect(matched?.actionResult.boostCategories).toContain("keyboards");
    });
  });

  describe("4. Security Rules", () => {
    it("blocks request if rate limit exceeded", async () => {
      const report = await defaultRuleEngine.evaluate(
        { requestRatePerMinute: 120, rateLimitThreshold: 100, isMalformed: false },
        "security"
      );
      const matched = report.results.find((r) => r.ruleId === "SEC_001_RATE_LIMIT_EXCEEDED");
      expect(matched?.matched).toBe(true);
      expect(matched?.actionResult.block).toBe(true);
      expect(matched?.actionResult.statusCode).toBe(429);
    });

    it("rejects malformed request with structured error", async () => {
      const report = await defaultRuleEngine.evaluate(
        { requestRatePerMinute: 10, rateLimitThreshold: 100, isMalformed: true, malformedReasons: ["Invalid SKU format"] },
        "security"
      );
      const matched = report.results.find((r) => r.ruleId === "SEC_002_MALFORMED_REQUEST");
      expect(matched?.matched).toBe(true);
      expect(matched?.actionResult.statusCode).toBe(400);
      expect(matched?.actionResult.errorCode).toBe("MALFORMED_REQUEST");
    });
  });

  describe("5. Performance Rules", () => {
    it("returns cached result on repeated queries", async () => {
      const report = await defaultRuleEngine.evaluate(
        { isCached: true, cacheKey: "search:headphones" },
        "performance"
      );
      const matched = report.results.find((r) => r.ruleId === "PERF_001_CACHED_QUERY");
      expect(matched?.matched).toBe(true);
      expect(matched?.actionResult.fromCache).toBe(true);
    });

    it("caps recommendation limit to max 6 items", async () => {
      const report = await defaultRuleEngine.evaluate(
        { isCached: false, requestedRecommendationLimit: 20 },
        "performance"
      );
      const matched = report.results.find((r) => r.ruleId === "PERF_002_LIMIT_RECOMMENDATIONS");
      expect(matched?.matched).toBe(true);
      expect(matched?.actionResult.cappedLimit).toBe(6);
    });
  });

  describe("6. Accessibility Rules", () => {
    it("flags missing keyboard handlers", async () => {
      const report = await defaultRuleEngine.evaluate({ hasKeyboardHandlers: false, hasAriaLabels: true }, "accessibility");
      const matched = report.results.find((r) => r.ruleId === "A11Y_001_KEYBOARD_ACCESSIBILITY");
      expect(matched?.matched).toBe(true);
      expect(matched?.actionResult.compliant).toBe(false);
    });

    it("flags missing aria labels", async () => {
      const report = await defaultRuleEngine.evaluate({ hasKeyboardHandlers: true, hasAriaLabels: false }, "accessibility");
      const matched = report.results.find((r) => r.ruleId === "A11Y_002_PROPER_LABELS");
      expect(matched?.matched).toBe(true);
      expect(matched?.actionResult.compliant).toBe(false);
    });
  });
});
