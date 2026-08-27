"use client";

import React from "react";
import { Star, Truck, CheckCircle, XCircle, Code, Plus } from "lucide-react";
import { Product } from "../lib/types";
import { formatINR } from "../lib/utils";

interface ProductCardProps {
  product: Product;
  onInspectJson: (p: Product) => void;
  onAddToCart: (p: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onInspectJson,
  onAddToCart
}) => {
  const inStock = product.availability.in_stock;
  const stockQty = product.availability.quantity;

  // Extract up to 3 highlighted attributes
  const attributeEntries = Object.entries(product.attributes || {}).slice(0, 3);

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 transition-all duration-200 hover:border-indigo-500/50 hover:bg-slate-900/70 hover:shadow-xl hover:shadow-indigo-500/10">
      {/* Image & Badge Container */}
      <div>
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-950/60 mb-3">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          {/* Category Tag */}
          <div className="absolute top-2 left-2 rounded-md bg-slate-950/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-300 border border-indigo-500/20">
            {product.category}
          </div>

          {/* Rating Pill */}
          <div className="absolute top-2 right-2 flex items-center space-x-1 rounded-md bg-slate-950/80 backdrop-blur-md px-2 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span>{product.rating.toFixed(1)}</span>
          </div>
        </div>

        {/* Product Details */}
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-indigo-300 transition-colors">
              {product.name}
            </h3>
          </div>

          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
            {product.description}
          </p>

          {/* Key Attributes Tags */}
          <div className="flex flex-wrap gap-1 pt-1">
            {attributeEntries.map(([key, val]) => (
              <span
                key={key}
                className="inline-flex items-center rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-300 border border-slate-700/50"
              >
                <span className="text-slate-400 mr-1">{key.replace(/_/g, " ")}:</span>
                <span className="text-indigo-300 font-semibold">{String(val)}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing & Footer Actions */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-base font-extrabold text-white">
              {formatINR(product.price)}
            </span>
            <span className="ml-1 text-[10px] font-semibold text-slate-400">INR</span>
          </div>

          {/* Stock availability */}
          {inStock ? (
            <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-400">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>{stockQty} in stock</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-rose-400">
              <XCircle className="h-3.5 w-3.5" />
              <span>Out of stock</span>
            </span>
          )}
        </div>

        {/* Delivery Estimate */}
        <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
          <Truck className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
          <span>Delivery: {product.delivery_estimate}</span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* AI Inspector Button */}
          <button
            onClick={() => onInspectJson(product)}
            className="flex items-center justify-center space-x-1 rounded-lg border border-indigo-500/30 bg-indigo-950/30 px-2.5 py-1.5 text-xs font-medium text-indigo-300 transition-colors hover:bg-indigo-900/40 hover:text-white"
            aria-label={`Inspect AI Agent JSON schema for ${product.name}`}
          >
            <Code className="h-3.5 w-3.5" />
            <span>AI JSON</span>
          </button>

          {/* Add to simulated cart button */}
          <button
            onClick={() => onAddToCart(product)}
            disabled={!inStock}
            className={`flex items-center justify-center space-x-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
              inStock
                ? "bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 shadow-sm shadow-indigo-500/30"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            }`}
            aria-label={`Add ${product.name} to cart`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Cart</span>
          </button>
        </div>
      </div>
    </div>
  );
};
