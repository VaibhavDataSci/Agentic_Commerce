import { z } from "zod";

export const RankedProductSchema = z.object({
  product_id: z.string().uuid(),
  score: z.number().min(0).max(1), // Match confidence score 0.00 to 1.00
  match_reasons: z.array(z.string()).default([]),
  reason: z.string(),
  is_recommended: z.boolean().default(false)
});

export type RankedProduct = z.infer<typeof RankedProductSchema>;

export const ProductRankingReportSchema = z.object({
  selected_product_id: z.string().uuid().nullable(),
  ranked_products: z.array(RankedProductSchema),
  summary_reasoning: z.string(),
  constraints_applied: z.record(z.any()).default({})
});

export type ProductRankingReport = z.infer<typeof ProductRankingReportSchema>;
