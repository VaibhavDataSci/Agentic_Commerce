import React from "react";
import { CheckCircle2, ShoppingBag, ArrowRight } from "lucide-react";
import { CartResponse } from "../../lib/types";
import { formatINR } from "../../lib/utils";

interface ActiveCartViewProps {
  cart: CartResponse | null;
  onReset: () => void;
}

export const ActiveCartView: React.FC<ActiveCartViewProps> = ({ cart, onReset }) => {
  if (!cart) return null;

  return (
    <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-950/20 via-slate-900/60 to-[#080d1e] p-6 shadow-2xl space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Merchant Cart Created</h3>
            <p className="text-xs text-slate-400 font-mono">
              Cart ID: <span className="text-emerald-400 font-bold">{cart.cart_id}</span>
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-400">Authoritative Subtotal</span>
          <p className="text-xl font-extrabold text-white">{formatINR(cart.subtotal)}</p>
        </div>
      </div>

      {/* Cart Items */}
      <div className="space-y-2.5">
        {cart.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 p-3"
          >
            <div className="flex items-center space-x-3">
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.product_name}
                  className="h-12 w-12 rounded-lg object-cover bg-slate-950"
                />
              )}
              <div>
                <h4 className="text-xs font-bold text-white">{item.product_name}</h4>
                <p className="text-[11px] text-slate-400 font-mono">SKU: {item.sku}</p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-white">
                {formatINR(item.unit_price)} × {item.quantity}
              </span>
              <p className="text-xs font-extrabold text-emerald-400">
                {formatINR(item.total_price)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Next Phase Notice & Actions */}
      <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-3 text-xs text-slate-300 flex items-center justify-between">
        <span>
          🛒 Ready for <strong>Phase 3: Agentic Checkout &amp; Razorpay Payment</strong>
        </span>
        <button
          onClick={onReset}
          className="flex items-center space-x-1 font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <span>Start New Search</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
