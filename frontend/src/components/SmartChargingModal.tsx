import React, { useState, useEffect } from 'react';
import {
  BatteryCharging,
  Zap,
  CheckCircle2,
  TrendingDown,
  ArrowDownUp,
  X,
  Building2,
  Sparkles,
  RefreshCw,
  Coins,
  ShieldCheck,
  Power,
  Flame,
  Activity,
  Gauge,
  Thermometer,
  SunMedium,
  Leaf
} from 'lucide-react';
import { ChargingStation, BatteryHealthReport, GridSubstationLoad } from '../types/fleet';

interface SmartChargingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SmartChargingModal: React.FC<SmartChargingModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'charging' | 'substations' | 'battery_health'>('charging');
  const [stations, setStations] = useState<ChargingStation[]>([
    {
      id: 'CS-01',
      name: 'SF Central Supercharge Hub',
      depot_id: 'DEPOT-01',
      total_bays: 16,
      occupied_bays: 6,
      max_power_kw: 450.0,
      current_draw_kw: 195.0,
      current_tariff_usd_kwh: 0.14,
      v2g_supported: true,
      status: 'OPERATIONAL'
    },
    {
      id: 'CS-02',
      name: 'Oakland Port High-Power DC',
      depot_id: 'DEPOT-02',
      total_bays: 12,
      occupied_bays: 4,
      max_power_kw: 350.0,
      current_draw_kw: 120.0,
      current_tariff_usd_kwh: 0.14,
      v2g_supported: true,
      status: 'OPERATIONAL'
    },
    {
      id: 'CS-03',
      name: 'San Jose Tech Megawatt Hub',
      depot_id: 'DEPOT-03',
      total_bays: 10,
      occupied_bays: 3,
      max_power_kw: 300.0,
      current_draw_kw: 90.0,
      current_tariff_usd_kwh: 0.14,
      v2g_supported: true,
      status: 'OPERATIONAL'
    }
  ]);

  const [batteryReports, setBatteryReports] = useState<BatteryHealthReport[]>([
    {
      vehicle_id: 'V481',
      model: 'Ford E-Transit',
      state_of_health_pct: 96.2,
      battery_temp_c: 25.4,
      cycle_count: 218,
      internal_resistance_mohm: 16.8,
      thermal_runaway_risk: 'LOW',
      remaining_useful_life_km: 214000.0,
      preconditioning_active: false,
      degradation_rate_per_10k_km: 0.38
    },
    {
      vehicle_id: 'V517',
      model: 'Rivian EDV 700',
      state_of_health_pct: 98.5,
      battery_temp_c: 24.8,
      cycle_count: 145,
      internal_resistance_mohm: 14.2,
      thermal_runaway_risk: 'LOW',
      remaining_useful_life_km: 280000.0,
      preconditioning_active: true,
      degradation_rate_per_10k_km: 0.29
    },
    {
      vehicle_id: 'V302',
      model: 'BrightDrop Zevo 600',
      state_of_health_pct: 88.4,
      battery_temp_c: 38.2,
      cycle_count: 612,
      internal_resistance_mohm: 26.4,
      thermal_runaway_risk: 'MEDIUM',
      remaining_useful_life_km: 92000.0,
      preconditioning_active: false,
      degradation_rate_per_10k_km: 0.68
    },
    {
      vehicle_id: 'V109',
      model: 'Freightliner eCascadia',
      state_of_health_pct: 91.0,
      battery_temp_c: 29.0,
      cycle_count: 490,
      internal_resistance_mohm: 22.1,
      thermal_runaway_risk: 'LOW',
      remaining_useful_life_km: 145000.0,
      preconditioning_active: false,
      degradation_rate_per_10k_km: 0.51
    }
  ]);

  const [substations, setSubstations] = useState<GridSubstationLoad[]>([
    {
      id: 'SUB-01',
      name: 'Potrero High-Voltage Substation',
      region: 'SF Central Metro',
      current_load_mw: 42.8,
      capacity_mw: 65.0,
      carbon_intensity_gco2_kwh: 112.0,
      renewable_mix_percent: 78.5,
      transformer_temp_c: 48.2,
      grid_stress_level: 'NORMAL'
    },
    {
      id: 'SUB-02',
      name: 'Oakland Marine Port Substation',
      region: 'East Bay Maritime',
      current_load_mw: 68.4,
      capacity_mw: 80.0,
      carbon_intensity_gco2_kwh: 145.0,
      renewable_mix_percent: 64.0,
      transformer_temp_c: 56.1,
      grid_stress_level: 'CONGESTED'
    },
    {
      id: 'SUB-03',
      name: 'Silicon Valley Microgrid Substation',
      region: 'South Bay Tech Corridor',
      current_load_mw: 34.1,
      capacity_mw: 75.0,
      carbon_intensity_gco2_kwh: 88.0,
      renewable_mix_percent: 89.2,
      transformer_temp_c: 42.0,
      grid_stress_level: 'OPTIMAL'
    }
  ]);

  const [currentTariff, setCurrentTariff] = useState<number>(0.14);
  const [fleetSoc, setFleetSoc] = useState<number>(84.2);
  const [avgSoH, setAvgSoH] = useState<number>(93.5);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [isV2gActive, setIsV2gActive] = useState<boolean>(false);
  const [isPreconditioning, setIsPreconditioning] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const tariffCurve = [
    { hour: '00:00', tariff: 0.11, tier: 'OFF_PEAK' },
    { hour: '04:00', tariff: 0.11, tier: 'OFF_PEAK' },
    { hour: '08:00', tariff: 0.24, tier: 'STANDARD' },
    { hour: '12:00', tariff: 0.28, tier: 'STANDARD' },
    { hour: '16:00', tariff: 0.46, tier: 'PEAK' },
    { hour: '20:00', tariff: 0.32, tier: 'STANDARD' },
    { hour: '23:00', tariff: 0.12, tier: 'OFF_PEAK' }
  ];

  const fetchChargingData = () => {
    fetch('/api/enterprise/charging/stations')
      .then(res => res.json())
      .then(data => {
        if (data && data.stations) {
          setStations(data.stations);
          setCurrentTariff(data.current_tariff_usd_kwh);
          setFleetSoc(data.fleet_avg_soc_percent);
        }
      })
      .catch(console.error);

    fetch('/api/enterprise/charging/battery-health')
      .then(res => res.json())
      .then(data => {
        if (data && data.reports) {
          setBatteryReports(data.reports);
          setAvgSoH(data.average_state_of_health_pct);
        }
      })
      .catch(console.error);

    fetch('/api/enterprise/charging/substations')
      .then(res => res.json())
      .then(data => {
        if (data && data.substations) {
          setSubstations(data.substations);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (isOpen) {
      fetchChargingData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOptimize = async () => {
    setIsOptimizing(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/enterprise/charging/optimize', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Smart Charging Optimization Scheduled: Queued ${data.optimized_sessions_count} sessions. Estimated Savings: $${data.estimated_savings_vs_peak_usd.toFixed(2)}`);
        fetchChargingData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleV2G = async () => {
    setIsV2gActive(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/enterprise/charging/v2g-discharge', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Vehicle-to-Grid (V2G) Peak Shaving Active: Injected ${data.total_kwh_injected} kWh to grid. Earned $${data.grid_credits_earned_usd.toFixed(2)} in power credits!`);
        fetchChargingData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsV2gActive(false);
    }
  };

  const handlePrecondition = async (vehicleId: string) => {
    setIsPreconditioning(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/enterprise/charging/smart-precondition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle_id: vehicleId })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Battery Pack Preconditioning Complete for ${vehicleId}: Stabilized to 25.0°C. Peak Fast-Charge Boost: +${data.fast_charge_rate_boost_kw} kW.`);
        fetchChargingData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsPreconditioning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <BatteryCharging className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white font-mono flex items-center gap-2 flex-wrap">
                AUTONOMOUS EV SMART CHARGING & GRID OPTIMIZER
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PHASE 8 • V2G & BATTERY SOH
                </span>
              </h2>
              <p className="text-xs text-slate-400">Off-peak tariff scheduling, power draw balancing, Substation microgrids & battery degradation analytics.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleOptimize}
              disabled={isOptimizing}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isOptimizing ? 'animate-spin' : ''}`} />
              <span>{isOptimizing ? 'Optimizing...' : 'Optimize Schedule'}</span>
            </button>

            <button
              onClick={handleV2G}
              disabled={isV2gActive}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{isV2gActive ? 'Discharging...' : 'Trigger V2G Shave'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Success Banner */}
        {actionMessage && (
          <div className="px-4 sm:px-6 py-2.5 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-4 sm:px-6 gap-2">
          {[
            { id: 'charging', label: 'Smart Grid & V2G Dispatch', icon: BatteryCharging },
            { id: 'substations', label: 'Substations & Clean Energy', icon: SunMedium },
            { id: 'battery_health', label: 'Battery SoH & Degradation', icon: Gauge }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3 text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-emerald-400 text-emerald-300'
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
              <span className="text-slate-500 text-[10.5px]">GRID TARIFF</span>
              <div className="text-base sm:text-lg font-bold text-emerald-400">${currentTariff.toFixed(2)} / kWh</div>
              <div className="text-[10px] text-slate-500">Off-Peak Window</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10.5px]">FLEET AVG SoC</span>
              <div className="text-base sm:text-lg font-bold text-cyan-400">{fleetSoc}%</div>
              <div className="text-[10px] text-slate-500">Nominal State of Charge</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10.5px]">BATTERY HEALTH (SoH)</span>
              <div className="text-base sm:text-lg font-bold text-white">{avgSoH}%</div>
              <div className="text-[10px] text-slate-500">Warranty Spec: &gt;70%</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10.5px]">TOTAL CHARGE BAYS</span>
              <div className="text-base sm:text-lg font-bold text-amber-400">38 Bays</div>
              <div className="text-[10px] text-slate-500">13 Active • 25 Free</div>
            </div>
          </div>

          {/* TAB 1: SMART GRID & V2G */}
          {activeTab === 'charging' && (
            <div className="space-y-6">
              {/* Dynamic Tariff Timeline */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-slate-300 font-bold text-xs flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-emerald-400" />
                    24-HOUR DYNAMIC UTILITY TARIFF CURVE (PG&E TIME-OF-USE)
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Currently Off-Peak: Active Charge Window
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {tariffCurve.map((slot, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border flex flex-col items-center justify-center transition-all ${
                        slot.tier === 'PEAK'
                          ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                          : slot.tier === 'STANDARD'
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                          : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      }`}
                    >
                      <span className="text-[10px] text-slate-400">{slot.hour}</span>
                      <span className="font-bold text-xs">${slot.tariff.toFixed(2)}</span>
                      <span className="text-[9px] opacity-80">{slot.tier.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Station Power Grid */}
              <div className="space-y-3">
                <div className="text-slate-400 text-xs font-bold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  REGIONAL CHARGING HUBS & POWER ALLOCATION
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {stations.map(st => {
                    const usagePct = Math.round((st.occupied_bays / st.total_bays) * 100);
                    return (
                      <div key={st.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 hover:border-emerald-500/40 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-white text-xs">{st.name}</div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300">
                            {st.depot_id}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[11px] text-slate-400">
                            <span>Bay Occupancy</span>
                            <span className="text-white font-bold">{st.occupied_bays} / {st.total_bays} ({usagePct}%)</span>
                          </div>
                          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                            <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full" style={{ width: `${usagePct}%` }} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                          <div className="p-2 rounded bg-slate-900 border border-slate-800">
                            <span className="text-slate-500">Active Load</span>
                            <div className="text-emerald-400 font-bold">{st.current_draw_kw} kW</div>
                          </div>
                          <div className="p-2 rounded bg-slate-900 border border-slate-800">
                            <span className="text-slate-500">Max Capacity</span>
                            <div className="text-white font-bold">{st.max_power_kw} kW</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                          <span>V2G Shave Ready: <b className="text-emerald-400">YES</b></span>
                          <span className="text-slate-500 font-bold">${st.current_tariff_usd_kwh.toFixed(2)}/kWh</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SUBSTATIONS & CLEAN ENERGY */}
          {activeTab === 'substations' && (
            <div className="space-y-4">
              <div className="text-slate-400 text-xs font-bold flex items-center gap-2">
                <SunMedium className="w-4 h-4 text-amber-400" />
                REGIONAL HIGH-VOLTAGE UTILITY SUBSTATIONS & CARBON INTENSITY
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {substations.map(sub => {
                  const loadPct = Math.round((sub.current_load_mw / sub.capacity_mw) * 100);
                  return (
                    <div key={sub.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 hover:border-amber-500/40 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-white text-xs">{sub.name}</div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          sub.grid_stress_level === 'OPTIMAL' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                          sub.grid_stress_level === 'CONGESTED' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                          'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                        }`}>
                          {sub.grid_stress_level}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-400">{sub.region}</div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>Substation Load</span>
                          <span className="text-white font-bold">{sub.current_load_mw} / {sub.capacity_mw} MW ({loadPct}%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full rounded-full ${
                              loadPct > 80 ? 'bg-rose-400' : loadPct > 60 ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                            style={{ width: `${loadPct}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                        <div className="p-2 rounded bg-slate-900 border border-slate-800">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Leaf className="w-3 h-3 text-emerald-400" />
                            Renewables
                          </span>
                          <div className="text-emerald-400 font-bold">{sub.renewable_mix_percent}%</div>
                        </div>
                        <div className="p-2 rounded bg-slate-900 border border-slate-800">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Thermometer className="w-3 h-3 text-rose-400" />
                            Transformer
                          </span>
                          <div className="text-white font-bold">{sub.transformer_temp_c}°C</div>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-900">
                        <span>Carbon Footprint:</span>
                        <span className="font-bold text-cyan-300">{sub.carbon_intensity_gco2_kwh} gCO₂/kWh</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: BATTERY HEALTH & DEGRADATION ANALYTICS */}
          {activeTab === 'battery_health' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-slate-400 text-xs font-bold flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-emerald-400" />
                  FLEET BATTERY STATE OF HEALTH (SoH) & THERMAL RUNAWAY MONITOR
                </div>
                <span className="text-[10px] text-slate-500">Chemistry: NMC 811 Li-Ion / LFP</span>
              </div>

              <div className="space-y-2">
                {batteryReports.map(rep => (
                  <div key={rep.vehicle_id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-emerald-500/40 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-mono font-bold text-white text-xs">
                        {rep.vehicle_id}
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs flex items-center gap-2">
                          {rep.model}
                          <span className={`text-[10px] px-2 py-0.2 rounded-full border ${
                            rep.thermal_runaway_risk === 'LOW' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                            'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}>
                            Thermal: {rep.thermal_runaway_risk}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {rep.cycle_count} Charge Cycles • Resistance: {rep.internal_resistance_mohm} mΩ • Pack Temp: {rep.battery_temp_c}°C
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs text-slate-400">State of Health (SoH)</div>
                        <div className="text-base font-bold text-emerald-400">{rep.state_of_health_pct}%</div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-slate-400">Remaining Life</div>
                        <div className="text-xs font-bold text-white">{Math.round(rep.remaining_useful_life_km / 1000)}k km</div>
                      </div>

                      <button
                        onClick={() => handlePrecondition(rep.vehicle_id)}
                        disabled={isPreconditioning}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold font-mono flex items-center gap-1 transition-all ${
                          rep.preconditioning_active
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                        title="Precondition battery thermal pack for optimal 25°C fast charging"
                      >
                        <Flame className={`w-3.5 h-3.5 ${rep.preconditioning_active ? 'text-cyan-400' : 'text-slate-400'}`} />
                        <span>{rep.preconditioning_active ? 'Primed (25°C)' : 'Precondition'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
