import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import {
  CreateMandateRequest,
  MandateResponse,
  PolicyEvaluationReport
} from "../schemas/authorization.schema.js";
import { policyEngine } from "./policy-engine.service.js";
import { auditService } from "./audit.service.js";

// Secret for HMAC signing (fallback to deterministic secret if not in env)
const MANDATE_SIGNING_SECRET = (env as any).MANDATE_SECRET || "agentcart_ap2_mandate_signing_secret_2026";

export class MandateService {
  /**
   * Cryptographically signs mandate payload using HMAC-SHA256
   */
  public generateMandateSignature(payload: {
    mandateId: string;
    userId: string;
    merchantId: string;
    checkoutId: string;
    checkoutIntegrityHash: string;
    amount: number;
    currency: string;
    nonce: string;
    issuedAt: string;
    expiresAt: string;
  }): string {
    const serialized = JSON.stringify({
      mandate_id: payload.mandateId,
      user_id: payload.userId,
      merchant_id: payload.merchantId,
      checkout_id: payload.checkoutId,
      checkout_hash: payload.checkoutIntegrityHash,
      amount: payload.amount,
      currency: payload.currency,
      nonce: payload.nonce,
      issued_at: payload.issuedAt,
      expires_at: payload.expiresAt
    });

    return crypto
      .createHmac("sha256", MANDATE_SIGNING_SECRET)
      .update(serialized)
      .digest("hex");
  }

  /**
   * Formats a Prisma AuthorizationMandate into MandateResponse DTO
   */
  private formatMandate(mandate: any, decisionReport?: PolicyEvaluationReport): MandateResponse {
    return {
      mandate_id: mandate.id,
      user_id: mandate.userId,
      merchant_id: mandate.merchantId,
      checkout_id: mandate.checkoutId,
      checkout_integrity_hash: mandate.checkoutIntegrityHash,
      amount: mandate.amount,
      currency: mandate.currency,
      constraints: (mandate.constraintsSnapshot as Record<string, any>) || {},
      signature: mandate.signature,
      nonce: mandate.nonce,
      status: mandate.status as any,
      decision: decisionReport || (mandate.decisionDetails as PolicyEvaluationReport),
      issued_at: mandate.issuedAt.toISOString(),
      expires_at: mandate.expiresAt.toISOString(),
      created_at: mandate.createdAt.toISOString()
    };
  }

  /**
   * 1. Create or Find User Constraints
   */
  public async createOrGetConstraints(
    input: {
      userId: string;
      sessionId?: string;
      maxAmount: number;
      currency?: string;
      allowedMerchants?: string[];
      allowedCategories?: string[];
      maxQuantity?: number;
      requiredFeatures?: Record<string, any>;
      expiresInMinutes?: number;
    },
    context: { requestId: string }
  ) {
    const currency = input.currency || "INR";
    const expiresInMinutes = input.expiresInMinutes || 60;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const record = await prisma.userConstraint.create({
      data: {
        userId: input.userId,
        sessionId: input.sessionId || null,
        maxAmount: input.maxAmount,
        currency,
        allowedMerchants: input.allowedMerchants || [],
        allowedCategories: input.allowedCategories || [],
        maxQuantity: input.maxQuantity || 1,
        requiredFeatures: input.requiredFeatures || {},
        status: "ACTIVE",
        expiresAt
      }
    });

    await auditService.logEvent({
      requestId: context.requestId,
      userId: input.userId,
      agentSessionId: input.sessionId,
      eventType: "CONSTRAINTS_CREATED" as any,
      result: "SUCCESS",
      metadata: {
        constraint_id: record.id,
        max_amount: record.maxAmount,
        currency: record.currency
      }
    });

    return record;
  }

