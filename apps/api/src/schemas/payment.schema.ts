import { z } from "zod";

export const PaymentStatusEnum = z.enum([
  "NOT_STARTED",
  "ORDER_CREATED",
  "PAYMENT_PENDING",
  "PAYMENT_VERIFICATION_PENDING",
  "PAID",
  "FAILED",
  "EXPIRED",
  "REFUNDED"
]);
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;

export const OrderStatusEnum = z.enum([
  "PLACED",
  "PROCESSING",
  "SHIPPED",
  "CANCELLED",
  "ORDER_PROCESSING_FAILED"
]);
export type OrderStatus = z.infer<typeof OrderStatusEnum>;

export const InitiatePaymentRequestSchema = z.object({
  mandate_id: z.string().min(1, "mandate_id is required"),
  checkout_id: z.string().min(1, "checkout_id is required")
});
export type InitiatePaymentRequest = z.infer<typeof InitiatePaymentRequestSchema>;

export const InitiatePaymentResponseSchema = z.object({
  payment_id: z.string(),
  razorpay_order_id: z.string(),
  razorpay_key_id: z.string(),
  amount: z.number().int().nonnegative(),
  amount_paise: z.number().int().nonnegative(),
  currency: z.string(),
  status: PaymentStatusEnum,
  merchant_name: z.string(),
  description: z.string()
});
export type InitiatePaymentResponse = z.infer<typeof InitiatePaymentResponseSchema>;

export const VerifyPaymentRequestSchema = z.object({
  payment_id: z.string().min(1, "payment_id is required"),
  razorpay_order_id: z.string().min(1, "razorpay_order_id is required"),
  razorpay_payment_id: z.string().min(1, "razorpay_payment_id is required"),
  razorpay_signature: z.string().min(1, "razorpay_signature is required")
});
export type VerifyPaymentRequest = z.infer<typeof VerifyPaymentRequestSchema>;

export const OrderItemDTO = z.object({
  id: z.string(),
  product_id: z.string(),
  product_name: z.string(),
  quantity: z.number().int().positive(),
  unit_price: z.number().int().nonnegative(),
  total_price: z.number().int().nonnegative()
});

export const MerchantOrderResponseSchema = z.object({
  order_id: z.string(),
  payment_id: z.string(),
  checkout_id: z.string(),
  merchant_id: z.string(),
  merchant_name: z.string(),
  subtotal: z.number().int().nonnegative(),
  tax: z.number().int().nonnegative(),
  shipping: z.number().int().nonnegative(),
  discount: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  currency: z.string(),
  status: OrderStatusEnum,
  items: z.array(OrderItemDTO),
  fulfillment: z.record(z.any()),
  created_at: z.string()
});
export type MerchantOrderResponse = z.infer<typeof MerchantOrderResponseSchema>;

export const VerifyPaymentResponseSchema = z.object({
  payment_id: z.string(),
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  status: PaymentStatusEnum,
  order: MerchantOrderResponseSchema,
  message: z.string()
});
export type VerifyPaymentResponse = z.infer<typeof VerifyPaymentResponseSchema>;

export const RazorpayWebhookPayloadSchema = z.object({
  entity: z.string().optional(),
  account_id: z.string().optional(),
  event: z.string(),
  contains: z.array(z.string()).optional(),
  payload: z.record(z.any()),
  created_at: z.number().optional()
});
export type RazorpayWebhookPayload = z.infer<typeof RazorpayWebhookPayloadSchema>;
