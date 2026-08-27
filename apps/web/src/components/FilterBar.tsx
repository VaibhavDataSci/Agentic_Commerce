"use client";

import React from "react";
import { Search, SlidersHorizontal, RotateCcw } from "lucide-react";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  categories: string[];
  inStockOnly: boolean;
  onInStockToggle: (val: boolean) => void;
  maxPrice: number;
  onMaxPriceChange: (p: number) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  onReset: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories,
  inStockOnly,
  onInStockToggle,
  maxPrice,
  onMaxPriceChange,
  sortBy,
  onSortChange,
  onReset
}) => {
  return (
    <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md">
      {/* Search and Sort Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search products by name, brand, or feature (e.g. 'ANC', 'Mechanical', '4K')..."
            aria-label="Search catalog products"
            className="w-full rounded-lg border border-slate-700/80 bg-slate-950/80 py-2 pl-9 pr-4 text-xs text-white placeholder-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center space-x-2">
          <label htmlFor="sort-select" className="text-xs font-medium text-slate-400 whitespace-nowrap">
            Sort by:
          </label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-xs text-white transition-colors focus:border-indigo-500 focus:outline-none"
          >
            <option value="rating_desc">Highest Rated</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="newest">Newest Arrival</option>
          </select>

          <button
            onClick={onReset}
            className="flex items-center space-x-1 rounded-lg border border-slate-700/80 bg-slate-800/80 px-2.5 py-2 text-xs text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
            title="Reset Filters"
            aria-label="Reset all filters"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Category Pills & Filters */}
      <div className="flex flex-col gap-3 pt-2 border-t border-slate-800/80 lg:flex-row lg:items-center lg:justify-between">
        {/* Categories */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => onCategoryChange("all")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              selectedCategory === "all"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition-all ${
                selectedCategory === cat
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Quick Toggles: In-stock & Price range */}
        <div className="flex items-center space-x-4">
          {/* Max Price Slider */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">Max:</span>
            <span className="text-xs font-semibold text-indigo-300">
              ₹{maxPrice >= 130000 ? "Any" : maxPrice.toLocaleString("en-IN")}
            </span>
            <input
              type="range"
              min="1000"
              max="130000"
              step="1000"
              value={maxPrice}
              onChange={(e) => onMaxPriceChange(Number(e.target.value))}
              aria-label="Filter by maximum price"
              className="h-1.5 w-24 cursor-pointer accent-indigo-500 bg-slate-700 rounded-lg"
            />
          </div>

          {/* In-Stock Toggle */}
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => onInStockToggle(e.target.checked)}
              aria-label="Filter only in-stock items"
              className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs font-medium text-slate-300">In-Stock Only</span>
          </label>
        </div>
      </div>
    </div>
  );
};
