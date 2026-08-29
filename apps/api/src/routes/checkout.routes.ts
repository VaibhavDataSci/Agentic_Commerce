import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { CheckoutService } from "../services/checkout.service.js";
import {
  CreateCheckoutSessionSchema,
  UpdateCheckoutSessionSchema
} from "../schemas/checkout.schema.js";
import { idempotencyService } from "../services/idempotency.service.js";

const CheckoutParamsSchema = z.object({
  id: z.string().min(1, { message: "Checkout session ID is required" })
});

export const checkoutRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const checkoutService = new CheckoutService();

  // Helper to extract context
  const getContext = (request: any) => ({
    requestId: request.requestId || `req_${Date.now()}`,
    userId: request.headers["x-user-id"] as string | undefined,
    agentSessionId: request.headers["x-agent-session-id"] as string | undefined
  });

  // Helper to check idempotency key
  const handleIdempotency = async (request: any, reply: any, handler: () => Promise<{ status: number; body: any }>) => {
    const idempotencyKey = request.headers["idempotency-key"] as string | undefined;
    if (!idempotencyKey) {
      const result = await handler();
      return reply.status(result.status).send(result.body);
    }

    const method = request.method;
    const path = request.url;
    const requestHash = idempotencyService.hashPayload(request.body);

    const check = await idempotencyService.checkIdempotency(idempotencyKey, method, path, requestHash);
    if (check.isDuplicate && check.cachedResponse) {
      reply.header("X-Idempotent-Replay", "true");
      return reply.status(check.cachedResponse.statusCode).send(check.cachedResponse.body);
    }

    const result = await handler();
    await idempotencyService.saveIdempotencyRecord(
      idempotencyKey,
      method,
      path,
      requestHash,
      result.status,
      result.body
    );

    return reply.status(result.status).send(result.body);
  };

  // 1. POST /checkout_sessions - Create checkout session
  fastify.post("/checkout_sessions", async (request, reply) => {
    const body = CreateCheckoutSessionSchema.parse(request.body);
    const context = getContext(request);

    return handleIdempotency(request, reply, async () => {
      const session = await checkoutService.createCheckoutSession(body, context);
      return { status: 201, body: session };
    });
  });

  // 2. GET /checkout_sessions/:id - Retrieve checkout session
  fastify.get("/checkout_sessions/:id", async (request, reply) => {
    const params = CheckoutParamsSchema.parse(request.params);
    const context = getContext(request);

    const session = await checkoutService.getCheckoutSessionById(params.id, context);
    return reply.status(200).send(session);
  });

  // 3. POST /checkout_sessions/:id - Update checkout session
  fastify.post("/checkout_sessions/:id", async (request, reply) => {
    const params = CheckoutParamsSchema.parse(request.params);
    const body = UpdateCheckoutSessionSchema.parse(request.body);
    const context = getContext(request);

    return handleIdempotency(request, reply, async () => {
      const session = await checkoutService.updateCheckoutSession(params.id, body, context);
      return { status: 200, body: session };
    });
  });

  // 4. POST /checkout_sessions/:id/complete - Request checkout completion
  fastify.post("/checkout_sessions/:id/complete", async (request, reply) => {
    const params = CheckoutParamsSchema.parse(request.params);
    const context = getContext(request);

    return handleIdempotency(request, reply, async () => {
      const session = await checkoutService.completeCheckoutSession(params.id, context);
      return { status: 200, body: session };
    });
  });

  // 5. POST /checkout_sessions/:id/cancel - Cancel checkout session
  fastify.post("/checkout_sessions/:id/cancel", async (request, reply) => {
    const params = CheckoutParamsSchema.parse(request.params);
    const context = getContext(request);

    return handleIdempotency(request, reply, async () => {
      const session = await checkoutService.cancelCheckoutSession(params.id, context);
      return { status: 200, body: session };
    });
  });
};
