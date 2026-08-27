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
