export interface ProductAvailability {
  in_stock: boolean;
  quantity: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  availability: ProductAvailability;
  attributes: Record<string, any>;
  rating: number;
  imageUrl: string;
  delivery_estimate: string;
}

export interface ProductSearchFilters {
  query?: string;
  category?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  rating?: number;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  filters: Record<string, any>;
}

export interface MerchantMetrics {
  total_products: number;
  in_stock_products: number;
  categories: string[];
  active_categories_count: number;
}

export interface MerchantProfile {
  id: string;
  name: string;
  description: string;
  currency: string;
  status: string;
  metrics: MerchantMetrics;
  ai_readiness: {
    structured_catalog: boolean;
    machine_readable_pricing: boolean;
    real_time_inventory: boolean;
    product_attributes: boolean;
    api_version: string;
  };
}

export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  category: string;
  matched: boolean;
  actionResult?: any;
  timestamp: string;
}

export interface RuleEngineReport {
  evaluatedCount: number;
  matchedCount: number;
  results: RuleEvaluationResult[];
}

// --- Phase 2: AI Buyer Types ---

export interface UserConstraints {
  wireless?: boolean;
  anc?: boolean;
  min_price?: number;
  max_price?: number;
  currency?: string;
  delivery_preference?: string;
  brand?: string;
  features?: string[];
  [key: string]: any;
}

export interface StructuredIntent {
  category?: string | null;
  raw_query: string;
  constraints: UserConstraints;
  quantity: number;
  purchase_intent: boolean;
  is_ambiguous: boolean;
  clarification_question?: string | null;
}

export interface RankedProduct {
  product_id: string;
  score: number;
  match_reasons: string[];
  reason: string;
  is_recommended: boolean;
}

export interface ProductRankingReport {
  selected_product_id: string | null;
  ranked_products: RankedProduct[];
  summary_reasoning: string;
  constraints_applied: Record<string, any>;
}

export interface TimelineStep {
  id: string;
  title: string;
  detail?: string;
  status: "completed" | "in_progress" | "failed";
  timestamp: string;
}

export interface BuyerChatResponse {
  session_id: string;
  request_id: string;
  user_prompt: string;
  intent: StructuredIntent;
  timeline: TimelineStep[];
  products: Product[];
  ranking: ProductRankingReport;
  recommended_product: Product | null;
  latency_ms: number;
}

export interface CartItemDTO {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  image_url?: string;
}

export interface CartResponse {
  cart_id: string;
  merchant_id: string;
  status: string;
  subtotal: number;
  currency: string;
  item_count: number;
  items: CartItemDTO[];
  created_at: string;
  updated_at: string;
}

// --- Phase 3: Agentic Checkout Types (ACP) ---

export type CheckoutStatus =
  | "CREATED"
  | "INCOMPLETE"
  | "READY_FOR_PAYMENT"
  | "COMPLETED"
  | "CANCELED"
  | "EXPIRED";

export interface ShippingOption {
  id: string;
  label: string;
  cost: number;
  estimated_days: string;
}

export interface BuyerAddress {
  name: string;
  line1: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface BuyerContact {
  email?: string;
  phone?: string;
}

export interface Fulfillment {
  selected_shipping_option_id: string;
  shipping_options: ShippingOption[];
  buyer_address?: BuyerAddress;
  buyer_contact?: BuyerContact;
}

export interface CheckoutItemResponse {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  image_url?: string;
  delivery_estimate?: string;
}

export interface CheckoutSessionResponse {
  checkout_id: string;
  id: string;
  cart_id: string | null;
  merchant_id: string;
  status: CheckoutStatus;
  currency: string;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  item_count: number;
  items: CheckoutItemResponse[];
  fulfillment: Fulfillment;
  integrity_hash: string;
  capabilities: {
    can_update_quantity: boolean;
    can_update_fulfillment: boolean;
    can_cancel: boolean;
    can_complete: boolean;
    payment_methods_supported: string[];
  };
  expires_at: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface AuditEventResponse {
  id: string;
  requestId: string;
  userId?: string | null;
  agentSessionId?: string | null;
  checkoutId?: string | null;
  eventType: string;
  result: string;
  metadata: Record<string, any>;
  createdAt: string;
}

// --- Phase 4: Security, Policy Engine & Mandate Types ---

export interface PolicyCheckItem {
  check: string;
  name: string;
  passed: boolean;
  details: string;
}

export interface PolicyEvaluationReport {
  decision: "ALLOW" | "DENY";
  reason_code: string;
  reason_message: string;
  checkout_id: string;
  total_amount: number;
  max_authorized_amount: number;
  currency: string;
  checks: PolicyCheckItem[];
  timestamp: string;
}

export interface MandateResponse {
  mandate_id: string;
  user_id: string;
  merchant_id: string;
  checkout_id: string;
  checkout_integrity_hash: string;
  amount: number;
  currency: string;
  constraints: Record<string, any>;
  signature: string;
  nonce: string;
  status: "PENDING" | "AUTHORIZED" | "DENIED" | "INVALIDATED" | "EXPIRED" | "CONSUMED";
  decision: PolicyEvaluationReport;
  issued_at: string;
  expires_at: string;
  created_at: string;
}

export interface UserConstraintsResponse {
  constraint_id: string;
  user_id: string;
  session_id: string | null;
  max_amount: number;
  currency: string;
  allowed_merchants: string[];
  allowed_categories: string[];
  max_quantity: number;
  required_features: Record<string, any>;
  status: string;
  expires_at: string;
  created_at: string;
}

// --- Phase 5: Razorpay Payment & Order Types ---

export type PaymentStatus =
  | "NOT_STARTED"
  | "ORDER_CREATED"
  | "PAYMENT_PENDING"
  | "PAYMENT_VERIFICATION_PENDING"
  | "PAID"
  | "FAILED"
  | "EXPIRED"
  | "REFUNDED";

export type OrderStatus =
  | "PLACED"
  | "PROCESSING"
  | "SHIPPED"
  | "CANCELLED"
  | "ORDER_PROCESSING_FAILED";

export interface InitiatePaymentResponse {
  payment_id: string;
  razorpay_order_id: string;
  razorpay_key_id: string;
  amount: number;
  amount_paise: number;
  currency: string;
  status: PaymentStatus;
  merchant_name: string;
  description: string;
}

export interface OrderItemResponse {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface MerchantOrderResponse {
  order_id: string;
  payment_id: string;
  checkout_id: string;
  merchant_id: string;
  merchant_name: string;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  status: OrderStatus;
  items: OrderItemResponse[];
  fulfillment: Record<string, any>;
  created_at: string;
}

export interface VerifyPaymentResponse {
  payment_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  status: PaymentStatus;
  order: MerchantOrderResponse;
  message: string;
}
