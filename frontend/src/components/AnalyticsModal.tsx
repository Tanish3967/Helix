import React, { useState } from 'react';
import {
  BarChart3,
  X,
  TrendingUp,
  ShieldCheck,
  Zap,
  Truck,
  Leaf,
  Activity,
  BatteryCharging,
  AlertTriangle
} from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'predictive' | 'esg'>('overview');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono">ENTERPRISE ANALYTICS & DIGITAL TWIN</h2>
              <p className="text-xs text-slate-400">Predictive maintenance, fleet telemetry benchmarks, and ESG carbon footprint.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 gap-2">
          {[
            { id: 'overview', label: 'Operations Overview', icon: Activity },
            { id: 'predictive', label: 'Predictive Digital Twin', icon: ShieldCheck },
            { id: 'esg', label: 'ESG Carbon & Smart EV', icon: Leaf }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3 text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs font-mono">
          {activeTab === 'overview' && (
            <>
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Total Score</div>
                  <div className="text-xl font-extrabold text-amber-300 mt-1">{metrics.score}</div>
                  <div className="text-[9px] text-emerald-400 font-semibold mt-0.5">Top 5% Performance</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Fleet Efficiency</div>
                  <div className="text-xl font-extrabold text-emerald-400 mt-1">{metrics.efficiency_percent}%</div>
                  <div className="text-[9px] text-emerald-400 font-semibold mt-0.5">+2.4% vs Baseline</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Avg AI Recovery</div>
                  <div className="text-xl font-extrabold text-cyan-400 mt-1">{metrics.avg_resolution_seconds}s</div>
                  <div className="text-[9px] text-cyan-400 font-semibold mt-0.5">Autonomous Dispatch</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Resolved Incidents</div>
                  <div className="text-xl font-extrabold text-violet-400 mt-1">{metrics.resolved_incidents_count}</div>
                  <div className="text-[9px] text-violet-400 font-semibold mt-0.5">100% Success Rate</div>
                </div>
              </div>

              {/* Rationale Card */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Agentic Swarm Telemetry Logic
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  Deterministic routing algorithms handle microsecond spatial math, road network constraints, and ETA estimations while LLM-powered orchestrators execute dynamic conflict resolution, courier reassignment, and SLA risk mitigation.
                </p>
              </div>
            </>
          )}

          {activeTab === 'predictive' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-white font-bold">Predictive Breakdown Risk Ratings</div>
                  <div className="text-slate-400 text-[11px]">Real-time digital twin evaluating battery cell voltages, TPMS, and OBD-II codes.</div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  98.2% Fleet Nominal
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Optimal Health (&gt;90%)</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1">94 Units</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Scheduled Inspection</div>
                  <div className="text-lg font-bold text-amber-400 mt-1">5 Units</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Active DTC Faults</div>
                  <div className="text-lg font-bold text-rose-400 mt-1">1 Unit (P0117)</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'esg' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
                    <Leaf className="w-3.5 h-3.5 text-emerald-400" /> Fleet Scope 1 & 2 Carbon
                  </div>
                  <div className="text-2xl font-bold text-emerald-400">178.4 <span className="text-xs text-slate-400">kg CO2 Today</span></div>
                  <div className="text-[10px] text-emerald-300 font-bold">🌿 642 kg CO2 saved vs. diesel baseline</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
                    <BatteryCharging className="w-3.5 h-3.5 text-cyan-400" /> EV Smart Depot Charging
                  </div>
                  <div className="text-2xl font-bold text-cyan-400">23:00 - 05:30</div>
                  <div className="text-[10px] text-slate-400">Off-Peak Grid Tariff: $0.12 / kWh (42 EVs Queued)</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
