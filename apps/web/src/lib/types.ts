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
