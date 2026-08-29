import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import {
  PolicyEvaluationReport,
  PolicyCheckItem,
  PolicyReasonCode
} from "../schemas/authorization.schema.js";
import { auditService } from "./audit.service.js";

export interface PolicyEngineEvaluationContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
}

export class PolicyEngine {
  /**
   * Deterministically evaluates a CheckoutSession against UserConstraints
   */
  public async evaluate(
    checkoutId: string,
    constraints: {
      maxAmount: number;
      currency: string;
      allowedMerchants?: string[];
      allowedCategories?: string[];
      maxQuantity?: number;
      requiredFeatures?: Record<string, any>;
      expiresAt?: Date | string;
    },
    context: PolicyEngineEvaluationContext
  ): Promise<PolicyEvaluationReport> {
    const checks: PolicyCheckItem[] = [];

    // Log policy check start
    await auditService.logEvent({
      requestId: context.requestId,
      userId: context.userId,
      agentSessionId: context.sessionId,
      checkoutId,
      eventType: "POLICY_CHECK_STARTED" as any,
      result: "SUCCESS",
      metadata: { constraints }
    });

    // 1. Fetch live Checkout Session from PostgreSQL
    const session = await prisma.checkoutSession.findUnique({
      where: { id: checkoutId },
      include: {
        merchant: true,
        items: {
          include: {
            product: {
              include: { inventory: true }
            }
          }
        }
      }
    });

    if (!session) {
      const report: PolicyEvaluationReport = {
        decision: "DENY",
        reason_code: "INVALID_CHECKOUT_STATE",
        reason_message: `Checkout session '${checkoutId}' does not exist.`,
        checkout_id: checkoutId,
        total_amount: 0,
        max_authorized_amount: constraints.maxAmount,
        currency: constraints.currency,
        checks: [
          {
            check: "SESSION_EXISTS",
            name: "Checkout Exists",
            passed: false,
            details: "Session not found in merchant database"
          }
        ],
        timestamp: new Date().toISOString()
      };

      await auditService.logEvent({
        requestId: context.requestId,
        userId: context.userId,
        checkoutId,
        eventType: "POLICY_DENIED" as any,
        result: "VALIDATION_FAILED",
        metadata: { reason_code: report.reason_code, message: report.reason_message }
      });

      return report;
    }

    // 2. Check: Expiration
    let expirationPassed = true;
    let expirationDetails = "Authorization constraints active";
    if (constraints.expiresAt) {
      const expDate = new Date(constraints.expiresAt);
      if (new Date() > expDate) {
        expirationPassed = false;
        expirationDetails = `Constraints expired at ${expDate.toISOString()}`;
      }
    }
    checks.push({
      check: "EXPIRATION",
      name: "Constraints Validity Period",
      passed: expirationPassed,
      details: expirationDetails
    });

    // 3. Check: Checkout Status is READY_FOR_PAYMENT
    const statusPassed = session.status === "READY_FOR_PAYMENT";
    checks.push({
      check: "CHECKOUT_STATE",
      name: "Checkout State Readiness",
      passed: statusPassed,
      details: `Status is '${session.status}' (expected 'READY_FOR_PAYMENT')`
    });

    // 4. Check: Currency Match
    const currencyPassed = session.currency.toUpperCase() === constraints.currency.toUpperCase();
    checks.push({
      check: "CURRENCY_MATCH",
      name: "Currency Consistency",
      passed: currencyPassed,
      details: `Checkout currency ${session.currency} == Authorized currency ${constraints.currency}`
    });

    // 5. Check: Budget Limit (checkout.total <= maxAmount)
    const amountPassed = session.total <= constraints.maxAmount;
    checks.push({
      check: "AMOUNT_LIMIT",
      name: "Spending Budget Limit",
      passed: amountPassed,
      details: `Checkout total ₹${session.total.toLocaleString("en-IN")} <= Max authorized ₹${constraints.maxAmount.toLocaleString("en-IN")}`
    });

    // 6. Check: Merchant Allowlist
    let merchantPassed = true;
    let merchantDetails = `Merchant '${session.merchant.name}' (${session.merchantId}) verified`;
    const allowedMerchants = constraints.allowedMerchants || [];
    if (allowedMerchants.length > 0) {
      const allowedLower = allowedMerchants.map((m) => m.toLowerCase());
      const isIdAllowed = allowedLower.includes(session.merchantId.toLowerCase());
      const isNameAllowed = allowedLower.some((name) =>
        session.merchant.name.toLowerCase().includes(name)
      );

      if (!isIdAllowed && !isNameAllowed) {
        merchantPassed = false;
        merchantDetails = `Merchant '${session.merchant.name}' not in allowed list [${allowedMerchants.join(", ")}]`;
      }
    }
    checks.push({
      check: "MERCHANT_ALLOWLIST",
      name: "Merchant Allowlist Verification",
      passed: merchantPassed,
      details: merchantDetails
    });

    // 7. Check: Category Allowlist
    let categoryPassed = true;
    const allowedCategories = (constraints.allowedCategories || []).map((c) => c.toLowerCase());
    const invalidCategories: string[] = [];

    if (allowedCategories.length > 0) {
      for (const item of session.items) {
        const itemCategory = item.product.category.toLowerCase();
        if (!allowedCategories.includes(itemCategory)) {
          categoryPassed = false;
          invalidCategories.push(`${item.product.name} (${item.product.category})`);
        }
      }
    }
    checks.push({
      check: "CATEGORY_ALLOWLIST",
      name: "Product Category Authorization",
      passed: categoryPassed,
      details: categoryPassed
        ? "All products belong to authorized categories"
        : `Unauthorized categories detected: ${invalidCategories.join(", ")}`
    });

    // 8. Check: Quantity Limit
    const totalQuantity = session.items.reduce((sum, i) => sum + i.quantity, 0);
    const maxQty = constraints.maxQuantity || 1;
    const quantityPassed = totalQuantity <= maxQty;
    checks.push({
      check: "QUANTITY_LIMIT",
      name: "Quantity Limit Verification",
      passed: quantityPassed,
      details: `Total quantity ${totalQuantity} <= Max allowed ${maxQty}`
    });

    // 9. Check: Required Features
    let featuresPassed = true;
    const requiredFeatures = constraints.requiredFeatures || {};
    const featureMismatches: string[] = [];

    for (const [featKey, expectedVal] of Object.entries(requiredFeatures)) {
      for (const item of session.items) {
        const attrs = (item.product.attributes as Record<string, any>) || {};
        if (expectedVal === true && !attrs[featKey]) {
          featuresPassed = false;
          featureMismatches.push(`${item.product.name} missing '${featKey}'`);
        }
      }
    }
    checks.push({
      check: "FEATURE_REQUIREMENTS",
      name: "Mandatory Feature Verification",
      passed: featuresPassed,
      details: featuresPassed
        ? "All required features satisfied"
        : `Feature mismatches: ${featureMismatches.join(", ")}`
    });

    // 10. Check: Live Inventory Stock
    let stockPassed = true;
    const stockErrors: string[] = [];
    for (const item of session.items) {
      if (item.product.status !== "ACTIVE") {
        stockPassed = false;
        stockErrors.push(`Product '${item.product.name}' is inactive`);
      }
      const available = item.product.inventory?.availableQuantity ?? 0;
      if (available < item.quantity) {
        stockPassed = false;
        stockErrors.push(
          `Insufficient stock for '${item.product.name}' (requested: ${item.quantity}, available: ${available})`
        );
      }
    }
    checks.push({
      check: "INVENTORY_AVAILABLE",
      name: "Real-Time Stock Verification",
      passed: stockPassed,
      details: stockPassed
        ? "All line items verified in stock"
        : `Stock issues: ${stockErrors.join("; ")}`
    });

    // 11. Check: Cryptographic Snapshot Integrity
    const currentHashPayload = {
      items: session.items.map((i) => ({
        product_id: i.productId,
        quantity: i.quantity,
        unit_price: i.unitPrice
      })).sort((a, b) => a.product_id.localeCompare(b.product_id)),
      currency: session.currency,
      fulfillment: {
        selected_option: (session.fulfillment as any)?.selected_shipping_option_id || "std_delivery",
        address: (session.fulfillment as any)?.buyer_address || null
      },
      total: session.total
    };
    const computedHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(currentHashPayload))
      .digest("hex");

