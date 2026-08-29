import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { paymentService } from "../services/payment.service.js";

export const webhookRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // POST /webhooks/razorpay
  fastify.post("/webhooks/razorpay", async (request, reply) => {
    const signature = (request.headers["x-razorpay-signature"] as string) || "";
    const rawBody =
      typeof request.body === "string"
        ? request.body
        : JSON.stringify(request.body || {});

    const context = {
      requestId: (request as any).requestId || `req_wh_${Date.now()}`
    };

    const result = await paymentService.handleWebhook(rawBody, signature, context);
    return reply.status(200).send(result);
  });
};
