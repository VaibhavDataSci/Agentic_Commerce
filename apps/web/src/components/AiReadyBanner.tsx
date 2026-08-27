import React from "react";
import { CheckCircle2, Sparkles, Database, Layers, Zap, Terminal } from "lucide-react";

export const AiReadyBanner: React.FC = () => {
  const capabilities = [
    { icon: Layers, label: "Structured Catalog", desc: "Zod validated schema" },
    { icon: Zap, label: "Machine-readable Pricing", desc: "Strict integer INR" },
    { icon: Database, label: "Real-time Inventory", desc: "PostgreSQL authoritative" },
    { icon: Sparkles, label: "Product Attributes", desc: "Deep key-value specs" },
    { icon: Terminal, label: "API Access", desc: "REST v1 endpoints" }
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900/60 p-5 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>AI Commerce Ready Layer</span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            TechKart Merchant Foundation
          </h2>
          <p className="text-xs text-slate-300 max-w-xl mt-0.5">
            Designed for future AI shopping agents to discover products, inspect availability, and evaluate rule policies deterministically without DOM scraping.
          </p>
        </div>

        {/* Feature Checkpoints */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {capabilities.map((c, i) => {
            const Icon = c.icon;
            return (
              <div
                key={i}
                className="flex items-start space-x-2 rounded-lg border border-slate-800/80 bg-slate-900/70 p-2.5 transition-colors hover:border-indigo-500/40"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-slate-200">{c.label}</p>
                  <p className="text-[10px] text-slate-400">{c.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