  /**
   * 2. Request / Issue Authorization Mandate
   */
  public async requestMandate(
    input: CreateMandateRequest,
    context: { requestId: string; sessionId?: string }
  ): Promise<MandateResponse> {
    const { checkout_id, constraint_id, user_id, user_constraints } = input;

    // Fetch checkout session
    const checkout = await prisma.checkoutSession.findUnique({
      where: { id: checkout_id },
      include: { merchant: true }
    });

    if (!checkout) {
      const err: any = new Error(`Checkout '${checkout_id}' not found.`);
      err.code = "CHECKOUT_NOT_FOUND";
      err.statusCode = 404;
      throw err;
    }

    // Resolve Constraints
    let activeConstraint: any = null;
    if (constraint_id) {
      activeConstraint = await prisma.userConstraint.findUnique({
        where: { id: constraint_id }
      });
    }

    if (!activeConstraint && user_constraints) {
      activeConstraint = await this.createOrGetConstraints(
        {
          userId: user_id || "user_default",
          sessionId: context.sessionId,
          maxAmount: user_constraints.max_amount,
          currency: user_constraints.currency,
          allowedMerchants: user_constraints.allowed_merchants,
          allowedCategories: user_constraints.allowed_categories,
          maxQuantity: user_constraints.max_quantity,
          requiredFeatures: user_constraints.required_features,
          expiresInMinutes: user_constraints.expires_in_minutes
        },
        context
      );
    }

    if (!activeConstraint) {
      // Create default active constraints bound to checkout amount + 10% tolerance for demo
      activeConstraint = await this.createOrGetConstraints(
        {
          userId: user_id || "user_default",
          sessionId: context.sessionId,
          maxAmount: checkout.total + 500,
          currency: checkout.currency,
          allowedMerchants: [checkout.merchant.name, checkout.merchantId],
          allowedCategories: [],
          maxQuantity: 5,
          requiredFeatures: {},
          expiresInMinutes: 30
        },
        context
      );
    }

    // Run deterministic Policy Engine evaluation
    const evaluation = await policyEngine.evaluate(
      checkout_id,
      {
        maxAmount: activeConstraint.maxAmount,
        currency: activeConstraint.currency,
        allowedMerchants: activeConstraint.allowedMerchants as string[],
        allowedCategories: activeConstraint.allowedCategories as string[],
        maxQuantity: activeConstraint.maxQuantity,
        requiredFeatures: activeConstraint.requiredFeatures as Record<string, any>,
        expiresAt: activeConstraint.expiresAt
      },
      {
        requestId: context.requestId,
        userId: user_id,
        sessionId: context.sessionId
      }
    );

    const mandateId = `man_${crypto.randomUUID()}`;
    const nonce = `nonce_${crypto.randomBytes(16).toString("hex")}`;
    const issuedAt = new Date();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes mandate validity

    // Generate cryptographic signature
    const signature = this.generateMandateSignature({
      mandateId,
      userId: user_id,
      merchantId: checkout.merchantId,
      checkoutId: checkout.id,
      checkoutIntegrityHash: checkout.integrityHash,
      amount: checkout.total,
      currency: checkout.currency,
      nonce,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString()
    });

    const initialStatus = evaluation.decision === "ALLOW" ? "PENDING" : "DENIED";

    const record = await prisma.authorizationMandate.create({
      data: {
        id: mandateId,
        userId: user_id,
        merchantId: checkout.merchantId,
        checkoutId: checkout.id,
        constraintId: activeConstraint.id,
        checkoutIntegrityHash: checkout.integrityHash,
        amount: checkout.total,
        currency: checkout.currency,
        constraintsSnapshot: {
          max_amount: activeConstraint.maxAmount,
          currency: activeConstraint.currency,
          allowed_merchants: activeConstraint.allowedMerchants,
          allowed_categories: activeConstraint.allowedCategories,
          max_quantity: activeConstraint.maxQuantity,
          required_features: activeConstraint.requiredFeatures
        },
        signature,
        nonce,
        status: initialStatus,
        decisionDetails: evaluation as any,
        issuedAt,
        expiresAt
      }
    });

    await auditService.logEvent({
      requestId: context.requestId,
      userId: user_id,
      agentSessionId: context.sessionId,
      checkoutId: checkout.id,
      eventType: "MANDATE_CREATED" as any,
      result: evaluation.decision === "ALLOW" ? "SUCCESS" : "VALIDATION_FAILED",
      metadata: {
        mandate_id: record.id,
        amount: record.amount,
        decision: evaluation.decision,
        reason_code: evaluation.reason_code
      }
    });

    await auditService.logEvent({
      requestId: context.requestId,
      userId: user_id,
      agentSessionId: context.sessionId,
      checkoutId: checkout.id,
      eventType: "MANDATE_SIGNED" as any,
      result: "SUCCESS",
      metadata: {
        mandate_id: record.id,
        signature: signature.slice(0, 16) + "...",
        nonce
      }
    });

    return this.formatMandate(record, evaluation);
  }

