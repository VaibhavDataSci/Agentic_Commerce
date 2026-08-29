import crypto from "crypto";
import { prisma } from "../config/prisma.js";

export interface IdempotencyCheckResult {
  isDuplicate: boolean;
  cachedResponse?: {
    statusCode: number;
    body: any;
  };
}

export class IdempotencyService {
  /**
   * Generates a deterministic SHA-256 hash of the request body
   */
  public hashPayload(body: any): string {
    const payloadStr = typeof body === "string" ? body : JSON.stringify(body || {});
    return crypto.createHash("sha256").update(payloadStr).digest("hex");
  }

  /**
   * Checks if an idempotency key already exists for this path & method
   */
  public async checkIdempotency(
    key: string,
    method: string,
    path: string,
    requestHash: string
  ): Promise<IdempotencyCheckResult> {
    const record = await prisma.idempotencyRecord.findUnique({
      where: { key }
    });

    if (!record) {
      return { isDuplicate: false };
    }

    // Key exists; check if it matches the same operation
    return {
      isDuplicate: true,
      cachedResponse: {
        statusCode: record.statusCode,
        body: record.responseBody
      }
    };
  }

  /**
   * Saves the response for an idempotency key
   */
  public async saveIdempotencyRecord(
    key: string,
    method: string,
    path: string,
    requestHash: string,
    statusCode: number,
    responseBody: any
  ): Promise<void> {
    try {
      await prisma.idempotencyRecord.upsert({
        where: { key },
        create: {
          key,
          method,
          path,
          requestHash,
          statusCode,
          responseBody
        },
        update: {
          statusCode,
          responseBody
        }
      });
    } catch (err) {
      console.warn(`Could not save idempotency record for key '${key}':`, err);
    }
  }
}

export const idempotencyService = new IdempotencyService();
