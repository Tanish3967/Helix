import React, { useState } from 'react';
import {
  SlidersHorizontal,
  X,
  Activity,
  CloudRain,
  Clock,
  Plus,
  Trash2,
  Power,
  Navigation,
  Dice5,
  Truck,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';
import { Vehicle, Order, Route } from '../types/fleet';
import {
  injectDisruption,
  addVehicle,
  removeVehicle,
  toggleVehicleStatus,
  modifyVehicleRoute
} from '../services/api';

interface SimulationConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  orders: Order[];
  initialTab?: 'disruptions' | 'fleet' | 'routes';
  onUpdateVehicles?: (vehicles: Vehicle[]) => void;
  onUpdateRoutes?: (routes: Route[]) => void;
}

const DESTINATION_ZONES = [
  { id: 'downtown', name: 'Downtown Core', lat: 37.7880, lng: -122.4075 },
  { id: 'financial', name: 'Financial District', lat: 37.7940, lng: -122.3990 },
  { id: 'mission', name: 'Mission Logistics', lat: 37.7599, lng: -122.4148 },
  { id: 'soma', name: 'SoMa Tech Zone', lat: 37.7780, lng: -122.4010 },
  { id: 'sunset', name: 'Sunset District', lat: 37.7550, lng: -122.4850 },
  { id: 'bay_bridge', name: 'Bay Bridge Corridor', lat: 37.7980, lng: -122.3780 },
  { id: 'highway_101', name: 'Highway 101 Arterial', lat: 37.7400, lng: -122.4050 },
  { id: 'port', name: 'Harbor Freight Terminal', lat: 37.7650, lng: -122.3850 },
  { id: 'depot_01', name: 'Central Metro Hub Depot', lat: 37.7790, lng: -122.4050 },
  { id: 'depot_02', name: 'Mission Distribution Depot', lat: 37.7580, lng: -122.4180 }
];

// Shared design-system inline styles (tokens live in index.css).
const CARD: React.CSSProperties = {
  background: 'var(--panel-solid)',
  border: '1px solid var(--edge)',
  borderRadius: 'var(--r-md)'
};
const FIELD: React.CSSProperties = {
  background: 'var(--panel-solid)',
  border: '1px solid var(--edge)',
  color: 'var(--ink)',
  fontFamily: 'var(--font-ui)'
};
const OPTION: React.CSSProperties = { background: '#0C121E' };
const SELECT_CLS = 'w-full rounded-lg px-3 py-1.5 text-xs mt-1 focus:outline-none';

