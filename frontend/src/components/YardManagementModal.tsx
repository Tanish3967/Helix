import React, { useState, useEffect } from 'react';
import {
  Warehouse,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Camera,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  X,
  RefreshCw,
  Boxes,
  Lock
} from 'lucide-react';
import { DockDoor, YardTrailer, GateActivity } from '../types/fleet';

interface YardManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const YardManagementModal: React.FC<YardManagementModalProps> = ({
  isOpen,
  onClose
}) => {
  const [dockDoors, setDockDoors] = useState<DockDoor[]>([
    { id: 'BAY-01', depot_id: 'DEPOT-01', bay_number: 1, status: 'LOADING', assigned_vehicle_id: 'V481', assigned_order_id: 'ORD-1001', cargo_type: 'GENERAL', dwell_time_minutes: 32, turnaround_target_minutes: 45 },
    { id: 'BAY-02', depot_id: 'DEPOT-01', bay_number: 2, status: 'UNLOADING', assigned_vehicle_id: 'V485', assigned_order_id: 'ORD-1005', cargo_type: 'COLD_CHAIN', dwell_time_minutes: 18, turnaround_target_minutes: 45 },
    { id: 'BAY-03', depot_id: 'DEPOT-01', bay_number: 3, status: 'OCCUPIED', assigned_vehicle_id: 'V490', assigned_order_id: 'ORD-1008', cargo_type: 'GENERAL', dwell_time_minutes: 41, turnaround_target_minutes: 45 },
    { id: 'BAY-04', depot_id: 'DEPOT-01', bay_number: 4, status: 'VACANT', assigned_vehicle_id: null, cargo_type: 'GENERAL', dwell_time_minutes: 0, turnaround_target_minutes: 45 },
    { id: 'BAY-05', depot_id: 'DEPOT-01', bay_number: 5, status: 'VACANT', assigned_vehicle_id: null, cargo_type: 'HAZMAT', dwell_time_minutes: 0, turnaround_target_minutes: 45 },
    { id: 'BAY-06', depot_id: 'DEPOT-01', bay_number: 6, status: 'MAINTENANCE', assigned_vehicle_id: null, cargo_type: 'GENERAL', dwell_time_minutes: 0, turnaround_target_minutes: 45 },
    { id: 'BAY-07', depot_id: 'DEPOT-01', bay_number: 7, status: 'LOADING', assigned_vehicle_id: 'V512', assigned_order_id: 'ORD-1014', cargo_type: 'COLD_CHAIN', dwell_time_minutes: 12, turnaround_target_minutes: 45 },
    { id: 'BAY-08', depot_id: 'DEPOT-01', bay_number: 8, status: 'VACANT', assigned_vehicle_id: null, cargo_type: 'GENERAL', dwell_time_minutes: 0, turnaround_target_minutes: 45 }
  ]);
  const [trailers, setTrailers] = useState<YardTrailer[]>([
    { id: 'TR-501', spot_id: 'SPOT-A04', status: 'STAGED', cargo_type: 'GENERAL', seal_intact: true },
    { id: 'TR-502', spot_id: 'SPOT-A08', status: 'STAGED', cargo_type: 'COLD_CHAIN', seal_intact: true, temp_c: 3.8 },
    { id: 'TR-503', spot_id: 'SPOT-B02', status: 'GATE_IN_TRANSIT', cargo_type: 'HAZMAT', seal_intact: true },
    { id: 'TR-504', spot_id: 'SPOT-B11', status: 'STAGED', cargo_type: 'GENERAL', seal_intact: true }
  ]);
  const [gateEvents, setGateEvents] = useState<GateActivity[]>([
    { id: 'GATE-881', event_type: 'GATE_IN', license_plate: '7XYZ901', vehicle_id: 'V481', driver_name: 'Marcus Vance', assigned_bay: 'BAY-01', timestamp: '14:22:10', status: 'CLEARED' },
    { id: 'GATE-882', event_type: 'GATE_OUT', license_plate: '4ABC231', vehicle_id: 'V478', driver_name: 'Sarah Jenkins', timestamp: '14:15:40', status: 'CLEARED' },
    { id: 'GATE-883', event_type: 'GATE_IN', license_plate: '8KLP456', vehicle_id: 'V512', driver_name: 'David Ross', assigned_bay: 'BAY-07', timestamp: '14:02:18', status: 'CLEARED' }
  ]);
  const [occupancyRate, setOccupancyRate] = useState<number>(62.5);
  const [avgDwell, setAvgDwell] = useState<number>(25.8);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const fetchYardStatus = () => {
    fetch('/api/enterprise/yard/status')
      .then(res => res.json())
      .then(data => {
        if (data && data.dock_doors) {
          setDockDoors(data.dock_doors);
          setTrailers(data.staged_trailers || []);
          setGateEvents(data.recent_gate_events || []);
          setOccupancyRate(data.occupancy_rate_percent || 62.5);
          setAvgDwell(data.avg_dwell_minutes || 25.8);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (isOpen) {
      fetchYardStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAutoAssign = async () => {
    setIsProcessing(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/enterprise/yard/dock-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle_id: 'V495', cargo_type: 'GENERAL' })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Autonomous YMS: Inbound unit ${data.vehicle_id} dispatched to ${data.assigned_bay} (Target Turnaround: 45 min).`);
        fetchYardStatus();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGateIn = async () => {
    setIsProcessing(true);
    setActionMessage(null);
    try {
      const newEvent: GateActivity = {
        id: `GATE-${Math.floor(100 + Math.random() * 900)}`,
        event_type: 'GATE_IN',
        license_plate: '9EXP882',
        vehicle_id: 'V495',
        driver_name: 'Elena Rostova',
        assigned_bay: 'BAY-04',
        timestamp: new Date().toLocaleTimeString(),
        status: 'CLEARED'
      };
      const res = await fetch('/api/enterprise/yard/gate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent)
      });
      const data = await res.json();
      if (data.success) {
        setGateEvents(prev => [newEvent, ...prev]);
        setActionMessage(`ALPR Gate Check-In: Vehicle V495 (Plate: 9EXP882) cleared gate -> Dispatched to BAY-04`);
        fetchYardStatus();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                AUTONOMOUS YARD MANAGEMENT SYSTEM (YMS)
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  DOCK & GATE ALLOCATION
                </span>
              </h2>
              <p className="text-xs text-slate-400">Real-time dock bay allocation, ALPR optical gate check-ins, and warehouse turnaround dwell telemetry.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoAssign}
              disabled={isProcessing}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Assign Bay</span>
            </button>

            <button
              onClick={handleGateIn}
              disabled={isProcessing}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Simulate ALPR Gate-In</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Message Banner */}
        {actionMessage && (
          <div className="px-6 py-2.5 bg-amber-500/15 border-b border-amber-500/30 text-amber-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs font-mono">
          {/* Top Vitals Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10.5px]">DOCK UTILIZATION</span>
              <div className="text-base sm:text-lg font-bold text-amber-400">{occupancyRate}%</div>
              <div className="text-[10px] text-slate-500">8 Bays • {dockDoors.filter(d => d.status !== 'VACANT').length} In-Use</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10.5px]">AVG DWELL TIME</span>
              <div className="text-base sm:text-lg font-bold text-emerald-400">{avgDwell} min</div>
              <div className="text-[10px] text-slate-500">SLA Target: &lt;45 min</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10.5px]">YARD TRAILERS</span>
              <div className="text-base sm:text-lg font-bold text-sky-400">{trailers.length} Units</div>
              <div className="text-[10px] text-slate-500">100% Seal Verified</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10.5px]">ALPR GATE RATE</span>
              <div className="text-base sm:text-lg font-bold text-purple-400">18 / hr</div>
              <div className="text-[10px] text-slate-500">Optical Cams Active</div>
            </div>
          </div>

          {/* Dock Door Bay Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-bold">WAREHOUSE DOCK DOORS (DEPOT-01 SF CENTRAL)</span>
              <span className="text-slate-500 text-[10.5px]">Live Turnaround Timers</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {dockDoors.map((bay) => {
                const isOccupied = bay.status !== 'VACANT';
                const isMaint = bay.status === 'MAINTENANCE';
                const progressPct = Math.min(100, Math.round((bay.dwell_time_minutes / bay.turnaround_target_minutes) * 100));

                return (
                  <div
                    key={bay.id}
                    className={`p-3.5 rounded-xl bg-slate-950 border transition-all space-y-2.5 ${
                      isMaint
                        ? 'border-rose-500/40 opacity-75'
                        : isOccupied
                        ? 'border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.08)]'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{bay.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
                        bay.status === 'LOADING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        bay.status === 'UNLOADING' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                        bay.status === 'OCCUPIED' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                        bay.status === 'MAINTENANCE' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                        'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {bay.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-slate-400 text-[11px] flex items-center justify-between">
                        <span>Assigned Unit:</span>
                        <span className="text-white font-bold">{bay.assigned_vehicle_id || '—'}</span>
                      </div>
                      <div className="text-slate-400 text-[11px] flex items-center justify-between">
                        <span>Cargo Type:</span>
                        <span className="text-cyan-300 font-bold">{bay.cargo_type}</span>
                      </div>
                    </div>

                    {/* Dwell Progress Bar */}
                    {isOccupied && !isMaint && (
                      <div className="space-y-1 pt-1 border-t border-slate-800/80">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-400" /> Dwell: {bay.dwell_time_minutes}m
                          </span>
                          <span className="text-slate-400">{progressPct}% of SLA</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              progressPct > 90 ? 'bg-rose-500' : progressPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Staged Trailers & Gate ALPR Live Feed */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Staged Yard Trailers */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-bold flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-sky-400" /> STAGED YARD TRAILERS
                </span>
                <span className="text-[10px] text-slate-500">{trailers.length} Staged</span>
              </div>
              <div className="space-y-2">
                {trailers.map((tr) => (
                  <div key={tr.id} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white text-xs">{tr.id} <span className="text-slate-500 font-normal">({tr.spot_id})</span></div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Type: {tr.cargo_type} {tr.temp_c ? `• ${tr.temp_c}°C` : ''}</div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <Lock className="w-3 h-3" />
                      <span>Seal Verified</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ALPR Gate Feed */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-bold flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-purple-400" /> ALPR OPTICAL GATE FEED
                </span>
                <span className="text-[10px] text-slate-500">Live Camera 01</span>
              </div>
              <div className="space-y-2">
                {gateEvents.slice(0, 3).map((ev) => (
                  <div key={ev.id} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded ${ev.event_type === 'GATE_IN' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {ev.event_type === 'GATE_IN' ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">{ev.license_plate} <span className="text-slate-500 font-normal">({ev.vehicle_id})</span></div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{ev.driver_name} • {ev.assigned_bay || 'Cleared Out'}</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500">{ev.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
