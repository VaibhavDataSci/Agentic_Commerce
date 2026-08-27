import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { BuyerService } from "../buyer/services/buyer.service.js";
import { ToolRegistry } from "../buyer/tools/tool-registry.js";

const BuyerChatBodySchema = z.object({
  prompt: z.string().min(1, { message: "Prompt cannot be empty" }),
  session_id: z.string().optional()
});

const ExecuteToolBodySchema = z.object({
  tool_name: z.string().min(1),
  parameters: z.record(z.any())
});

export const buyerRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const buyerService = new BuyerService();
  const toolRegistry = new ToolRegistry();

  // POST /api/v1/buyer/chat - End-to-end natural-language shopping assistant
  fastify.post("/buyer/chat", async (request, reply) => {
    const body = BuyerChatBodySchema.parse(request.body);
    const requestId = (request as any).requestId;

    const response = await buyerService.processShoppingRequest(
      body.prompt,
      body.session_id,
      requestId
    );

    return reply.status(200).send(response);
  });

  // GET /api/v1/buyer/tools - List authorized tool definitions
  fastify.get("/buyer/tools", async (_request, reply) => {
    return reply.status(200).send({
      allowed_tools: toolRegistry.getToolDefinitions()
    });
  });

  // POST /api/v1/buyer/tools/execute - Sandboxed tool execution endpoint
  fastify.post("/buyer/tools/execute", async (request, reply) => {
    const body = ExecuteToolBodySchema.parse(request.body);
    const result = await toolRegistry.executeTool(body.tool_name, body.parameters);
    return reply.status(200).send({
      tool: body.tool_name,
      result
    });
  });
};
