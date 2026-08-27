import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Award,
  AlertTriangle,
  Eye,
  Smartphone,
  Zap,
  CheckCircle2,
  X,
  UserCheck,
  TrendingUp,
  Activity,
  Flame,
  Camera,
  RotateCcw
} from 'lucide-react';
import { Driver, DriverSafetyEvent } from '../types/fleet';

interface DriverSafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LeaderboardDriver extends Driver {
  rank: number;
  tier: 'GOLD' | 'SILVER' | 'BRONZE' | 'AT_RISK';
}

export const DriverSafetyModal: React.FC<DriverSafetyModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'events' | 'scorecard'>('leaderboard');
  const [leaderboard, setLeaderboard] = useState<LeaderboardDriver[]>([]);
  const [fleetScore, setFleetScore] = useState<number>(94.8);
  const [totalViolations, setTotalViolations] = useState<number>(3);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('DRV-101');
  const [recentEvents, setRecentEvents] = useState<DriverSafetyEvent[]>([
    {
      id: 'EV-SAFE-01',
      driver_id: 'DRV-104',
      vehicle_id: 'V481',
      event_type: 'HARSH_BRAKING',
      severity: 'HIGH',
      g_force: -0.68,
      confidence_score: 0.98,
      timestamp: '18:14:22',
      coaching_message: 'Maintain 3-second following distance to reduce abrupt braking deceleration.'
    },
    {
      id: 'EV-SAFE-02',
      driver_id: 'DRV-107',
      vehicle_id: 'V488',
      event_type: 'PHONE_DISTRACTION',
      severity: 'CRITICAL',
      g_force: 0.05,
      confidence_score: 0.94,
      timestamp: '18:12:05',
      coaching_message: 'Eyes-on-road policy violation. In-cab mobile device usage prohibited while driving.'
    }
  ]);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const fetchLeaderboard = () => {
    fetch('/api/enterprise/safety/leaderboard')
      .then(res => res.json())
      .then(data => {
        if (data && data.leaderboard) {
          setLeaderboard(data.leaderboard);
          setFleetScore(data.fleet_safety_score);
          setTotalViolations(data.total_violations_today);
          if (data.leaderboard.length > 0 && !selectedDriverId) {
            setSelectedDriverId(data.leaderboard[0].id);
          }
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedDriver = leaderboard.find(d => d.id === selectedDriverId) || leaderboard[0] || null;

  const handleSimulateEvent = async (type: string, sev: string) => {
    setIsSimulating(true);
    const targetDriver = selectedDriver ? selectedDriver.id : 'DRV-101';
    const newEvent: DriverSafetyEvent = {
      id: `EV-SAFE-${Date.now()}`,
      driver_id: targetDriver,
      vehicle_id: selectedDriver?.assigned_vehicle_id || 'V481',
      event_type: type,
      severity: sev,
      g_force: type === 'HARSH_BRAKING' ? -0.72 : undefined,
      confidence_score: 0.96,
      timestamp: new Date().toLocaleTimeString(),
      coaching_message: type === 'HARSH_BRAKING' 
        ? 'Rapid deceleration spike detected. Increase gap distance.' 
        : 'AI Camera flagged facial gaze distraction.'
    };

    try {
      const res = await fetch('/api/enterprise/safety/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent)
      });
      const data = await res.json();
      if (data.success) {
        setRecentEvents(prev => [newEvent, ...prev].slice(0, 15));
        fetchLeaderboard();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                AI VISION & DRIVER SAFETY TELEMATICS
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  DMS & G-FORCE
                </span>
              </h2>
              <p className="text-xs text-slate-400">Real-time harsh driving anomaly detection, AI dashcam alerts & driver coaching scorecards.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSimulateEvent('HARSH_BRAKING', 'HIGH')}
              disabled={isSimulating}
              className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-mono text-xs font-bold transition-all"
              title="Inject test harsh braking telemetry event"
            >
              + Harsh Brake
            </button>
            <button
              onClick={() => handleSimulateEvent('PHONE_DISTRACTION', 'CRITICAL')}
              disabled={isSimulating}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold transition-all"
              title="Inject test AI vision distraction alert"
            >
              + Distraction
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 gap-2">
          {[
            { id: 'leaderboard', label: 'Safety Leaderboard', icon: Award },
            { id: 'events', label: 'AI Vision Events Feed', icon: Camera },
            { id: 'scorecard', label: 'Driver Scorecard & Coaching', icon: UserCheck }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3 text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-rose-400 text-rose-300'
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
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs font-mono">
          {/* TAB 1: SAFETY LEADERBOARD */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-4">
              {/* Executive Safety Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 text-[10.5px]">FLEET SAFETY INDEX</span>
                  <div className="text-base sm:text-lg font-bold text-emerald-400">{fleetScore} / 100</div>
                  <div className="text-[10px] text-slate-500">Tier: Gold Benchmark</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 text-[10.5px]">TOTAL HARSH EVENTS</span>
                  <div className="text-base sm:text-lg font-bold text-rose-400">{totalViolations} Events</div>
                  <div className="text-[10px] text-slate-500">AI Dashcam & OBD-II</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 text-[10.5px]">COMPLIANCE STATUS</span>
                  <div className="text-base sm:text-lg font-bold text-cyan-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    <span>FMCSA Certified</span>
                  </div>
                </div>
              </div>

              {/* Leaderboard Table */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-slate-400 text-xs font-bold">DRIVER SAFETY RANKINGS</div>
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {leaderboard.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => {
                        setSelectedDriverId(d.id);
                        setActiveTab('scorecard');
                      }}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 hover:border-rose-500/40 cursor-pointer flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          d.rank === 1 ? 'bg-amber-400 text-slate-950' :
                          d.rank === 2 ? 'bg-slate-300 text-slate-950' :
                          d.rank === 3 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
                        }`}>
                          #{d.rank}
                        </span>
                        <div>
                          <div className="text-white font-bold">{d.name}</div>
                          <div className="text-[10px] text-slate-500">{d.id} • Shift: {d.shift_hours}h</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          d.tier === 'GOLD' ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' :
                          d.tier === 'SILVER' ? 'bg-slate-300/20 text-slate-200 border border-slate-300/30' :
                          d.tier === 'BRONZE' ? 'bg-amber-700/20 text-amber-500 border border-amber-700/30' :
                          'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {d.tier}
                        </span>

                        <div className="text-right">
                          <div className="text-sm font-bold text-emerald-400">{d.safety_score ?? 95.0}%</div>
                          <div className="text-[9.5px] text-slate-500">Safety Rating</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI VISION EVENTS FEED */}
          {activeTab === 'events' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-slate-400 text-xs font-bold">REAL-TIME IN-CAB VISION & SENSOR ALERTS</div>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {recentEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
                            ev.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                            'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {ev.event_type}
                          </span>
                          <span className="text-white font-bold">{ev.driver_id}</span>
                          <span className="text-slate-500">({ev.vehicle_id})</span>
                        </div>
                        <span className="text-slate-500 text-[10px]">{ev.timestamp}</span>
                      </div>

                      <div className="text-slate-300 text-[11px] font-sans">
                        {ev.coaching_message}
                      </div>

                      <div className="flex items-center gap-3 text-[10px] text-slate-500">
                        <span>Confidence: {(ev.confidence_score * 100).toFixed(0)}%</span>
                        {ev.g_force && <span>Deceleration: {ev.g_force}G</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DRIVER SCORECARD & COACHING */}
          {activeTab === 'scorecard' && selectedDriver && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">{selectedDriver.name}</h3>
                  <p className="text-slate-400 text-xs">{selectedDriver.id} • Assigned Vehicle: {selectedDriver.assigned_vehicle_id || 'V481'}</p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-emerald-400">{selectedDriver.safety_score ?? 96.5} / 100</div>
                  <div className="text-xs text-slate-500 font-bold">SAFETY SCORE</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 text-[10.5px]">HARSH BRAKING</span>
                  <div className="text-lg font-bold text-white">{selectedDriver.harsh_braking_events ?? 0} Times</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 text-[10.5px]">PHONE DISTRACTION</span>
                  <div className="text-lg font-bold text-white">{selectedDriver.distraction_events ?? 0} Flags</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 text-[10.5px]">FATIGUE INDEX</span>
                  <div className="text-lg font-bold text-cyan-400">{selectedDriver.fatigue_score ?? 0.15} Score</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-slate-400 text-xs font-bold">AUTOMATED IN-CAB COACHING PLAN</div>
                <div className="space-y-1.5">
                  {(selectedDriver.coaching_tips && selectedDriver.coaching_tips.length > 0 ? selectedDriver.coaching_tips : [
                    "Maintain 3-second safe following buffer on highway corridors.",
                    "Ensure mobile devices are stowed in approved hands-free vehicle dock.",
                    "Smooth deceleration into metropolitan intersections to preserve tire life."
                  ]).map((tip, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2 text-slate-300 font-sans text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{tip}</span>
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
