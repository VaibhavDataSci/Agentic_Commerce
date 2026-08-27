import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { prisma } from "../config/prisma.js";

export const healthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/health", async (_request, reply) => {
    try {
      // Check database connection
      await prisma.$queryRaw`SELECT 1`;
      return reply.status(200).send({
        status: "healthy",
        service: "techkart-merchant-api",
        database: "connected",
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      return reply.status(503).send({
        status: "unhealthy",
        service: "techkart-merchant-api",
        database: "disconnected",
        timestamp: new Date().toISOString()
      });
    }
  });
};
