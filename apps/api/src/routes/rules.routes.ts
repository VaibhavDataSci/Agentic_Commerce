import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { defaultRuleEngine, RuleCategory } from "../rules/index.js";

const EvaluateRulesBodySchema = z.object({
  category: z
    .enum(["validation", "cart", "user_behavior", "security", "performance", "accessibility"])
    .optional(),
  context: z.record(z.any())
});

export const rulesRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // GET /api/v1/rules - List all active rule engine definitions
  fastify.get("/rules", async (_request, reply) => {
    const rules = defaultRuleEngine.getAllRules().map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      category: r.category,
      priority: r.priority,
      enabled: r.enabled
    }));

    return reply.status(200).send({
      total: rules.length,
      rules
    });
  });

  // POST /api/v1/rules/evaluate - Evaluate a rule context against active rules
  fastify.post("/rules/evaluate", async (request, reply) => {
    const body = EvaluateRulesBodySchema.parse(request.body);
    const report = await defaultRuleEngine.evaluate(body.context, body.category as RuleCategory);

    return reply.status(200).send({
      report
    });
  });
};
