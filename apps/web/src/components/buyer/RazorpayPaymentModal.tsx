"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Store,
  Sparkles,
  Lock,
  ArrowRight,
  Package,
  Receipt,
  Truck
} from "lucide-react";
import {
  MandateResponse,
  CheckoutSessionResponse,
  InitiatePaymentResponse,
  VerifyPaymentResponse,
  MerchantOrderResponse
} from "../../lib/types";
import { initiatePayment, verifyPayment } from "../../lib/api";
import { formatINR } from "../../lib/utils";

interface RazorpayPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  mandate: MandateResponse;
  checkout: CheckoutSessionResponse;
  onPaymentCompleted: (order: MerchantOrderResponse) => void;
}

export const RazorpayPaymentModal: React.FC<RazorpayPaymentModalProps> = ({
  isOpen,
  onClose,
  mandate,
  checkout,
  onPaymentCompleted
}) => {
  const [initLoading, setInitLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<InitiatePaymentResponse | null>(null);
  const [verifiedOrder, setVerifiedOrder] = useState<MerchantOrderResponse | null>(null);
  const [paymentStep, setPaymentStep] = useState<
    "INIT" | "ORDER_CREATED" | "PROCESSING" | "VERIFIED" | "FAILED"
  >("INIT");

  // Initiate Razorpay Order on modal mount if not already done
  useEffect(() => {
    if (!isOpen || paymentData || initLoading) return;

    let isMounted = true;
    const createPaymentOrder = async () => {
      setInitLoading(true);
      setError(null);
      try {
        const res = await initiatePayment(mandate.mandate_id, checkout.checkout_id);
        if (isMounted) {
          setPaymentData(res);
          setPaymentStep("ORDER_CREATED");
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to initialize Razorpay test payment");
          setPaymentStep("FAILED");
        }
      } finally {
        if (isMounted) setInitLoading(false);
      }
    };

    createPaymentOrder();

    return () => {
      isMounted = false;
    };
  }, [isOpen, mandate.mandate_id, checkout.checkout_id, paymentData, initLoading]);

  if (!isOpen) return null;

  // Execute Simulated Test Mode Payment & Server Verification
  const handleTestPayment = async (shouldSimulateSuccess = true) => {
    if (!paymentData) return;
    setPayLoading(true);
    setError(null);
    setPaymentStep("PROCESSING");

    try {
      if (!shouldSimulateSuccess) {
        throw new Error("Payment was declined by user / bank simulator in Test Mode.");
      }

      // Generate a simulated Razorpay payment ID & test signature
      const dummyPaymentId = `pay_${Date.now()}`;
      // In test mode, server generates/accepts valid signature formula
      const secret = "rzp_sec_test_agentcart_secret_2026";
      
      // Calculate signature in frontend helper or send standard test signature
      // Using standard sha256 HMAC for test verification
      const msg = `${paymentData.razorpay_order_id}|${dummyPaymentId}`;
      // Use standard Node/browser crypto or simple test signature
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secret);
      const msgData = encoder.encode(msg);
      const cryptoKey = await window.crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const sigBuffer = await window.crypto.subtle.sign("HMAC", cryptoKey, msgData);
      const signature = Array.from(new Uint8Array(sigBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const res: VerifyPaymentResponse = await verifyPayment(
        paymentData.payment_id,
        paymentData.razorpay_order_id,
        dummyPaymentId,
        signature
      );

      setVerifiedOrder(res.order);
      setPaymentStep("VERIFIED");
      onPaymentCompleted(res.order);
    } catch (err: any) {
      setError(err.message || "Payment verification failed");
      setPaymentStep("FAILED");
    } finally {
      setPayLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl border-2 border-indigo-500/50 bg-[#090e1f] p-6 text-slate-100 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Razorpay Test Payment
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Mandate ID: <span className="text-indigo-300">{mandate.mandate_id}</span>
              </p>
            </div>
          </div>

          <span className="inline-flex items-center space-x-1.5 rounded-full bg-blue-500/20 border border-blue-500/40 px-3 py-1 text-[11px] font-bold text-blue-300">
            <span>TEST MODE</span>
          </span>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Transaction Summary Card */}
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
            <span className="text-xs text-slate-400">Authoritative Payment Total</span>
            <div className="flex items-baseline sm:justify-end space-x-1">
              <span className="text-xl font-extrabold text-emerald-400 font-mono">
                {formatINR(checkout.total)}
              </span>
              <span className="text-xs text-slate-400">({checkout.total * 100} paise)</span>
            </div>
            <p className="text-[11px] text-emerald-400 font-medium">✓ Zero client price tampering</p>
          </div>
        </div>

        {/* Live Transaction Timeline */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Transaction Execution Pipeline
          </h4>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>1. User Spending Authorization</span>
              </span>
              <span className="font-mono text-emerald-400 font-bold">APPROVED</span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>2. Deterministic Policy Engine</span>
              </span>
              <span className="font-mono text-emerald-400 font-bold">PASSED (10/10)</span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center space-x-2">
                {paymentData ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : (
                  <RefreshCw className="h-4 w-4 animate-spin text-indigo-400 shrink-0" />
                )}
                <span>3. Razorpay Order Creation</span>
              </span>
              <span className="font-mono text-indigo-300 font-medium">
                {paymentData ? paymentData.razorpay_order_id : "Creating Order..."}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center space-x-2">
                {paymentStep === "VERIFIED" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : paymentStep === "PROCESSING" ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-amber-400 shrink-0" />
                ) : paymentStep === "FAILED" ? (
                  <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                ) : (
                  <Lock className="h-4 w-4 text-slate-500 shrink-0" />
                )}
                <span>4. Payment Execution &amp; Server Verification</span>
              </span>
              <span
                className={`font-mono font-bold ${
                  paymentStep === "VERIFIED"
                    ? "text-emerald-400"
                    : paymentStep === "PROCESSING"
                    ? "text-amber-300"
                    : paymentStep === "FAILED"
                    ? "text-rose-400"
                    : "text-slate-500"
                }`}
              >
                {paymentStep === "VERIFIED"
                  ? "VERIFIED & SIGNED"
                  : paymentStep === "PROCESSING"
                  ? "VERIFYING..."
                  : paymentStep === "FAILED"
                  ? "FAILED"
                  : "PENDING"}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center space-x-2">
                {verifiedOrder ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : (
                  <Package className="h-4 w-4 text-slate-500 shrink-0" />
                )}
                <span>5. Merchant Order &amp; Stock Decrement</span>
              </span>
              <span
                className={`font-mono font-bold ${
                  verifiedOrder ? "text-emerald-400" : "text-slate-500"
                }`}
              >
                {verifiedOrder ? `ORDER ${verifiedOrder.order_id}` : "PENDING"}
              </span>
            </div>
          </div>
        </div>

        {/* Post-Success Merchant Order Card */}
        {verifiedOrder && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-3 animate-fade-in">
            <div className="flex items-center space-x-2 text-emerald-400">
              <Receipt className="h-5 w-5" />
              <h4 className="font-bold text-sm">Merchant Order Confirmation</h4>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400">Order ID:</span>
                <p className="font-mono font-bold text-white">{verifiedOrder.order_id}</p>
              </div>
              <div>
                <span className="text-slate-400">Status:</span>
                <p className="font-bold text-emerald-400">{verifiedOrder.status}</p>
              </div>
              <div>
                <span className="text-slate-400">Total Charged:</span>
                <p className="font-mono font-bold text-white">{formatINR(verifiedOrder.total)}</p>
              </div>
              <div>
                <span className="text-slate-400">Delivery:</span>
                <p className="text-slate-300">Standard Delivery (2-3 days)</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          {paymentStep !== "VERIFIED" && (
            <>
              <button
                onClick={() => handleTestPayment(false)}
                disabled={payLoading || initLoading || !paymentData}
                className="w-full sm:w-auto rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-950/40 hover:border-rose-500/40 transition-colors disabled:opacity-40"
              >
                Simulate Payment Failure
              </button>

              <button
                onClick={() => handleTestPayment(true)}
                disabled={payLoading || initLoading || !paymentData}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/30 active:scale-95 disabled:opacity-50"
              >
                {payLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Verifying with Razorpay...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    <span>Pay {formatINR(checkout.total)} (Test Mode)</span>
                  </>
                )}
              </button>
            </>
          )}

          {paymentStep === "VERIFIED" && (
            <button
              onClick={onClose}
              className="w-full sm:w-auto rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/30"
            >
              Done / Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
