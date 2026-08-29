import { z } from "zod";

export const MandateStatusEnum = z.enum([
  "PENDING",
  "AUTHORIZED",
  "DENIED",
  "INVALIDATED",
  "EXPIRED",
  "CONSUMED"
]);
export type MandateStatus = z.infer<typeof MandateStatusEnum>;

export const PolicyDecisionEnum = z.enum(["ALLOW", "DENY"]);
export type PolicyDecision = z.infer<typeof PolicyDecisionEnum>;

export const PolicyReasonCodeEnum = z.enum([
  "POLICY_PASSED",
  "AMOUNT_EXCEEDED",
  "CURRENCY_MISMATCH",
  "MERCHANT_NOT_ALLOWED",
  "CATEGORY_NOT_ALLOWED",
  "FEATURE_MISMATCH",
  "QUANTITY_EXCEEDED",
  "INSUFFICIENT_STOCK",
  "PRODUCT_UNAVAILABLE",
  "INVALID_CHECKOUT_STATE",
  "CONSTRAINT_EXPIRED",
  "INTEGRITY_VIOLATION",
  "REPLAY_ATTEMPT_BLOCKED",
  "AUTHORIZATION_EXPIRED",
  "AUTHORIZATION_INVALIDATED",
  "CHECKOUT_HASH_MISMATCH",
  "PROMPT_INJECTION_DETECTED"
]);
export type PolicyReasonCode = z.infer<typeof PolicyReasonCodeEnum>;

export const PolicyCheckItemSchema = z.object({
  check: z.string(),
  name: z.string(),
  passed: z.boolean(),
  details: z.string()
});
export type PolicyCheckItem = z.infer<typeof PolicyCheckItemSchema>;

export const PolicyEvaluationReportSchema = z.object({
  decision: PolicyDecisionEnum,
  reason_code: PolicyReasonCodeEnum,
  reason_message: z.string(),
  checkout_id: z.string(),
  total_amount: z.number().int().nonnegative(),
  max_authorized_amount: z.number().int().nonnegative(),
  currency: z.string(),
  checks: z.array(PolicyCheckItemSchema),
  timestamp: z.string()
});
export type PolicyEvaluationReport = z.infer<typeof PolicyEvaluationReportSchema>;

export const UserConstraintsInputSchema = z.object({
  user_id: z.string().default("user_default"),
  session_id: z.string().optional(),
  max_amount: z.number().int().positive("max_amount must be a positive integer in smallest unit"),
  currency: z.string().default("INR"),
  allowed_merchants: z.array(z.string()).default([]),
  allowed_categories: z.array(z.string()).default([]),
  max_quantity: z.number().int().positive().default(1),
  required_features: z.record(z.any()).default({}),
  expires_in_minutes: z.number().int().positive().default(60)
});
export type UserConstraintsInput = z.infer<typeof UserConstraintsInputSchema>;

export const UserConstraintsResponseSchema = z.object({
  constraint_id: z.string(),
  user_id: z.string(),
  session_id: z.string().nullable(),
  max_amount: z.number().int().positive(),
  currency: z.string(),
  allowed_merchants: z.array(z.string()),
  allowed_categories: z.array(z.string()),
  max_quantity: z.number().int().positive(),
  required_features: z.record(z.any()),
  status: z.string(),
  expires_at: z.string(),
  created_at: z.string()
});
export type UserConstraintsResponse = z.infer<typeof UserConstraintsResponseSchema>;

export const CreateMandateRequestSchema = z.object({
  checkout_id: z.string().min(1, "checkout_id is required"),
  constraint_id: z.string().optional(),
  user_id: z.string().default("user_default"),
  user_constraints: UserConstraintsInputSchema.optional()
});
export type CreateMandateRequest = z.infer<typeof CreateMandateRequestSchema>;

export const MandateResponseSchema = z.object({
  mandate_id: z.string(),
  user_id: z.string(),
  merchant_id: z.string(),
  checkout_id: z.string(),
  checkout_integrity_hash: z.string(),
  amount: z.number().int().nonnegative(),
  currency: z.string(),
  constraints: z.record(z.any()),
  signature: z.string(),
  nonce: z.string(),
  status: MandateStatusEnum,
  decision: PolicyEvaluationReportSchema,
  issued_at: z.string(),
  expires_at: z.string(),
  created_at: z.string()
});
export type MandateResponse = z.infer<typeof MandateResponseSchema>;

export const ApproveMandateSchema = z.object({
  user_id: z.string().default("user_default"),
  confirmation: z.boolean().refine((val) => val === true, {
    message: "Explicit user confirmation is required to authorize mandate"
  })
});
export type ApproveMandateInput = z.infer<typeof ApproveMandateSchema>;
