import { z } from "zod";

// --- Availability Schema ---
export const AvailabilitySchema = z.object({
  in_stock: z.boolean(),
  quantity: z.number().int().nonnegative()
});

// --- AI-Readable Product Schema ---
export const ProductResponseSchema = z.object({
  id: z.string().uuid(),
  sku: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  price: z.number().int().nonnegative(),
  currency: z.string(),
  availability: AvailabilitySchema,
  attributes: z.record(z.any()),
  rating: z.number().min(0).max(5),
  imageUrl: z.string().url(),
  delivery_estimate: z.string()
});

export type ProductResponse = z.infer<typeof ProductResponseSchema>;

// --- Search Query Schema ---
export const ProductSearchQuerySchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  min_price: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => (val !== undefined ? Number(val) : undefined))
    .pipe(z.number().nonnegative().optional()),
  max_price: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => (val !== undefined ? Number(val) : undefined))
    .pipe(z.number().nonnegative().optional()),
  in_stock: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined;
      if (typeof val === "boolean") return val;
      return val === "true" || val === "1";
    })
    .pipe(z.boolean().optional()),
  rating: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => (val !== undefined ? Number(val) : undefined))
    .pipe(z.number().min(0).max(5).optional()),
  sort: z
    .enum(["price_asc", "price_desc", "rating_desc", "newest"])
    .optional()
    .default("rating_desc"),
  page: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => (val !== undefined ? Math.max(1, Number(val)) : 1))
    .pipe(z.number().int().positive().default(1)),
  limit: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => (val !== undefined ? Math.min(50, Math.max(1, Number(val))) : 20))
    .pipe(z.number().int().positive().default(20))
});

export type ProductSearchQuery = z.infer<typeof ProductSearchQuerySchema>;

// --- Products List Response Schema ---
export const ProductListResponseSchema = z.object({
  products: z.array(ProductResponseSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  filters: z.record(z.any())
});

export type ProductListResponse = z.infer<typeof ProductListResponseSchema>;

// --- Inventory Response Schema ---
export const InventoryResponseSchema = z.object({
  product_id: z.string().uuid(),
  sku: z.string(),
  available_quantity: z.number().int().nonnegative(),
  reserved_quantity: z.number().int().nonnegative(),
  in_stock: z.boolean(),
  updated_at: z.string().datetime()
});

export type InventoryResponse = z.infer<typeof InventoryResponseSchema>;

// --- Merchant Response Schema ---
export const MerchantResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  currency: z.string(),
  status: z.string(),
  metrics: z.object({
    total_products: z.number().int().nonnegative(),
    in_stock_products: z.number().int().nonnegative(),
    categories: z.array(z.string()),
    active_categories_count: z.number().int().nonnegative()
  }),
  ai_readiness: z.object({
    structured_catalog: z.boolean(),
    machine_readable_pricing: z.boolean(),
    real_time_inventory: z.boolean(),
    product_attributes: z.boolean(),
    api_version: z.string()
  })
});

export type MerchantResponse = z.infer<typeof MerchantResponseSchema>;

// --- Standard Error Schema ---
export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    request_id: z.string().optional(),
    details: z.any().optional()
  })
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
