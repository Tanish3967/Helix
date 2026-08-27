import React, { useState, useRef, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Settings as SettingsIcon,
  Command,
  Play,
  Pause,
  Zap,
  Building2,
  Sliders,
  History,
  ShieldAlert,
  BatteryCharging,
  CloudLightning,
  Warehouse,
  Clock,
  LayoutGrid,
  ChevronDown,
  Wrench,
  Shield,
  Snowflake,
  Tablet,
  Activity,
  Layers,
  FileText,
  Globe
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
  onOpenPolicies?: () => void;
  onOpenFlightRecorder?: () => void;
  onOpenDepots?: () => void;
  onOpenSafety?: () => void;
  onOpenCharging?: () => void;
  onOpenWeather?: () => void;
  onOpenYard?: () => void;
  onOpenHOS?: () => void;
  onOpenMaintenance?: () => void;
  onOpenConvoy?: () => void;
  onOpenCryo?: () => void;
  onOpenConsole?: (tab?: 'disruptions' | 'fleet' | 'routes') => void;
  onOpenAuditLogs?: () => void;
  onOpenImporter?: () => void;
}

const NAV_TABS = [
  { id: 'operations', label: 'Operations' },
  { id: 'fleet', label: 'Fleet' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'simulation', label: 'Scenarios' },
  { id: 'reports', label: 'Audit Logs' }
];

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
  onOpenDriverModal,
  onOpenPolicies,
  onOpenFlightRecorder,
  onOpenDepots,
  onOpenSafety,
  onOpenCharging,
  onOpenWeather,
  onOpenYard,
  onOpenHOS,
  onOpenMaintenance,
  onOpenConvoy,
  onOpenCryo,
  onOpenConsole,
  onOpenAuditLogs,
  onOpenImporter
}) => {
  const [isSuiteOpen, setIsSuiteOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const simTime = state?.sim_time || '08:00:00 UTC';
  const isPaused = Boolean(state?.is_paused);
  const speed = state?.speed_multiplier ?? 1;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsSuiteOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTogglePause = async () => {
    try {
      await toggleSimulationPause();
    } catch (e) {
      console.error('Failed to toggle pause:', e);
    }
  };

  const handleCycleSpeed = async () => {
    const nextSpeed = speed === 1 ? 2 : speed === 2 ? 4 : speed === 4 ? 8 : 1;
    try {
      await setSimulationSpeed(nextSpeed);
    } catch (e) {
      console.error('Failed to set speed:', e);
    }
  };

  const enterpriseTools = [
    {
      category: 'Autonomous & Security',
      items: [
        { id: 'cryo', label: 'Cryo Cold-Chain', desc: '-80°C ULT & FDA 21 CFR', icon: Snowflake, color: 'text-sky-400', bg: 'hover:border-sky-500/50 hover:bg-sky-500/10', action: onOpenCryo },
        { id: 'convoy', label: 'Secure Convoy', desc: 'DEFCON Tactical Mesh & Vault', icon: Shield, color: 'text-cyan-400', bg: 'hover:border-cyan-500/50 hover:bg-cyan-500/10', action: onOpenConvoy },
        { id: 'safety', label: 'AI Driver Safety', desc: 'Computer Vision DMS & G-Force', icon: ShieldAlert, color: 'text-rose-400', bg: 'hover:border-rose-500/50 hover:bg-rose-500/10', action: onOpenSafety }
      ]
    },
    {
      category: 'Grid & Energy Infrastructure',
      items: [
        { id: 'charging', label: 'EV Grid & V2G', desc: 'Peak Shave & Bay Allocation', icon: BatteryCharging, color: 'text-emerald-400', bg: 'hover:border-emerald-500/50 hover:bg-emerald-500/10', action: onOpenCharging },
        { id: 'depots', label: 'Multi-Depot Swarm', desc: 'Cross-Facility Load Balancer', icon: Building2, color: 'text-cyan-400', bg: 'hover:border-cyan-500/50 hover:bg-cyan-500/10', action: onOpenDepots },
        { id: 'yard', label: 'Yard YMS & ALPR', desc: 'Dock Doors & Optical Scanner', icon: Warehouse, color: 'text-amber-400', bg: 'hover:border-amber-500/50 hover:bg-amber-500/10', action: onOpenYard }
      ]
    },
    {
      category: 'Maintenance & Compliance',
      items: [
        { id: 'maintenance', label: 'Predictive Maint', desc: 'RUL Degradation & Work Orders', icon: Wrench, color: 'text-amber-400', bg: 'hover:border-amber-500/50 hover:bg-amber-500/10', action: onOpenMaintenance },
        { id: 'hos', label: 'HOS FMCSA ELD', desc: 'Duty Timers & 70h Violation Engine', icon: Clock, color: 'text-indigo-400', bg: 'hover:border-indigo-500/50 hover:bg-indigo-500/10', action: onOpenHOS },
        { id: 'weather', label: 'Weather Radar', desc: 'Live Microclimates & Detours', icon: CloudLightning, color: 'text-sky-400', bg: 'hover:border-sky-500/50 hover:bg-sky-500/10', action: onOpenWeather }
      ]
    },
    {
      category: 'Telemetry & Field Operations',
      items: [
        { id: 'blackbox', label: 'Flight Blackbox', desc: 'Time-Travel & Forensic Replay', icon: History, color: 'text-amber-400', bg: 'hover:border-amber-500/50 hover:bg-amber-500/10', action: onOpenFlightRecorder },
        { id: 'policies', label: 'Self-Healing Policies', desc: 'Autonomous SLA Fallback Rules', icon: Sliders, color: 'text-violet-400', bg: 'hover:border-violet-500/50 hover:bg-violet-500/10', action: onOpenPolicies },
        { id: 'driver', label: 'In-Cab Driver Tablet', desc: 'Manifest, Route Navigation & e-POD', icon: Tablet, color: 'text-cyan-400', bg: 'hover:border-cyan-500/50 hover:bg-cyan-500/10', action: onOpenDriverModal },
        { id: 'importer', label: 'Fleet Data Studio', desc: 'Global City Packs & CSV Ingestion', icon: Globe, color: 'text-emerald-400', bg: 'hover:border-emerald-500/50 hover:bg-emerald-500/10', action: onOpenImporter }
      ]
    }
  ];

  return (
    <header className="h-13 bg-[#080D17]/95 border-b border-white/[0.08] backdrop-blur-xl px-3 lg:px-4 flex items-center justify-between z-40 sticky top-0 shadow-[0_4px_30px_rgba(0,0,0,0.8)] text-xs font-mono select-none">
      {/* 1. Left Cluster: Logo & Navigation Tabs */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-emerald-500/20 border border-cyan-500/40 shadow-[0_0_15px_rgba(0,240,255,0.25)]">
            <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400/30" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          </div>
          <div className="flex items-center gap-1.5 leading-tight">
            <span className="font-extrabold tracking-wider text-slate-100 text-sm font-sans">
              FLEETOPS<span className="text-[#00F0FF]">.AI</span>
            </span>
            <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-[#00F0FF] text-[9.5px] font-mono font-extrabold border border-cyan-500/30 tracking-widest hidden sm:inline-block">
              AUTONOMOUS
            </span>
          </div>
        </div>

        {/* Primary View Switcher Tabs */}
        <nav className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-800/90 ml-1">
          {NAV_TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-[0_0_10px_rgba(0,240,255,0.15)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 2. Center Cluster: Enterprise Suite Mega-Menu Trigger & Hot Buttons */}
      <div className="flex items-center gap-2">
        {/* Enterprise Mega-Menu Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsSuiteOpen(!isSuiteOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-lg backdrop-blur-md ${
              isSuiteOpen
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.3)]'
                : 'bg-[#0E1726]/90 hover:bg-slate-800 text-slate-200 border-cyan-500/30 hover:border-cyan-500/60'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="tracking-wide">ENTERPRISE PLATFORM</span>
            <span className="px-1.5 py-0.2 rounded bg-cyan-500/30 text-cyan-200 text-[10px] font-extrabold border border-cyan-400/40">
              12 SUITES
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-cyan-400 transition-transform duration-200 ${isSuiteOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Mega-Menu Drawer Grid */}
          {isSuiteOpen && (
            <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-[720px] bg-[#0A0F1D]/98 border border-cyan-500/40 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl p-4 z-50 animate-fadeIn space-y-4">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                    <LayoutGrid className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                      FleetOps Autonomous Subsystems Suite
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      12 fully-integrated mission-critical engines with real-time bidirectional telemetry
                    </p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  ● ALL ONLINE
                </span>
              </div>

              {/* 4-Category Mega-Grid */}
              <div className="grid grid-cols-2 gap-3">
                {enterpriseTools.map((cat, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span>{cat.category}</span>
                    </div>

                    <div className="space-y-1">
                      {cat.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setIsSuiteOpen(false);
                              if (item.action) item.action();
                            }}
                            className={`w-full flex items-center justify-between p-2 rounded-lg border border-transparent bg-slate-900/50 text-left transition-all ${item.bg}`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Icon className={`w-3.5 h-3.5 shrink-0 ${item.color}`} />
                              <div className="truncate">
                                <div className="text-xs font-bold text-slate-200 truncate">{item.label}</div>
                                <div className="text-[9.5px] text-slate-400 truncate">{item.desc}</div>
                              </div>
                            </div>
                            <span className="text-slate-500 hover:text-white text-[11px] font-bold">→</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dedicated Autonomous Simulator & Disruption Injector Button */}
        {onOpenConsole && (
          <button
            onClick={() => onOpenConsole('disruptions')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-500/20 hover:from-amber-500/30 hover:to-rose-500/30 border border-amber-500/50 hover:border-amber-400 text-amber-300 text-xs font-bold font-mono shadow-[0_0_18px_rgba(245,158,11,0.25)] transition-all hover:scale-105 active:scale-95"
            title="Open Simulator to Inject Vehicle Faults, Traffic Congestion & Weather Hazards"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse fill-amber-400/40" />
            <span className="tracking-wider font-extrabold">SIMULATOR</span>
            <span className="px-1.5 py-0.2 rounded bg-amber-500/30 text-[9.5px] text-amber-200 border border-amber-400/40 font-bold hidden md:inline-block">
              CHAOS INJECT
            </span>
          </button>
        )}

        {/* Dedicated Fleet Data Studio & Global City Switcher Button */}
        {onOpenImporter && (
          <button
            onClick={onOpenImporter}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-emerald-500/20 hover:from-emerald-500/30 hover:to-cyan-500/30 border border-emerald-500/50 hover:border-emerald-400 text-emerald-300 text-xs font-bold font-mono shadow-[0_0_18px_rgba(16,185,129,0.25)] transition-all hover:scale-105 active:scale-95"
            title="Open Fleet Data Studio (Switch Cities: SF, NYC, London, Tokyo, Berlin or Import CSV)"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="tracking-wider font-extrabold hidden md:inline">DATA STUDIO</span>
            <span className="px-1.5 py-0.2 rounded bg-emerald-500/30 text-[9.5px] text-emerald-200 border border-emerald-400/40 font-bold">
              CITIES / CSV
            </span>
          </button>
        )}

        {/* Hot Quick Launch Badges */}
        <div className="hidden 2xl:flex items-center gap-1.5">
          {onOpenCryo && (
            <button
              onClick={onOpenCryo}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-[11px] font-bold transition-all"
            >
              <Snowflake className="w-3 h-3 text-sky-400" />
              <span>CRYO -80°C</span>
            </button>
          )}
          {onOpenConvoy && (
            <button
              onClick={onOpenConvoy}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold transition-all"
            >
              <Shield className="w-3 h-3 text-cyan-400" />
              <span>DEFCON CONVOY</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Right Cluster: Depots, Simulation Transport & Utility */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Depot Filter */}
        {onSelectDepot && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 text-[11px]">
            <Building2 className="w-3 h-3 text-cyan-400 shrink-0" />
            <select
              value={selectedDepot}
              onChange={(e) => onSelectDepot(e.target.value)}
              className="bg-transparent border-none text-slate-200 text-xs font-mono focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL">All Depots (Swarm)</option>
              <option value="DEPOT-01">SF Central Hub</option>
              <option value="DEPOT-02">Oakland Port Hub</option>
              <option value="DEPOT-03">San Jose Tech Hub</option>
            </select>
          </div>
        )}

        {/* Transport Playback Speed & Pause Controls */}
        <div className="flex items-center bg-slate-950/90 rounded-lg border border-slate-800 p-0.5 gap-1">
          <button
            onClick={handleTogglePause}
            className={`p-1 rounded transition-colors ${isPaused ? 'bg-amber-500/20 text-amber-300' : 'text-emerald-400 hover:bg-slate-800'}`}
            title={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleCycleSpeed}
            className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 text-[10px] font-bold"
            title="Cycle simulation speed"
          >
            {speed}x
          </button>
          <span className="px-2 text-[10.5px] text-slate-400 font-mono hidden md:inline">
            {simTime.includes('T') ? simTime.split('T')[1].split('.')[0] : simTime}
          </span>
        </div>

        {/* Dedicated Audit & Regulatory Logs Button */}
        {onOpenAuditLogs && (
          <button
            onClick={onOpenAuditLogs}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-200 text-[11px] font-bold transition-all shadow-sm"
            title="Open Enterprise Audit & Regulatory Compliance Ledger"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Audit Logs</span>
          </button>
        )}

        {/* Command Bar Shortcut Trigger */}
        <button
          onClick={onOpenCommand}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] transition-colors"
          title="Open AI Command Terminal (Cmd+K)"
        >
          <Command className="w-3 h-3 text-cyan-400" />
          <span className="hidden sm:inline">⌘K</span>
        </button>

        {/* Audio Toggle */}
        <button
          onClick={onToggleSound}
          className={`p-1.5 rounded-lg border transition-colors ${
            soundEnabled
              ? 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          }`}
          title={soundEnabled ? 'Mute Alert Audio' : 'Unmute Alert Audio'}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>

        {/* Settings Gear */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
          title="Open Settings & Diagnostics"
        >
          <SettingsIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
