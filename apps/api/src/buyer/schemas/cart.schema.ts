import { z } from "zod";

export const CartItemDTO = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  product_name: z.string(),
  sku: z.string(),
  unit_price: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
  total_price: z.number().int().nonnegative(),
  image_url: z.string().url().optional()
});

export type CartItem = z.infer<typeof CartItemDTO>;

export const CartResponseSchema = z.object({
  cart_id: z.string().uuid(),
  merchant_id: z.string().uuid(),
  status: z.string(),
  subtotal: z.number().int().nonnegative(),
  currency: z.string().default("INR"),
  item_count: z.number().int().nonnegative(),
  items: z.array(CartItemDTO),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export type CartResponse = z.infer<typeof CartResponseSchema>;

export const CreateCartInputSchema = z.object({
  product_id: z.string().uuid({ message: "product_id must be a valid UUID" }),
  quantity: z.number().int().positive().default(1),
  cart_id: z.string().uuid().optional()
});

export type CreateCartInput = z.infer<typeof CreateCartInputSchema>;