  /**
   * 3. Verify Mandate & Replay Protection
   */
  public async verifyMandate(
    mandateId: string,
    context: { requestId: string; userId?: string }
  ): Promise<{ isValid: boolean; reasonCode: string; reasonMessage: string; mandate?: any }> {
    const mandate = await prisma.authorizationMandate.findUnique({
      where: { id: mandateId },
      include: { checkout: true }
    });

    if (!mandate) {
      return {
        isValid: false,
        reasonCode: "MANDATE_NOT_FOUND",
        reasonMessage: `Mandate '${mandateId}' does not exist.`
      };
    }

    // 1. Check expiration
    if (new Date() > new Date(mandate.expiresAt)) {
      if (mandate.status !== "EXPIRED") {
        await prisma.authorizationMandate.update({
          where: { id: mandateId },
          data: { status: "EXPIRED" }
        });
      }
      await auditService.logEvent({
        requestId: context.requestId,
        userId: context.userId,
        checkoutId: mandate.checkoutId,
        eventType: "MANDATE_EXPIRED" as any,
        result: "FAILURE",
        metadata: { mandate_id: mandate.id, expires_at: mandate.expiresAt }
      });
      return {
        isValid: false,
        reasonCode: "AUTHORIZATION_EXPIRED",
        reasonMessage: `Authorization mandate expired at ${mandate.expiresAt.toISOString()}.`,
        mandate
      };
    }

    // 2. Check Replay: verify nonce hasn't been consumed
    const usedNonce = await prisma.usedNonce.findUnique({
      where: { nonce: mandate.nonce }
    });
    if (usedNonce) {
      await auditService.logEvent({
        requestId: context.requestId,
        userId: context.userId,
        checkoutId: mandate.checkoutId,
        eventType: "REPLAY_ATTEMPT_BLOCKED" as any,
        result: "FAILURE",
        metadata: { mandate_id: mandate.id, nonce: mandate.nonce }
      });
      return {
        isValid: false,
        reasonCode: "REPLAY_ATTEMPT_BLOCKED",
        reasonMessage: "Authorization replay detected: Nonce has already been consumed.",
        mandate
      };
    }

    // 3. Verify HMAC signature
    const expectedSig = this.generateMandateSignature({
      mandateId: mandate.id,
      userId: mandate.userId,
      merchantId: mandate.merchantId,
      checkoutId: mandate.checkoutId,
      checkoutIntegrityHash: mandate.checkoutIntegrityHash,
      amount: mandate.amount,
      currency: mandate.currency,
      nonce: mandate.nonce,
      issuedAt: mandate.issuedAt.toISOString(),
      expiresAt: mandate.expiresAt.toISOString()
    });

    if (expectedSig !== mandate.signature) {
      return {
        isValid: false,
        reasonCode: "INTEGRITY_VIOLATION",
        reasonMessage: "Cryptographic signature verification failed.",
        mandate
      };
    }

    // 4. Verify checkout integrity hash against current checkout in DB
    const currentCheckout = await prisma.checkoutSession.findUnique({
      where: { id: mandate.checkoutId }
    });

    if (!currentCheckout || currentCheckout.integrityHash !== mandate.checkoutIntegrityHash) {
      await prisma.authorizationMandate.update({
        where: { id: mandateId },
        data: { status: "INVALIDATED" }
      });
      await auditService.logEvent({
        requestId: context.requestId,
        userId: context.userId,
        checkoutId: mandate.checkoutId,
        eventType: "CHECKOUT_HASH_MISMATCH" as any,
        result: "FAILURE",
        metadata: {
          mandate_id: mandate.id,
          authorized_hash: mandate.checkoutIntegrityHash,
          current_hash: currentCheckout?.integrityHash
        }
      });
      await auditService.logEvent({
        requestId: context.requestId,
        userId: context.userId,
        checkoutId: mandate.checkoutId,
        eventType: "MANDATE_INVALIDATED" as any,
        result: "FAILURE",
        metadata: { mandate_id: mandate.id }
      });
      return {
        isValid: false,
        reasonCode: "AUTHORIZATION_INVALIDATED",
        reasonMessage: "Checkout line items or totals were modified after authorization was issued.",
        mandate
      };
    }

    await auditService.logEvent({
      requestId: context.requestId,
      userId: context.userId,
      checkoutId: mandate.checkoutId,
      eventType: "MANDATE_VERIFIED" as any,
      result: "SUCCESS",
      metadata: { mandate_id: mandate.id }
    });

    return {
      isValid: true,
      reasonCode: "POLICY_PASSED",
      reasonMessage: "Mandate is valid, signed, and unexpired.",
      mandate
    };
  }

