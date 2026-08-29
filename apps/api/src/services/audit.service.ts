import { prisma } from "../config/prisma.js";

export interface LogAuditParams {
  requestId: string;
  userId?: string;
  agentSessionId?: string;
  checkoutId?: string;
  eventType:
    | "CHECKOUT_CREATED"
    | "CHECKOUT_RETRIEVED"
    | "CHECKOUT_UPDATED"
    | "CHECKOUT_VALIDATED"
    | "CHECKOUT_CANCELED"
    | "PRICE_CHANGED"
    | "INVENTORY_CHANGED"
    | "CHECKOUT_COMPLETION_REQUESTED"
    | "IDEMPOTENCY_HIT";
  result: "SUCCESS" | "FAILURE" | "PRICE_CHANGED" | "OUT_OF_STOCK" | "VALIDATION_FAILED";
  metadata?: Record<string, any>;
}

export class AuditService {
  /**
   * Logs a structured audit event to PostgreSQL and stdout for observability
   */
  public async logEvent(params: LogAuditParams): Promise<void> {
    try {
      const { requestId, userId, agentSessionId, checkoutId, eventType, result, metadata = {} } = params;

      // Ensure no sensitive payment info / secrets are logged
      const safeMetadata = { ...metadata };
      delete safeMetadata.password;
      delete safeMetadata.token;
      delete safeMetadata.secret;
      delete safeMetadata.card_number;

      const record = await prisma.auditEvent.create({
        data: {
          requestId,
          userId: userId || null,
          agentSessionId: agentSessionId || null,
          checkoutId: checkoutId || null,
          eventType,
          result,
          metadata: safeMetadata
        }
      });

      // Output structured log for observability
      console.log(
        JSON.stringify({
          audit_event: {
            event_id: record.id,
            timestamp: record.createdAt.toISOString(),
            request_id: record.requestId,
            user_id: record.userId,
            agent_session_id: record.agentSessionId,
            checkout_id: record.checkoutId,
            event_type: record.eventType,
            result: record.result,
            metadata: record.metadata
          }
        })
      );
    } catch (err) {
      console.error("Failed to write audit event:", err);
    }
  }

  /**
   * Retrieves audit trail for a specific checkout session
   */
  public async getCheckoutAuditTrail(checkoutId: string) {
    return prisma.auditEvent.findMany({
      where: { checkoutId },
      orderBy: { createdAt: "asc" }
    });
  }
}

export const auditService = new AuditService();
