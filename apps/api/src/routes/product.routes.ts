import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { CatalogService } from "../services/catalog.service.js";
import { ProductSearchQuerySchema } from "../schemas/product.schema.js";
import { defaultRuleEngine } from "../rules/index.js";

const ProductParamsSchema = z.object({
  id: z.string().uuid({ message: "Product ID must be a valid UUID" })
});

export const productRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const catalogService = new CatalogService();

  // GET /api/v1/products/search (Placed before /:id)
  fastify.get("/products/search", async (request, reply) => {
    const rawQuery = request.query as Record<string, any>;

    // 1. Evaluate Rule Engine Validation Rules
    if (rawQuery.query !== undefined) {
      const valReport = await defaultRuleEngine.evaluate(
        { query: String(rawQuery.query) },
        "validation"
      );

      const lengthViolation = valReport.results.find(
        (r) => r.ruleId === "VAL_001_MIN_QUERY_LENGTH" && r.matched
      );
      if (lengthViolation) {
        return reply.status(400).send({
          error: {
            code: "INVALID_PARAMETER",
            message: "Search query must be at least 2 characters long",
            request_id: (request as any).requestId,
            details: [lengthViolation.actionResult]
          }
        });
      }

      // Check Sanitization
      const sanitizationMatch = valReport.results.find(
        (r) => r.ruleId === "VAL_002_SANITIZE_INPUT" && r.matched
      );
      if (sanitizationMatch && sanitizationMatch.actionResult?.cleanValue !== undefined) {
        rawQuery.query = sanitizationMatch.actionResult.cleanValue;
      }
    }

    // 2. Parse and Validate Query Parameters with Zod
    const queryParams = ProductSearchQuerySchema.parse(rawQuery);

    const result = await catalogService.searchProducts(queryParams);
    return reply.status(200).send(result);
  });

  // GET /api/v1/products
  fastify.get("/products", async (request, reply) => {
    const rawQuery = request.query as Record<string, any>;
    const queryParams = ProductSearchQuerySchema.parse(rawQuery);

    const result = await catalogService.searchProducts(queryParams);
    return reply.status(200).send(result);
  });

  // GET /api/v1/products/:id
  fastify.get("/products/:id", async (request, reply) => {
    const params = ProductParamsSchema.parse(request.params);
    const product = await catalogService.getProductById(params.id);

    if (!product) {
      return reply.status(404).send({
        error: {
          code: "PRODUCT_NOT_FOUND",
          message: `Product with ID '${params.id}' does not exist`,
          request_id: (request as any).requestId
        }
      });
    }

    return reply.status(200).send(product);
  });
};
