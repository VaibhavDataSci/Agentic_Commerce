import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { paymentService } from "../services/payment.service.js";
import {
  InitiatePaymentRequestSchema,
  VerifyPaymentRequestSchema
} from "../schemas/payment.schema.js";

const PaymentParamsSchema = z.object({
  id: z.string().min(1, { message: "Payment ID is required" })
});

export const paymentRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const getContext = (request: any) => ({
    requestId: request.requestId || `req_${Date.now()}`,
    userId: (request.headers["x-user-id"] as string) || "user_default",
    sessionId: request.headers["x-agent-session-id"] as string | undefined
  });

  // 1. POST /payments/initiate - Run preflight check and create Razorpay order
  fastify.post("/payments/initiate", async (request, reply) => {
    const body = InitiatePaymentRequestSchema.parse(request.body);
    const context = getContext(request);

    const result = await paymentService.initiatePayment(body, context);
    return reply.status(201).send(result);
  });

  // 2. POST /payments/verify - Server-side payment verification & atomic merchant order placement
  fastify.post("/payments/verify", async (request, reply) => {
    const body = VerifyPaymentRequestSchema.parse(request.body);
    const context = getContext(request);

    const result = await paymentService.verifyPayment(body, context);
    return reply.status(200).send(result);
  });
};