export const SimulationConsoleModal: React.FC<SimulationConsoleModalProps> = ({
  isOpen,
  onClose,
  vehicles,
  orders,
  initialTab = 'disruptions',
  onUpdateVehicles,
  onUpdateRoutes
}) => {
  const [activeTab, setActiveTab] = useState<'disruptions' | 'fleet' | 'routes'>(initialTab);

  React.useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  // Disruption state
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('RANDOM');
  const [faultType, setFaultType] = useState<string>('Engine Overheat & Stalling');
  const [trafficCondition, setTrafficCondition] = useState<string>('Accident');
  const [selectedZone, setSelectedZone] = useState<string>('RANDOM');
  const [weatherCondition, setWeatherCondition] = useState<string>('Storm');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('RANDOM');
  const [delayMinutes, setDelayMinutes] = useState<number>(25);

  // When on, injected incidents wait for the operator to approve the AI plan
  // (auto_resolve=false) instead of dispatching the swarm automatically.
  const [holdForApproval, setHoldForApproval] = useState<boolean>(false);

  // Fleet Management state
  const [newVehicleModel, setNewVehicleModel] = useState<string>('Ford E-Transit');
  const [newVehicleType, setNewVehicleType] = useState<string>('Electric Cargo Van');
  const [newVehicleCapacity, setNewVehicleCapacity] = useState<number>(650);
  const [newVehicleBattery] = useState<number>(100);
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState<string>('');

  // Route Modification state
  const [routeVehicleId, setRouteVehicleId] = useState<string>(vehicles[0]?.id || 'V481');
  const [selectedDestZone, setSelectedDestZone] = useState<string>('downtown');

  React.useEffect(() => {
    if (vehicles && vehicles.length > 0 && (!routeVehicleId || !vehicles.find((v) => v.id === routeVehicleId))) {
      setRouteVehicleId(vehicles[0].id);
    }
  }, [vehicles]);

  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isError = Boolean(statusMessage && statusMessage.startsWith('Error'));

  // Suffix appended to injection confirmations, reflecting the resolution mode.
  const resolutionNote = holdForApproval
    ? 'Awaiting plan approval — review it in the AI Recommendation panel.'
    : 'Multi-agent pipeline dispatched automatically.';

  // Disruption Handlers
  const handleInjectBreakdown = async (targetId?: string) => {
    setLoading(true);
    try {
      const vId = targetId || selectedVehicleId;
      const res = await injectDisruption({
        type: 'BREAKDOWN',
        vehicle_id: vId,
        fault_type: faultType,
        auto_resolve: !holdForApproval
      });
      const affectedV = res.incident?.affected_vehicle_ids[0] || vId;
      setStatusMessage(`Breakdown injected on ${affectedV}. ${resolutionNote}`);
    } catch (e: any) {
      setStatusMessage(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInjectTraffic = async () => {
    setLoading(true);
    try {
      await injectDisruption({
        type: 'TRAFFIC',
        zone_id: selectedZone,
        traffic_condition: trafficCondition,
        auto_resolve: !holdForApproval
      });
      setStatusMessage(`${trafficCondition} traffic applied to ${selectedZone}. ${resolutionNote}`);
    } catch (e: any) {
      setStatusMessage(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInjectWeather = async () => {
    setLoading(true);
    try {
      await injectDisruption({
        type: 'WEATHER',
        weather_condition: weatherCondition,
        auto_resolve: !holdForApproval
      });
      setStatusMessage(`Fleetwide weather set to ${weatherCondition}. ${resolutionNote}`);
    } catch (e: any) {
      setStatusMessage(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInjectDelay = async () => {
    setLoading(true);
    try {
      await injectDisruption({
        type: 'DELAY',
        order_id: selectedOrderId,
        delay_minutes: delayMinutes,
        auto_resolve: !holdForApproval
      });
      setStatusMessage(`Delivery delay of +${delayMinutes}m applied to ${selectedOrderId}. ${resolutionNote}`);
    } catch (e: any) {
      setStatusMessage(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fleet Management Handlers (Instant Optimistic Updates)
  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await addVehicle({
        model: newVehicleModel,
        type: newVehicleType,
        max_capacity_kg: newVehicleCapacity,
        battery_fuel_percent: newVehicleBattery
      });
      if (res.vehicle && onUpdateVehicles) {
        onUpdateVehicles([...vehicles, res.vehicle]);
      }
      setStatusMessage(`Vehicle ${res.vehicle?.id || 'V-New'} onboarded to the fleet.`);
    } catch (e: any) {
      setStatusMessage(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveVehicle = async (vId: string) => {
    if (onUpdateVehicles) {
      onUpdateVehicles(vehicles.filter((v) => v.id !== vId));
    }
    setLoading(true);
    try {
      await removeVehicle(vId);
      setStatusMessage(`Vehicle ${vId} removed from the fleet.`);
    } catch (e: any) {
      setStatusMessage(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (vId: string) => {
    if (onUpdateVehicles) {
      const toggled = vehicles.map((v) => {
        if (v.id === vId) {
          const nextStatus = v.status === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE';
          return { ...v, status: nextStatus as any };
        }
        return v;
      });
      onUpdateVehicles(toggled);
    }
    setLoading(true);
    try {
      const res = await toggleVehicleStatus(vId);
      if (res.vehicle && onUpdateVehicles) {
        onUpdateVehicles(vehicles.map((v) => (v.id === vId ? res.vehicle : v)));
      }
      setStatusMessage(`Vehicle ${vId} status updated to ${res.vehicle?.status}.`);
    } catch (e: any) {
      setStatusMessage(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Manual Route Handler
  const handleModifyRoute = async () => {
    setLoading(true);
    try {
      const targetZone = DESTINATION_ZONES.find((z) => z.id === selectedDestZone) || DESTINATION_ZONES[0];
      const res = await modifyVehicleRoute(routeVehicleId, {
        destination_lat: targetZone.lat,
        destination_lng: targetZone.lng,
        destination_name: targetZone.name,
        zone_id: targetZone.id
      });
      if (res.route && onUpdateRoutes) {
        onUpdateRoutes([res.route]);
      }
      setStatusMessage(`Vehicle ${routeVehicleId} rerouted to ${targetZone.name}. Trajectory is live.`);
    } catch (e: any) {
      setStatusMessage(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredVehicles = (vehicles || []).filter((v) => {
    if (!v) return false;
    const vId = String(v.id || '').toLowerCase();
    const vModel = String(v.model || '').toLowerCase();
    const vStatus = String(v.status || '').toLowerCase();
    const q = vehicleSearchQuery.toLowerCase();
    return vId.includes(q) || vModel.includes(q) || vStatus.includes(q);
  });

  // Map a vehicle status onto a design-system token for the fleet-table pill.
  const statusColor = (status: string): string => {
    switch (status) {
      case 'AT_RISK':
        return 'var(--crit)';
      case 'REASSIGNED':
        return 'var(--violet)';
      case 'MAINTENANCE':
        return 'var(--ink-faint)';
      case 'ON_ROUTE':
        return 'var(--signal)';
      default:
        return 'var(--ion)';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(3,5,8,0.82)', backdropFilter: 'blur(8px)' }}
    >
      <div className="panel w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" style={{ boxShadow: 'var(--shadow-pop)' }}>
        {/* Header */}
        <div className="panel-head">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'color-mix(in srgb, var(--ion) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--ion) 30%, transparent)' }}
            >
              <SlidersHorizontal className="w-4 h-4" style={{ color: 'var(--ion)' }} />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
                Operations &amp; Disruption Console
              </h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                Inject disruptions, manage the fleet, and reroute vehicles in real time.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '6px' }} aria-label="Close console">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-3" style={{ borderBottom: '1px solid var(--edge)' }}>
          <div className="segmented" role="tablist">
            <button role="tab" aria-selected={activeTab === 'disruptions'} className={activeTab === 'disruptions' ? 'is-active' : ''} onClick={() => setActiveTab('disruptions')}>
              Disruptions
            </button>
            <button role="tab" aria-selected={activeTab === 'fleet'} className={activeTab === 'fleet' ? 'is-active' : ''} onClick={() => setActiveTab('fleet')}>
              Fleet · {vehicles.length}
            </button>
            <button role="tab" aria-selected={activeTab === 'routes'} className={activeTab === 'routes' ? 'is-active' : ''} onClick={() => setActiveTab('routes')}>
              Routes
            </button>
          </div>
        </div>

        {/* Status Message Banner */}
        {statusMessage && (
          <div
            className="mx-6 mt-3 flex items-center justify-between rounded-lg px-3 py-2 text-xs"
            style={{
              color: isError ? 'var(--crit)' : 'var(--ion)',
              background: isError ? 'color-mix(in srgb, var(--crit) 12%, transparent)' : 'color-mix(in srgb, var(--ion) 12%, transparent)',
              border: `1px solid ${isError ? 'color-mix(in srgb, var(--crit) 35%, transparent)' : 'color-mix(in srgb, var(--ion) 30%, transparent)'}`
            }}
          >
            <span className="font-semibold">{statusMessage}</span>
            <button onClick={() => setStatusMessage(null)} style={{ color: 'var(--ink-faint)' }} aria-label="Dismiss message" className="ml-2 shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: DISRUPTIONS & CHAOS */}
          {activeTab === 'disruptions' && (
            <div className="space-y-5">
              {/* Quick Action: Random Breakdown */}
              <div
                className="flex items-center justify-between rounded-xl p-4 gap-4"
                style={{
                  background: 'linear-gradient(90deg, color-mix(in srgb, var(--crit) 12%, transparent), var(--panel-solid))',
                  border: '1px solid color-mix(in srgb, var(--crit) 40%, transparent)'
                }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Dice5 className="w-5 h-5" style={{ color: 'var(--crit)' }} />
                    <h3 className="text-sm font-bold" style={{ color: 'var(--ink)' }}>Trigger random breakdown</h3>
                  </div>
                  <p className="text-[11px] mt-1" style={{ color: 'var(--ink-dim)' }}>
                    Disables a random active vehicle on route and watches the swarm reallocate its workload to the nearest available unit.
                  </p>
                </div>
                <button
                  disabled={loading}
                  onClick={() => handleInjectBreakdown('RANDOM')}
                  className="btn btn-sm shrink-0"
                  style={{ color: '#FFFFFF', background: 'var(--crit)', border: '1px solid color-mix(in srgb, var(--crit) 70%, transparent)', fontWeight: 700 }}
                >
                  Random breakdown
                </button>
              </div>

              {/* Resolution mode: hold for approval */}
              <div className="flex items-center justify-between rounded-xl px-4 py-3 gap-4" style={CARD}>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" style={{ color: holdForApproval ? 'var(--ion)' : 'var(--ink-faint)' }} />
                  <div>
                    <div className="text-xs font-bold" style={{ color: 'var(--ink)' }}>Hold for approval</div>
                    <div className="text-[11px] mt-0.5 max-w-md" style={{ color: 'var(--ink-faint)' }}>
                      {holdForApproval
                        ? 'New incidents pause for your sign-off. Approve the AI plan in the Recommendation panel to dispatch the swarm.'
                        : 'New incidents dispatch the agent swarm automatically as soon as they are injected.'}
                    </div>
                  </div>
                </div>
                <button
                  role="switch"
                  aria-checked={holdForApproval}
                  aria-label="Hold injected incidents for approval"
                  onClick={() => setHoldForApproval((v) => !v)}
                  className="relative shrink-0 rounded-full transition-colors"
                  style={{
                    width: 40,
                    height: 22,
                    background: holdForApproval ? 'var(--ion)' : 'rgba(148,163,184,0.22)',
                    border: `1px solid ${holdForApproval ? 'var(--ion)' : 'var(--edge)'}`
                  }}
                >
                  <span
                    className="absolute rounded-full transition-transform"
                    style={{
                      width: 16,
                      height: 16,
                      top: 2,
                      left: 2,
                      background: holdForApproval ? '#04140D' : 'var(--ink-dim)',
                      transform: holdForApproval ? 'translateX(18px)' : 'translateX(0)'
                    }}
                  />
                </button>
              </div>

              {/* Targeted Disruption Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Vehicle Breakdown */}
                <div className="p-4 space-y-3" style={CARD}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" style={{ color: 'var(--crit)' }} />
                    <span className="eyebrow" style={{ color: 'var(--crit)' }}>Targeted breakdown</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="eyebrow" style={{ fontSize: '9px' }}>Target vehicle</label>
                      <select value={selectedVehicleId} onChange={(e) => setSelectedVehicleId(e.target.value)} className={SELECT_CLS} style={{ ...FIELD, fontFamily: 'var(--font-mono)' }}>
                        <option value="RANDOM" style={OPTION}>Random active vehicle</option>
                        {vehicles.map((v) => (
                          <option key={v.id} value={v.id} style={OPTION}>
                            {v.id} — {v.model} ({v.status})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="eyebrow" style={{ fontSize: '9px' }}>Fault type</label>
                      <select value={faultType} onChange={(e) => setFaultType(e.target.value)} className={SELECT_CLS} style={FIELD}>
                        <option style={OPTION} value="Engine Overheat & Stalling">Engine Overheat &amp; Stalling</option>
                        <option style={OPTION} value="Battery Inverter Malfunction">Battery Inverter Malfunction</option>
                        <option style={OPTION} value="Brake Hydraulic Pressure Loss">Brake Hydraulic Pressure Loss</option>
                        <option style={OPTION} value="Transmission Sensor Fault">Transmission Sensor Fault</option>
                        <option style={OPTION} value="Tire Blowout on Arterial Road">Tire Blowout on Arterial Road</option>
                      </select>
                    </div>

                    <button
                      disabled={loading}
                      onClick={() => handleInjectBreakdown()}
                      className="btn btn-sm w-full mt-1"
                      style={{ color: '#FFFFFF', background: 'var(--crit)', border: '1px solid color-mix(in srgb, var(--crit) 70%, transparent)', fontWeight: 700 }}
                    >
                      Inject vehicle fault
                    </button>
                  </div>
                </div>

                {/* 2. Traffic Gridlock */}
                <div className="p-4 space-y-3" style={CARD}>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" style={{ color: 'var(--warn)' }} />
                    <span className="eyebrow" style={{ color: 'var(--warn)' }}>Traffic &amp; corridors</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="eyebrow" style={{ fontSize: '9px' }}>Target corridor</label>
                      <select value={selectedZone} onChange={(e) => setSelectedZone(e.target.value)} className={SELECT_CLS} style={FIELD}>
                        <option style={OPTION} value="RANDOM">Random corridor</option>
                        <option style={OPTION} value="highway_101">Highway 101 Arterial</option>
                        <option style={OPTION} value="bay_bridge">Bay Bridge Corridor</option>
                        <option style={OPTION} value="downtown">Downtown Core</option>
                        <option style={OPTION} value="mission">Mission Logistics</option>
                        <option style={OPTION} value="soma">SoMa Tech Zone</option>
                      </select>
                    </div>

                    <div>
                      <label className="eyebrow" style={{ fontSize: '9px' }}>Severity</label>
                      <select value={trafficCondition} onChange={(e) => setTrafficCondition(e.target.value)} className={SELECT_CLS} style={FIELD}>
                        <option style={OPTION} value="Accident">Accident (2.5× delay)</option>
                        <option style={OPTION} value="Gridlock">Major gridlock (2.0× delay)</option>
                        <option style={OPTION} value="Congested">Moderate congestion (1.5×)</option>
                        <option style={OPTION} value="Normal">Normal flow (1.0×)</option>
                      </select>
                    </div>

                    <button
                      disabled={loading}
                      onClick={handleInjectTraffic}
                      className="btn btn-sm w-full mt-1"
                      style={{ color: '#160F02', background: 'var(--warn)', border: '1px solid color-mix(in srgb, var(--warn) 70%, transparent)', fontWeight: 700 }}
                    >
                      Inject traffic condition
                    </button>
                  </div>
                </div>

                {/* 3. Severe Weather */}
                <div className="p-4 space-y-3" style={CARD}>
                  <div className="flex items-center gap-2">
                    <CloudRain className="w-4 h-4" style={{ color: 'var(--ion)' }} />
                    <span className="eyebrow" style={{ color: 'var(--ion)' }}>Meteorological hazards</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="eyebrow" style={{ fontSize: '9px' }}>Condition</label>
                      <select value={weatherCondition} onChange={(e) => setWeatherCondition(e.target.value)} className={SELECT_CLS} style={FIELD}>
                        <option style={OPTION} value="Storm">Severe storm (2.0× speed cut)</option>
                        <option style={OPTION} value="Heavy Rain">Heavy rain (1.5× buffer)</option>
                        <option style={OPTION} value="Rain">Light rain (1.2×)</option>
                        <option style={OPTION} value="Clear">Clear sky (nominal)</option>
                      </select>
                    </div>

                    <button
                      disabled={loading}
                      onClick={handleInjectWeather}
                      className="btn btn-sm w-full mt-8"
                      style={{ color: '#02181C', background: 'var(--ion)', border: '1px solid color-mix(in srgb, var(--ion) 70%, transparent)', fontWeight: 700 }}
                    >
                      Apply weather hazard
                    </button>
                  </div>
                </div>

                {/* 4. Customer Delivery Delay */}
                <div className="p-4 space-y-3" style={CARD}>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" style={{ color: 'var(--violet)' }} />
                    <span className="eyebrow" style={{ color: 'var(--violet)' }}>Customer SLA delay</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="eyebrow" style={{ fontSize: '9px' }}>Target order</label>
                      <select value={selectedOrderId} onChange={(e) => setSelectedOrderId(e.target.value)} className={SELECT_CLS} style={{ ...FIELD, fontFamily: 'var(--font-mono)' }}>
                        <option value="RANDOM" style={OPTION}>Random active order</option>
                        {orders.slice(0, 15).map((o) => (
                          <option key={o.id} value={o.id} style={OPTION}>
                            {o.id} — {o.customer_name} ({o.destination.address || 'Metro'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="eyebrow" style={{ fontSize: '9px' }}>Delay duration · +{delayMinutes} min</label>
                      <input
                        type="range"
                        min={10}
                        max={60}
                        step={5}
                        value={delayMinutes}
                        onChange={(e) => setDelayMinutes(Number(e.target.value))}
                        className="w-full mt-2 cursor-pointer"
                        style={{ accentColor: 'var(--violet)' }}
                      />
                    </div>

                    <button
                      disabled={loading}
                      onClick={handleInjectDelay}
                      className="btn btn-sm w-full mt-1"
                      style={{ color: '#FFFFFF', background: 'var(--violet)', border: '1px solid color-mix(in srgb, var(--violet) 70%, transparent)', fontWeight: 700 }}
                    >
                      Inject customer delay
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FLEET MANAGEMENT */}
          {activeTab === 'fleet' && (
            <div className="space-y-6">
              {/* Add New Vehicle Form */}
              <form onSubmit={handleAddVehicle} className="p-4 space-y-3" style={CARD}>
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4" style={{ color: 'var(--signal)' }} />
                  <span className="eyebrow" style={{ color: 'var(--signal)' }}>Onboard new vehicle</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="eyebrow" style={{ fontSize: '9px' }}>Model</label>
                    <select value={newVehicleModel} onChange={(e) => setNewVehicleModel(e.target.value)} className={SELECT_CLS} style={FIELD}>
                      <option style={OPTION} value="Ford E-Transit">Ford E-Transit</option>
                      <option style={OPTION} value="Rivian EDV-700">Rivian EDV-700</option>
                      <option style={OPTION} value="Mercedes Sprinter 2500">Mercedes Sprinter 2500</option>
                      <option style={OPTION} value="BrightDrop Zevo 600">BrightDrop Zevo 600</option>
                      <option style={OPTION} value="Ram ProMaster 3500">Ram ProMaster 3500</option>
                    </select>
                  </div>

                  <div>
                    <label className="eyebrow" style={{ fontSize: '9px' }}>Type</label>
                    <input type="text" value={newVehicleType} onChange={(e) => setNewVehicleType(e.target.value)} className={SELECT_CLS} style={FIELD} />
                  </div>

                  <div>
                    <label className="eyebrow" style={{ fontSize: '9px' }}>Max payload (kg)</label>
                    <input type="number" value={newVehicleCapacity} onChange={(e) => setNewVehicleCapacity(Number(e.target.value))} className={SELECT_CLS} style={{ ...FIELD, fontFamily: 'var(--font-mono)' }} />
                  </div>

                  <div className="flex items-end">
                    <button type="submit" disabled={loading} className="btn btn-primary btn-sm w-full">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add to fleet</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Fleet List & Controls */}
              <div className="p-4 space-y-3" style={CARD}>
                <div className="flex items-center justify-between gap-3">
                  <span className="eyebrow">
                    Fleet register · {filteredVehicles.length} / {vehicles.length}
                  </span>

                  <input
                    type="text"
                    placeholder="Search by ID, status, model…"
                    value={vehicleSearchQuery}
                    onChange={(e) => setVehicleSearchQuery(e.target.value)}
                    className="rounded-lg px-3 py-1 text-xs focus:outline-none w-64"
                    style={{ ...FIELD }}
                  />
                </div>

                <div className="max-h-72 overflow-y-auto rounded-lg" style={{ border: '1px solid var(--edge)' }}>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-[1]" style={{ background: 'var(--panel-solid)' }}>
                      <tr style={{ borderBottom: '1px solid var(--edge)' }}>
                        {['Vehicle', 'Model', 'Battery', 'Load', 'Status', 'Actions'].map((h, i) => (
                          <th key={h} className={`py-2 px-3 eyebrow ${i === 5 ? 'text-right pr-4' : ''}`} style={{ fontSize: '9px' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVehicles.map((v) => {
                        const sc = statusColor(v.status);
                        return (
                          <tr key={v.id} style={{ borderBottom: '1px solid var(--edge)' }}>
                            <td className="py-2 px-3 readout font-bold" style={{ color: 'var(--ink)' }}>{v.id}</td>
                            <td className="py-2 px-3 font-semibold" style={{ color: 'var(--ink-dim)' }}>{v.model}</td>
                            <td className="py-2 px-3 readout" style={{ color: 'var(--signal)' }}>{v.battery_fuel_percent}%</td>
                            <td className="py-2 px-3 readout" style={{ color: 'var(--ink-faint)' }}>{v.current_load_kg} / {v.max_capacity_kg}kg</td>
                            <td className="py-2 px-3">
                              <span
                                className="text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                                style={{ color: sc, background: `color-mix(in srgb, ${sc} 15%, transparent)`, border: `1px solid color-mix(in srgb, ${sc} 32%, transparent)`, fontFamily: 'var(--font-mono)' }}
                              >
                                {v.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right pr-4">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  onClick={() => handleToggleStatus(v.id)}
                                  title={v.status === 'MAINTENANCE' ? 'Return to service' : 'Send to maintenance'}
                                  className="p-1 rounded transition-colors"
                                  style={{
                                    color: v.status === 'MAINTENANCE' ? 'var(--signal)' : 'var(--warn)',
                                    background: v.status === 'MAINTENANCE' ? 'color-mix(in srgb, var(--signal) 14%, transparent)' : 'color-mix(in srgb, var(--warn) 14%, transparent)',
                                    border: `1px solid ${v.status === 'MAINTENANCE' ? 'color-mix(in srgb, var(--signal) 40%, transparent)' : 'color-mix(in srgb, var(--warn) 40%, transparent)'}`
                                  }}
                                >
                                  <Power className="w-3.5 h-3.5 inline-block" />
                                </button>

                                <button
                                  onClick={() => handleRemoveVehicle(v.id)}
                                  title="Remove from fleet"
                                  className="p-1 rounded transition-colors"
                                  style={{ color: 'var(--crit)', background: 'color-mix(in srgb, var(--crit) 14%, transparent)', border: '1px solid color-mix(in srgb, var(--crit) 40%, transparent)' }}
                                >
                                  <Trash2 className="w-3.5 h-3.5 inline-block" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MANUAL ROUTE EDITOR */}
          {activeTab === 'routes' && (
            <div className="p-5 space-y-4" style={CARD}>
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4" style={{ color: 'var(--violet)' }} />
                <span className="eyebrow" style={{ color: 'var(--violet)' }}>Manually reroute a vehicle</span>
              </div>
              <p className="text-[11px]" style={{ color: 'var(--ink-dim)' }}>
                Pick a vehicle and a new destination. The engine synthesizes smooth waypoints and updates the vehicle's trajectory on the live map immediately.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="eyebrow" style={{ fontSize: '9px' }}>Vehicle</label>
                  <select value={routeVehicleId} onChange={(e) => setRouteVehicleId(e.target.value)} className="w-full rounded-lg px-3 py-2 text-xs mt-1 focus:outline-none" style={{ ...FIELD, fontFamily: 'var(--font-mono)' }}>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id} style={OPTION}>
                        {v.id} — {v.model} ({v.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="eyebrow" style={{ fontSize: '9px' }}>Destination zone / hub</label>
                  <select value={selectedDestZone} onChange={(e) => setSelectedDestZone(e.target.value)} className="w-full rounded-lg px-3 py-2 text-xs mt-1 focus:outline-none" style={FIELD}>
                    {DESTINATION_ZONES.map((z) => (
                      <option key={z.id} value={z.id} style={OPTION}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                disabled={loading}
                onClick={handleModifyRoute}
                className="btn btn-sm w-full mt-1"
                style={{ color: '#FFFFFF', background: 'var(--violet)', border: '1px solid color-mix(in srgb, var(--violet) 70%, transparent)', fontWeight: 700 }}
              >
                <Navigation className="w-4 h-4" />
                <span>Apply reroute to live map</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
