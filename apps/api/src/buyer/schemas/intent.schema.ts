import { z } from "zod";

export const UserConstraintsSchema = z.object({
  wireless: z.boolean().optional(),
  anc: z.boolean().optional(),
  min_price: z.number().nonnegative().optional(),
  max_price: z.number().nonnegative().optional(),
  currency: z.string().default("INR"),
  delivery_preference: z.string().optional(),
  brand: z.string().optional(),
  features: z.array(z.string()).optional(),
  form_factor: z.string().optional(),
  switch_type: z.string().optional(),
  resolution: z.string().optional(),
  ram_gb: z.number().positive().optional(),
  storage_gb: z.number().positive().optional(),
  screen_size_inch: z.number().positive().optional()
});

export type UserConstraints = z.infer<typeof UserConstraintsSchema>;

export const StructuredIntentSchema = z.object({
  category: z.string().nullable().optional(),
  raw_query: z.string().default(""),
  constraints: UserConstraintsSchema.default({}),
  quantity: z.number().int().positive().default(1),
  purchase_intent: z.boolean().default(true),
  is_ambiguous: z.boolean().default(false),
  clarification_question: z.string().nullable().optional()
});

export type StructuredIntent = z.infer<typeof StructuredIntentSchema>;
