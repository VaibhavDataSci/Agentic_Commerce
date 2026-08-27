"use client";

import React from "react";
import { Cpu, Bot, ShoppingCart, Sliders, ShieldCheck } from "lucide-react";

interface NavbarProps {
  cartCount: number;
  onOpenCart: () => void;
  onOpenRules: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ cartCount, onOpenCart, onOpenRules }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-indigo-900/40 bg-[#080d1e]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand & Subtitle */}
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/20">
            <Cpu className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-white">TechKart</h1>
              <span className="inline-flex items-center rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
                Phase 1 Merchant
              </span>
            </div>
            <p className="text-xs text-slate-400">AI-Ready Commerce Catalog</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          {/* Rule Engine Button */}
          <button
            onClick={onOpenRules}
            className="flex items-center space-x-1.5 rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-indigo-500/50 hover:bg-slate-800 hover:text-white"
            aria-label="Inspect Retail Rule Engine"
          >
            <Sliders className="h-3.5 w-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Rule Engine</span>
          </button>

          {/* AI Buyer Ready Badge */}
          <div className="hidden md:flex items-center space-x-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
            <Bot className="h-3.5 w-3.5" />
            <span>AI-Agent Protocol Ready</span>
          </div>

          {/* Simulated Cart Trigger */}
          <button
            onClick={onOpenCart}
            className="relative flex items-center space-x-2 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white transition-all hover:bg-indigo-500 shadow-md shadow-indigo-600/30"
            aria-label={`Simulated Cart with ${cartCount} items`}
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Simulated Cart</span>
            {cartCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-slate-900">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
