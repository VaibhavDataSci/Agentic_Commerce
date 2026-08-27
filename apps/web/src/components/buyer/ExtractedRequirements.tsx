import React from "react";
import { Check, Layers, DollarSign, Zap, Truck, Tag } from "lucide-react";
import { StructuredIntent } from "../../lib/types";
import { formatINR } from "../../lib/utils";

interface ExtractedRequirementsProps {
  intent: StructuredIntent | null;
}

export const ExtractedRequirements: React.FC<ExtractedRequirementsProps> = ({ intent }) => {
  if (!intent || intent.is_ambiguous) return null;

  const { category, constraints } = intent;

  return (
    <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/30 via-slate-900/40 to-slate-900/60 p-4 backdrop-blur-md space-y-2.5">
      <div className="flex items-center space-x-2">
        <Zap className="h-4 w-4 text-indigo-400" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-white">
          Extracted Structured Intent &amp; Constraints
        </h4>
      </div>

      <div className="flex flex-wrap gap-2">
        {category && (
          <span className="inline-flex items-center space-x-1.5 rounded-lg border border-indigo-500/30 bg-indigo-950/50 px-2.5 py-1 text-xs font-semibold text-indigo-300">
            <Layers className="h-3 w-3 text-indigo-400" />
            <span>Category: {category}</span>
          </span>
        )}

        {constraints.max_price && (
          <span className="inline-flex items-center space-x-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/50 px-2.5 py-1 text-xs font-semibold text-emerald-300">
            <DollarSign className="h-3 w-3 text-emerald-400" />
            <span>Budget ≤ {formatINR(constraints.max_price)}</span>
          </span>
        )}

        {constraints.anc && (
          <span className="inline-flex items-center space-x-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/50 px-2.5 py-1 text-xs font-semibold text-cyan-300">
            <Check className="h-3 w-3 text-cyan-400" />
            <span>ANC: Enabled</span>
          </span>
        )}

        {constraints.wireless && (
          <span className="inline-flex items-center space-x-1.5 rounded-lg border border-purple-500/30 bg-purple-950/50 px-2.5 py-1 text-xs font-semibold text-purple-300">
            <Check className="h-3 w-3 text-purple-400" />
            <span>Wireless / Bluetooth</span>
          </span>
        )}

        {constraints.delivery_preference && (
          <span className="inline-flex items-center space-x-1.5 rounded-lg border border-amber-500/30 bg-amber-950/50 px-2.5 py-1 text-xs font-semibold text-amber-300">
            <Truck className="h-3 w-3 text-amber-400" />
            <span>Delivery: {constraints.delivery_preference}</span>
          </span>
        )}

        {constraints.brand && (
          <span className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-xs font-semibold text-slate-300">
            <Tag className="h-3 w-3 text-slate-400" />
            <span>Brand: {constraints.brand}</span>
          </span>
        )}
      </div>
    </div>
  );
};
