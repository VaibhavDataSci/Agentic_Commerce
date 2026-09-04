"use client";

import React from "react";
import { X, Trash2, Tag, Gift, ShoppingBag, Lock, ArrowRight, RefreshCw } from "lucide-react";
import { Product } from "../lib/types";
import { formatINR } from "../lib/utils";

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onProceedToCheckout?: () => void;
  isCheckingOut?: boolean;
}

export const CartOptimizerModal: React.FC<CartOptimizerModalProps> = ({
  isOpen,
  onClose,
  cart,
  onRemoveItem,
  onClearCart,
  onProceedToCheckout,
  isCheckingOut = false
}) => {
  if (!isOpen) return null;

  const rawSubtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  // Cart Rules Evaluation
  const isUnder1000 = rawSubtotal > 0 && rawSubtotal < 1000;
  const isOver3000 = rawSubtotal > 3000;
  const discountAmount = isOver3000 ? Math.round((rawSubtotal * 10) / 100) : 0;
  const finalTotal = rawSubtotal - discountAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-indigo-500/30 bg-[#090e1f] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-indigo-900/40 px-5 py-4">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="h-5 w-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Simulated Merchant Cart</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close cart modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {cart.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <ShoppingBag className="h-10 w-10 mx-auto text-slate-600" />
              <p className="text-sm font-medium">Your simulated cart is empty.</p>
              <p className="text-xs text-slate-500">Add products from the catalog to test Rule Engine optimizations.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-3"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="h-12 w-12 rounded-lg object-cover bg-slate-950"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-white line-clamp-1">
                        {item.product.name}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {formatINR(item.product.price)} x {item.quantity}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold text-white">
                      {formatINR(item.product.price * item.quantity)}
                    </span>
                    <button
                      onClick={() => onRemoveItem(item.product.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors"
                      title="Remove item"
                      aria-label={`Remove ${item.product.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Dynamic Rule Alerts */}
          {isUnder1000 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-1">
              <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold">
                <Gift className="h-4 w-4" />
                <span>Rule Engine: Add-On Suggestion Triggered</span>
              </div>
              <p className="text-[11px] text-amber-200">
                Add {formatINR(1000 - rawSubtotal)} more to qualify for Free Shipping &amp; Accessory bundles!
              </p>
            </div>
          )}

          {isOver3000 && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-1">
              <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold">
                <Tag className="h-4 w-4" />
                <span>Rule Engine: High-Value Premium Tier Unlocked</span>
              </div>
              <p className="text-[11px] text-emerald-200">
                10% Instant Merchant Discount applied: saved {formatINR(discountAmount)}!
              </p>
            </div>
          )}
        </div>

        {/* Footer Summary */}
        {cart.length > 0 && (
          <div className="border-t border-indigo-900/40 bg-slate-950/40 p-5 space-y-3">
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold text-white">{formatINR(rawSubtotal)}</span>
              </div>
              {isOver3000 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Premium Tier Discount (10%):</span>
                  <span>-{formatINR(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                <span>Estimated Total:</span>
                <span className="text-indigo-400">{formatINR(finalTotal)}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {onProceedToCheckout && (
                <button
                  onClick={onProceedToCheckout}
                  disabled={isCheckingOut || cart.length === 0}
                  className="w-full flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-xs sm:text-sm font-bold text-white hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-600/30 active:scale-95 disabled:opacity-50"
                >
                  {isCheckingOut ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Initializing ACP Checkout...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      <span>Proceed to Checkout ({formatINR(finalTotal)})</span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </button>
              )}

              <div className="flex gap-2">
                <button
                  onClick={onClearCart}
                  className="w-1/3 rounded-lg border border-slate-700 bg-slate-800/80 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  Clear Cart
                </button>
                <button
                  onClick={onClose}
                  className="w-2/3 rounded-lg border border-indigo-500/30 bg-slate-900/80 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  Continue Browsing
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
