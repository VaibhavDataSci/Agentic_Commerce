import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { InventoryService } from "../services/inventory.service.js";

const InventoryParamsSchema = z.object({
  productId: z.string().uuid({ message: "Product ID must be a valid UUID" })
});

export const inventoryRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const inventoryService = new InventoryService();

  // GET /api/v1/inventory/:productId
  fastify.get("/inventory/:productId", async (request, reply) => {
    const params = InventoryParamsSchema.parse(request.params);
    const inventory = await inventoryService.getInventoryByProductId(params.productId);

    if (!inventory) {
      return reply.status(404).send({
        error: {
          code: "INVENTORY_NOT_FOUND",
          message: `Inventory for product ID '${params.productId}' was not found`,
          request_id: (request as any).requestId
        }
      });
    }

    return reply.status(200).send(inventory);
  });
};
