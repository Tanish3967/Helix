import React from 'react';
import { Search, Bell, Volume2, VolumeX, Settings, Command } from 'lucide-react';
import { SimulationState } from '../types/fleet';
import { ConnectionStatus } from '../services/websocket';

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
}

const NAV_TABS: { id: string; label: string }[] = [
  { id: 'operations', label: 'Live Operations' },
  { id: 'fleet', label: 'Fleet Overview' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'simulation', label: 'Simulation' },
  { id: 'reports', label: 'Reports' }
];

const CONNECTION_META: Record<ConnectionStatus, { label: string; color: string; dot: string }> = {
  open: { label: 'LIVE', color: 'var(--signal)', dot: 'status-dot--active' },
  connecting: { label: 'SYNCING', color: 'var(--warn)', dot: 'status-dot--idle' },
  closed: { label: 'OFFLINE', color: 'var(--crit)', dot: 'status-dot--crit' }
};

const AegisMark: React.FC = () => (
  <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path
      d="M16 2.5 27 8v9.2c0 6.6-4.6 10.6-11 12.3C9.6 27.8 5 23.8 5 17.2V8L16 2.5Z"
      stroke="var(--signal)"
      strokeWidth="1.6"
      fill="rgba(16,185,129,0.08)"
    />
    <path d="M16 9.5 20.5 20h-2.4l-.9-2.3h-2.4L13.9 20h-2.4L16 9.5Z" fill="var(--signal-2)" />
    <circle cx="16" cy="16" r="12.5" stroke="var(--signal)" strokeOpacity="0.18" strokeWidth="1" />
  </svg>
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
  onToggleSound
}) => {
  const conn = CONNECTION_META[connectionStatus];
  const simTime = state?.sim_time || '--:--:--';
  const isPaused = state?.is_paused;
  const speed = state?.speed_multiplier ?? 1;

  const activeIncidents =
    state?.metrics?.active_incidents_count ?? (state?.active_incident ? 1 : 0);

  return (
    <header
      className="relative z-30 flex items-center gap-4 h-14 px-4 shrink-0"
      style={{
        background: 'linear-gradient(180deg, rgba(18,26,42,0.92), rgba(10,15,26,0.86))',
        borderBottom: '1px solid var(--edge)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)'
      }}
    >
      {/* Brand lockup */}
      <div className="flex items-center gap-2.5 shrink-0">
        <AegisMark />
        <div className="leading-none">
          <div
            className="text-[15px] font-extrabold tracking-[0.14em]"
            style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}
          >
            AEGIS
          </div>
          <div className="eyebrow mt-1" style={{ fontSize: '8.5px', letterSpacing: '0.18em' }}>
            AUTONOMOUS FLEET INTELLIGENCE
          </div>
        </div>
      </div>

      <div className="w-px h-7 shrink-0" style={{ background: 'var(--edge)' }} />

      {/* Primary navigation */}
      <nav className="flex items-center gap-5 shrink-0" aria-label="Primary">
        {NAV_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? 'is-active' : ''}`}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            onClick={() => onSelectTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Command / search launcher — opens the Ask Aegis bar (Phase E) */}
      <button
        onClick={onOpenCommand}
        className="hidden md:flex items-center gap-2.5 h-9 pl-3 pr-2 rounded-lg transition-colors group"
        style={{ background: 'rgba(8,12,20,0.6)', border: '1px solid var(--edge)', minWidth: '230px' }}
        aria-label="Open command bar"
      >
        <Search className="w-3.5 h-3.5" style={{ color: 'var(--ink-faint)' }} />
        <span className="text-[12px] flex-1 text-left" style={{ color: 'var(--ink-faint)' }}>
          Ask Aegis or search…
        </span>
        <kbd
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold"
          style={{ background: 'rgba(148,163,184,0.1)', color: 'var(--ink-dim)', fontFamily: 'var(--font-mono)' }}
        >
          <Command className="w-2.5 h-2.5" />K
        </kbd>
      </button>

      {/* Connection + sim clock pill */}
      <div
        className="flex items-center gap-2.5 h-9 px-3 rounded-lg shrink-0"
        style={{ background: 'rgba(8,12,20,0.6)', border: '1px solid var(--edge)' }}
        title={`Backend link: ${conn.label}${isPaused ? ' · simulation paused' : ''}`}
      >
        <span className={`status-dot ${conn.dot}`} />
        <span
          className="text-[10px] font-bold tracking-wider"
          style={{ color: conn.color, fontFamily: 'var(--font-mono)' }}
        >
          {conn.label}
        </span>
        <span className="w-px h-4" style={{ background: 'var(--edge)' }} />
        <span className="readout text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>
          {simTime}
        </span>
        {isPaused ? (
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(245,158,11,0.16)', color: 'var(--warn)', fontFamily: 'var(--font-mono)' }}
          >
            PAUSED
          </span>
        ) : (
          <span className="readout text-[10px]" style={{ color: 'var(--ink-faint)' }}>
            {speed}×
          </span>
        )}
      </div>

      {/* Notifications */}
      <button
        onClick={onOpenIncidents}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors shrink-0"
        style={{ background: 'rgba(8,12,20,0.6)', border: '1px solid var(--edge)', color: 'var(--ink-dim)' }}
        aria-label={`Notifications${activeIncidents ? `, ${activeIncidents} active` : ''}`}
        title="Active incidents"
      >
        <Bell className="w-4 h-4" />
        {activeIncidents > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-bold"
            style={{ background: 'var(--crit)', color: '#fff', fontFamily: 'var(--font-mono)' }}
          >
            {activeIncidents}
          </span>
        )}
      </button>

      {/* Sound toggle */}
      <button
        onClick={onToggleSound}
        className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors shrink-0"
        style={{ background: 'rgba(8,12,20,0.6)', border: '1px solid var(--edge)', color: 'var(--ink-dim)' }}
        aria-label={soundEnabled ? 'Mute alerts' : 'Unmute alerts'}
        aria-pressed={soundEnabled}
        title={soundEnabled ? 'Alerts on' : 'Alerts muted'}
      >
        {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </button>

      {/* Settings */}
      <button
        onClick={onOpenSettings}
        className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors shrink-0"
        style={{ background: 'rgba(8,12,20,0.6)', border: '1px solid var(--edge)', color: 'var(--ink-dim)' }}
        aria-label="Settings"
        title="Settings"
      >
        <Settings className="w-4 h-4" />
      </button>

      {/* Operator avatar */}
      <div
        className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 text-[12px] font-bold"
        style={{
          background: 'linear-gradient(140deg, var(--signal), var(--ion))',
          color: '#04140D',
          fontFamily: 'var(--font-mono)'
        }}
        title="Fleet Operator"
        aria-label="Fleet Operator"
      >
        OP
      </div>
    </header>
  );
};
