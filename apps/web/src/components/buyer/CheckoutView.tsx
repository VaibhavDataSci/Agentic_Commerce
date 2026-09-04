"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Hash,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Lock
} from "lucide-react";
import {
  CheckoutSessionResponse,
  ShippingOption,
  MandateResponse,
  MerchantOrderResponse
} from "../../lib/types";
import {
  updateCheckoutSession,
  cancelCheckoutSession,
  requestAuthorizationMandate
} from "../../lib/api";
import { formatINR } from "../../lib/utils";
import { PurchaseAuthorizationModal } from "./PurchaseAuthorizationModal";

interface CheckoutViewProps {
  checkout: CheckoutSessionResponse;
  onCheckoutUpdated: (updated: CheckoutSessionResponse) => void;
  onReset: () => void;
  onPaymentCompleted?: (order: MerchantOrderResponse) => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  checkout,
  onCheckoutUpdated,
  onReset,
  onPaymentCompleted
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showIntegrityDetails, setShowIntegrityDetails] = useState(false);
  const [activeMandate, setActiveMandate] = useState<MandateResponse | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<MerchantOrderResponse | null>(null);

  const isTerminal = ["COMPLETED", "CANCELED", "EXPIRED"].includes(checkout.status);
  const isReady = checkout.status === "READY_FOR_PAYMENT";

  // Handle Quantity Change
  const handleQuantityChange = async (productId: string, newQty: number) => {
    if (newQty < 1 || isTerminal) return;
    setLoading(true);
    setError(null);
    try {
      const updatedItems = checkout.items.map((item) => ({
        product_id: item.product_id,
        quantity: item.product_id === productId ? newQty : item.quantity
      }));

      const res = await updateCheckoutSession(checkout.checkout_id, {
        items: updatedItems,
        fulfillment: {
          selected_shipping_option_id: checkout.fulfillment.selected_shipping_option_id
        }
      });
      onCheckoutUpdated(res);
    } catch (err: any) {
      setError(err.message || "Failed to update item quantity");
    } finally {
      setLoading(false);
    }
  };

  // Handle Shipping Option Change
  const handleShippingChange = async (optionId: string) => {
    if (isTerminal) return;
    setLoading(true);
    setError(null);
    try {
      const res = await updateCheckoutSession(checkout.checkout_id, {
        fulfillment: {
          selected_shipping_option_id: optionId
        }
      });
      onCheckoutUpdated(res);
    } catch (err: any) {
      setError(err.message || "Failed to update fulfillment option");
    } finally {
      setLoading(false);
    }
  };

  // Handle Start Purchase Authorization (Phase 4 Security Layer)
  const handleRequestAuthorization = async () => {
    if (checkout.status !== "READY_FOR_PAYMENT") {
      setError(`Checkout session is '${checkout.status}' and cannot be authorized again. Please start a new search.`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Create user constraints limit (e.g. ₹5,000 or checkout total + tolerance)
      const maxBudget = Math.max(5000, checkout.total + 200);
      const mandate = await requestAuthorizationMandate(checkout.checkout_id, maxBudget, checkout.currency);
      setActiveMandate(mandate);
      setIsAuthModalOpen(true);
    } catch (err: any) {
      setError(err.message || "Failed to initiate purchase authorization");
    } finally {
      setLoading(false);
    }
  };

  // Handle Cancel Checkout
  const handleCancel = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await cancelCheckoutSession(checkout.checkout_id);
      onCheckoutUpdated(res);
    } catch (err: any) {
      setError(err.message || "Failed to cancel checkout session");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (checkout.status === "COMPLETED" || completedOrder) {
      return (
        <span className="inline-flex items-center space-x-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-bold text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>ORDER PLACED & PAID</span>
        </span>
      );
    }

    if (activeMandate?.status === "AUTHORIZED") {
      return (
        <span className="inline-flex items-center space-x-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-bold text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>AUTHORIZED FOR PAYMENT</span>
        </span>
      );
    }

    switch (checkout.status) {
      case "READY_FOR_PAYMENT":
        return (
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-bold text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>READY FOR PAYMENT</span>
          </span>
        );
      case "CANCELED":
        return (
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 px-3 py-1 text-xs font-bold text-rose-400">
            <XCircle className="h-3.5 w-3.5" />
            <span>CANCELED</span>
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-bold text-amber-400">
            <Clock className="h-3.5 w-3.5" />
            <span>EXPIRED</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-blue-500/20 border border-blue-500/40 px-3 py-1 text-xs font-bold text-blue-300">
            <Package className="h-3.5 w-3.5" />
            <span>{checkout.status}</span>
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl border-2 border-indigo-500/40 bg-gradient-to-br from-indigo-950/30 via-slate-900/80 to-[#080d1e] p-6 shadow-2xl space-y-6 animate-fade-in backdrop-blur-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-500/20 pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                ACP Agentic Checkout Session
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                ID: <span className="text-indigo-300">{checkout.checkout_id}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {getStatusBadge()}
          {loading && <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Items & Fulfillment */}
        <div className="lg:col-span-2 space-y-5">
          {/* Items Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <Package className="h-4 w-4 text-indigo-400" />
              <span>Checkout Line Items ({checkout.item_count})</span>
            </h4>

            <div className="space-y-2.5">
              {checkout.items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 gap-3"
                >
                  <div className="flex items-center space-x-3.5">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.product_name}
                        className="h-14 w-14 rounded-lg object-cover bg-slate-950 border border-slate-800"
                      />
                    )}
                    <div>
                      <h5 className="text-xs sm:text-sm font-bold text-white">{item.product_name}</h5>
                      <p className="text-[11px] text-slate-400 font-mono">SKU: {item.sku}</p>
                      <p className="text-[11px] text-indigo-300">
                        Authoritative Unit Price: {formatINR(item.unit_price)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-4 border-t border-slate-800/80 pt-2 sm:border-0 sm:pt-0">
                    {/* Quantity Selector */}
                    <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-lg p-1">
                      <button
                        onClick={() => handleQuantityChange(item.product_id, item.quantity - 1)}
                        disabled={isTerminal || item.quantity <= 1 || loading}
                        className="h-6 w-6 flex items-center justify-center rounded text-slate-300 hover:bg-slate-800 disabled:opacity-30 text-xs font-bold"
                      >
                        -
                      </button>
                      <span className="text-xs font-mono font-bold text-white px-2">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(item.product_id, item.quantity + 1)}
                        disabled={isTerminal || loading}
                        className="h-6 w-6 flex items-center justify-center rounded text-slate-300 hover:bg-slate-800 disabled:opacity-30 text-xs font-bold"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right min-w-[90px]">
                      <span className="text-xs text-slate-400 block sm:hidden">Total</span>
                      <span className="text-sm font-extrabold text-emerald-400">
                        {formatINR(item.total_price)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fulfillment Options */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <Truck className="h-4 w-4 text-indigo-400" />
              <span>Fulfillment &amp; Delivery Option</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {checkout.fulfillment.shipping_options.map((opt: ShippingOption) => {
                const isSelected = checkout.fulfillment.selected_shipping_option_id === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleShippingChange(opt.id)}
                    disabled={isTerminal || loading}
                    className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-950/40 ring-1 ring-indigo-500"
                        : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
                    } ${isTerminal ? "cursor-default" : "cursor-pointer"}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-white">{opt.label}</span>
                      <span className="text-xs font-extrabold text-emerald-400">
                        {opt.cost === 0 ? "FREE" : formatINR(opt.cost)}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1">
                      Est. Delivery: {opt.estimated_days}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Authoritative Pricing Summary & Actions */}
        <div className="space-y-4">
          <div className="rounded-xl border border-indigo-500/30 bg-slate-950/70 p-4 space-y-3 shadow-inner">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider pb-2 border-b border-slate-800">
              Authoritative Merchant Calculation
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Product Subtotal</span>
                <span className="font-mono font-medium text-white">{formatINR(checkout.subtotal)}</span>
              </div>

              <div className="flex justify-between text-slate-300">
                <span>Estimated Tax (10% GST)</span>
                <span className="font-mono font-medium text-white">{formatINR(checkout.tax)}</span>
              </div>

              <div className="flex justify-between text-slate-300">
                <span>Shipping</span>
                <span className="font-mono font-medium text-emerald-400">
                  {checkout.shipping === 0 ? "FREE" : formatINR(checkout.shipping)}
                </span>
              </div>

              {checkout.discount > 0 && (
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span className="flex items-center space-x-1">
                    <Sparkles className="h-3 w-3" />
                    <span>Rule Discount (5%)</span>
                  </span>
                  <span className="font-mono">-{formatINR(checkout.discount)}</span>
                </div>
              )}

              <div className="border-t border-slate-800 pt-2.5 flex justify-between items-baseline">
                <span className="text-sm font-bold text-white">Authoritative Total</span>
                <span className="text-xl font-extrabold text-emerald-400 font-mono">
                  {formatINR(checkout.total)}
                </span>
              </div>
            </div>

            {/* Cryptographic Integrity Hash Badge */}
            <div className="pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setShowIntegrityDetails(!showIntegrityDetails)}
                className="w-full flex items-center justify-between text-[11px] text-slate-400 hover:text-indigo-300 transition-colors"
              >
                <span className="flex items-center space-x-1">
                  <Hash className="h-3 w-3 text-indigo-400" />
                  <span>Integrity Snapshot (SHA-256)</span>
                </span>
                <span className="font-mono text-[10px] text-indigo-400 truncate max-w-[100px]">
                  {checkout.integrity_hash.slice(0, 10)}...
                </span>
              </button>

              {showIntegrityDetails && (
                <div className="mt-2 rounded-lg bg-slate-900 border border-indigo-500/20 p-2.5 text-[10px] text-slate-300 font-mono break-all space-y-1 animate-fade-in">
                  <p className="text-indigo-400 font-bold">SHA-256 Server Hash:</p>
                  <p className="text-slate-400">{checkout.integrity_hash}</p>
                  <p className="text-[9px] text-slate-400 mt-1">
                    Immutable server verification bound to exact items, unit prices, delivery, and total.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Order Completion Success Banner */}
          {(checkout.status === "COMPLETED" || completedOrder) && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/25 p-4 space-y-2 animate-fade-in text-xs">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span className="text-sm">Order Placed &amp; Paid Successfully</span>
              </div>
              {completedOrder && (
                <p className="font-mono text-slate-300">
                  Order ID: <span className="text-white font-bold">{completedOrder.order_id}</span>
                </p>
              )}
              <p className="text-slate-400">
                Payment captured via Razorpay Test Mode. Merchant inventory decremented and mandate consumed.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            {isReady && !completedOrder && (
              <button
                onClick={handleRequestAuthorization}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs sm:text-sm font-bold text-white hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/30 active:scale-95 disabled:opacity-50"
              >
                <Lock className="h-4 w-4" />
                <span>Authorize Purchase (AP2 Mandate)</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </button>
            )}

            {isReady && !completedOrder && (
              <button
                onClick={handleCancel}
                disabled={loading}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-950/30 hover:border-rose-500/40 transition-colors"
              >
                Cancel Checkout
              </button>
            )}

            {(isTerminal || completedOrder) && (
              <button
                onClick={onReset}
                className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/30"
              >
                Start New AI Search
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Phase 4 Purchase Authorization Modal */}
      {activeMandate && (
        <PurchaseAuthorizationModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          mandate={activeMandate}
          checkout={checkout}
          onMandateUpdated={(updated) => setActiveMandate(updated)}
          onPaymentCompleted={(order) => {
            setCompletedOrder(order);
            onCheckoutUpdated({ ...checkout, status: "COMPLETED" });
            if (onPaymentCompleted) onPaymentCompleted(order);
          }}
        />
      )}
    </div>
  );
};
