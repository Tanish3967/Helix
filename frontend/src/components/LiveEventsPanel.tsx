import React, { useState } from 'react';
import { Radio, Inbox } from 'lucide-react';
import { LiveEvent, IncidentSeverity } from '../types/fleet';

interface LiveEventsPanelProps {
  events: LiveEvent[];
  onSelectVehicle?: (vId: string) => void;
}

interface SeverityMeta {
  color: string;
  label: string;
}

// Map each severity onto a design-system token + short label.
const SEVERITY_META: Record<string, SeverityMeta> = {
  CRITICAL: { color: 'var(--crit)', label: 'Critical' },
  HIGH: { color: 'var(--crit)', label: 'High' },
  MEDIUM: { color: 'var(--warn)', label: 'Medium' },
  LOW: { color: 'var(--signal)', label: 'Low' },
  INFO: { color: 'var(--ion)', label: 'Info' }
};

function severityMeta(sev: string): SeverityMeta {
  return SEVERITY_META[(sev || 'INFO').toUpperCase()] || SEVERITY_META.INFO;
}

// Normalize a timestamp (ISO or HH:MM:SS clock) down to a compact HH:MM:SS readout.
function formatEventTime(ts?: string): string {
  if (!ts) return '--:--:--';
  if (ts.includes('T')) return ts.split('T')[1]?.slice(0, 8) || ts;
  return ts;
}

const FILTERS: Array<{ value: string; label: string }> = [
  { value: 'ALL', label: 'All Events' },
  { value: 'HIGH', label: 'High Severity' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
  { value: 'INFO', label: 'Info' }
];

export const LiveEventsPanel: React.FC<LiveEventsPanelProps> = ({ events, onSelectVehicle }) => {
  const [filter, setFilter] = useState<string>('ALL');

  const filtered = events.filter((e) => {
    if (filter === 'ALL') return true;
    if (filter === 'HIGH') return e.severity === 'HIGH' || e.severity === 'CRITICAL';
    return (e.severity as IncidentSeverity) === filter;
  });

  // Newest first so the freshest signal is always at the top of the stream.
  const ordered = [...filtered].reverse();
  const hasEvents = ordered.length > 0;

  return (
    <section className="panel flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="panel-head">
        <span
          className="eyebrow flex items-center gap-2"
          style={{ color: hasEvents ? 'var(--ion)' : 'var(--ink-faint)' }}
        >
          <span className={`status-dot ${hasEvents ? 'status-dot--ion' : 'status-dot--standby'}`} />
          Live Events
        </span>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter events by severity"
          className="text-[11px] font-semibold rounded-md px-2 py-1 cursor-pointer focus:outline-none"
          style={{
            fontFamily: 'var(--font-mono)',
            color: 'var(--ink-dim)',
            background: 'var(--panel-solid)',
            border: '1px solid var(--edge)'
          }}
        >
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value} style={{ background: '#0C121E' }}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Stream */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
        {hasEvents ? (
          ordered.map((ev, index) => {
            const meta = severityMeta(ev.severity);
            const vId = ev.vehicle_id || undefined;
            const clickable = Boolean(vId && onSelectVehicle);
            return (
              <button
                key={ev.id || index}
                onClick={clickable ? () => onSelectVehicle!(vId!) : undefined}
                disabled={!clickable}
                className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2.5 transition-colors ${
                  clickable ? 'hover:bg-[rgba(148,163,184,0.06)] cursor-pointer' : 'cursor-default'
                }`}
                style={{ border: '1px solid transparent' }}
                title={clickable ? `Focus ${vId} on map` : undefined}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: meta.color, boxShadow: `0 0 7px ${meta.color}` }}
                />
                <span
                  className="readout text-[10.5px] shrink-0"
                  style={{ color: 'var(--ink-mute)' }}
                >
                  {formatEventTime(ev.timestamp)}
                </span>
                <span className="min-w-0 flex-1 flex items-baseline gap-1.5">
                  {ev.category && (
                    <span
                      className="text-[8px] font-bold uppercase tracking-wider shrink-0"
                      style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)' }}
                    >
                      {ev.category}
                    </span>
                  )}
                  <span className="text-[11.5px] font-medium truncate" style={{ color: 'var(--ink-dim)' }}>
                    {ev.message}
                  </span>
                </span>
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                  style={{
                    color: meta.color,
                    background: `color-mix(in srgb, ${meta.color} 15%, transparent)`,
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  {meta.label}
                </span>
              </button>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-2 py-8 text-center">
            <Inbox className="w-6 h-6" style={{ color: 'var(--ink-mute)' }} />
            <p className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>
              {filter === 'ALL' ? 'Awaiting live events' : 'No events match this filter'}
            </p>
          </div>
        )}
      </div>

      {/* Footer heartbeat */}
      <div className="px-3 py-1.5 flex items-center gap-2" style={{ borderTop: '1px solid var(--edge)' }}>
        <Radio className="w-3 h-3" style={{ color: hasEvents ? 'var(--ion)' : 'var(--ink-mute)' }} />
        <span className="eyebrow" style={{ fontSize: '9px' }}>
          {hasEvents ? `${filtered.length} event${filtered.length === 1 ? '' : 's'} · streaming` : 'Event stream idle'}
        </span>
      </div>
    </section>
  );
};
