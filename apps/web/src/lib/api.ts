import {
  MerchantProfile,
  Product,
  ProductListResponse,
  ProductSearchFilters,
  RuleEngineReport,
  BuyerChatResponse,
  CartResponse,
  CheckoutSessionResponse,
  MandateResponse,
  PolicyEvaluationReport,
  UserConstraintsResponse,
  InitiatePaymentResponse,
  VerifyPaymentResponse
} from "./types";

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

// --- Phase 2: AI Buyer APIs ---

export async function sendBuyerChat(prompt: string, sessionId?: string): Promise<BuyerChatResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/buyer/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, session_id: sessionId })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `AI Buyer request failed (${res.status})`);
  }
  return res.json();
}

export async function createCart(productId: string, quantity = 1, cartId?: string): Promise<CartResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/cart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product_id: productId, quantity, cart_id: cartId })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to add product to cart (${res.status})`);
  }
  return res.json();
}

export async function fetchCart(cartId: string): Promise<CartResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/cart/${cartId}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Cart not found: ${res.statusText}`);
  }
  return res.json();
}

// --- Phase 3: ACP Agentic Checkout APIs ---

export async function createCheckoutSession(
  cartId?: string,
  items?: Array<{ product_id: string; quantity: number }>,
  agentSessionId?: string,
  idempotencyKey?: string
): Promise<CheckoutSessionResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }
  if (agentSessionId) {
    headers["x-agent-session-id"] = agentSessionId;
  }

  const res = await fetch(`${API_BASE_URL}/checkout_sessions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      cart_id: cartId,
      items: items,
      agent_session_id: agentSessionId
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to create checkout session (${res.status})`);
  }
  return res.json();
}

export async function fetchCheckoutSession(checkoutId: string): Promise<CheckoutSessionResponse> {
  const res = await fetch(`${API_BASE_URL}/checkout_sessions/${checkoutId}`, { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to fetch checkout session (${res.status})`);
  }
  return res.json();
}

export async function updateCheckoutSession(
  checkoutId: string,
  updates: {
    items?: Array<{ product_id: string; quantity: number }>;
    fulfillment?: { selected_shipping_option_id?: string; buyer_address?: any; buyer_contact?: any };
  },
  idempotencyKey?: string
): Promise<CheckoutSessionResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const res = await fetch(`${API_BASE_URL}/checkout_sessions/${checkoutId}`, {
    method: "POST",
    headers,
    body: JSON.stringify(updates)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to update checkout session (${res.status})`);
  }
  return res.json();
}

export async function completeCheckoutSession(
  checkoutId: string,
  idempotencyKey?: string
): Promise<CheckoutSessionResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const res = await fetch(`${API_BASE_URL}/checkout_sessions/${checkoutId}/complete`, {
    method: "POST",
    headers,
    body: JSON.stringify({})
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to complete checkout (${res.status})`);
  }
  return res.json();
}

export async function cancelCheckoutSession(
  checkoutId: string,
  idempotencyKey?: string
): Promise<CheckoutSessionResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const res = await fetch(`${API_BASE_URL}/checkout_sessions/${checkoutId}/cancel`, {
    method: "POST",
    headers,
    body: JSON.stringify({})
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to cancel checkout (${res.status})`);
  }
  return res.json();
}

// --- Phase 4: Security, Policy Engine & Mandate APIs ---

export async function requestAuthorizationMandate(
  checkoutId: string,
  maxAmount: number,
  currency = "INR",
  sessionId?: string
): Promise<MandateResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/authorizations/mandates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      checkout_id: checkoutId,
      user_constraints: {
        max_amount: maxAmount,
        currency,
        max_quantity: 5
      }
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to request authorization mandate (${res.status})`);
  }
  return res.json();
}

export async function fetchMandateById(mandateId: string): Promise<MandateResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/authorizations/mandates/${mandateId}`, {
    cache: "no-store"
  });
  if (!res.ok) {
    throw new Error(`Mandate not found (${res.status})`);
  }
  return res.json();
}

export async function approveMandate(mandateId: string): Promise<{ mandate: MandateResponse; status: string; message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/v1/authorizations/mandates/${mandateId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirmation: true })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to approve mandate (${res.status})`);
  }
  return res.json();
}

export async function denyMandate(mandateId: string): Promise<{ mandate: MandateResponse; status: string; message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/v1/authorizations/mandates/${mandateId}/deny`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to deny mandate (${res.status})`);
  }
  return res.json();
}

// --- Phase 5: Razorpay Payment & Order APIs ---

export async function initiatePayment(
  mandateId: string,
  checkoutId: string,
  idempotencyKey?: string
): Promise<InitiatePaymentResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/payments/initiate`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      mandate_id: mandateId,
      checkout_id: checkoutId
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Payment initiation failed (${res.status})`);
  }
  return res.json();
}

export async function verifyPayment(
  paymentId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): Promise<VerifyPaymentResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/payments/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      payment_id: paymentId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Payment verification failed (${res.status})`);
  }
  return res.json();
}
