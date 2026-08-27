"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Navbar } from "../components/Navbar";
import { AiReadyBanner } from "../components/AiReadyBanner";
import { MetricsBar } from "../components/MetricsBar";
import { FilterBar } from "../components/FilterBar";
import { ProductCard } from "../components/ProductCard";
import { JsonDrawer } from "../components/JsonDrawer";
import { RuleEngineDrawer } from "../components/RuleEngineDrawer";
import { CartOptimizerModal } from "../components/CartOptimizerModal";
import { InactivityPopup } from "../components/InactivityPopup";
import { AiBuyerInterface } from "../components/buyer/AiBuyerInterface";
import { fetchMerchantProfile, fetchProducts } from "../lib/api";
import { MerchantProfile, Product } from "../lib/types";
import { AlertCircle, RefreshCw, Layers, Bot, Store } from "lucide-react";

interface CartItem {
  product: Product;
  quantity: number;
}

export default function HomePage() {
  // Navigation Mode: "ai_buyer" or "merchant_catalog"
  const [activeTab, setActiveTab] = useState<"ai_buyer" | "merchant_catalog">("ai_buyer");

  // Merchant & Catalog State
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [maxPrice, setMaxPrice] = useState<number>(130000);
  const [sortBy, setSortBy] = useState<string>("rating_desc");

  // Modals & Drawers
  const [inspectProduct, setInspectProduct] = useState<Product | null>(null);
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showInactivityPopup, setShowInactivityPopup] = useState<boolean>(false);

  // Inactivity tracking (10 seconds user behavior rule)
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      setShowInactivityPopup(true);
    }, 10000); // 10 seconds
  }, []);

  useEffect(() => {
    const handleUserActivity = () => resetInactivityTimer();
    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);
    window.addEventListener("scroll", handleUserActivity);
    resetInactivityTimer();

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      window.removeEventListener("scroll", handleUserActivity);
    };
  }, [resetInactivityTimer]);

  // Load Merchant Profile
  const loadMerchant = useCallback(async () => {
    try {
      const data = await fetchMerchantProfile();
      setMerchant(data);
    } catch (err: any) {
      console.error("Merchant fetch error:", err);
    }
  }, []);

  // Load Products from Backend API
  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchProducts({
        query: searchQuery.trim().length >= 2 ? searchQuery.trim() : undefined,
        category: selectedCategory !== "all" ? selectedCategory : undefined,
        in_stock: inStockOnly ? true : undefined,
        max_price: maxPrice < 130000 ? maxPrice : undefined,
        sort: sortBy
      });
      setProducts(res.products);
      setTotalCount(res.total);
    } catch (err: any) {
      setError(err.message || "Failed to load products from Merchant API");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, inStockOnly, maxPrice, sortBy]);

  useEffect(() => {
    loadMerchant();
  }, [loadMerchant]);

  // Debounced search / filter fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadProducts]);

  // Cart operations
  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setInStockOnly(false);
    setMaxPrice(130000);
    setSortBy("rating_desc");
  };

  const categories = merchant?.metrics.categories || [
    "headphones",
    "earbuds",
    "laptops",
    "keyboards",
    "mice",
    "monitors",
    "webcams",
    "speakers"
  ];

  return (
    <div className="flex min-h-screen flex-col bg-transparent text-slate-100">
      {/* Top Navigation */}
      <Navbar
        cartCount={cart.reduce((a, b) => a + b.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenRules={() => setIsRulesOpen(true)}
      />

      {/* Main Content Container */}
      <main className="mx-auto flex-1 w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Mode Switcher Tabs */}
        <div className="flex items-center justify-center">
          <div className="inline-flex rounded-xl border border-indigo-500/30 bg-[#090e1f] p-1.5 shadow-xl">
            <button
              onClick={() => setActiveTab("ai_buyer")}
              className={`flex items-center space-x-2 rounded-lg px-5 py-2 text-xs sm:text-sm font-bold transition-all ${
                activeTab === "ai_buyer"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Bot className="h-4 w-4" />
              <span>Phase 2: AI Buyer Agent</span>
            </button>

            <button
              onClick={() => setActiveTab("merchant_catalog")}
              className={`flex items-center space-x-2 rounded-lg px-5 py-2 text-xs sm:text-sm font-bold transition-all ${
                activeTab === "merchant_catalog"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Store className="h-4 w-4" />
              <span>Phase 1: Merchant Catalog UI</span>
            </button>
          </div>
        </div>

        {/* Tab 1: AI Buyer Agent Interface (Phase 2) */}
        {activeTab === "ai_buyer" && (
          <AiBuyerInterface onInspectJson={setInspectProduct} />
        )}

        {/* Tab 2: Merchant Catalog View (Phase 1) */}
        {activeTab === "merchant_catalog" && (
          <div className="space-y-6">
            {/* AI Commerce Readiness Banner */}
            <AiReadyBanner />

            {/* Real-time Merchant Metrics */}
            <MetricsBar metrics={merchant?.metrics || null} loading={!merchant} />

            {/* Filter and Search Bar */}
            <FilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              categories={categories}
              inStockOnly={inStockOnly}
              onInStockToggle={setInStockOnly}
              maxPrice={maxPrice}
              onMaxPriceChange={setMaxPrice}
              sortBy={sortBy}
              onSortChange={setSortBy}
              onReset={handleResetFilters}
            />

            {/* Catalog Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Layers className="h-4 w-4 text-indigo-400" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Product Catalog ({totalCount} items)
                  </h2>
                </div>
                <span className="text-xs text-slate-400">
                  Authoritative Backend:{" "}
                  <span className="font-semibold text-emerald-400">PostgreSQL</span>
                </span>
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300 flex items-center space-x-3">
                  <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
                  <div>
                    <p className="text-xs font-bold">API Validation Error</p>
                    <p className="text-xs">{error}</p>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {loading ? (
                <div className="py-20 text-center text-slate-400 space-y-3">
                  <RefreshCw className="h-8 w-8 mx-auto animate-spin text-indigo-400" />
                  <p className="text-xs font-semibold">Querying TechKart Merchant API...</p>
                </div>
              ) : products.length === 0 && !error ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/30 py-16 text-center text-slate-400 space-y-2">
                  <Layers className="h-10 w-10 mx-auto text-slate-600" />
                  <p className="text-sm font-bold text-white">No products found matching filters</p>
                  <p className="text-xs text-slate-500">
                    Try widening your price range, selecting &quot;All Items&quot;, or clearing the search bar.
                  </p>
                  <button
                    onClick={handleResetFilters}
                    className="mt-3 inline-block rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onInspectJson={setInspectProduct}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-800/80 bg-[#060a16] py-6 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            AgentCart &bull; Phase 1 (Merchant) + Phase 2 (AI Buyer) &bull; Razorpay AI Buildathon
          </p>
          <p className="text-[11px] text-slate-600">
            Source of Truth: Fastify REST API &bull; PostgreSQL 18 &bull; Gemini-Powered Intent &amp; Ranking
          </p>
        </div>
      </footer>

      {/* Drawers & Modals */}
      <JsonDrawer product={inspectProduct} onClose={() => setInspectProduct(null)} />
      <RuleEngineDrawer isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
      <CartOptimizerModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={handleClearCart}
      />
      <InactivityPopup
        isOpen={showInactivityPopup}
        onClose={() => setShowInactivityPopup(false)}
      />
    </div>
  );
}
