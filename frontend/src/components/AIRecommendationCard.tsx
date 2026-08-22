import React, { useEffect, useState } from 'react';
import { Sparkles, Check, GitBranch, Loader2, CircleCheck } from 'lucide-react';
import { Incident, IncidentType } from '../types/fleet';
import { resolveActiveIncident } from '../services/api';

interface AIRecommendationCardProps {
  incident: Incident | null | undefined;
  onShowAlternatives: () => void;
}

interface PlanBlueprint {
  headline: string;
  agents: string[];
}

/**
 * The recommended course of action the orchestrator will execute, framed per
 * incident type. Presented as the plan the operator can approve — the actual
 * work runs server-side once approved.
 */
function planFor(incident: Incident): PlanBlueprint {
  const units = incident.affected_vehicle_ids?.length || 1;
  const orders = incident.affected_order_ids?.length || 0;
  switch (incident.type as IncidentType) {
    case 'VEHICLE_BREAKDOWN':
      return {
        headline: `Reassign ${orders || 'the'} at-risk ${orders === 1 ? 'delivery' : 'deliveries'} to the nearest available unit and dispatch recovery for ${incident.affected_vehicle_ids?.[0] || 'the vehicle'}.`,
        agents: ['Dispatch', 'Routing', 'Customer']
      };
    case 'TRAFFIC_CONGESTION':
      return {
        headline: `Reroute ${units} affected ${units === 1 ? 'unit' : 'units'} around the congested corridor via dynamic detours.`,
        agents: ['Traffic', 'Routing']
      };
    case 'SEVERE_WEATHER':
      return {
        headline: 'Apply fleet-wide safety speed buffers and steer exposed corridors onto sheltered routes.',
        agents: ['Weather', 'Routing', 'Dispatch']
      };
    case 'HIGH_PRIORITY_ORDER':
      return {
        headline: 'Expedite the delayed order and issue a proactive revised-ETA notice to the customer.',
        agents: ['Dispatch', 'Customer']
      };
    case 'MULTIPLE_FAILURES':
    case 'COMPOUND_DISRUPTION':
    case 'CASCADING_FAILURE':
      return {
        headline: `Coordinate a multi-front recovery across ${units} ${units === 1 ? 'unit' : 'units'}: rebalance load, reroute, and notify affected customers.`,
        agents: ['Orchestrator', 'Dispatch', 'Routing', 'Customer']
      };
    default:
      return {
        headline: 'Dispatch the multi-agent swarm to triage and resolve this incident.',
        agents: ['Orchestrator', 'Routing']
      };
  }
}

export const AIRecommendationCard: React.FC<AIRecommendationCardProps> = ({
  incident,
  onShowAlternatives
}) => {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  // Clear any transient note when the incident changes.
  useEffect(() => {
    setNote(null);
    setBusy(false);
  }, [incident?.id]);

  const isResolved = incident?.resolution_status === 'Resolved';
  const isResolving = incident?.resolution_status === 'Resolving';

  const handleApprove = async () => {
    setBusy(true);
    setNote(null);
    try {
      const res = await resolveActiveIncident();
      setNote(res.message || 'Resolution dispatched to the agent network.');
    } catch {
      setNote('Could not reach the resolution service. Check the backend link.');
    } finally {
      setBusy(false);
    }
  };

  // ---------- No active incident ----------
  if (!incident) {
    return (
      <section className="panel shrink-0 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--violet)' }} />
          <span className="eyebrow">AI Recommendation</span>
        </div>
        <p className="text-[11px] mt-2 leading-relaxed" style={{ color: 'var(--ink-faint)' }}>
          No action required. The orchestrator will surface a recommended plan the moment
          an incident is detected.
        </p>
      </section>
    );
  }

  const plan = planFor(incident);

  return (
    <section className="panel shrink-0 overflow-hidden" style={{ borderColor: 'rgba(139,92,246,0.32)' }}>
      <div className="panel-head">
        <span className="eyebrow flex items-center gap-2" style={{ color: 'var(--violet)' }}>
          <Sparkles className="w-3.5 h-3.5" />
          AI Recommendation
        </span>
        <span
          className="text-[9px] font-bold px-2 py-0.5 rounded-full"
          style={{ color: 'var(--violet)', background: 'rgba(139,92,246,0.14)', fontFamily: 'var(--font-mono)' }}
        >
          ORCHESTRATOR
        </span>
      </div>

      <div className="p-3.5">
        {/* Recommended action */}
        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ink)' }}>
          {plan.headline}
        </p>

        {/* Agents engaged by the plan */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="eyebrow" style={{ fontSize: '9px' }}>Engages</span>
          {plan.agents.map((a) => (
            <span
              key={a}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                color: 'var(--ink-dim)',
                background: 'rgba(148,163,184,0.08)',
                border: '1px solid var(--edge)',
                fontFamily: 'var(--font-mono)'
              }}
            >
              {a}
            </span>
          ))}
        </div>

        {/* Resolved outcome */}
        {isResolved ? (
          <div className="mt-3.5">
            <div
              className="flex items-center gap-2 text-[12px] font-semibold"
              style={{ color: 'var(--signal)' }}
            >
              <CircleCheck className="w-4 h-4" />
              Plan executed
            </div>
            <button onClick={onShowAlternatives} className="btn btn-ghost btn-sm w-full mt-2.5">
              <GitBranch className="w-3.5 h-3.5" />
              Review Executed Trace
            </button>
          </div>
        ) : (
          <>
            <div className="mt-3.5 grid grid-cols-2 gap-2">
              <button
                onClick={handleApprove}
                disabled={busy}
                className="btn btn-primary btn-sm"
                title="Dispatch the multi-agent swarm to execute this plan"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Dispatching
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Approve Plan
                  </>
                )}
              </button>
              <button onClick={onShowAlternatives} disabled={busy} className="btn btn-ghost btn-sm">
                <GitBranch className="w-3.5 h-3.5" />
                Alternatives
              </button>
            </div>

            {(note || isResolving) && (
              <p
                className="text-[10.5px] mt-2.5 leading-snug flex items-start gap-1.5"
                style={{ color: isResolving ? 'var(--ion)' : 'var(--ink-faint)' }}
              >
                {isResolving && <Loader2 className="w-3 h-3 mt-0.5 animate-spin shrink-0" />}
                <span>{note || 'Agents are executing the approved plan…'}</span>
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
};
