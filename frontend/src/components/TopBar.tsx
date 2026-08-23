import React from 'react';
import {
  Search,
  Bell,
  Volume2,
  VolumeX,
  Settings as SettingsIcon,
  Command,
  Play,
  Pause,
  Zap,
  Activity,
  Radio,
  ShieldCheck,
  Sparkles,
  Tablet,
  Building2
} from 'lucide-react';
import { SimulationState } from '../types/fleet';
import { ConnectionStatus } from '../services/websocket';
import { toggleSimulationPause, setSimulationSpeed } from '../services/api';

interface TopBarProps {
  state: SimulationState | null;
  activeTab: string;
  connectionStatus: ConnectionStatus;
  onSelectTab: (tab: string) => void;
  onOpenCommand: () => void;
  onOpenIncidents: () => void;
  onOpenSettings: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  selectedDepot?: string;
  onSelectDepot?: (depotId: string) => void;
  onOpenDriverModal?: () => void;
}

const NAV_TABS: { id: string; label: string; badge?: string }[] = [
  { id: 'operations', label: 'Live Operations' },
  { id: 'fleet', label: 'Fleet Roster' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'simulation', label: 'Scenarios & Levels' },
  { id: 'reports', label: 'Audit Logs' }
];

const CONNECTION_META: Record<ConnectionStatus, { label: string; color: string; dot: string }> = {
  open: { label: 'LIVE SYNC', color: 'var(--signal)', dot: 'status-dot--active' },
  connecting: { label: 'SYNCING', color: 'var(--warn)', dot: 'status-dot--idle' },
  closed: { label: 'OFFLINE', color: 'var(--crit)', dot: 'status-dot--crit' }
};

const FleetOpsLogo: React.FC = () => (
  <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 via-cyan-500/15 to-violet-500/20 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
    <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400/30" />
    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
  </div>
);

