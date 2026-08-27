import { FastifyRequest, FastifyReply } from "fastify";
import crypto from "crypto";

export async function requestIdHook(req: FastifyRequest, reply: FastifyReply) {
  const incomingId = req.headers["x-request-id"] as string | undefined;
  const requestId = incomingId || `req_${crypto.randomBytes(8).toString("hex")}`;
  (req as any).requestId = requestId;
  reply.header("x-request-id", requestId);
}
