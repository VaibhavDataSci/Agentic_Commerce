import { Rule } from "./core/types.js";

export interface SecurityContext {
  requestRatePerMinute: number;
  rateLimitThreshold: number;
  isMalformed: boolean;
  malformedReasons?: string[];
  ipAddress?: string;
}

export const securityRules: Rule<SecurityContext>[] = [
  {
    id: "SEC_001_RATE_LIMIT_EXCEEDED",
    name: "Rate Limit Enforcement",
    description: "IF request rate exceeds limit -> block temporarily",
    category: "security",
    priority: 150,
    enabled: true,
    condition: (ctx) => {
      return ctx.requestRatePerMinute > ctx.rateLimitThreshold;
    },
    action: (ctx) => {
      return {
        block: true,
        statusCode: 429,
        errorCode: "RATE_LIMIT_EXCEEDED",
        retryAfterSeconds: 60,
        message: `Rate limit of ${ctx.rateLimitThreshold} req/min exceeded. Please retry after 60 seconds.`
      };
    }
  },
  {
    id: "SEC_002_MALFORMED_REQUEST",
    name: "Malformed Payload Rejection",
    description: "IF malformed request -> return error response",
    category: "security",
    priority: 140,
    enabled: true,
    condition: (ctx) => {
      return ctx.isMalformed === true;
    },
    action: (ctx) => {
      return {
        block: true,
        statusCode: 400,
        errorCode: "MALFORMED_REQUEST",
        details: ctx.malformedReasons || ["Request payload failed structural schema validation"],
        message: "The submitted request was malformed and rejected."
      };
    }
  }
];
