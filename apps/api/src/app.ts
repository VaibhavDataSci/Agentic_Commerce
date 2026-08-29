import fastify, { FastifyInstance, FastifyServerOptions } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { env } from "./config/env.js";
import { requestIdHook } from "./middleware/request-id.middleware.js";
import { errorHandler } from "./middleware/error-handler.middleware.js";
import { healthRoutes } from "./routes/health.routes.js";
import { merchantRoutes } from "./routes/merchant.routes.js";
import { productRoutes } from "./routes/product.routes.js";
import { inventoryRoutes } from "./routes/inventory.routes.js";
import { rulesRoutes } from "./routes/rules.routes.js";
import { cartRoutes } from "./routes/cart.routes.js";
import { buyerRoutes } from "./routes/buyer.routes.js";
import { checkoutRoutes } from "./routes/checkout.routes.js";
import { authorizationRoutes } from "./routes/authorization.routes.js";
import { paymentRoutes } from "./routes/payment.routes.js";
import { webhookRoutes } from "./routes/webhook.routes.js";

export function buildApp(opts: FastifyServerOptions = {}): FastifyInstance {
  const app = fastify({
    logger:
      env.NODE_ENV === "test"
        ? false
        : {
            level: "info",
            transport:
              env.NODE_ENV === "development"
                ? {
                    target: "pino/file",
                    options: { destination: 1 }
                  }
                : undefined
          },
    ...opts
  });

  // Request ID Tracing
  app.addHook("onRequest", requestIdHook);

  // Security & Headers
  app.register(helmet, {
    crossOriginResourcePolicy: { policy: "cross-origin" }
  });

  // CORS Configuration
  app.register(cors, {
    origin: (origin, cb) => {
      // Allow localhost and specified CORS origins
      if (!origin || origin.includes("localhost") || origin.includes("127.0.0.1") || env.CORS_ORIGIN === "*") {
        cb(null, true);
        return;
      }
      cb(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  });

  // Rate Limiting (Security Rule)
  app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    errorResponseBuilder: (request, context) => ({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: `Too many requests. Limit is ${context.max} requests per minute.`,
        request_id: (request as any).requestId
      }
    })
  });

  // Central Error Handler
  app.setErrorHandler(errorHandler);

  // Health Route
  app.register(healthRoutes);

  // Webhooks
  app.register(webhookRoutes);

  // Direct Standard Routes
  app.register(checkoutRoutes);
  app.register(authorizationRoutes);
  app.register(paymentRoutes);

  // Version 1 Merchant, Buyer, Checkout, Authorization & Payment APIs (/api/v1/...)
  app.register(
    async (v1) => {
      await v1.register(merchantRoutes);
      await v1.register(productRoutes);
      await v1.register(inventoryRoutes);
      await v1.register(rulesRoutes);
      await v1.register(cartRoutes);
      await v1.register(buyerRoutes);
      await v1.register(checkoutRoutes);
      await v1.register(authorizationRoutes);
      await v1.register(paymentRoutes);
    },
    { prefix: "/api/v1" }
  );

  return app;
}
