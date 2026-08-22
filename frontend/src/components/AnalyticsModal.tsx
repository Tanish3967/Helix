import React from 'react';
import { BarChart3, X, TrendingUp, ShieldCheck, Zap, Truck, DollarSign } from 'lucide-react';
import { MissionScore } from '../types/fleet';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: MissionScore;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  onClose,
  metrics
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Fleet Analytics & Operational Efficiency</h2>
              <p className="text-xs text-slate-400">Real-time performance benchmarks, autonomous recovery metrics, and cost savings.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Score</div>
              <div className="text-xl font-extrabold mono text-amber-300 mt-1">{metrics.score}</div>
              <div className="text-[9px] text-emerald-400 font-semibold mt-0.5">Top 5% Performance</div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Fleet Efficiency</div>
              <div className="text-xl font-extrabold mono text-emerald-400 mt-1">{metrics.efficiency_percent}%</div>
              <div className="text-[9px] text-emerald-400 font-semibold mt-0.5">+2.4% vs Baseline</div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Avg AI Recovery</div>
              <div className="text-xl font-extrabold mono text-cyan-400 mt-1">{metrics.avg_resolution_seconds}s</div>
              <div className="text-[9px] text-cyan-400 font-semibold mt-0.5">Autonomous Dispatch</div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Resolved Incidents</div>
              <div className="text-xl font-extrabold mono text-indigo-400 mt-1">{metrics.resolved_incidents_count}</div>
              <div className="text-[9px] text-indigo-400 font-semibold mt-0.5">100% Success Rate</div>
            </div>
          </div>

          {/* Architecture Rationale Breakdown */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Agentic Orchestration Rationale
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Deterministic tools handle high-speed spatial math, capacity constraints, and ETA estimations while LLM-driven agents focus exclusively on high-level reasoning, trade-off evaluation, and strategic recovery synthesis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
