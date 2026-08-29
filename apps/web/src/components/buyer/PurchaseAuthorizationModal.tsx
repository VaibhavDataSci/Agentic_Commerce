"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  KeyRound,
  Hash,
  AlertTriangle,
  RefreshCw,
  Store,
  Sparkles,
  Lock,
  CreditCard,
  ArrowRight
} from "lucide-react";
import { MandateResponse, CheckoutSessionResponse, MerchantOrderResponse } from "../../lib/types";
import { approveMandate, denyMandate } from "../../lib/api";
import { formatINR } from "../../lib/utils";
import { RazorpayPaymentModal } from "./RazorpayPaymentModal";

interface PurchaseAuthorizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  mandate: MandateResponse;
  checkout: CheckoutSessionResponse;
  onMandateUpdated: (updated: MandateResponse) => void;
  onPaymentCompleted?: (order: MerchantOrderResponse) => void;
}

export const PurchaseAuthorizationModal: React.FC<PurchaseAuthorizationModalProps> = ({
  isOpen,
  onClose,
  mandate,
  checkout,
  onMandateUpdated,
  onPaymentCompleted
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRazorpayModalOpen, setIsRazorpayModalOpen] = useState(false);

  if (!isOpen) return null;

  const isAuthorized = mandate.status === "AUTHORIZED";
  const isDenied = mandate.status === "DENIED";
  const isPending = mandate.status === "PENDING";
  const isConsumed = mandate.status === "CONSUMED";
  const policyPassed = mandate.decision.decision === "ALLOW";

  const handleApprove = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await approveMandate(mandate.mandate_id);
      onMandateUpdated(res.mandate);
    } catch (err: any) {
      setError(err.message || "Failed to authorize mandate");
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await denyMandate(mandate.mandate_id);
      onMandateUpdated(res.mandate);
    } catch (err: any) {
      setError(err.message || "Failed to deny mandate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in">
        <div className="relative w-full max-w-2xl rounded-2xl border-2 border-indigo-500/50 bg-[#090e1f] p-6 text-slate-100 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Purchase Authorization (AP2 Mandate)
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Mandate ID: <span className="text-indigo-300">{mandate.mandate_id}</span>
                </p>
              </div>
            </div>

            <div>
              {(isAuthorized || isConsumed) && (
                <span className="inline-flex items-center space-x-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-bold text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{isConsumed ? "PAYMENT EXECUTED" : "AUTHORIZED FOR PAYMENT"}</span>
                </span>
              )}
              {isDenied && (
                <span className="inline-flex items-center space-x-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 px-3 py-1 text-xs font-bold text-rose-400">
                  <XCircle className="h-3.5 w-3.5" />
                  <span>DENIED</span>
                </span>
              )}
              {isPending && (
                <span className="inline-flex items-center space-x-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-bold text-amber-300">
                  <Clock className="h-3.5 w-3.5" />
                  <span>AWAITING APPROVAL</span>
                </span>
              )}
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Summary Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 flex items-center space-x-1">
                <Store className="h-3.5 w-3.5 text-indigo-400" />
                <span>Merchant</span>
              </span>
              <p className="text-sm font-bold text-white">TechKart Electronics</p>
              <p className="text-[11px] text-slate-400">
                Product: {checkout.items.map((i) => i.product_name).join(", ")}
              </p>
            </div>

            <div className="space-y-1 sm:text-right">
              <span className="text-xs text-slate-400">Authoritative Checkout vs Authorized Limit</span>
              <div className="flex items-baseline sm:justify-end space-x-2">
                <span className="text-lg font-extrabold text-emerald-400 font-mono">
                  {formatINR(checkout.total)}
                </span>
                <span className="text-xs text-slate-400">/ limit {formatINR(mandate.decision.max_authorized_amount)}</span>
              </div>
              <p className="text-[11px] text-emerald-400 font-medium">✓ Within authorized budget</p>
            </div>
          </div>

          {/* Policy Engine Security Checks Checklist */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Deterministic Policy Engine Checks</span>
              </h4>
              <span className={`text-[11px] font-bold ${policyPassed ? "text-emerald-400" : "text-rose-400"}`}>
                {policyPassed ? "✓ All Checks Passed" : "✗ Policy Denied"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {mandate.decision.checks.map((chk, idx) => (
                <div
                  key={idx}
                  className={`flex items-start space-x-2.5 rounded-xl border p-3 text-xs ${
                    chk.passed
                      ? "border-emerald-500/20 bg-emerald-950/20 text-slate-300"
                      : "border-rose-500/30 bg-rose-950/30 text-rose-300"
                  }`}
                >
                  {chk.passed ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                  )}
                  <div>
                    <p className="font-bold text-white">{chk.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{chk.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cryptographic Proof & Signature Badge */}
          <div className="rounded-xl border border-indigo-500/20 bg-slate-950/80 p-3.5 space-y-2 text-[11px] font-mono text-slate-400">
            <div className="flex items-center justify-between text-indigo-300">
              <span className="flex items-center space-x-1">
                <KeyRound className="h-3.5 w-3.5" />
                <span>HMAC-SHA256 Mandate Signature</span>
              </span>
              <span className="truncate max-w-[120px]">{mandate.signature.slice(0, 16)}...</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <Hash className="h-3.5 w-3.5 text-slate-500" />
                <span>Cryptographic Nonce</span>
              </span>
              <span className="text-slate-300 truncate max-w-[140px]">{mandate.nonce}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            {isPending && (
              <>
                <button
                  onClick={handleDeny}
                  disabled={loading}
                  className="w-full sm:w-auto rounded-xl border border-slate-700 bg-slate-800/80 px-5 py-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-950/40 hover:border-rose-500/40 transition-colors"
                >
                  Reject / Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={loading || !policyPassed}
                  className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/30 active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Signing Mandate...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>Authorize Transaction</span>
                    </>
                  )}
                </button>
              </>
            )}

            {isAuthorized && (
              <>
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto rounded-xl border border-slate-700 bg-slate-800/80 px-5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => setIsRazorpayModalOpen(true)}
                  className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-xs font-bold text-white hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-indigo-600/30 active:scale-95"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Proceed to Razorpay Test Payment</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </>
            )}

            {isDenied && (
              <button
                onClick={onClose}
                className="w-full sm:w-auto rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/30"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Razorpay Test Mode Payment Modal */}
      {isRazorpayModalOpen && (
        <RazorpayPaymentModal
          isOpen={isRazorpayModalOpen}
          onClose={() => {
            setIsRazorpayModalOpen(false);
            onClose();
          }}
          mandate={mandate}
          checkout={checkout}
          onPaymentCompleted={(order) => {
            if (onPaymentCompleted) onPaymentCompleted(order);
          }}
        />
      )}
    </>
  );
};
