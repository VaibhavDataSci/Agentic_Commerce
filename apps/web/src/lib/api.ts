import { MerchantProfile, Product, ProductListResponse, ProductSearchFilters, RuleEngineReport } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export async function fetchMerchantProfile(): Promise<MerchantProfile> {
  const res = await fetch(`${API_BASE_URL}/api/v1/merchant`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch merchant profile: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchProducts(filters: ProductSearchFilters = {}): Promise<ProductListResponse> {
  const params = new URLSearchParams();
  if (filters.query) params.append("query", filters.query);
  if (filters.category && filters.category !== "all") params.append("category", filters.category);
  if (filters.min_price !== undefined) params.append("min_price", String(filters.min_price));
  if (filters.max_price !== undefined) params.append("max_price", String(filters.max_price));
  if (filters.in_stock !== undefined) params.append("in_stock", String(filters.in_stock));
  if (filters.rating !== undefined) params.append("rating", String(filters.rating));
  if (filters.sort) params.append("sort", filters.sort);
  if (filters.page) params.append("page", String(filters.page));
  if (filters.limit) params.append("limit", String(filters.limit));

  const url = `${API_BASE_URL}/api/v1/products/search?${params.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to fetch products (${res.status})`);
  }
  return res.json();
}

export async function fetchProductById(id: string): Promise<Product> {
  const res = await fetch(`${API_BASE_URL}/api/v1/products/${id}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Product not found: ${res.statusText}`);
  }
  return res.json();
}

export async function evaluateRules(context: Record<string, any>, category?: string): Promise<RuleEngineReport> {
  const res = await fetch(`${API_BASE_URL}/api/v1/rules/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, context })
  });
  if (!res.ok) {
    throw new Error(`Rule evaluation failed: ${res.statusText}`);
  }
  const data = await res.json();
  return data.report;
}
