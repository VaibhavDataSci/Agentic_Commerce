import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { CartService } from "../buyer/services/cart.service.js";
import { CreateCartInputSchema } from "../buyer/schemas/cart.schema.js";

const CartParamsSchema = z.object({
  id: z.string().uuid({ message: "Cart ID must be a valid UUID" })
});

export const cartRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const cartService = new CartService();

  // POST /api/v1/cart - Add item to cart or create new cart
  fastify.post("/cart", async (request, reply) => {
    const body = CreateCartInputSchema.parse(request.body);
    const cart = await cartService.createOrUpdateCart(body);
    return reply.status(201).send(cart);
  });

  // GET /api/v1/cart/:id - Retrieve existing cart
  fastify.get("/cart/:id", async (request, reply) => {
    const params = CartParamsSchema.parse(request.params);
    const cart = await cartService.getCartById(params.id);

    if (!cart) {
      return reply.status(404).send({
        error: {
          code: "CART_NOT_FOUND",
          message: `Cart '${params.id}' was not found.`,
          request_id: (request as any).requestId
        }
      });
    }

    return reply.status(200).send(cart);
  });
};
