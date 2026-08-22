import React from 'react';
import { MissionScore } from '../types/fleet';

interface MissionProgressProps {
  metrics: MissionScore;
  onOpenScenarios: () => void;
}

export const MissionProgress: React.FC<MissionProgressProps> = ({ metrics }) => {
  const total = metrics.total_orders_today || 100;
  const completed = metrics.completed_orders_today || 86;
  const percent = Math.min(100, Math.round((completed / total) * 100));
  const efficiency = metrics.efficiency_percent || 92;
  const score = metrics.score || 8620;

  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (efficiency / 100) * circumference;

  return (
    <section className="panel shrink-0 overflow-hidden">
      <div className="panel-head">
        <span className="eyebrow">Mission Progress</span>
        <span className="readout text-[11px] font-semibold" style={{ color: 'var(--signal-2)' }}>
          {score.toLocaleString()} pts
        </span>
      </div>

      <div className="p-3.5 space-y-3">
        {/* Deliveries */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium" style={{ color: 'var(--ink-dim)' }}>
              Today&apos;s Deliveries
            </span>
            <span className="readout text-[11px] font-semibold" style={{ color: 'var(--ink)' }}>
              {completed}<span style={{ color: 'var(--ink-faint)' }}> / {total}</span>
              <span className="ml-1.5" style={{ color: 'var(--ink-faint)' }}>{percent}%</span>
            </span>
          </div>
          <div className="mbar">
            <span style={{ width: `${percent}%` }} />
          </div>
        </div>

        {/* Efficiency ring */}
        <div className="flex items-center justify-between pt-2.5" style={{ borderTop: '1px solid var(--edge)' }}>
          <div>
            <div className="eyebrow" style={{ fontSize: '9px' }}>Efficiency</div>
            <div className="readout text-[16px] font-bold mt-1" style={{ color: 'var(--ink)' }}>
              {efficiency}%
            </div>
          </div>
          <div className="relative w-11 h-11 flex items-center justify-center">
            <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
              <circle cx="18" cy="18" r={radius} stroke="rgba(148,163,184,0.14)" strokeWidth="3" fill="none" />
              <circle
                cx="18"
                cy="18"
                r={radius}
                stroke="var(--signal)"
                strokeWidth="3"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.22,0.61,0.36,1)', filter: 'drop-shadow(0 0 4px rgba(16,185,129,0.5))' }}
              />
            </svg>
            <span className="absolute text-[9px] readout font-bold" style={{ color: 'var(--signal)' }}>
              {Math.round(efficiency)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
