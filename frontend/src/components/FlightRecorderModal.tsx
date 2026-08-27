import React, { useState, useEffect } from 'react';
import {
  History,
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  X,
  FileText,
  Thermometer,
  ShieldAlert,
  Download,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Activity,
  Layers,
  FileDown
} from 'lucide-react';
import { SimulationState, Incident, Vehicle } from '../types/fleet';

interface FlightRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: SimulationState | null;
  activeIncident: Incident | null;
}

interface Snapshot {
  timestamp: string;
  sim_time: string;
  vehicle_count: number;
  vehicles: {
    id: string;
    lat: number;
    lng: number;
    speed_kmh: number;
    battery: number;
    status: string;
    fault?: string | null;
  }[];
  active_incident_id: string | null;
  incident_title: string | null;
  step_count: number;
}

interface PostMortemData {
  incident_id: string;
  title: string;
  severity: string;
  detected_at: string;
  resolved_at: string;
  root_cause: string;
  minutes_saved: number;
  fuel_avoided_liters: number;
  co2_avoided_kg: number;
  agent_timeline: {
    agent: string;
    summary: string;
    state: string;
    timestamp: string;
    tools_executed: string[];
  }[];
  markdown_report: string;
}

export const FlightRecorderModal: React.FC<FlightRecorderModalProps> = ({
  isOpen,
  onClose,
  state,
  activeIncident
}) => {
  const [activeTab, setActiveTab] = useState<'replay' | 'postmortem' | 'coldchain'>('replay');
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [postMortem, setPostMortem] = useState<PostMortemData | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState<boolean>(false);

  // Fetch flight log snapshots when opened
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/fleet/flight-log')
      .then(res => res.json())
      .then(data => {
        if (data && data.snapshots && data.snapshots.length > 0) {
          setSnapshots(data.snapshots);
          setCurrentIndex(data.snapshots.length - 1);
        }
      })
      .catch(console.error);
  }, [isOpen]);

  // Fetch post-mortem report
  useEffect(() => {
    if (!isOpen || activeTab !== 'postmortem') return;

    const targetId = activeIncident?.id || 'INC-LATEST';
    setIsLoadingReport(true);
    fetch(`/api/fleet/incidents/${targetId}/post-mortem`)
      .then(res => res.json())
      .then(data => {
        setPostMortem(data);
      })
      .catch(console.error)
      .finally(() => setIsLoadingReport(false));
  }, [isOpen, activeTab, activeIncident]);

  // Auto-play replay timer
  useEffect(() => {
    let interval: any;
    if (isPlaying && snapshots.length > 0) {
      interval = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= snapshots.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, snapshots.length, playbackSpeed]);

  if (!isOpen) return null;

  const currentSnapshot = snapshots[currentIndex] || null;

  // Cold-chain vehicles list
  const coldChainVehicles = (state?.vehicles || []).map((v, idx) => {
    const isPharma = idx % 4 === 0;
    const isPerishable = idx % 4 === 1;
    const temp = v.cargo_temp_c ?? (isPharma ? 4.2 : isPerishable ? -18.5 : 21.0);
    const humidity = v.cargo_humidity_percent ?? 55;
    const doorOpen = Boolean(v.door_open_alert);
    const cargoType = v.cargo_type || (isPharma ? 'PHARMACEUTICAL' : isPerishable ? 'PERISHABLE' : 'GENERAL');
    
    const isExcursion = (cargoType === 'PHARMACEUTICAL' && (temp < 2.0 || temp > 8.0)) ||
                        (cargoType === 'PERISHABLE' && temp > 4.0);

    return {
      ...v,
      temp,
      humidity,
      doorOpen,
      cargoType,
      isExcursion
    };
  });

  const handleExportJSON = async () => {
    try {
      const res = await fetch('/api/fleet/flight-log/export', { method: 'POST' });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fleetops-blackbox-flight-log-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export flight log:', e);
    }
  };

  const handleDownloadMarkdown = () => {
    if (!postMortem) return;
    const blob = new Blob([postMortem.markdown_report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incident-post-mortem-${postMortem.incident_id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                MISSION FLIGHT RECORDER & REPLAY
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  BLACKBOX AI
                </span>
              </h2>
              <p className="text-xs text-slate-400">High-frequency telemetry snapshots, time-travel replay & executive post-mortem analysis.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 gap-2">
          {[
            { id: 'replay', label: 'Time-Travel Scrubber', icon: History },
            { id: 'postmortem', label: 'Executive Post-Mortem', icon: FileText },
            { id: 'coldchain', label: 'Cold-Chain IoT Telematics', icon: Thermometer }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3 text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs font-mono">
          {/* TAB 1: TIME-TRAVEL REPLAY SCRUBBER */}
          {activeTab === 'replay' && (
            <div className="space-y-4">
              {/* Playback Control Bar */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs">Sim Snapshot:</span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                      {currentSnapshot ? currentSnapshot.sim_time : '--:--:--'}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      ({currentIndex + 1} / {snapshots.length || 1} frames)
                    </span>
                  </div>

                  {/* Play / Speed Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentIndex(0)}
                      className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                      title="Rewind to Start"
                    >
                      <SkipBack className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="p-1.5 px-3 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold flex items-center gap-1.5 hover:bg-amber-500/30 transition-all"
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5 fill-amber-400" /> : <Play className="w-3.5 h-3.5 fill-amber-400" />}
                      <span>{isPlaying ? 'Pause' : 'Replay'}</span>
                    </button>
                    <button
                      onClick={() => setCurrentIndex(snapshots.length - 1)}
                      className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                      title="Fast-forward to Live"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-1 ml-2 border-l border-slate-800 pl-2">
                      {[1, 2, 4].map(spd => (
                        <button
                          key={spd}
                          onClick={() => setPlaybackSpeed(spd)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            playbackSpeed === spd ? 'bg-amber-400 text-slate-950' : 'bg-slate-900 text-slate-400'
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Scrubber Range Slider */}
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, snapshots.length - 1)}
                  value={currentIndex}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setCurrentIndex(parseInt(e.target.value, 10));
                  }}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>

              {/* Snapshot State Inspector */}
              {currentSnapshot ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="text-slate-400 text-xs font-bold flex items-center justify-between">
                      <span>OPERATIONAL VITALS</span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> SYNCED
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                        <span className="text-slate-500">Tracked Units:</span>
                        <div className="text-white font-bold">{currentSnapshot.vehicle_count} Vehicles</div>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                        <span className="text-slate-500">Agent Reasoning Steps:</span>
                        <div className="text-white font-bold">{currentSnapshot.step_count} Invocations</div>
                      </div>
                    </div>

                    {currentSnapshot.active_incident_id && (
                      <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px]">
                        <div className="font-bold flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          <span>Active Disruption: {currentSnapshot.active_incident_id}</span>
                        </div>
                        <div className="text-slate-400 text-[10px] mt-0.5">{currentSnapshot.incident_title}</div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="text-slate-400 text-xs font-bold flex items-center justify-between">
                      <span>TELEMETRY SNAPSHOT SAMPLE</span>
                      <button
                        onClick={handleExportJSON}
                        className="text-amber-400 hover:text-amber-300 text-[10.5px] flex items-center gap-1"
                      >
                        <FileDown className="w-3 h-3" /> Export JSON
                      </button>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                      {currentSnapshot.vehicles.slice(0, 6).map(v => (
                        <div key={v.id} className="p-1.5 rounded bg-slate-900 border border-slate-800/60 flex items-center justify-between text-[10.5px]">
                          <span className="text-white font-bold">{v.id}</span>
                          <span className="text-slate-400">{v.speed_kmh} km/h</span>
                          <span className="text-slate-400">{v.battery}% SOC</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] ${
                            v.status === 'ON_ROUTE' ? 'bg-emerald-500/20 text-emerald-300' :
                            v.status === 'AT_RISK' ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {v.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500">No telemetry snapshot recorded yet.</div>
              )}
            </div>
          )}

          {/* TAB 2: EXECUTIVE POST-MORTEM REPORT */}
          {activeTab === 'postmortem' && (
            <div className="space-y-4">
              {isLoadingReport ? (
                <div className="p-8 text-center text-slate-400 animate-pulse">
                  Synthesizing Multi-Agent Executive Post-Mortem Report...
                </div>
              ) : postMortem ? (
                <div className="space-y-4">
                  {/* Executive Metric Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-500 text-[10.5px]">DELIVERY DELAY AVOIDED</span>
                      <div className="text-lg font-bold text-emerald-400">+{postMortem.minutes_saved} min</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-500 text-[10.5px]">FUEL / ENERGY SAVED</span>
                      <div className="text-lg font-bold text-cyan-400">{postMortem.fuel_avoided_liters} L</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-500 text-[10.5px]">SCOPE 1 CO2 AVOIDED</span>
                      <div className="text-lg font-bold text-amber-400">-{postMortem.co2_avoided_kg} kg</div>
                    </div>
                  </div>

                  {/* Full Markdown Report View */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="font-bold text-white text-xs flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>AI Root-Cause & Swarm Impact Analysis</span>
                      </div>
                      <button
                        onClick={handleDownloadMarkdown}
                        className="px-2.5 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 text-[11px] font-bold flex items-center gap-1.5 transition-all"
                      >
                        <Download className="w-3 h-3" /> Download Markdown
                      </button>
                    </div>

                    <div className="bg-slate-900/90 p-4 rounded-lg border border-slate-800/80 max-h-72 overflow-y-auto font-sans text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {postMortem.markdown_report}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500">No post-mortem report available.</div>
              )}
            </div>
          )}

          {/* TAB 3: COLD-CHAIN IOT TELEMATICS */}
          {activeTab === 'coldchain' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 text-[10.5px]">MONITORED COLD UNITS</span>
                  <div className="text-lg font-bold text-cyan-400">{coldChainVehicles.length} Units</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 text-[10.5px]">ACTIVE EXCURSIONS</span>
                  <div className="text-lg font-bold text-rose-400">
                    {coldChainVehicles.filter(v => v.isExcursion).length} Units
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 text-[10.5px]">DOOR UNLATCH ALERTS</span>
                  <div className="text-lg font-bold text-amber-400">
                    {coldChainVehicles.filter(v => v.doorOpen).length} Units
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-slate-400 text-xs font-bold">REFRIGERATED ASSET SENSOR GRID</div>
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {coldChainVehicles.slice(0, 10).map((v) => (
                    <div
                      key={v.id}
                      className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">{v.id}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            {v.cargoType}
                          </span>
                        </div>
                        <div className="text-slate-400 text-[10.5px]">Humidity: {v.humidity}% RH</div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={`font-bold text-sm ${v.isExcursion ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {v.temp.toFixed(1)}°C
                          </div>
                          <div className="text-[9.5px] text-slate-500">
                            {v.cargoType === 'PHARMACEUTICAL' ? 'Target: 2-8°C' : 'Target: <= 4°C'}
                          </div>
                        </div>

                        {v.isExcursion ? (
                          <span className="px-2 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-400" /> EXCURSION
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> STABLE
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
