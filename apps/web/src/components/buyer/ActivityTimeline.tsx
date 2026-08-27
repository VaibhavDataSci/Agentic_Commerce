import React from "react";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { TimelineStep } from "../../lib/types";

interface ActivityTimelineProps {
  steps: TimelineStep[];
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ steps }) => {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="rounded-xl border border-indigo-500/20 bg-[#080d1e]/80 p-4 backdrop-blur-md space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
          Agent Execution Timeline
        </h4>
        <span className="text-[10px] font-mono text-slate-400">
          Deterministic Tool Flow
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, idx) => {
          const isCompleted = step.status === "completed";
          const isFailed = step.status === "failed";

          return (
            <div
              key={step.id || idx}
              className={`flex items-start space-x-2.5 rounded-lg border p-2.5 transition-all ${
                isCompleted
                  ? "border-emerald-500/30 bg-emerald-950/20"
                  : isFailed
                  ? "border-rose-500/30 bg-rose-950/20"
                  : "border-slate-800 bg-slate-900/40"
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : isFailed ? (
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <Clock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{step.title}</p>
                {step.detail && (
                  <p className="text-[10px] text-slate-300 line-clamp-1">{step.detail}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
