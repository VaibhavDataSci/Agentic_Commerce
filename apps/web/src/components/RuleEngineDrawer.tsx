"use client";

import React, { useState } from "react";
import { X, Sliders, CheckCircle, AlertTriangle, ShieldCheck, Play, RefreshCw } from "lucide-react";
import { evaluateRules } from "../lib/api";
import { RuleEngineReport } from "../lib/types";

interface RuleEngineDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RuleEngineDrawer: React.FC<RuleEngineDrawerProps> = ({ isOpen, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("cart");
  const [cartValueInput, setCartValueInput] = useState<number>(3500);
  const [queryInput, setQueryInput] = useState<string>("x");
  const [inactivityInput, setInactivityInput] = useState<number>(10);
  const [report, setReport] = useState<RuleEngineReport | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const runEvaluation = async (cat: string) => {
    setLoading(true);
    try {
      let context: Record<string, any> = {};

      if (cat === "cart") {
        context = { cartValue: Number(cartValueInput), itemCount: 2 };
      } else if (cat === "validation") {
        context = { query: queryInput };
      } else if (cat === "user_behavior") {
        context = { inactivitySeconds: Number(inactivityInput), isReturningUser: true, viewedCategories: ["headphones", "laptops"] };
      } else if (cat === "security") {
        context = { requestRatePerMinute: 110, rateLimitThreshold: 100, isMalformed: false };
      } else if (cat === "performance") {
        context = { isCached: true, cacheKey: "search:headphones", requestedRecommendationLimit: 8 };
      } else if (cat === "accessibility") {
        context = { hasKeyboardHandlers: true, hasAriaLabels: true };
      }

      const res = await evaluateRules(context, cat);
      setReport(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-indigo-500/30 bg-[#090e1f] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-indigo-900/40 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/30 text-indigo-400">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Condition-Based Retail Rule Engine</h3>
              <p className="text-xs text-slate-400">Modular IF/THEN policies for validation, pricing, security & accessibility</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close rule engine modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: "validation", label: "1. Input Validation" },
              { id: "cart", label: "2. Cart Optimization" },
              { id: "user_behavior", label: "3. User Behavior" },
              { id: "security", label: "4. Security & Rate Limit" },
              { id: "performance", label: "5. Performance & Caching" },
              { id: "accessibility", label: "6. Accessibility" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedCategory(tab.id);
                  setReport(null);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedCategory === tab.id
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Context Simulator Input */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Simulate Context Payload:
            </h4>

            {selectedCategory === "cart" && (
              <div className="flex items-center space-x-3">
                <label className="text-xs text-slate-300">Cart Total Value (₹):</label>
                <input
                  type="number"
                  value={cartValueInput}
                  onChange={(e) => setCartValueInput(Number(e.target.value))}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-white w-32 focus:border-indigo-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400">
                  (Try &lt; 1000 for Add-ons, &gt; 3000 for 10% Discount)
                </span>
              </div>
            )}

            {selectedCategory === "validation" && (
              <div className="flex items-center space-x-3">
                <label className="text-xs text-slate-300">Search Query:</label>
                <input
                  type="text"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-white w-64 focus:border-indigo-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400">
                  (Try single char &apos;x&apos; or unsafe chars &apos;&lt;script&gt;&apos;)
                </span>
              </div>
            )}

            {selectedCategory === "user_behavior" && (
              <div className="flex items-center space-x-3">
                <label className="text-xs text-slate-300">Inactivity (seconds):</label>
                <input
                  type="number"
                  value={inactivityInput}
                  onChange={(e) => setInactivityInput(Number(e.target.value))}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-white w-24 focus:border-indigo-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400">
                  (Try &gt;= 10s to trigger discount popup)
                </span>
              </div>
            )}

            {selectedCategory === "security" && (
              <p className="text-xs text-slate-300">
                Context: Rate of 110 req/min vs Threshold of 100 req/min.
              </p>
            )}

            {selectedCategory === "performance" && (
              <p className="text-xs text-slate-300">
                Context: Repeated search query with cacheKey &apos;search:headphones&apos; and 8 recommendations requested.
              </p>
            )}

            {selectedCategory === "accessibility" && (
              <p className="text-xs text-slate-300">
                Context: Evaluates ARIA label presence and keyboard tab navigation contracts.
              </p>
            )}

            <button
              onClick={() => runEvaluation(selectedCategory)}
              disabled={loading}
              className="flex items-center space-x-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-indigo-500 shadow-md shadow-indigo-600/30"
            >
              {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              <span>Evaluate Rules Against Context</span>
            </button>
          </div>

          {/* Results Display */}
          {report && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Engine Evaluation Results ({report.matchedCount}/{report.evaluatedCount} matched)
                </h4>
                <span className="text-[11px] text-emerald-400 font-semibold">
                  Deterministic Execution
                </span>
              </div>

              <div className="space-y-2.5">
                {report.results.map((res, i) => (
                  <div
                    key={i}
                    className={`rounded-xl border p-3.5 transition-all ${
                      res.matched
                        ? "border-emerald-500/40 bg-emerald-950/20"
                        : "border-slate-800 bg-slate-900/30 opacity-70"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {res.matched ? (
                          <CheckCircle className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-slate-500" />
                        )}
                        <span className="text-xs font-bold text-white">{res.ruleName}</span>
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-300">
                          {res.ruleId}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          res.matched
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {res.matched ? "RULE MATCHED (IF TRUE)" : "NOT MATCHED"}
                      </span>
                    </div>

                    {res.matched && res.actionResult && (
                      <div className="mt-2.5 rounded-lg border border-slate-800 bg-[#04060d] p-2.5 font-mono text-xs text-indigo-300">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(res.actionResult, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-indigo-900/40 bg-slate-950/40 px-6 py-3 text-right">
          <button
            onClick={onClose}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Close Engine Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
