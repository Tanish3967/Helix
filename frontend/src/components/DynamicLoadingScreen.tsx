import React, { useState, useEffect } from 'react';
import { Radio, Cpu, ShieldCheck, Activity, CheckCircle2, Zap } from 'lucide-react';

interface DynamicLoadingScreenProps {
  onComplete?: () => void;
}

export const DynamicLoadingScreen: React.FC<DynamicLoadingScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState<number>(0);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  const steps = [
    { title: 'Initializing Autonomous Fleet Operations Engine', icon: Cpu },
    { title: 'Connecting High-Cadence Telemetry Stream (ws://localhost:8000)', icon: Radio },
    { title: 'Loading 100 Metropolitan Vehicles & Waypoint Corridors', icon: Activity },
    { title: 'Calibrating Multi-Agent Neural Dispatch & Routing Swarm', icon: Zap },
    { title: 'Command Center Live Stream Operational', icon: ShieldCheck }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          if (onComplete) setTimeout(onComplete, 400);
          return 100;
        }
        const next = prev + Math.floor(Math.random() * 14) + 8;
        return next > 100 ? 100 : next;
      });
    }, 120);

    return () => clearInterval(interval);
  }, [onComplete]);

  useEffect(() => {
    if (progress < 25) setCurrentStepIndex(0);
    else if (progress < 50) setCurrentStepIndex(1);
    else if (progress < 75) setCurrentStepIndex(2);
    else if (progress < 95) setCurrentStepIndex(3);
    else setCurrentStepIndex(4);
  }, [progress]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#080C14] select-none">
      {/* Background Animated Gradient Mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-[#080C14] to-[#04070D] pointer-events-none" />

      {/* Center Radar Loading Pulse */}
      <div className="relative z-10 flex flex-col items-center max-w-md w-full px-6 text-center space-y-6">
        {/* Radar Ring Visual */}
        <div className="relative flex items-center justify-center w-24 h-24">
          <div className="absolute w-24 h-24 rounded-full border border-blue-500/20 animate-ping" />
          <div className="absolute w-20 h-20 rounded-full border border-cyan-500/40 bg-cyan-500/10 animate-pulse" />
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-xl shadow-blue-500/30 border border-blue-400/40">
            <Radio className="w-6 h-6 text-white animate-spin-slow" />
          </div>
        </div>

        {/* Branding & Subtitle */}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center space-x-2">
            <span>FleetOps</span>
            <span className="text-cyan-400 font-mono">AI</span>
          </h1>
          <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-widest">
            Autonomous Fleet Operations Simulator
          </p>
        </div>

        {/* Dynamic Progression Checklist */}
        <div className="w-full bg-[#0E131F]/90 border border-[#1E293B] rounded-xl p-4 text-left space-y-2.5 shadow-2xl backdrop-blur-md">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isDone = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div 
                key={idx}
                className={`flex items-center space-x-3 text-xs transition-all duration-300 ${
                  isDone 
                    ? 'text-emerald-400 font-semibold' 
                    : isCurrent 
                    ? 'text-white font-bold translate-x-1' 
                    : 'text-slate-600 opacity-50'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : isCurrent ? (
                  <div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin shrink-0" />
                ) : (
                  <Icon className="w-4 h-4 text-slate-600 shrink-0" />
                )}
                <span className="truncate">{step.title}</span>
              </div>
            );
          })}
        </div>

        {/* Progress Bar & Status Metric */}
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400">CONNECTING TELEMETRY BUS</span>
            <span className="text-cyan-400 font-bold">{progress}%</span>
          </div>

          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden p-0.5">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 rounded-full transition-all duration-150 ease-out shadow-sm shadow-cyan-400/50"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