export const TopBar: React.FC<TopBarProps> = ({
  state,
  activeTab,
  connectionStatus,
  onSelectTab,
  onOpenCommand,
  onOpenIncidents,
  onOpenSettings,
  soundEnabled,
  onToggleSound,
  selectedDepot = 'ALL',
  onSelectDepot,
  onOpenDriverModal
}) => {
  const conn = CONNECTION_META[connectionStatus];
  const simTime = state?.sim_time || '--:--:--';
  const isPaused = Boolean(state?.is_paused);
  const speed = state?.speed_multiplier ?? 1;

  const totalVehicles = state?.vehicles?.length || 100;
  const activeUnits = state?.vehicles?.filter(v => v.status === 'ON_ROUTE' || v.status === 'REASSIGNED').length || 78;
  const onTimeRate = state?.metrics?.on_time_rate_percent ?? 98.4;
  const activeIncidents = state?.metrics?.active_incidents_count ?? (state?.active_incident ? 1 : 0);

  const handleTogglePause = async () => {
    try {
      await toggleSimulationPause();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSpeedSelect = async (newSpeed: number) => {
    try {
      await setSimulationSpeed(newSpeed);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header
      className="relative z-30 flex items-center gap-3 h-14 px-4 shrink-0 justify-between select-none"
      style={{
        background: 'linear-gradient(180deg, rgba(14,20,34,0.96) 0%, rgba(8,12,20,0.92) 100%)',
        borderBottom: '1px solid rgba(45,58,86,0.6)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)'
      }}
    >
      {/* Brand Lockup */}
      <div className="flex items-center gap-3 shrink-0">
        <FleetOpsLogo />
        <div className="leading-tight">
          <div className="flex items-center gap-1.5">
            <span
              className="text-[14px] font-extrabold tracking-[0.12em] bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent font-mono"
            >
              FLEETOPS
            </span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
              AI
            </span>
          </div>
          <div className="text-[8.5px] font-mono tracking-widest text-slate-400 uppercase font-semibold">
            Autonomous Command Swarm
          </div>
        </div>
      </div>

      <div className="w-px h-6 shrink-0 bg-slate-800 hidden lg:block" />

      {/* Multi-Depot Selector */}
      {onSelectDepot && (
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800 text-xs font-mono">
          <Building2 className="w-3.5 h-3.5 text-cyan-400" />
          <select
            value={selectedDepot}
            onChange={(e) => onSelectDepot(e.target.value)}
            className="bg-transparent text-slate-300 focus:outline-none cursor-pointer text-xs"
          >
            <option value="ALL" className="bg-slate-900 text-slate-300">All Depots (Global)</option>
            <option value="DEPOT-01" className="bg-slate-900 text-slate-300">DEPOT-01 SF Central Hub</option>
            <option value="DEPOT-02" className="bg-slate-900 text-slate-300">DEPOT-02 Oakland Port</option>
            <option value="DEPOT-03" className="bg-slate-900 text-slate-300">DEPOT-03 San Jose Tech</option>
          </select>
        </div>
      )}

      {/* Primary Navigation Tabs */}
      <nav className="hidden lg:flex items-center gap-1 shrink-0" aria-label="Primary">
        {NAV_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-slate-800/90 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <span>{tab.label}</span>
              {tab.id === 'simulation' && (
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  L1-8
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Center Metrics Pill Bar */}
      <div className="hidden 2xl:flex items-center gap-3 px-3 py-1 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">FLEET:</span>
          <span className="font-bold text-white">{activeUnits}/{totalVehicles} Active</span>
        </div>
        <span className="w-px h-3 bg-slate-800" />
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">SLA:</span>
          <span className="font-bold text-emerald-400">{onTimeRate.toFixed(1)}%</span>
        </div>
        <span className="w-px h-3 bg-slate-800" />
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">SWARM:</span>
          <span className="font-bold text-cyan-400">Autonomous</span>
        </div>
      </div>

      {/* Right Controls Cluster */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Driver In-Cab Companion Tablet Launcher */}
        {onOpenDriverModal && (
          <button
            onClick={onOpenDriverModal}
            className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold transition-all"
            title="Open In-Cab Driver Tablet Companion"
          >
            <Tablet className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">IN-CAB</span>
          </button>
        )}

        {/* Command & Natural Language Palette Trigger */}
        <button
          onClick={onOpenCommand}
          className="hidden md:flex items-center gap-2 h-8 pl-2.5 pr-2 rounded-lg bg-slate-950/60 hover:bg-slate-900 border border-slate-800 transition-colors text-slate-400 hover:text-slate-200"
          title="Command Palette & AI Agent Assistant"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs">Ask Swarm…</span>
          <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400 border border-slate-700">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </button>

        {/* Simulation Speed & Clock Pill */}
        <div className="flex items-center gap-1.5 h-8 px-2 rounded-lg bg-slate-950/80 border border-slate-800">
          <button
            onClick={handleTogglePause}
            className={`p-1 rounded transition-colors ${
              isPaused ? 'text-amber-400 hover:bg-amber-500/20' : 'text-emerald-400 hover:bg-emerald-500/20'
            }`}
            title={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 fill-amber-400" /> : <Pause className="w-3.5 h-3.5 fill-emerald-400" />}
          </button>

          <span className="w-px h-3.5 bg-slate-800" />

          <span className="text-xs font-mono font-bold text-white tracking-wider">
            {simTime}
          </span>

          <span className="w-px h-3.5 bg-slate-800" />

          {/* Quick Speed Switcher */}
          <div className="flex items-center gap-0.5">
            {[1, 2, 4].map((spd) => (
              <button
                key={spd}
                onClick={() => handleSpeedSelect(spd)}
                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded transition-all ${
                  speed === spd && !isPaused
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Connection Status Badge */}
        <div
          className="hidden md:flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-slate-950/80 border border-slate-800"
          title={`Backend WebSocket: ${conn.label}`}
        >
          <span className={`w-2 h-2 rounded-full ${connectionStatus === 'open' ? 'bg-emerald-400 shadow-[0_0_8px_#10B981]' : 'bg-amber-400'}`} />
          <span
            className="text-[10px] font-mono font-bold tracking-wider"
            style={{ color: conn.color }}
          >
            {conn.label}
          </span>
        </div>

        {/* Incidents Notification Alert Button */}
        <button
          onClick={onOpenIncidents}
          className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Active Disruption Feed"
        >
          <Bell className="w-4 h-4" />
          {activeIncidents > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-bold bg-rose-600 text-white font-mono animate-pulse">
              {activeIncidents}
            </span>
          )}
        </button>

        {/* Sound Toggle */}
        <button
          onClick={onToggleSound}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          title={soundEnabled ? 'Audio Alerts Enabled' : 'Audio Alerts Muted'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          title="System Configuration & API Keys"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>

        {/* Operator Badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 border border-emerald-500/30 text-xs font-mono font-bold text-emerald-300"
          title="Logged in as Fleet Commander"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden lg:inline">COMMANDER</span>
        </div>
      </div>
    </header>
  );
};
