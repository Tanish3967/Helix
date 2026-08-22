import React from 'react';
import {
  Bot,
  Compass,
  Car,
  CloudRain,
  UserCheck,
  MessageSquare,
  ChevronRight,
  Zap,
  Activity
} from 'lucide-react';
import { AgentStep } from '../types/fleet';
import { formatToolCall } from '../utils/agentFormatter';

interface AgentActivityFeedProps {
  steps: AgentStep[];
  onOpenTraceModal: () => void;
}

interface AgentCardConfig {
  key: string;
  name: string;
  role: string;
  icon: any;
  color: string;
  defaultStatus: string;
  defaultDetail: string;
}

const SWARM_AGENTS: AgentCardConfig[] = [
  { key: 'orchestrator', name: 'Orchestrator Agent', role: 'Triage & Coordinator', icon: Bot, color: 'var(--violet)', defaultStatus: 'ACTIVE', defaultDetail: 'Supervising fleet vehicles & routing pipelines' },
  { key: 'routing', name: 'Routing Agent', role: 'Dynamic Pathfinding', icon: Compass, color: 'var(--ion)', defaultStatus: 'ONLINE', defaultDetail: 'Optimizing waypoints & delivery corridors' },
  { key: 'traffic', name: 'Traffic Agent', role: 'Gridlock Analysis', icon: Car, color: 'var(--warn)', defaultStatus: 'MONITORING', defaultDetail: 'Live congestion surveillance across corridors' },
  { key: 'weather', name: 'Weather Agent', role: 'Atmospheric Safety', icon: CloudRain, color: '#38BDF8', defaultStatus: 'ONLINE', defaultDetail: 'Meteorological telemetry & speed buffers' },
  { key: 'dispatch', name: 'Dispatch Agent', role: 'Workload Allotment', icon: UserCheck, color: 'var(--signal)', defaultStatus: 'READY', defaultDetail: 'Balancing payload & idle reassignments' },
  { key: 'customer', name: 'Customer Agent', role: 'SLA Communications', icon: MessageSquare, color: '#EC4899', defaultStatus: 'STANDBY', defaultDetail: 'Proactive notifications for delayed orders' }
];

function getAgentConfig(agentNameStr: string): AgentCardConfig {
  const norm = (agentNameStr || '').toLowerCase();
  if (norm.includes('orchestrat')) return SWARM_AGENTS[0];
  if (norm.includes('rout')) return SWARM_AGENTS[1];
  if (norm.includes('traffic')) return SWARM_AGENTS[2];
  if (norm.includes('weather')) return SWARM_AGENTS[3];
  if (norm.includes('dispatch')) return SWARM_AGENTS[4];
  if (norm.includes('customer')) return SWARM_AGENTS[5];
  return SWARM_AGENTS[0];
}

function stateColor(state: string): string {
  switch ((state || '').toUpperCase()) {
    case 'RUNNING':
    case 'ANALYZING':
      return 'var(--violet)';
    case 'COMPLETE':
    case 'RESOLVED':
      return 'var(--signal)';
    case 'ACTIVE':
    case 'ONLINE':
    case 'MONITORING':
    case 'READY':
      return 'var(--ion)';
    case 'ERROR':
      return 'var(--crit)';
    default:
      return 'var(--ink-faint)';
  }
}

function formatStepTime(ts?: string): string {
  if (!ts) return 'live';
  if (ts.includes('T')) return ts.split('T')[1]?.slice(0, 8) || 'live';
  return ts;
}

