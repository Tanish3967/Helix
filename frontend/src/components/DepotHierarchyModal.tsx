import React, { useState, useEffect } from 'react';
import {
  Building2,
  X,
  Zap,
  ArrowRightLeft,
  CheckCircle2,
  Truck,
  BatteryCharging,
  Package,
  Layers,
  Sparkles,
  RefreshCw,
  MapPin
} from 'lucide-react';
import { Vehicle } from '../types/fleet';

interface DepotHierarchyModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDepot: string;
  onSelectDepot: (depotId: string) => void;
  vehicles: Vehicle[];
}

interface DepotData {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  capacity_vehicles: number;
  active_units: number;
  utilization_percent: number;
  pending_orders: number;
  charging_bays_available: number;
}

export const DepotHierarchyModal: React.FC<DepotHierarchyModalProps> = ({
  isOpen,
  onClose,
  selectedDepot,
  onSelectDepot,
  vehicles
}) => {
  const [depots, setDepots] = useState<DepotData[]>([
    {
      id: 'DEPOT-01',
      name: 'SF Central Hub',
      region: 'Northern CA',
      lat: 37.7770,
      lng: -122.4180,
      capacity_vehicles: 60,
      active_units: 42,
      utilization_percent: 70.0,
      pending_orders: 84,
      charging_bays_available: 6
    },
    {
      id: 'DEPOT-02',
      name: 'Oakland Port Logistics',
      region: 'East Bay',
      lat: 37.8044,
      lng: -122.2712,
      capacity_vehicles: 40,
      active_units: 28,
      utilization_percent: 70.0,
      pending_orders: 56,
      charging_bays_available: 8
    },
    {
      id: 'DEPOT-03',
      name: 'San Jose Tech Corridor',
      region: 'South Bay',
      lat: 37.3382,
      lng: -121.8863,
      capacity_vehicles: 30,
      active_units: 18,
      utilization_percent: 60.0,
      pending_orders: 42,
      charging_bays_available: 9
    }
  ]);
  const [isRebalancing, setIsRebalancing] = useState<boolean>(false);
  const [rebalanceResult, setRebalanceResult] = useState<string | null>(null);

  const fetchDepots = () => {
    fetch('/api/enterprise/depots')
      .then(res => res.json())
      .then(data => {
        if (data && data.depots) {
          setDepots(data.depots);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (isOpen) {
      fetchDepots();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRebalance = async () => {
    setIsRebalancing(true);
    setRebalanceResult(null);
    try {
      const res = await fetch('/api/enterprise/depots/rebalance', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setRebalanceResult(`Successfully rebalanced ${data.rebalanced_units} fleet units across regional hubs!`);
        fetchDepots();
      }
    } catch (e) {
      console.error('Failed to trigger swarm rebalance:', e);
    } finally {
      setIsRebalancing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                MULTI-DEPOT REGIONAL HIERARCHY
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  SWARM LOAD BALANCER
                </span>
              </h2>
              <p className="text-xs text-slate-400">Cross-depot capacity metrics, charging infrastructure & autonomous fleet reallocations.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRebalance}
              disabled={isRebalancing}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-violet-500/20 hover:from-cyan-500/30 hover:to-violet-500/30 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRebalancing ? 'animate-spin' : ''}`} />
              <span>{isRebalancing ? 'Balancing...' : 'Trigger Swarm Rebalance'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Rebalance Success Banner */}
        {rebalanceResult && (
          <div className="px-6 py-2.5 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{rebalanceResult}</span>
          </div>
        )}

        {/* Depot Grid Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs font-mono">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {depots.map((d) => {
              const isSelected = selectedDepot === d.id;
              const scopedCount = vehicles.filter(v => (v.depot_id || 'DEPOT-01') === d.id).length;

              return (
                <div
                  key={d.id}
                  className={`p-5 rounded-2xl bg-slate-950 border transition-all flex flex-col justify-between space-y-4 ${
                    isSelected
                      ? 'border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.15)] bg-slate-950/90'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold">
                        {d.id}
                      </span>
                      <span className="text-slate-400 text-[11px] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-rose-400" /> {d.region}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white">{d.name}</h3>
                      <p className="text-[10.5px] text-slate-500 mt-0.5">GPS: {d.lat.toFixed(4)}, {d.lng.toFixed(4)}</p>
                    </div>

                    {/* Capacity Utilization Bar */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Hub Capacity:</span>
                        <span className="text-white font-bold">{d.active_units} / {d.capacity_vehicles} Units</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (d.active_units / d.capacity_vehicles) * 100)}%` }}
                        />
                      </div>
                      <div className="text-right text-[10px] text-slate-500 font-bold">
                        {d.utilization_percent}% Utilized
                      </div>
                    </div>

                    {/* Vitals Grid */}
                    <div className="grid grid-cols-2 gap-2 text-[10.5px] pt-1">
                      <div className="p-2 rounded bg-slate-900 border border-slate-800/60">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Package className="w-3 h-3 text-amber-400" /> Inbound Backlog
                        </span>
                        <div className="text-white font-bold mt-0.5">{d.pending_orders} Orders</div>
                      </div>

                      <div className="p-2 rounded bg-slate-900 border border-slate-800/60">
                        <span className="text-slate-500 flex items-center gap-1">
                          <BatteryCharging className="w-3 h-3 text-emerald-400" /> EV Chargers
                        </span>
                        <div className="text-white font-bold mt-0.5">{d.charging_bays_available} Bays Free</div>
                      </div>
                    </div>
                  </div>

                  {/* Scope Selection Button */}
                  <button
                    onClick={() => {
                      onSelectDepot(isSelected ? 'ALL' : d.id);
                    }}
                    className={`w-full py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Scoped (Click to View All)</span>
                      </>
                    ) : (
                      <>
                        <span>Filter Command to {d.id}</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Depot Summary Footer Info */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Multi-Tenant Fleet Architecture active. Depots share autonomous swarm load balancing & cross-docking routes.</span>
            </div>
            <span className="text-slate-500">Tenant: default_enterprise</span>
          </div>
        </div>
      </div>
    </div>
  );
};
