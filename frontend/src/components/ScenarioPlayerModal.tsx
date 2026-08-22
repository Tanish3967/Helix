import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  X, 
  Play, 
  Award, 
  ShieldCheck, 
  Zap, 
  Clock, 
  TrendingUp, 
  Flame,
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ScenarioItem } from '../types/fleet';
import { fetchScenarios, triggerScenario } from '../services/api';

interface ScenarioPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevel: number;
}

export const ScenarioPlayerModal: React.FC<ScenarioPlayerModalProps> = ({
  isOpen,
  onClose,
  currentLevel
}) => {
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeScenarioLevel, setActiveScenarioLevel] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchScenarios()
        .then(setScenarios)
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLaunchLevel = async (lvl: number) => {
    setLoading(true);
    setActiveScenarioLevel(lvl);
    try {
      await triggerScenario(lvl);
      // Fire victory celebration confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyBadge = (diff: string) => {
    switch (diff.toLowerCase()) {
      case 'novice':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'intermediate':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'advanced':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'expert':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/40 font-bold';
      case 'master':
      case 'grandmaster':
        return 'bg-red-500/20 text-red-400 border-red-500/50 font-extrabold animate-pulse';
      default:
        return 'bg-slate-800 text-slate-400';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
              <Layers className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Gamified Incident Levels (1 through 8)</h2>
              <p className="text-xs text-slate-400">Progressive AI stress-test scenarios designed for interview demonstrations and resilience benchmarking.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Levels Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {scenarios.map((sc) => {
            const isSelected = activeScenarioLevel === sc.level;
            return (
              <div
                key={sc.level}
                className={`rounded-xl p-4 border transition-all flex flex-col justify-between ${
                  sc.level === 8 
                    ? 'bg-gradient-to-b from-slate-900 to-rose-950/40 border-rose-500/40 shadow-lg shadow-rose-950/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 flex items-center justify-center font-extrabold text-xs mono">
                        {sc.level}
                      </span>
                      <h3 className="text-sm font-bold text-white">{sc.title.split(': ')[1] || sc.title}</h3>
                    </div>
                    <span className={`text-[9px] uppercase font-bold mono px-2 py-0.5 rounded border ${getDifficultyBadge(sc.difficulty)}`}>
                      {sc.difficulty}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mt-2.5 leading-relaxed font-normal">
                    {sc.description}
                  </p>

                  <div className="mt-3 p-2 bg-slate-900/80 rounded-lg border border-slate-800 text-[11px] text-emerald-300">
                    <span className="font-bold text-emerald-400">AI Challenge: </span>
                    {sc.ai_challenge}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-[10px] mono text-slate-400">
                    <span>Max Delay: &le;{sc.target_metrics.max_delay_min}m</span>
                    <span>SLA: &ge;{sc.target_metrics.sla_preservation}%</span>
                  </div>

                  <button
                    disabled={loading}
                    onClick={() => handleLaunchLevel(sc.level)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md ${
                      sc.level === 8
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/40'
                    }`}
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>Launch Level {sc.level}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
