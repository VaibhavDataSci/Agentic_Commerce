"use client";

import React from "react";
import { Sparkles, X, Tag } from "lucide-react";

interface InactivityPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InactivityPopup: React.FC<InactivityPopupProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <aside
      aria-label="Special discount notification"
      className="fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl border border-indigo-500/40 bg-[#0c1229] p-5 shadow-2xl backdrop-blur-xl animate-slide-up"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
              Rule Engine Behavior Trigger
            </span>
            <h4 className="text-xs font-bold text-white">Still deciding on your gear?</h4>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white"
          aria-label="Dismiss discount popup"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-2 text-xs text-slate-300">
        You&apos;ve been exploring for a while! Use promo code{" "}
        <span className="font-mono font-bold text-amber-400">TECHKART5</span> for an extra 5% instant discount.
      </p>

      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800">
        <span className="inline-flex items-center space-x-1 text-[11px] text-emerald-400 font-semibold">
          <Tag className="h-3 w-3" />
          <span>Code: TECHKART5</span>
        </span>
        <button
          onClick={onClose}
          className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
        >
          Claim Offer
        </button>
      </div>
    </aside>
  );
};
