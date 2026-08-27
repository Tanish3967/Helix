import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Flame,
  Gauge,
  Layers,
  Package,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Thermometer,
  Vibrate,
  X
} from 'lucide-react';
import { VehicleMaintenanceScorecard, AutonomousWorkOrder } from '../types/fleet';

interface PredictiveMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PredictiveMaintenanceModal: React.FC<PredictiveMaintenanceModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'prognostics' | 'work_orders' | 'reliability'>('prognostics');
  const [scorecards, setScorecards] = useState<VehicleMaintenanceScorecard[]>([
    {
      vehicle_id: 'V481',
      model: 'Ford E-Transit Cargo',
      overall_health_score: 96.4,
      odometer_km: 34200.0,
      prognostics: [
        {
          component_name: 'Inverter Power Module',
          health_score_pct: 98.0,
          remaining_useful_life_hours: 2400.0,
          vibration_harmonic_hz: 28.4,
          operating_temp_c: 62.0,
          failure_probability_7d: 0.01,
          failure_mode_description: 'Nominal MOSFET thermal switching frequency',
          severity: 'NORMAL'
        },
        {
          component_name: 'Regenerative Brake Actuator',
          health_score_pct: 94.5,
          remaining_useful_life_hours: 1850.0,
          vibration_harmonic_hz: 34.2,
          operating_temp_c: 54.0,
          failure_probability_7d: 0.03,
          failure_mode_description: 'Slight friction rotor wear within standard tolerance',
          severity: 'NORMAL'
        },
        {
          component_name: 'Drive Axle Bearings',
          health_score_pct: 96.8,
          remaining_useful_life_hours: 3200.0,
          vibration_harmonic_hz: 18.1,
          operating_temp_c: 46.0,
          failure_probability_7d: 0.01,
          failure_mode_description: 'Smooth acoustic profile',
          severity: 'NORMAL'
        }
      ],
      predicted_failure_component: null,
      autonomous_work_order_id: null
    },
    {
      vehicle_id: 'V302',
      model: 'BrightDrop Zevo 600',
      overall_health_score: 72.5,
      odometer_km: 89400.0,
      prognostics: [
        {
          component_name: 'Inverter Power Module',
          health_score_pct: 64.0,
          remaining_useful_life_hours: 140.0,
          vibration_harmonic_hz: 78.6,
          operating_temp_c: 88.5,
          failure_probability_7d: 0.68,
          failure_mode_description: 'High thermal throttling & elevated harmonic jitter (78.6 Hz)',
          severity: 'WARNING'
        },
        {
          component_name: 'Cooling Loop Circulation Pump',
          health_score_pct: 76.0,
          remaining_useful_life_hours: 310.0,
          vibration_harmonic_hz: 52.0,
          operating_temp_c: 74.0,
          failure_probability_7d: 0.24,
          failure_mode_description: 'Cavitation acoustic signature detected',
          severity: 'WATCHLIST'
        },
        {
          component_name: 'Drive Axle Bearings',
          health_score_pct: 82.0,
          remaining_useful_life_hours: 820.0,
          vibration_harmonic_hz: 38.0,
          operating_temp_c: 58.0,
          failure_probability_7d: 0.12,
          failure_mode_description: 'Mild race degradation',
          severity: 'WATCHLIST'
        }
      ],
      predicted_failure_component: 'Inverter Power Module',
      autonomous_work_order_id: 'WO-9042'
    },
    {
      vehicle_id: 'V517',
      model: 'Rivian EDV 700',
      overall_health_score: 98.8,
      odometer_km: 18200.0,
      prognostics: [
        {
          component_name: 'Inverter Power Module',
          health_score_pct: 99.0,
          remaining_useful_life_hours: 4200.0,
          vibration_harmonic_hz: 21.0,
          operating_temp_c: 56.0,
          failure_probability_7d: 0.005,
          failure_mode_description: 'Pristine SiC inverter telemetry',
          severity: 'NORMAL'
        },
        {
          component_name: 'Tire Tread & Active PSI',
          health_score_pct: 97.5,
          remaining_useful_life_hours: 2900.0,
          vibration_harmonic_hz: 14.0,
          operating_temp_c: 36.0,
          failure_probability_7d: 0.01,
          failure_mode_description: 'Uniform tread depth (7.8mm) & 42 PSI cold',
          severity: 'NORMAL'
        }
      ],
      predicted_failure_component: null,
      autonomous_work_order_id: null
    },
    {
      vehicle_id: 'V109',
      model: 'Freightliner eCascadia',
      overall_health_score: 86.0,
      odometer_km: 112000.0,
      prognostics: [
        {
          component_name: 'Air Brake Compressor',
          health_score_pct: 81.0,
          remaining_useful_life_hours: 640.0,
          vibration_harmonic_hz: 44.0,
          operating_temp_c: 68.0,
          failure_probability_7d: 0.18,
          failure_mode_description: 'Periodic pressure drop under continuous duty cycle',
          severity: 'WATCHLIST'
        }
      ],
      predicted_failure_component: null,
      autonomous_work_order_id: null
    }
  ]);

  const [workOrders, setWorkOrders] = useState<AutonomousWorkOrder[]>([
    {
      id: 'WO-9042',
      vehicle_id: 'V302',
      created_at: new Date().toISOString(),
      priority: 'URGENT',
      target_component: 'Inverter Power Module',
      prescribed_repair_action: 'Replace SiC Inverter Stage & Flush Coolant Loop',
      required_oem_parts: ['OEM-INV-7740', 'COOLANT-DEX-EV-4L', 'GASKET-SEAL-KIT'],
      estimated_downtime_minutes: 45.0,
      assigned_bay_id: 'BAY-04',
      status: 'OPEN_SCHEDULED'
    },
    {
      id: 'WO-8910',
      vehicle_id: 'V109',
      created_at: new Date().toISOString(),
      priority: 'SCHEDULED',
      target_component: 'Air Brake Compressor Valve',
      prescribed_repair_action: 'Calibrate pneumatic solenoid & inspect seals',
      required_oem_parts: ['VALVE-ASSY-PNU', 'O-RING-SET-HD'],
      estimated_downtime_minutes: 30.0,
      assigned_bay_id: 'BAY-02',
      status: 'PARTS_ALLOCATED'
    }
  ]);

  const [meanHealth, setMeanHealth] = useState<number>(88.4);
  const [criticalCount, setCriticalCount] = useState<number>(1);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('V302');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);

  const fetchMaintenanceData = () => {
    fetch('/api/enterprise/maintenance/fleet-health')
      .then(res => res.json())
      .then(data => {
        if (data && data.scorecards) {
          setScorecards(data.scorecards);
          setMeanHealth(data.fleet_mean_health_score);
          setCriticalCount(data.critical_watchlist_count);
        }
      })
      .catch(console.error);

    fetch('/api/enterprise/maintenance/work-orders')
      .then(res => res.json())
      .then(data => {
        if (data && data.work_orders) {
          setWorkOrders(data.work_orders);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (isOpen) {
      fetchMaintenanceData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDispatchWorkOrder = async (vehicleId: string, component: string) => {
    setIsDispatching(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/enterprise/maintenance/work-orders/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: vehicleId,
          component_name: component,
          priority: 'URGENT'
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Autonomous Work Order Dispatched: ${data.work_order_id} assigned to ${data.assigned_bay}. Vehicle ${vehicleId} safely diverted for proactive service.`);
        fetchMaintenanceData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDispatching(false);
    }
  };

  const handleCompleteWorkOrder = async (workOrderId: string) => {
    try {
      const res = await fetch(`/api/enterprise/maintenance/work-orders/${workOrderId}/complete`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Work Order ${workOrderId} Completed & Certified: Vehicle restored to 100% health.`);
        fetchMaintenanceData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const currentScorecard = scorecards.find(s => s.vehicle_id === selectedVehicleId) || scorecards[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white font-mono flex items-center gap-2 flex-wrap">
                AI PREDICTIVE MAINTENANCE & COMPONENT PROGNOSTICS
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  PHASE 12 • RUL & AUTO-WORK ORDERS
                </span>
              </h2>
              <p className="text-xs text-slate-400">Acoustic vibration analytics, inverter thermals, component RUL forecasting & autonomous bay scheduling.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleDispatchWorkOrder('V302', 'Inverter Power Module')}
              disabled={isDispatching}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isDispatching ? 'animate-spin' : ''}`} />
              <span>{isDispatching ? 'Allocating...' : 'Trigger AI Work Order'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Message Banner */}
        {actionMessage && (
          <div className="px-4 sm:px-6 py-2.5 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-4 sm:px-6 gap-2">
          {[
            { id: 'prognostics', label: 'Component Prognostics & RUL', icon: Cpu },
            { id: 'work_orders', label: 'Autonomous Work Orders & Parts', icon: Package },
            { id: 'reliability', label: 'Fleet Reliability & MTBF', icon: ShieldCheck }
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
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs font-mono">
          {/* Top Vitals Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10.5px]">FLEET MEAN HEALTH</span>
              <div className="text-base sm:text-lg font-bold text-emerald-400">{meanHealth}%</div>
              <div className="text-[10px] text-slate-500">Benchmark: &gt;85%</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10.5px]">CRITICAL WATCHLIST</span>
              <div className="text-base sm:text-lg font-bold text-rose-400">{criticalCount} Vehicle (V302)</div>
              <div className="text-[10px] text-slate-500">High Failure Risk</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10.5px]">MEAN TIME BETWEEN FAILURES</span>
              <div className="text-base sm:text-lg font-bold text-cyan-400">14,200 hrs</div>
              <div className="text-[10px] text-slate-500">MTTD: 1.4 min</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10.5px]">OPEN WORK ORDERS</span>
              <div className="text-base sm:text-lg font-bold text-amber-400">{workOrders.length} Active</div>
              <div className="text-[10px] text-slate-500">Service Bay 02 & 04</div>
            </div>
          </div>

          {/* TAB 1: COMPONENT PROGNOSTICS & RUL */}
          {activeTab === 'prognostics' && (
            <div className="space-y-4">
              {/* Vehicle Selector Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-slate-500 text-xs shrink-0">SELECT VEHICLE:</span>
                {scorecards.map(sc => (
                  <button
                    key={sc.vehicle_id}
                    onClick={() => setSelectedVehicleId(sc.vehicle_id)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                      selectedVehicleId === sc.vehicle_id
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-800'
                    }`}
                  >
                    <span>{sc.vehicle_id}</span>
                    <span className={`text-[10px] px-1 py-0.2 rounded ${
                      sc.overall_health_score < 80 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {sc.overall_health_score}%
                    </span>
                  </button>
                ))}
              </div>

              {/* Selected Vehicle Prognostics Breakdown */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-sm">{currentScorecard.vehicle_id} • {currentScorecard.model}</div>
                    <div className="text-slate-400 text-xs">Odometer: {currentScorecard.odometer_km.toLocaleString()} km • Active Diagnostics Stream</div>
                  </div>
                  {currentScorecard.predicted_failure_component && (
                    <div className="px-3 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      Impending Failure: {currentScorecard.predicted_failure_component}
                    </div>
                  )}
                </div>

                {/* Prognostics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {currentScorecard.prognostics.map((prog, idx) => (
                    <div key={idx} className={`p-3.5 rounded-xl border space-y-2.5 transition-all ${
                      prog.severity === 'WARNING' ? 'bg-rose-500/10 border-rose-500/40 text-rose-300' :
                      prog.severity === 'WATCHLIST' ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' :
                      'bg-slate-900 border-slate-800 text-slate-300'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{prog.component_name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          prog.severity === 'WARNING' ? 'bg-rose-500/20 text-rose-300' :
                          prog.severity === 'WATCHLIST' ? 'bg-amber-500/20 text-amber-300' :
                          'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {prog.severity}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400">{prog.failure_mode_description}</div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Health Score</span>
                          <span className="font-bold text-white">{prog.health_score_pct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              prog.health_score_pct < 70 ? 'bg-rose-400' : prog.health_score_pct < 85 ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                            style={{ width: `${prog.health_score_pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1 border-t border-slate-800/80">
                        <div>RUL: <b className="text-white">{prog.remaining_useful_life_hours}h</b></div>
                        <div>Vibration: <b className="text-cyan-300">{prog.vibration_harmonic_hz} Hz</b></div>
                        <div>Temp: <b className="text-amber-300">{prog.operating_temp_c}°C</b></div>
                        <div>Fail Risk (7d): <b className="text-rose-400">{Math.round(prog.failure_probability_7d * 100)}%</b></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUTONOMOUS WORK ORDERS & PARTS */}
          {activeTab === 'work_orders' && (
            <div className="space-y-4">
              <div className="text-slate-400 text-xs font-bold flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" />
                AUTONOMOUS AI WORK ORDERS & OEM PARTS KIT ALLOCATION
              </div>

              <div className="space-y-3">
                {workOrders.map(wo => (
                  <div key={wo.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 hover:border-amber-500/40 transition-all">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-400 text-xs">{wo.id}</span>
                        <span className="text-white font-bold text-xs">• Vehicle {wo.vehicle_id}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                          wo.priority === 'URGENT' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                          'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}>
                          {wo.priority}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">Assigned: <b className="text-cyan-300">{wo.assigned_bay_id}</b></span>
                        <button
                          onClick={() => handleCompleteWorkOrder(wo.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold transition-all"
                        >
                          Mark Complete
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-slate-300">
                      <b>Target Component:</b> {wo.target_component} — {wo.prescribed_repair_action}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-[10.5px]">
                      <span className="text-slate-500">Allocated OEM Parts:</span>
                      {wo.required_oem_parts.map((p, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                          {p}
                        </span>
                      ))}
                      <span className="text-slate-500 ml-auto">Est. Downtime: <b className="text-white">{wo.estimated_downtime_minutes} min</b></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: FLEET RELIABILITY & MTBF */}
          {activeTab === 'reliability' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="text-slate-300 font-bold text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  PREDICTIVE FAILURE PREVENTION BENCHMARK
                </div>
                <div className="text-xs text-slate-400 leading-relaxed">
                  FleetOps AI uses high-frequency harmonic acoustic fast Fourier transform (FFT) analysis and gradient-boosted decision trees to intercept mechanical and electrical anomalies before they cause roadside breakdowns.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 text-[10.5px]">ROADSIDE BREAKDOWNS AVOIDED</span>
                    <div className="text-lg font-bold text-emerald-400">18 Incidents</div>
                    <div className="text-[10px] text-slate-500">This Quarter</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 text-[10.5px]">UNPLANNED DOWNTIME SAVED</span>
                    <div className="text-lg font-bold text-cyan-400">142 Hours</div>
                    <div className="text-[10px] text-slate-500">$38,400 Maintenance ROI</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 text-[10.5px]">PROGNOSTICS ACCURACY</span>
                    <div className="text-lg font-bold text-amber-400">97.8%</div>
                    <div className="text-[10px] text-slate-500">Zero False Negatives</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
