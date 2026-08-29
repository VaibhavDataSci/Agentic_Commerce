import { FastifyError, FastifyRequest, FastifyReply } from "fastify";
import { ZodError } from "zod";

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const requestId = (request as any).requestId || `req_${Date.now()}`;

  // Log internal error
  request.log.error({ err: error, requestId }, "Request failed with error");

  // Handle Zod Validation Errors
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: {
        code: "INVALID_PARAMETER",
        message: "Invalid query or body parameters",
        request_id: requestId,
        details: error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
          code: e.code
        }))
      }
    });
  }

  // Handle Fastify 404
  if ("statusCode" in error && error.statusCode === 404) {
    return reply.status(404).send({
      error: {
        code: "RESOURCE_NOT_FOUND",
        message: error.message || "The requested resource was not found",
        request_id: requestId
      }
    });
  }

  // Handle Rate Limiting (429)
  if ("statusCode" in error && error.statusCode === 429) {
    return reply.status(429).send({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please try again later.",
        request_id: requestId
      }
    });
  }

  // Generic Application / Custom Error
  const statusCode = (error as any).statusCode || 500;
  return reply.status(statusCode).send({
    error: {
      code: (error as any).code || "INTERNAL_SERVER_ERROR",
      message: statusCode === 500 ? "An unexpected error occurred. Please try again later." : error.message,
      request_id: requestId,
      details: (error as any).details || undefined
    }
  });
}
