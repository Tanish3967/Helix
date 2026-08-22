import React, { useState } from 'react';
import {
  Cpu,
  X,
  Bot,
  Wrench,
  CheckCircle2,
  Clock,
  Copy,
  ChevronDown,
  ChevronRight,
  Code2,
  Sparkles,
  Zap,
  Compass,
  Car,
  CloudRain,
  UserCheck,
  MessageSquare,
  Activity,
  Check
} from 'lucide-react';
import { AgentStep, Incident } from '../types/fleet';
import { formatToolCall, FormattedToolCall } from '../utils/agentFormatter';

interface AgentTraceModalProps {
  isOpen: boolean;
  onClose: () => void;
  steps: AgentStep[];
  activeIncident: Incident | null | undefined;
}

const AGENT_ICONS: Record<string, any> = {
  Orchestrator: Bot,
  Routing: Compass,
  Traffic: Car,
  Weather: CloudRain,
  Dispatch: UserCheck,
  Customer: MessageSquare
};

const AGENT_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  Orchestrator: { color: 'var(--violet)', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.3)' },
  Routing: { color: 'var(--ion)', bg: 'rgba(34,211,238,0.12)', border: 'rgba(34,211,238,0.3)' },
  Traffic: { color: 'var(--warn)', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  Weather: { color: '#38BDF8', bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.3)' },
  Dispatch: { color: 'var(--signal)', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
  Customer: { color: '#EC4899', bg: 'rgba(236,72,153,0.12)', border: 'rgba(236,72,153,0.3)' }
};

export const AgentTraceModal: React.FC<AgentTraceModalProps> = ({
  isOpen,
  onClose,
  steps,
  activeIncident
}) => {
  const [viewMode, setViewMode] = useState<'human' | 'json'>('human');
  const [expandedJsonTools, setExpandedJsonTools] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const toggleToolJson = (id: string) => {
    setExpandedJsonTools((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = () => {
    const jsonTrace = JSON.stringify({ incident: activeIncident, execution_steps: steps }, null, 2);
    navigator.clipboard.writeText(jsonTrace);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalToolCalls = steps.reduce((acc, s) => acc + (s.tool_calls?.length || 0), 0);
  const distinctAgents = Array.from(new Set(steps.map((s) => s.agent_name)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Autonomous Multi-Agent Trace</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {steps.length} Steps · {totalToolCalls} Actions
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Auditable decision chain with human-readable parameters, live telemetry, and verification logs.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
              <button
                onClick={() => setViewMode('human')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'human'
                    ? 'bg-violet-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Human View
              </button>
              <button
                onClick={() => setViewMode('json')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewMode === 'json'
                    ? 'bg-violet-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Raw JSON</span>
              </button>
            </div>

            {/* Copy button */}
            <button
              onClick={copyToClipboard}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
              title="Copy complete trace to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>

            {/* Close modal */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Incident Summary Banner */}
        {activeIncident && (
          <div className="px-6 py-3 bg-red-950/20 border-b border-red-900/30 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-red-400 tracking-wider mr-2">
                  Target Incident
                </span>
                <span className="text-xs font-bold text-white">{activeIncident.title}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
              <span>Status: <strong className="text-emerald-400">{activeIncident.resolution_status || 'Active'}</strong></span>
              <span>•</span>
              <span>Engaged Agents: <strong className="text-white">{distinctAgents.length}</strong></span>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {viewMode === 'json' ? (
            /* Raw JSON View for Developers */
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 text-slate-300 font-mono text-xs overflow-x-auto">
              <pre>{JSON.stringify({ incident: activeIncident, execution_steps: steps }, null, 2)}</pre>
            </div>
          ) : (
            /* Human-Friendly Narrative & Action Cards */
            <div className="space-y-4">
              {steps.map((step, idx) => {
                const agentKey = step.agent_name.replace(' Agent', '');
                const agentStyle = AGENT_COLORS[agentKey] || AGENT_COLORS.Orchestrator;
                const AgentIcon = AGENT_ICONS[agentKey] || Bot;
                const isComplete = step.state === 'COMPLETE';

                return (
                  <div
                    key={step.id || idx}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/90 shadow-lg space-y-3 transition-all hover:border-slate-700"
                  >
                    {/* Step Header */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center space-x-2.5">
                        <span className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs font-mono text-slate-300">
                          #{idx + 1}
                        </span>
                        <div
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
                          style={{ color: agentStyle.color, background: agentStyle.bg, border: `1px solid ${agentStyle.border}` }}
                        >
                          <AgentIcon className="w-3.5 h-3.5" />
                          <span>{step.agent_name}</span>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                            isComplete
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          }`}
                        >
                          {step.state}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
                        <Clock className="w-3 h-3" />
                        <span>{step.timestamp ? step.timestamp.replace('T', ' ').slice(0, 19) : 'Live'}</span>
                      </div>
                    </div>

                    {/* Step Headline & Detail Narrative */}
                    <div className="space-y-1">
                      {step.summary && (
                        <h4 className="text-xs font-bold text-white leading-snug">
                          {step.summary}
                        </h4>
                      )}
                      <p className="text-xs text-slate-300 leading-relaxed font-normal">
                        {step.detail}
                      </p>
                    </div>

                    {/* Executed Tools / Deterministic Actions */}
                    {step.tool_calls && step.tool_calls.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-800/80">
                        <div className="text-[10px] font-mono font-bold uppercase text-slate-400 flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Actions & Deterministic Tool Invocations ({step.tool_calls.length})</span>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5">
                          {step.tool_calls.map((tc, tIdx) => {
                            const formatted: FormattedToolCall = formatToolCall(tc);
                            const toolId = `${step.id}-${tIdx}`;
                            const isJsonExpanded = Boolean(expandedJsonTools[toolId]);

                            return (
                              <div
                                key={tIdx}
                                className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 space-y-2.5"
                              >
                                {/* Tool Card Header */}
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22D3EE]" />
                                    <span className="text-xs font-bold text-white">
                                      {formatted.title}
                                    </span>
                                    <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                                      {formatted.category}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                                      <Zap className="w-2.5 h-2.5 text-amber-400" />
                                      {formatted.durationMs}ms
                                    </span>
                                    <button
                                      onClick={() => toggleToolJson(toolId)}
                                      className="text-[10px] font-mono text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800/60 border border-slate-700/60 flex items-center gap-1"
                                      title="Toggle raw machine payload"
                                    >
                                      <Code2 className="w-3 h-3" />
                                      <span>{isJsonExpanded ? 'Hide Raw' : 'Raw JSON'}</span>
                                      {isJsonExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                    </button>
                                  </div>
                                </div>

                                {/* Natural Language Summary */}
                                <p className="text-xs text-slate-300 font-medium">
                                  {formatted.summary}
                                </p>

                                {/* Structured Findings & Results Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                                  {/* Inputs */}
                                  <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800/60 space-y-1">
                                    <div className="text-[9px] font-mono font-bold uppercase text-slate-500">
                                      Operational Inputs
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                      {formatted.paramsList.map((p, pIdx) => (
                                        <span
                                          key={pIdx}
                                          className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60 font-mono"
                                        >
                                          <strong className="text-slate-400">{p.label}:</strong> {p.value}
                                        </span>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Outputs */}
                                  <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800/60 space-y-1">
                                    <div className="text-[9px] font-mono font-bold uppercase text-emerald-400/80">
                                      Verified Outcome
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                      {formatted.resultsList.map((r, rIdx) => (
                                        <span
                                          key={rIdx}
                                          className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 font-mono"
                                        >
                                          <strong className="text-emerald-400">{r.label}:</strong> {r.value}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                {/* Expandable Raw JSON View */}
                                {isJsonExpanded && (
                                  <div className="bg-slate-950 rounded-lg p-2.5 border border-slate-800 text-[10px] font-mono space-y-1 mt-1 text-slate-400 overflow-x-auto">
                                    <div className="text-cyan-300 font-bold">
                                      {tc.tool_name}({JSON.stringify(tc.arguments)})
                                    </div>
                                    <div>Result: {JSON.stringify(tc.result)}</div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
