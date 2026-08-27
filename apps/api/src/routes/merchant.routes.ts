import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { MerchantService } from "../services/merchant.service.js";

export const merchantRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const merchantService = new MerchantService();

  fastify.get("/merchant", async (request, reply) => {
    try {
      const merchant = await merchantService.getMerchantProfile();
      return reply.status(200).send(merchant);
    } catch (err) {
      request.log.error(err, "Failed to fetch merchant profile");
      return reply.status(500).send({
        error: {
          code: "MERCHANT_FETCH_ERROR",
          message: "Unable to retrieve merchant information",
          request_id: (request as any).requestId
        }
      });
    }
  });
};
