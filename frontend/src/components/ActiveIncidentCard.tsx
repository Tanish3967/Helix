import React from 'react';
import {
  AlertTriangle,
  MapPin,
  Clock,
  ShieldCheck,
  ArrowRight,
  Truck
} from 'lucide-react';
import { Incident, IncidentSeverity } from '../types/fleet';

interface ActiveIncidentCardProps {
  incident: Incident | null | undefined;
  onInspectTrace: () => void;
  onSelectVehicle?: (vId: string) => void;
}

const SEVERITY_META: Record<string, { label: string; tier: string; color: string; tint: string }> = {
  CRITICAL: { label: 'Critical', tier: 'P1', color: 'var(--crit)', tint: 'rgba(240,68,82,0.14)' },
  HIGH: { label: 'High', tier: 'P2', color: 'var(--warn)', tint: 'rgba(245,158,11,0.14)' },
  MEDIUM: { label: 'Medium', tier: 'P3', color: 'var(--ion)', tint: 'rgba(34,211,238,0.14)' },
  LOW: { label: 'Low', tier: 'P4', color: 'var(--ink-dim)', tint: 'rgba(148,163,184,0.12)' },
  INFO: { label: 'Info', tier: 'P5', color: 'var(--ink-faint)', tint: 'rgba(148,163,184,0.1)' }
};

function formatDetected(iso?: string): string {
  if (!iso) return '--:--';
  // Backend sends either an ISO timestamp or a HH:MM:SS clock string.
  const isoMatch = iso.match(/T(\d{2}:\d{2})/);
  if (isoMatch) return isoMatch[1];
  const clockMatch = iso.match(/^(\d{2}:\d{2})/);
  if (clockMatch) return clockMatch[1];
  const d = new Date(iso);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return '--:--';
}

function formatLocation(incident: Incident): string {
  const loc = incident.location;
  if (!loc) return 'Location pending';
  if (loc.address) return loc.address;
  if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
    return `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
  }
  return loc.zone_id || 'Location pending';
}

export const ActiveIncidentCard: React.FC<ActiveIncidentCardProps> = ({
  incident,
  onInspectTrace,
  onSelectVehicle
}) => {
  // ---------- Empty (nominal) state ----------
  if (!incident) {
    return (
      <section className="panel panel-glow shrink-0 p-4">
        <div className="flex items-center gap-2.5">
          <span className="status-dot status-dot--active" />
          <span className="eyebrow" style={{ color: 'var(--signal-2)' }}>
            All Systems Nominal
          </span>
        </div>
        <div className="mt-2.5 flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--signal)' }} />
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
            No active incidents. The fleet is operating within parameters and the agent
            network is monitoring for disruptions.
          </p>
        </div>
      </section>
    );
  }

  const isResolved = incident.resolution_status === 'Resolved';
  const isResolving = incident.resolution_status === 'Resolving';
  const sev = SEVERITY_META[incident.severity as IncidentSeverity] || SEVERITY_META.HIGH;
  const primaryVehicle = incident.affected_vehicle_ids?.[0];
  const deliveriesAtRisk = incident.affected_order_ids?.length ?? 0;
  const unitsAffected = incident.affected_vehicle_ids?.length ?? 0;

  const headColor = isResolved ? 'var(--signal)' : sev.color;
  const headTint = isResolved ? 'rgba(16,185,129,0.14)' : sev.tint;

  const statusLabel = isResolved ? 'Resolved' : isResolving ? 'Resolving' : 'Active';
  const statusDot = isResolved ? 'status-dot--active' : isResolving ? 'status-dot--ion' : 'status-dot--crit';

  const impact: { label: string; value: string; color: string }[] = [
    { label: 'Deliveries at Risk', value: `${deliveriesAtRisk}`, color: 'var(--ink)' },
    { label: 'Units Affected', value: `${unitsAffected}`, color: 'var(--ink)' },
    { label: 'Priority', value: sev.tier, color: headColor }
  ];

  return (
    <section className={`panel ${isResolved ? 'panel-glow' : 'panel-crit'} shrink-0 overflow-hidden`}>
      {/* Header */}
      <div className="panel-head">
        <span className="eyebrow flex items-center gap-2" style={{ color: headColor }}>
          <span className={`status-dot ${statusDot}`} />
          {isResolved ? 'Incident Resolved' : 'Active Incident'}
        </span>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ color: headColor, background: headTint, fontFamily: 'var(--font-mono)' }}
        >
          {sev.label}
        </span>
      </div>

      <div className="p-3.5">
        {/* Title + description */}
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: headColor }} />
          <div className="min-w-0">
            <h3 className="text-[13px] font-bold leading-snug" style={{ color: 'var(--ink)' }}>
              {incident.title}
            </h3>
            <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
              {incident.description}
            </p>
          </div>
        </div>

        {/* Primary unit + location + time */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]" style={{ color: 'var(--ink-faint)' }}>
          {primaryVehicle && (
            <button
              onClick={() => onSelectVehicle?.(primaryVehicle)}
              className="flex items-center gap-1.5 transition-colors hover:text-[var(--ion)]"
              style={{ color: 'var(--ink-dim)' }}
              title={`Focus ${primaryVehicle} on map`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span className="readout font-semibold">{primaryVehicle}</span>
            </button>
          )}
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate max-w-[150px]">{formatLocation(incident)}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span className="readout">{formatDetected(incident.detected_at)}</span>
          </span>
        </div>

        {/* Impact grid */}
        <div className="mt-3.5">
          <div className="eyebrow mb-1.5" style={{ fontSize: '9px' }}>Impact</div>
          <div className="grid grid-cols-3 gap-2">
            {impact.map((cell) => (
              <div key={cell.label} className="stat-tile text-center">
                <div className="stat-num" style={{ fontSize: '19px', color: cell.color }}>
                  {cell.value}
                </div>
                <div className="stat-label" style={{ fontSize: '9.5px', lineHeight: 1.2 }}>
                  {cell.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resolution summary (present once agents recover the incident) */}
        {incident.resolution_summary && (
          <div
            className="mt-3 p-2.5 rounded-lg flex items-start gap-2"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.28)' }}
          >
            <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--signal)' }} />
            <p className="text-[11px] leading-snug" style={{ color: 'var(--ink-dim)' }}>
              {incident.resolution_summary}
            </p>
          </div>
        )}

        {/* Action */}
        <button onClick={onInspectTrace} className="btn btn-ghost btn-sm w-full mt-3.5">
          <span>View Agent Trace</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <div className="mt-2 flex items-center justify-between text-[10px]" style={{ color: 'var(--ink-mute)' }}>
          <span className="readout">{incident.id}</span>
          <span style={{ color: headColor }}>{statusLabel}</span>
        </div>
      </div>
    </section>
  );
};
