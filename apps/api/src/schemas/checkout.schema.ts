import { z } from "zod";

export const CheckoutStatusEnum = z.enum([
  "CREATED",
  "INCOMPLETE",
  "READY_FOR_PAYMENT",
  "COMPLETED",
  "CANCELED",
  "EXPIRED"
]);
export type CheckoutStatus = z.infer<typeof CheckoutStatusEnum>;

export const ShippingOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  cost: z.number().int().nonnegative(),
  estimated_days: z.string()
});
export type ShippingOption = z.infer<typeof ShippingOptionSchema>;

export const BuyerAddressSchema = z.object({
  name: z.string().min(1, "Name is required"),
  line1: z.string().min(1, "Address line 1 is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postal_code: z.string().min(3, "Postal code is required"),
  country: z.string().default("IN")
});
export type BuyerAddress = z.infer<typeof BuyerAddressSchema>;

export const BuyerContactSchema = z.object({
  email: z.string().email("Invalid email").optional(),
  phone: z.string().min(10, "Phone number must have at least 10 digits").optional()
});
export type BuyerContact = z.infer<typeof BuyerContactSchema>;

export const FulfillmentSchema = z.object({
  selected_shipping_option_id: z.string().default("std_delivery"),
  shipping_options: z.array(ShippingOptionSchema).default([]),
  buyer_address: BuyerAddressSchema.optional(),
  buyer_contact: BuyerContactSchema.optional()
});
export type Fulfillment = z.infer<typeof FulfillmentSchema>;

export const CheckoutItemInputSchema = z.object({
  product_id: z.string().uuid("Invalid product UUID"),
  quantity: z.number().int().positive("Quantity must be greater than 0")
});
export type CheckoutItemInput = z.infer<typeof CheckoutItemInputSchema>;

export const CreateCheckoutSessionSchema = z.object({
  cart_id: z.string().uuid("Invalid cart UUID").optional(),
  merchant_id: z.string().uuid("Invalid merchant UUID").optional(),
  items: z.array(CheckoutItemInputSchema).optional(),
  fulfillment: FulfillmentSchema.optional(),
  agent_session_id: z.string().optional(),
  metadata: z.record(z.any()).optional()
}).refine((data) => data.cart_id || (data.items && data.items.length > 0), {
  message: "Either 'cart_id' or a non-empty 'items' array must be provided to create a checkout session"
});
export type CreateCheckoutSessionInput = z.infer<typeof CreateCheckoutSessionSchema>;

export const UpdateCheckoutSessionSchema = z.object({
  items: z.array(CheckoutItemInputSchema).optional(),
  fulfillment: z.object({
    selected_shipping_option_id: z.string().optional(),
    buyer_address: BuyerAddressSchema.optional(),
    buyer_contact: BuyerContactSchema.optional()
  }).optional(),
  metadata: z.record(z.any()).optional()
});
export type UpdateCheckoutSessionInput = z.infer<typeof UpdateCheckoutSessionSchema>;

export const CheckoutItemResponseSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  product_name: z.string(),
  sku: z.string(),
  unit_price: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
  total_price: z.number().int().nonnegative(),
  image_url: z.string().optional(),
  delivery_estimate: z.string().optional()
});
export type CheckoutItemResponse = z.infer<typeof CheckoutItemResponseSchema>;

export const CheckoutSessionResponseSchema = z.object({
  checkout_id: z.string(),
  id: z.string(), // ACP compatibility alias
  cart_id: z.string().nullable(),
  merchant_id: z.string(),
  status: CheckoutStatusEnum,
  currency: z.string(),
  subtotal: z.number().int().nonnegative(),
  tax: z.number().int().nonnegative(),
  shipping: z.number().int().nonnegative(),
  discount: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  item_count: z.number().int().nonnegative(),
  items: z.array(CheckoutItemResponseSchema),
  fulfillment: FulfillmentSchema,
  integrity_hash: z.string(),
  capabilities: z.object({
    can_update_quantity: z.boolean(),
    can_update_fulfillment: z.boolean(),
    can_cancel: z.boolean(),
    can_complete: z.boolean(),
    payment_methods_supported: z.array(z.string())
  }),
  expires_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  metadata: z.record(z.any()).optional()
});
export type CheckoutSessionResponse = z.infer<typeof CheckoutSessionResponseSchema>;
