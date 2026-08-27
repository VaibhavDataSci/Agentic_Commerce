import { Rule } from "./core/types.js";

export interface ValidationContext {
  query?: string;
  category?: string;
  min_price?: number;
  max_price?: number;
}

export const validationRules: Rule<ValidationContext>[] = [
  {
    id: "VAL_001_MIN_QUERY_LENGTH",
    name: "Query Minimum Length Validation",
    description: "IF query length < 2 AND query is provided -> reject request",
    category: "validation",
    priority: 100,
    enabled: true,
    condition: (ctx) => {
      return typeof ctx.query === "string" && ctx.query.trim().length > 0 && ctx.query.trim().length < 2;
    },
    action: (ctx) => {
      return {
        valid: false,
        code: "INVALID_QUERY_LENGTH",
        message: "Search query must be at least 2 characters long",
        field: "query",
        value: ctx.query
      };
    }
  },
  {
    id: "VAL_002_SANITIZE_INPUT",
    name: "Input Sanitization Rule",
    description: "IF invalid characters or potential XSS/SQL patterns detected -> sanitize input",
    category: "validation",
    priority: 90,
    enabled: true,
    condition: (ctx) => {
      if (!ctx.query) return false;
      const unsafePattern = /[<>{};'"\\]|--|\/\*|\*\//;
      return unsafePattern.test(ctx.query);
    },
    action: (ctx) => {
      const sanitized = ctx.query ? ctx.query.replace(/[<>{};'"\\]|--|\/\*|\*\//g, "").trim() : "";
      return {
        sanitized: true,
        original: ctx.query,
        cleanValue: sanitized,
        message: "Input contained special characters and was safely sanitized"
      };
    }
  }
];
