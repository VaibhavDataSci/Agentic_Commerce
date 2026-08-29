import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { mandateService } from "../services/mandate.service.js";
import { policyEngine } from "../services/policy-engine.service.js";
import {
  UserConstraintsInputSchema,
  CreateMandateRequestSchema,
  ApproveMandateSchema
} from "../schemas/authorization.schema.js";

const MandateParamsSchema = z.object({
  id: z.string().min(1, { message: "Mandate ID is required" })
});

const EvaluateBodySchema = z.object({
  checkout_id: z.string().min(1),
  constraints: z.object({
    max_amount: z.number().int().positive(),
    currency: z.string().default("INR"),
    allowed_merchants: z.array(z.string()).optional(),
    allowed_categories: z.array(z.string()).optional(),
    max_quantity: z.number().int().positive().optional(),
    required_features: z.record(z.any()).optional(),
    expires_at: z.string().optional()
  })
});

export const authorizationRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const getContext = (request: any) => ({
    requestId: request.requestId || `req_${Date.now()}`,
    userId: (request.headers["x-user-id"] as string) || "user_default",
    sessionId: request.headers["x-agent-session-id"] as string | undefined
  });

  // 1. POST /authorizations/constraints - Store or update user constraints
  fastify.post("/authorizations/constraints", async (request, reply) => {
    const body = UserConstraintsInputSchema.parse(request.body);
    const context = getContext(request);

    const record = await mandateService.createOrGetConstraints(
      {
        userId: body.user_id,
        sessionId: body.session_id || context.sessionId,
        maxAmount: body.max_amount,
        currency: body.currency,
        allowedMerchants: body.allowed_merchants,
        allowedCategories: body.allowed_categories,
        maxQuantity: body.max_quantity,
        requiredFeatures: body.required_features,
        expiresInMinutes: body.expires_in_minutes
      },
      context
    );

    return reply.status(201).send({
      constraint_id: record.id,
      user_id: record.userId,
      max_amount: record.maxAmount,
      currency: record.currency,
      allowed_merchants: record.allowedMerchants,
      allowed_categories: record.allowedCategories,
      max_quantity: record.maxQuantity,
      required_features: record.requiredFeatures,
      status: record.status,
      expires_at: record.expiresAt.toISOString(),
      created_at: record.createdAt.toISOString()
    });
  });

  // 2. POST /authorizations/evaluate - Run policy check against a checkout
  fastify.post("/authorizations/evaluate", async (request, reply) => {
    const body = EvaluateBodySchema.parse(request.body);
    const context = getContext(request);

    const result = await policyEngine.evaluate(
      body.checkout_id,
      {
        maxAmount: body.constraints.max_amount,
        currency: body.constraints.currency,
        allowedMerchants: body.constraints.allowed_merchants,
        allowedCategories: body.constraints.allowed_categories,
        maxQuantity: body.constraints.max_quantity,
        requiredFeatures: body.constraints.required_features,
        expiresAt: body.constraints.expires_at
      },
      context
    );

    return reply.status(200).send(result);
  });

  // 3. POST /authorizations/mandates - Request a signed authorization mandate
  fastify.post("/authorizations/mandates", async (request, reply) => {
    const body = CreateMandateRequestSchema.parse(request.body);
    const context = getContext(request);

    const mandate = await mandateService.requestMandate(body, context);
    return reply.status(201).send(mandate);
  });

  // 4. GET /authorizations/mandates/:id - Get mandate by ID
  fastify.get("/authorizations/mandates/:id", async (request, reply) => {
    const params = MandateParamsSchema.parse(request.params);
    const context = getContext(request);

    const mandate = await mandateService.getMandateById(params.id, context);
    return reply.status(200).send(mandate);
  });

  // 5. POST /authorizations/mandates/:id/verify - Verify mandate integrity & validity
  fastify.post("/authorizations/mandates/:id/verify", async (request, reply) => {
    const params = MandateParamsSchema.parse(request.params);
    const context = getContext(request);

    const verification = await mandateService.verifyMandate(params.id, context);
    return reply.status(200).send(verification);
  });

  // 6. POST /authorizations/mandates/:id/approve - User approves mandate
  fastify.post("/authorizations/mandates/:id/approve", async (request, reply) => {
    const params = MandateParamsSchema.parse(request.params);
    const body = ApproveMandateSchema.parse(request.body);
    const context = getContext(request);

    const updated = await mandateService.approveMandate(params.id, {
      requestId: context.requestId,
      userId: body.user_id || context.userId,
      sessionId: context.sessionId
    });

    return reply.status(200).send({
      mandate: updated,
      status: "AUTHORIZED_FOR_PAYMENT",
      message: "Mandate successfully approved by user. Ready for Phase 5 payment processing."
    });
  });

  // 7. POST /authorizations/mandates/:id/deny - User denies mandate
  fastify.post("/authorizations/mandates/:id/deny", async (request, reply) => {
    const params = MandateParamsSchema.parse(request.params);
    const context = getContext(request);

    const updated = await mandateService.denyMandate(params.id, {
      requestId: context.requestId,
      userId: context.userId,
      sessionId: context.sessionId
    });

    return reply.status(200).send({
      mandate: updated,
      status: "DENIED",
      message: "Mandate was rejected by user."
    });
  });
};
