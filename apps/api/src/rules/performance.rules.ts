import { Rule } from "./core/types.js";

export interface PerformanceContext {
  cacheKey?: string;
  isCached: boolean;
  requestedRecommendationLimit?: number;
}

export const performanceRules: Rule<PerformanceContext>[] = [
  {
    id: "PERF_001_CACHED_QUERY",
    name: "Query Response Caching",
    description: "IF repeated query -> return cached results",
    category: "performance",
    priority: 110,
    enabled: true,
    condition: (ctx) => {
      return ctx.isCached === true && !!ctx.cacheKey;
    },
    action: (ctx) => {
      return {
        fromCache: true,
        cacheKey: ctx.cacheKey,
        ttlSeconds: 300,
        message: "Serving response directly from in-memory hot cache for optimal latency"
      };
    }
  },
  {
    id: "PERF_002_LIMIT_RECOMMENDATIONS",
    name: "Recommendation Payload Throttling",
    description: "Limit product recommendations to max 6 items",
    category: "performance",
    priority: 105,
    enabled: true,
    condition: (ctx) => {
      return (
        ctx.requestedRecommendationLimit === undefined ||
        ctx.requestedRecommendationLimit > 6
      );
    },
    action: () => {
      return {
        cappedLimit: 6,
        reason: "Retail performance best practice: max 6 recommendation items per AI inference payload to minimize context overhead",
        enforced: true
      };
    }
  }
];