  /**
   * 4. User Approves Mandate
   */
  public async approveMandate(
    mandateId: string,
    context: { requestId: string; userId: string; sessionId?: string }
  ): Promise<MandateResponse> {
    const verification = await this.verifyMandate(mandateId, context);
    if (!verification.isValid) {
      const err: any = new Error(verification.reasonMessage);
      err.code = verification.reasonCode;
      err.statusCode = 400;
      throw err;
    }

    const mandate = verification.mandate;
    if (mandate.status !== "PENDING") {
      const err: any = new Error(`Cannot approve mandate with status '${mandate.status}'.`);
      err.code = "INVALID_STATE_TRANSITION";
      err.statusCode = 400;
      throw err;
    }

    const updated = await prisma.authorizationMandate.update({
      where: { id: mandateId },
      data: { status: "AUTHORIZED" }
    });

    await auditService.logEvent({
      requestId: context.requestId,
      userId: context.userId,
      agentSessionId: context.sessionId,
      checkoutId: mandate.checkoutId,
      eventType: "USER_AUTHORIZED" as any,
      result: "SUCCESS",
      metadata: {
        mandate_id: mandate.id,
        amount: mandate.amount,
        status: "AUTHORIZED"
      }
    });

    return this.formatMandate(updated);
  }

  /**
   * 5. User Denies Mandate
   */
  public async denyMandate(
    mandateId: string,
    context: { requestId: string; userId: string; sessionId?: string }
  ): Promise<MandateResponse> {
    const mandate = await prisma.authorizationMandate.findUnique({
      where: { id: mandateId }
    });

    if (!mandate) {
      const err: any = new Error(`Mandate '${mandateId}' not found.`);
      err.code = "MANDATE_NOT_FOUND";
      err.statusCode = 404;
      throw err;
    }

    const updated = await prisma.authorizationMandate.update({
      where: { id: mandateId },
      data: { status: "DENIED" }
    });

    await auditService.logEvent({
      requestId: context.requestId,
      userId: context.userId,
      agentSessionId: context.sessionId,
      checkoutId: mandate.checkoutId,
      eventType: "USER_DENIED" as any,
      result: "SUCCESS",
      metadata: {
        mandate_id: mandate.id,
        status: "DENIED"
      }
    });

    return this.formatMandate(updated);
  }

  /**
   * 6. Retrieve Mandate by ID
   */
  public async getMandateById(
    mandateId: string,
    context: { requestId: string }
  ): Promise<MandateResponse> {
    const mandate = await prisma.authorizationMandate.findUnique({
      where: { id: mandateId }
    });

    if (!mandate) {
      const err: any = new Error(`Mandate '${mandateId}' not found.`);
      err.code = "MANDATE_NOT_FOUND";
      err.statusCode = 404;
      throw err;
    }

    return this.formatMandate(mandate);
  }
}

export const mandateService = new MandateService();