    const integrityPassed = computedHash === session.integrityHash;
    checks.push({
      check: "INTEGRITY_VERIFIED",
      name: "Checkout Snapshot Integrity",
      passed: integrityPassed,
      details: integrityPassed
        ? "SHA-256 integrity hash matches database snapshot"
        : `Hash mismatch (computed ${computedHash.slice(0, 10)}... != stored ${session.integrityHash.slice(0, 10)}...)`
    });

    // Evaluate Final Decision
    const allPassed =
      expirationPassed &&
      statusPassed &&
      currencyPassed &&
      amountPassed &&
      merchantPassed &&
      categoryPassed &&
      quantityPassed &&
      featuresPassed &&
      stockPassed &&
      integrityPassed;

    let reasonCode: PolicyReasonCode = "POLICY_PASSED";
    let reasonMessage = "All deterministic policy security checks passed.";

    if (!allPassed) {
      if (!expirationPassed) {
        reasonCode = "CONSTRAINT_EXPIRED";
        reasonMessage = "User authorization constraints have expired.";
      } else if (!statusPassed) {
        reasonCode = "INVALID_CHECKOUT_STATE";
        reasonMessage = `Checkout session is not in READY_FOR_PAYMENT state (current: ${session.status}).`;
      } else if (!currencyPassed) {
        reasonCode = "CURRENCY_MISMATCH";
        reasonMessage = `Currency mismatch (${session.currency} != ${constraints.currency}).`;
      } else if (!amountPassed) {
        reasonCode = "AMOUNT_EXCEEDED";
        reasonMessage = `Checkout total (₹${session.total}) exceeds user authorized limit (₹${constraints.maxAmount}).`;
      } else if (!merchantPassed) {
        reasonCode = "MERCHANT_NOT_ALLOWED";
        reasonMessage = `Merchant '${session.merchant.name}' is not in user's authorized merchant list.`;
      } else if (!categoryPassed) {
        reasonCode = "CATEGORY_NOT_ALLOWED";
        reasonMessage = `Product categories contain unauthorized items: ${invalidCategories.join(", ")}.`;
      } else if (!quantityPassed) {
        reasonCode = "QUANTITY_EXCEEDED";
        reasonMessage = `Requested quantity (${totalQuantity}) exceeds authorized limit (${maxQty}).`;
      } else if (!featuresPassed) {
        reasonCode = "FEATURE_MISMATCH";
        reasonMessage = `Required features not met: ${featureMismatches.join(", ")}.`;
      } else if (!stockPassed) {
        reasonCode = "INSUFFICIENT_STOCK";
        reasonMessage = `Stock verification failed: ${stockErrors.join("; ")}.`;
      } else if (!integrityPassed) {
        reasonCode = "INTEGRITY_VIOLATION";
        reasonMessage = "Checkout snapshot has been altered or tampered with.";
      }
    }

    const decision = allPassed ? "ALLOW" : "DENY";

    // Log policy outcome
    await auditService.logEvent({
      requestId: context.requestId,
      userId: context.userId,
      agentSessionId: context.sessionId,
      checkoutId,
      eventType: allPassed ? ("POLICY_CHECK_PASSED" as any) : ("POLICY_DENIED" as any),
      result: allPassed ? "SUCCESS" : "FAILURE",
      metadata: {
        decision,
        reason_code: reasonCode,
        reason_message: reasonMessage,
        failed_checks: checks.filter((c) => !c.passed).map((c) => c.name)
      }
    });

    return {
      decision,
      reason_code: reasonCode,
      reason_message: reasonMessage,
      checkout_id: checkoutId,
      total_amount: session.total,
      max_authorized_amount: constraints.maxAmount,
      currency: session.currency,
      checks,
      timestamp: new Date().toISOString()
    };
  }
}

export const policyEngine = new PolicyEngine();