export const AgentActivityFeed: React.FC<AgentActivityFeedProps> = ({ steps = [], onOpenTraceModal }) => {
  const recentSteps = steps.slice(-6).reverse();
  const hasLive = recentSteps.length > 0;

  return (
    <section className="panel flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="panel-head">
        <span className="eyebrow flex items-center gap-2" style={{ color: hasLive ? 'var(--ion)' : 'var(--ink-faint)' }}>
          <span className={`status-dot ${hasLive ? 'status-dot--ion' : 'status-dot--standby'}`} />
          Agent Activity
        </span>
        <button
          onClick={onOpenTraceModal}
          className="btn btn-ghost btn-sm"
          style={{ padding: '3px 9px' }}
          title="Open the full multi-agent execution trace"
        >
          <span>Full Trace ({steps.length})</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Stream */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {hasLive ? (
          recentSteps.map((step, idx) => {
            const cfg = getAgentConfig(step.agent_name);
            const Icon = cfg.icon;
            const sc = stateColor(step.state);
            const isLive = ['RUNNING', 'ANALYZING'].includes((step.state || '').toUpperCase());
            return (
              <button
                key={step.id || idx}
                onClick={onOpenTraceModal}
                className="w-full text-left p-2 rounded-lg transition-colors"
                style={{ background: 'var(--panel-solid)', border: '1px solid var(--edge)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: `color-mix(in srgb, ${cfg.color} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${cfg.color} 34%, transparent)` }}
                    >
                      <Icon className="w-3 h-3" style={{ color: cfg.color }} />
                    </span>
                    <span className="text-[11px] font-bold truncate" style={{ color: 'var(--ink)' }}>
                      {step.agent_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        color: sc,
                        background: `color-mix(in srgb, ${sc} 15%, transparent)`,
                        fontFamily: 'var(--font-mono)',
                        animation: isLive ? 'glow-pulse 1.8s infinite' : undefined
                      }}
                    >
                      {step.state}
                    </span>
                    <span className="text-[9px] readout" style={{ color: 'var(--ink-mute)' }}>
                      {formatStepTime(step.timestamp)}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] leading-snug mt-1 line-clamp-2" style={{ color: 'var(--ink-dim)' }}>
                  {step.summary || step.detail}
                </p>
                {step.tool_calls && step.tool_calls.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1.5 overflow-hidden flex-wrap">
                    {step.tool_calls.slice(0, 2).map((tc, i) => {
                      const formatted = formatToolCall(tc);
                      return (
                        <span
                          key={i}
                          className="text-[8.5px] font-semibold px-2 py-0.5 rounded truncate max-w-[180px] flex items-center gap-1"
                          style={{
                            background: 'rgba(34,211,238,0.08)',
                            color: formatted.badgeColor || 'var(--ion)',
                            border: '1px solid rgba(34,211,238,0.24)',
                            fontFamily: 'var(--font-mono)'
                          }}
                          title={formatted.summary}
                        >
                          <Zap className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{formatted.title}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </button>
            );
          })
        ) : (
          // Idle roster
          SWARM_AGENTS.map((agent) => {
            const Icon = agent.icon;
            const sc = stateColor(agent.defaultStatus);
            return (
              <button
                key={agent.key}
                onClick={onOpenTraceModal}
                className="w-full text-left p-2 rounded-lg transition-colors flex items-center justify-between gap-2"
                style={{ background: 'var(--panel-solid)', border: '1px solid var(--edge)' }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                    style={{ background: `color-mix(in srgb, ${agent.color} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${agent.color} 34%, transparent)` }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: agent.color }} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold truncate" style={{ color: 'var(--ink)' }}>
                      {agent.name}
                    </div>
                    <div className="text-[9px] truncate" style={{ color: 'var(--ink-faint)' }}>
                      {agent.defaultDetail}
                    </div>
                  </div>
                </div>
                <span
                  className="text-[8px] font-bold px-1.5 py-0.5 rounded shrink-0"
                  style={{ color: sc, background: `color-mix(in srgb, ${sc} 15%, transparent)`, fontFamily: 'var(--font-mono)' }}
                >
                  {agent.defaultStatus}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Footer heartbeat */}
      <div className="px-3 py-1.5 flex items-center gap-2" style={{ borderTop: '1px solid var(--edge)' }}>
        <Activity className="w-3 h-3" style={{ color: hasLive ? 'var(--ion)' : 'var(--ink-mute)' }} />
        <span className="eyebrow" style={{ fontSize: '9px' }}>
          {hasLive ? `${steps.length} steps · swarm engaged` : '6 agents · standing by'}
        </span>
      </div>
    </section>
  );
};
