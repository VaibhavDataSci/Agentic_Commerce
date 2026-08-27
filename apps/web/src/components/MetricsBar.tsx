import React from "react";
import { Package, CheckCircle, FolderTree, Activity } from "lucide-react";
import { MerchantMetrics } from "../lib/types";

interface MetricsBarProps {
  metrics: MerchantMetrics | null;
  loading: boolean;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({ metrics, loading }) => {
  const cards = [
    {
      title: "Total Products",
      value: loading ? "..." : metrics?.total_products ?? 0,
      icon: Package,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20"
    },
    {
      title: "In-Stock Products",
      value: loading ? "..." : metrics?.in_stock_products ?? 0,
      icon: CheckCircle,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20"
    },
    {
      title: "Categories",
      value: loading ? "..." : metrics?.active_categories_count ?? 0,
      icon: FolderTree,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20"
    },
    {
      title: "Inventory Status",
      value: "Live (Postgres)",
      icon: Activity,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20"
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`flex items-center space-x-3 rounded-xl border ${card.border} ${card.bg} p-3.5 backdrop-blur-md`}
          >
            <div className={`rounded-lg p-2 ${card.bg}`}>
              <Icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400">{card.title}</p>
              <p className="text-base font-bold text-white tracking-tight">{card.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
