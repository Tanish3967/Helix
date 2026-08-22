import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { SimulationState, AgentStep, AgentName } from '../types/fleet';
import { setSimulationSpeed, toggleSimulationPause, resetSimulation } from '../services/api';
import { fleetWS, ConnectionStatus, WsMetrics } from '../services/websocket';

interface LeftSidebarProps {
  state: SimulationState | null;
  onOpenConsole: (initialTab?: 'disruptions' | 'fleet' | 'routes') => void;
  onOpenDeliveries?: () => void;
  onOpenIncidents?: () => void;
  onOpenAgents?: () => void;
  onOpenAnalytics?: () => void;
}

/* ---------- lightweight inline sparkline ---------- */
const Sparkline: React.FC<{ data: number[]; color?: string; fill?: string }> = ({
  data,
  color = 'var(--ion)',
  fill = 'rgba(34,211,238,0.14)'
}) => {
  const w = 100;
  const h = 22;
  const pad = 1.5;
  if (!data || data.length < 2) {
    return (
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
        <line x1={0} y1={h - pad} x2={w} y2={h - pad} stroke={color} strokeOpacity="0.3" strokeWidth="1" />
      </svg>
    );
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const x = (i: number) => pad + (i / (data.length - 1)) * (w - 2 * pad);
  const y = (v: number) => h - pad - ((v - min) / range) * (h - 2 * pad - 1);
  const line = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${pad},${h - pad} ${line} ${(w - pad).toFixed(1)},${h - pad}`;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <polygon points={area} fill={fill} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

/* ---------- derived snapshot for history/sparklines ---------- */
interface Snap {
  au: number;   // active units
  ot: number;   // on-time %
  eff: number;  // efficiency %
  inc: number;  // active incidents
  tick: number; // telemetry tick rate (Hz) — real, from the WS link
  rate: number; // vehicle records streamed per second — real (tickHz × fleet size)
  streams: number; // active routes
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

function computeSnapshot(state: SimulationState | null, ws: WsMetrics): Snap {
  const vehicles = state?.vehicles || [];
  const routes = state?.routes || [];
  const m = state?.metrics;
  const activeUnits = vehicles.filter((v) => v.status === 'ON_ROUTE' || v.status === 'REASSIGNED').length;
  const fleetSize = vehicles.length || 1;
  const incidents = m?.active_incidents_count ?? (state?.active_incident ? 1 : 0);
  const activeRoutes = routes.filter((r) => r.is_active).length || activeUnits;

  return {
    au: activeUnits,
    ot: m?.on_time_rate_percent ?? 0,
    eff: m?.efficiency_percent ?? 0,
    inc: incidents,
    tick: ws.tickHz,
    rate: ws.tickHz * fleetSize,
    streams: activeRoutes
  };
}

/** Format a millisecond uptime as h:mm:ss / m:ss. */
function formatUptime(ms: number): string {
  if (ms <= 0) return '--:--';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(mm)}:${pad(ss)}` : `${mm}:${pad(ss)}`;
}

const LINK_META: Record<ConnectionStatus, { label: string; color: string; dot: string }> = {
  open: { label: 'LINKED', color: 'var(--signal-2)', dot: 'status-dot--active' },
  connecting: { label: 'SYNCING', color: 'var(--warn)', dot: 'status-dot--idle' },
  closed: { label: 'OFFLINE', color: 'var(--crit)', dot: 'status-dot--crit' }
};

/* ---------- agent network status ---------- */
const AGENTS: { name: AgentName; short: string }[] = [
  { name: 'Orchestrator Agent', short: 'Orchestrator' },
  { name: 'Routing Agent', short: 'Routing' },
  { name: 'Traffic Agent', short: 'Traffic' },
  { name: 'Weather Agent', short: 'Weather' },
  { name: 'Dispatch Agent', short: 'Dispatch' },
  { name: 'Customer Agent', short: 'Customer' }
];

function agentStatus(step?: AgentStep): { dot: string; tag: string; live: boolean } {
  if (!step) return { dot: 'status-dot--standby', tag: 'STANDBY', live: false };
  switch (step.state) {
    case 'RUNNING':
    case 'ANALYZING':
    case 'PENDING':
      return { dot: 'status-dot--ion', tag: 'ACTIVE', live: true };
    case 'ERROR':
      return { dot: 'status-dot--crit', tag: 'ERROR', live: false };
    case 'COMPLETE':
    default:
      return { dot: 'status-dot--active', tag: 'READY', live: false };
  }
}

const SectionHead: React.FC<{ label: string; right?: React.ReactNode }> = ({ label, right }) => (
  <div className="panel-head">
    <span className="eyebrow">{label}</span>
    {right}
  </div>
);

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  state,
  onOpenConsole,
  onOpenDeliveries,
  onOpenIncidents,
  onOpenAgents,
  onOpenAnalytics
}) => {
  const [wsMetrics, setWsMetrics] = useState<WsMetrics>({
    msgPerSec: 0,
    tickHz: 0,
    uptimeMs: 0,
    totalMessages: 0,
    connected: false
  });
  const [conn, setConn] = useState<ConnectionStatus>(fleetWS.getStatus());

  useEffect(() => {
    const unsubM = fleetWS.onMetrics(setWsMetrics);
    const unsubS = fleetWS.onStatus(setConn);
    return () => {
      unsubM();
      unsubS();
    };
  }, []);

  const snap = computeSnapshot(state, wsMetrics);
  const snapRef = useRef(snap);
  snapRef.current = snap;

  // Accumulate a bounded history keyed on the sim clock so sparklines/deltas are real.
  const [history, setHistory] = useState<Snap[]>([]);
  useEffect(() => {
    setHistory((prev) => {
      const next = [...prev, snapRef.current];
      if (next.length > 28) next.shift();
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.sim_time]);

  const series = (key: keyof Snap) => history.map((s) => s[key]);
  const first = (key: keyof Snap) => (history.length ? history[0][key] : snap[key]);

  // Latest agent step per agent
  const steps = state?.agent_steps || [];
  const latestByAgent = new Map<AgentName, AgentStep>();
  for (const s of steps) latestByAgent.set(s.agent_name, s);
  const activeAgentCount = AGENTS.filter((a) => agentStatus(latestByAgent.get(a.name)).live).length;

  const handleSpeed = (speed: number) => setSimulationSpeed(speed);
  const handlePause = () => toggleSimulationPause();
  const handleReset = () => resetSimulation();

  const speed = state?.speed_multiplier ?? 1;
  const isPaused = !!state?.is_paused;

  interface Tile {
    label: string;
    value: string;
    raw: number;
    key: keyof Snap;
    goodUp: boolean;
    color: string;
    fill: string;
    onClick?: () => void;
  }

  const tiles: Tile[] = [
    {
      label: 'Active Units',
      value: `${snap.au}`,
      raw: snap.au,
      key: 'au',
      goodUp: true,
      color: 'var(--signal)',
      fill: 'rgba(16,185,129,0.14)',
      onClick: () => onOpenConsole('fleet')
    },
    {
      label: 'On-Time Rate',
      value: `${snap.ot.toFixed(0)}%`,
      raw: snap.ot,
      key: 'ot',
      goodUp: true,
      color: 'var(--ion)',
      fill: 'rgba(34,211,238,0.14)',
      onClick: onOpenAnalytics
    },
    {
      label: 'Efficiency',
      value: `${snap.eff.toFixed(0)}%`,
      raw: snap.eff,
      key: 'eff',
      goodUp: true,
      color: 'var(--violet)',
      fill: 'rgba(139,92,246,0.16)',
      onClick: onOpenAnalytics
    },
    {
      label: 'Active Incidents',
      value: `${snap.inc}`,
      raw: snap.inc,
      key: 'inc',
      goodUp: false,
      color: 'var(--crit)',
      fill: 'rgba(240,68,82,0.16)',
      onClick: onOpenIncidents
    }
  ];

  const metricRows: { label: string; value: string; pct: number; key: keyof Snap; color: string }[] = [
    {
      label: 'Tick Rate',
      value: `${snap.tick.toFixed(1)} Hz`,
      pct: clamp((snap.tick / 6) * 100),
      key: 'tick',
      color: 'var(--ion)'
    },
    {
      label: 'Data Rate',
      value: `${Math.round(snap.rate)}/s`,
      pct: clamp((snap.rate / Math.max(1, (state?.vehicles?.length || 1) * 4)) * 100),
      key: 'rate',
      color: 'var(--signal)'
    },
    {
      label: 'Active Streams',
      value: `${snap.streams}`,
      pct: clamp((snap.streams / Math.max(1, state?.vehicles?.length || 1)) * 100),
      key: 'streams',
      color: 'var(--violet)'
    }
  ];

  const link = LINK_META[conn];

  return (
    <aside
      className="w-[240px] xl:w-[280px] h-full flex flex-col gap-2.5 p-2.5 overflow-y-auto shrink-0 z-20"
      style={{ borderRight: '1px solid var(--edge)', background: 'rgba(9,13,22,0.55)' }}
    >
      {/* FLEET HEALTH */}
      <section className="panel">
        <SectionHead
          label="Fleet Health"
          right={
            <span className="eyebrow flex items-center gap-1.5" style={{ color: 'var(--signal-2)' }}>
              <span className="status-dot status-dot--active" />
              LIVE
            </span>
          }
        />
        <div className="p-2.5 grid grid-cols-2 gap-2">
          {tiles.map((tile) => {
            const delta = tile.raw - first(tile.key);
            const rounded = Math.round(delta * 10) / 10;
            const isGood = rounded === 0 ? true : tile.goodUp ? rounded > 0 : rounded < 0;
            const showDelta = Math.abs(rounded) >= 0.1;
            return (
              <button
                key={tile.label}
                onClick={tile.onClick}
                className="stat-tile text-left transition-colors"
                style={{ cursor: tile.onClick ? 'pointer' : 'default' }}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="stat-num" style={{ color: tile.color }}>
                    {tile.value}
                  </span>
                  {showDelta && (
                    <span className={`delta ${isGood ? 'delta-up' : 'delta-down'}`}>
                      {rounded > 0 ? (
                        <ArrowUpRight className="w-2.5 h-2.5" />
                      ) : (
                        <ArrowDownRight className="w-2.5 h-2.5" />
                      )}
                      {Math.abs(rounded)}
                    </span>
                  )}
                </div>
                <div className="stat-label">{tile.label}</div>
                <div className="mt-2 -mx-0.5">
                  <Sparkline data={series(tile.key)} color={tile.color} fill={tile.fill} />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* AGENT NETWORK */}
      <section className="panel">
        <SectionHead
          label="Agent Network"
          right={
            <span className="eyebrow" style={{ color: activeAgentCount ? 'var(--ion)' : 'var(--ink-mute)' }}>
              {activeAgentCount}/{AGENTS.length} ACTIVE
            </span>
          }
        />
        <div className="px-1.5 py-1.5">
          {AGENTS.map((agent) => {
            const step = latestByAgent.get(agent.name);
            const st = agentStatus(step);
            return (
              <button
                key={agent.name}
                onClick={onOpenAgents}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left transition-colors hover:bg-[rgba(148,163,184,0.06)]"
              >
                <span className={`status-dot ${st.dot}`} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[12px] font-semibold truncate" style={{ color: 'var(--ink-dim)' }}>
                    {agent.short}
                  </span>
                  <span className="block text-[10px] truncate" style={{ color: 'var(--ink-mute)' }}>
                    {step?.summary || 'Awaiting tasking'}
                  </span>
                </span>
                <span
                  className="text-[9px] font-bold tracking-wider shrink-0"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: st.live ? 'var(--ion)' : st.tag === 'ERROR' ? 'var(--crit)' : 'var(--ink-faint)'
                  }}
                >
                  {st.tag}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* SYSTEM METRICS */}
      <section className="panel">
        <SectionHead
          label="System Metrics"
          right={
            <span className="eyebrow flex items-center gap-1.5" style={{ color: link.color }}>
              <span className={`status-dot ${link.dot}`} />
              {link.label}
            </span>
          }
        />
        <div className="p-3 space-y-3">
          {metricRows.map((row) => (
            <div key={row.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium" style={{ color: 'var(--ink-dim)' }}>
                  {row.label}
                </span>
                <span className="readout text-[11px] font-semibold" style={{ color: 'var(--ink)' }}>
                  {row.value}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="mbar flex-1">
                  <span style={{ width: `${clamp(row.pct)}%`, background: row.color }} />
                </div>
                <div className="w-12 shrink-0 opacity-80">
                  <Sparkline data={series(row.key)} color={row.color} fill="transparent" />
                </div>
              </div>
            </div>
          ))}
          {/* Real link session readout */}
          <div
            className="flex items-center justify-between pt-1 text-[10px]"
            style={{ borderTop: '1px solid var(--edge)', color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}
          >
            <span>UPTIME {formatUptime(wsMetrics.uptimeMs)}</span>
            <span>{wsMetrics.totalMessages.toLocaleString()} MSGS</span>
          </div>
        </div>
      </section>

      {/* SIM CONTROL — compact; the full playback bar moves onto the map in Phase D */}
      <section className="panel mt-auto">
        <SectionHead
          label="Sim Control"
          right={
            <span
              className="eyebrow"
              style={{ color: isPaused ? 'var(--warn)' : 'var(--signal-2)' }}
            >
              {isPaused ? 'PAUSED' : 'RUNNING'}
            </span>
          }
        />
        <div className="p-2.5 space-y-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePause}
              className="btn btn-ghost btn-sm flex-1"
              aria-label={isPaused ? 'Resume simulation' : 'Pause simulation'}
            >
              {isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5" style={{ color: 'var(--signal)' }} /> Resume
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" /> Pause
                </>
              )}
            </button>
            <button
              onClick={handleReset}
              className="btn btn-danger btn-sm"
              aria-label="Reset simulation"
              title="Reset simulation world"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="segmented w-full">
            {[1, 2, 4, 8].map((s) => (
              <button
                key={s}
                onClick={() => handleSpeed(s)}
                className={`flex-1 ${speed === s ? 'is-active' : ''}`}
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </section>
    </aside>
  );
};
