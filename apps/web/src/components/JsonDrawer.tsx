"use client";

import React, { useState } from "react";
import { X, Copy, Check, Terminal, Cpu } from "lucide-react";
import { Product } from "../lib/types";

interface JsonDrawerProps {
  product: Product | null;
  onClose: () => void;
}

export const JsonDrawer: React.FC<JsonDrawerProps> = ({ product, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!product) return null;

  const jsonString = JSON.stringify(product, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-indigo-500/30 bg-[#090e1f] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-indigo-900/40 px-5 py-4">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
              <Terminal className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">AI-Agent Readable Payload</h3>
              <p className="text-xs text-slate-400">Canonical JSON format consumed by AI buyer agents</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* JSON Content */}
        <div className="flex-1 overflow-auto p-5">
          <div className="relative rounded-xl border border-slate-800 bg-[#04060d] p-4 font-mono text-xs text-indigo-300">
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
              aria-label="Copy JSON to clipboard"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>
            <pre className="overflow-x-auto whitespace-pre-wrap">{jsonString}</pre>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-indigo-900/40 bg-slate-950/40 px-5 py-3 text-[11px] text-slate-400">
          <span className="flex items-center space-x-1.5">
            <Cpu className="h-3.5 w-3.5 text-indigo-400" />
            <span>Endpoint: GET /api/v1/products/{product.id}</span>
          </span>
          <button
            onClick={onClose}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
