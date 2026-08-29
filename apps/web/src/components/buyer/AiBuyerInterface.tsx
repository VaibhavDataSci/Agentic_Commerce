"use client";

import React, { useState } from "react";
import { Send, Bot, Sparkles, AlertCircle, RefreshCw, HelpCircle } from "lucide-react";
import { sendBuyerChat, createCart, createCheckoutSession } from "../../lib/api";
import {
  BuyerChatResponse,
  CartResponse,
  CheckoutSessionResponse,
  Product
} from "../../lib/types";
import { ActivityTimeline } from "./ActivityTimeline";
import { ExtractedRequirements } from "./ExtractedRequirements";
import { RankedProductList } from "./RankedProductList";
import { ActiveCartView } from "./ActiveCartView";
import { CheckoutView } from "./CheckoutView";

interface AiBuyerInterfaceProps {
  onInspectJson: (product: Product) => void;
}

export const AiBuyerInterface: React.FC<AiBuyerInterfaceProps> = ({ onInspectJson }) => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [creatingCheckout, setCreatingCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buyerResponse, setBuyerResponse] = useState<BuyerChatResponse | null>(null);
  const [createdCart, setCreatedCart] = useState<CartResponse | null>(null);
  const [checkoutSession, setCheckoutSession] = useState<CheckoutSessionResponse | null>(null);

  const samplePrompts = [
    "Find me wireless ANC headphones under ₹5,000, deliverable in 2 days",
    "Mechanical keyboard with brown switches under ₹6,000",
    "4K color-accurate designer monitor under ₹30,000",
    "High refresh rate gaming laptop under ₹90,000"
  ];

  const handleSearch = async (queryText?: string) => {
    const textToSend = queryText || prompt;
    if (!textToSend.trim()) return;

    setLoading(true);
    setError(null);
    setCreatedCart(null);
    setCheckoutSession(null);

    try {
      const res = await sendBuyerChat(textToSend.trim(), buyerResponse?.session_id);
      setBuyerResponse(res);
    } catch (err: any) {
      setError(err.message || "Failed to process shopping request with AI Buyer");
      setBuyerResponse(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptProduct = async (product: Product) => {
    setAddingToCart(true);
    setError(null);
    try {
      const cart = await createCart(product.id, 1, createdCart?.cart_id);
      setCreatedCart(cart);

      // Append 'Cart created' step to timeline
      if (buyerResponse) {
        setBuyerResponse({
          ...buyerResponse,
          timeline: [
            ...buyerResponse.timeline,
            {
              id: "step_cart",
              title: "Cart created",
              detail: `Cart ${cart.cart_id.slice(0, 8)}... created with ${product.name}`,
              status: "completed",
              timestamp: new Date().toISOString()
            }
          ]
        });
      }
    } catch (err: any) {
      setError(err.message || "Failed to create cart");
    } finally {
      setAddingToCart(false);
    }
  };

  const handleProceedToCheckout = async (cartId: string) => {
    setCreatingCheckout(true);
    setError(null);
    try {
      const session = await createCheckoutSession(cartId, undefined, buyerResponse?.session_id);
      setCheckoutSession(session);

      // Append 'Checkout Session Initialized' to timeline
      if (buyerResponse) {
        setBuyerResponse({
          ...buyerResponse,
          timeline: [
            ...buyerResponse.timeline,
            {
              id: "step_checkout",
              title: "ACP Checkout session initialized",
              detail: `Session ${session.checkout_id.slice(0, 8)}... Ready for payment (Authoritative Total: ₹${session.total.toLocaleString("en-IN")})`,
              status: "completed",
              timestamp: new Date().toISOString()
            }
          ]
        });
      }
    } catch (err: any) {
      setError(err.message || "Failed to initialize ACP checkout session");
    } finally {
      setCreatingCheckout(false);
    }
  };

  const handleReset = () => {
    setPrompt("");
    setBuyerResponse(null);
    setCreatedCart(null);
    setCheckoutSession(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* 1. Conversational Prompt Bar */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-slate-900/80 to-[#080d1e] p-5 shadow-2xl backdrop-blur-xl space-y-3">
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              AI Buyer &bull; Natural Language Shopping
            </h2>
            <p className="text-xs text-slate-400">
              Describe what you need — Gemini extracts intent, queries merchant APIs, and creates ACP checkouts.
            </p>
          </div>
        </div>

        {/* Input Field */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. 'Find me wireless ANC headphones under ₹5,000 deliverable tomorrow'..."
              className="w-full rounded-xl border border-indigo-500/30 bg-slate-950/80 py-3 pl-4 pr-10 text-xs sm:text-sm text-white placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white transition-all hover:bg-indigo-500 active:scale-95 disabled:opacity-50 shadow-md shadow-indigo-600/30 shrink-0"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Reasoning...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Find &amp; Rank</span>
              </>
            )}
          </button>
        </form>

        {/* Sample Prompt Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-slate-400 mr-1 flex items-center">
            <Sparkles className="h-3 w-3 text-indigo-400 mr-1" />
            Try:
          </span>
          {samplePrompts.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setPrompt(s);
                handleSearch(s);
              }}
              className="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-[11px] text-slate-300 transition-colors hover:border-indigo-500/40 hover:bg-slate-800 hover:text-white"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Error Message */}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300 flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
          <div className="text-xs">
            <p className="font-bold">AI Buyer Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* 3. Ambiguity Clarification Message */}
      {buyerResponse?.intent.is_ambiguous && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200 flex items-start space-x-3">
          <HelpCircle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
          <div className="space-y-1 text-xs">
            <p className="font-bold text-amber-300">Clarification Needed</p>
            <p>{buyerResponse.intent.clarification_question}</p>
          </div>
        </div>
      )}

      {/* 4. Agent Activity Timeline */}
      {buyerResponse && <ActivityTimeline steps={buyerResponse.timeline} />}

      {/* 5. Extracted Requirements */}
      {buyerResponse && <ExtractedRequirements intent={buyerResponse.intent} />}

      {/* 6. Ranked Products Comparison & Recommendation */}
      {buyerResponse && !buyerResponse.intent.is_ambiguous && !createdCart && !checkoutSession && (
        <RankedProductList
          products={buyerResponse.products}
          ranking={buyerResponse.ranking}
          recommendedProduct={buyerResponse.recommended_product}
          onAcceptProduct={handleAcceptProduct}
          onInspectJson={onInspectJson}
          addingToCart={addingToCart}
        />
      )}

      {/* 7. Active Created Cart */}
      {createdCart && !checkoutSession && (
        <ActiveCartView
          cart={createdCart}
          onReset={handleReset}
          onProceedToCheckout={handleProceedToCheckout}
          creatingCheckout={creatingCheckout}
        />
      )}

      {/* 8. Phase 3 ACP Checkout Session View */}
      {checkoutSession && (
        <CheckoutView
          checkout={checkoutSession}
          onCheckoutUpdated={(updated) => setCheckoutSession(updated)}
          onReset={handleReset}
        />
      )}
    </div>
  );
};
