"use client";

import React from "react";
import { Star, CheckCircle, Sparkles, ShoppingCart, Code, ShieldCheck } from "lucide-react";
import { Product, ProductRankingReport } from "../../lib/types";
import { formatINR } from "../../lib/utils";

interface RankedProductListProps {
  products: Product[];
  ranking: ProductRankingReport;
  recommendedProduct: Product | null;
  onAcceptProduct: (product: Product) => void;
  onInspectJson: (product: Product) => void;
  addingToCart: boolean;
}

export const RankedProductList: React.FC<RankedProductListProps> = ({
  products,
  ranking,
  recommendedProduct,
  onAcceptProduct,
  onInspectJson,
  addingToCart
}) => {
  if (!products || products.length === 0) return null;

  return (
    <div className="space-y-5">
      {/* 1. Top Recommendation Spotlight Card */}
      {recommendedProduct && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-indigo-500/60 bg-gradient-to-br from-indigo-950/50 via-slate-900/80 to-[#0b1024] p-5 sm:p-6 shadow-2xl shadow-indigo-500/10">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Image */}
            <div className="relative aspect-video md:w-72 shrink-0 overflow-hidden rounded-xl bg-slate-950">
              <img
                src={recommendedProduct.imageUrl}
                alt={recommendedProduct.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute top-2 left-2 rounded-md bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white shadow-md">
                Top Recommendation
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                    {recommendedProduct.category}
                  </span>
                  <div className="flex items-center space-x-1 rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-400">
                    <Star className="h-3.5 w-3.5 fill-amber-400" />
                    <span>{recommendedProduct.rating.toFixed(1)}</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white mt-1">
                  {recommendedProduct.name}
                </h3>
                <p className="text-xs text-slate-300 line-clamp-2 mt-0.5">
                  {recommendedProduct.description}
                </p>

                {/* "Why This Product?" Reasoning Callout */}
                <div className="mt-3 rounded-xl border border-indigo-500/30 bg-indigo-950/40 p-3">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-300">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Why This Product Was Selected:</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-200 leading-relaxed">
                    {ranking.summary_reasoning}
                  </p>
                </div>
              </div>

              {/* Price & Action Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
                <div>
                  <span className="text-2xl font-extrabold text-white">
                    {formatINR(recommendedProduct.price)}
                  </span>
                  <span className="ml-1 text-xs font-semibold text-slate-400">INR</span>
                  <span className="ml-3 inline-flex items-center space-x-1 text-xs font-semibold text-emerald-400">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>{recommendedProduct.availability.quantity} in stock</span>
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onInspectJson(recommendedProduct)}
                    className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
                  >
                    <Code className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => onAcceptProduct(recommendedProduct)}
                    disabled={addingToCart}
                    className="flex items-center space-x-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 active:scale-95 disabled:opacity-50"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <span>{addingToCart ? "Creating Cart..." : "Accept & Create Cart"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Other Evaluated Candidate Products */}
      {products.length > 1 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Other Evaluated Candidates ({products.length - 1})
          </h4>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products
              .filter((p) => p.id !== recommendedProduct?.id)
              .map((product) => {
                const rankInfo = ranking.ranked_products.find((r) => r.product_id === product.id);

                return (
                  <div
                    key={product.id}
                    className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-4 transition-all hover:border-slate-700"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase">
                          {product.category}
                        </span>
                        {rankInfo && (
                          <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                            Score: {Math.round(rankInfo.score * 100)}%
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-white line-clamp-1">
                        {product.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                        {rankInfo?.reason || product.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-sm font-bold text-white">
                        {formatINR(product.price)}
                      </span>
                      <button
                        onClick={() => onAcceptProduct(product)}
                        disabled={addingToCart}
                        className="rounded-lg border border-indigo-500/30 bg-indigo-950/40 px-3 py-1 text-xs font-semibold text-indigo-300 hover:bg-indigo-900/50 hover:text-white"
                      >
                        Choose this
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};
