import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SimulationState, Vehicle, Route, Order, Incident, LiveEvent, MissionScore, AgentStep } from './types/fleet';
import { fetchSimulationState } from './services/api';
import { connectFleetWebSocket, disconnectFleetWebSocket, fleetWS, ConnectionStatus, WSMessageHandler } from './services/websocket';
import { TopBar } from './components/TopBar';
import { LeftSidebar } from './components/LeftSidebar';
import { FleetMap } from './components/FleetMap';
import { LiveEventsPanel } from './components/LiveEventsPanel';
import { DeliveriesTable } from './components/DeliveriesTable';
import { ActiveIncidentCard } from './components/ActiveIncidentCard';
import { AgentActivityFeed } from './components/AgentActivityFeed';
import { MissionProgress } from './components/MissionProgress';
import { DynamicLoadingScreen } from './components/DynamicLoadingScreen';
import { SimulationConsoleModal } from './components/SimulationConsoleModal';
import { AgentTraceModal } from './components/AgentTraceModal';
import { ScenarioPlayerModal } from './components/ScenarioPlayerModal';
import { DeliveriesModal } from './components/DeliveriesModal';
import { IncidentsModal } from './components/IncidentsModal';
import { AnalyticsModal } from './components/AnalyticsModal';
import { SettingsModal } from './components/SettingsModal';
import { DriverCompanionModal } from './components/DriverCompanionModal';
import { EnterprisePolicyModal } from './components/EnterprisePolicyModal';
import { FlightRecorderModal } from './components/FlightRecorderModal';
import { DepotHierarchyModal } from './components/DepotHierarchyModal';
import { DriverSafetyModal } from './components/DriverSafetyModal';
import { SmartChargingModal } from './components/SmartChargingModal';
import { WeatherRadarModal } from './components/WeatherRadarModal';
import { YardManagementModal } from './components/YardManagementModal';
import { HOSComplianceModal } from './components/HOSComplianceModal';
import { PredictiveMaintenanceModal } from './components/PredictiveMaintenanceModal';
import { SecureConvoyModal } from './components/SecureConvoyModal';
import { CryoColdChainModal } from './components/CryoColdChainModal';
import { CommandBar } from './components/CommandBar';
import { CustomerTrackingModal } from './components/CustomerTrackingModal';
import { AuditLogsModal } from './components/AuditLogsModal';
import { FleetImporterModal } from './components/FleetImporterModal';
import { CITY_PRESETS, CityPreset } from './services/cityPresets';
import { generateInitialFallbackState } from './services/fallbackData';

const INITIAL_FALLBACK_STATE: SimulationState = generateInitialFallbackState();

export const App: React.FC = () => {
  const [state, setState] = useState<SimulationState>(INITIAL_FALLBACK_STATE);
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_FALLBACK_STATE.vehicles);
  const [routes, setRoutes] = useState<Route[]>(INITIAL_FALLBACK_STATE.routes);
  const [orders, setOrders] = useState<Order[]>(INITIAL_FALLBACK_STATE.orders);
  const [activeIncident, setActiveIncident] = useState<Incident | null>(null);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>(INITIAL_FALLBACK_STATE.agent_steps);
  const [events, setEvents] = useState<LiveEvent[]>(INITIAL_FALLBACK_STATE.events);
  const [metrics, setMetrics] = useState<MissionScore>(INITIAL_FALLBACK_STATE.metrics);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('operations');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('open');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(false);
  const [consoleInitialTab, setConsoleInitialTab] = useState<'disruptions' | 'fleet' | 'routes'>('disruptions');
  const [isTraceOpen, setIsTraceOpen] = useState<boolean>(false);
  const [isScenariosOpen, setIsScenariosOpen] = useState<boolean>(false);
  const [isDeliveriesOpen, setIsDeliveriesOpen] = useState<boolean>(false);
  const [isIncidentsOpen, setIsIncidentsOpen] = useState<boolean>(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isDriverOpen, setIsDriverOpen] = useState<boolean>(false);
  const [isPoliciesOpen, setIsPoliciesOpen] = useState<boolean>(false);
  const [isFlightRecorderOpen, setIsFlightRecorderOpen] = useState<boolean>(false);
  const [isDepotHierarchyOpen, setIsDepotHierarchyOpen] = useState<boolean>(false);
  const [isSafetyOpen, setIsSafetyOpen] = useState<boolean>(false);
  const [isChargingOpen, setIsChargingOpen] = useState<boolean>(false);
  const [isWeatherOpen, setIsWeatherOpen] = useState<boolean>(false);
  const [isYardOpen, setIsYardOpen] = useState<boolean>(false);
  const [isHOSOpen, setIsHOSOpen] = useState<boolean>(false);
  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState<boolean>(false);
  const [isConvoyOpen, setIsConvoyOpen] = useState<boolean>(false);
  const [isCryoOpen, setIsCryoOpen] = useState<boolean>(false);
  const [isAuditLogsOpen, setIsAuditLogsOpen] = useState<boolean>(false);
  const [isImporterOpen, setIsImporterOpen] = useState<boolean>(false);
  const [currentCityId, setCurrentCityId] = useState<string>('sf');
  const [currentCityCenter, setCurrentCityCenter] = useState<{ lat: number; lng: number; zoom?: number }>({
    lat: 37.7749,
    lng: -122.4194,
    zoom: 12.5
  });
  const [selectedDepot, setSelectedDepot] = useState<string>('ALL');
  const [isCommandOpen, setIsCommandOpen] = useState<boolean>(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState<boolean>(false);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);

  // Apply Global City Preset
  const handleApplyCityPreset = async (preset: CityPreset) => {
    setCurrentCityId(preset.id);
    setCurrentCityCenter(preset.center);
    setVehicles(preset.vehicles);
    try {
      await fetch('/api/enterprise/fleet/import-city', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city_id: preset.id,
          city_name: preset.name,
          center: preset.center,
          depots: preset.depots,
          vehicles: preset.vehicles
        })
      });
    } catch (err) {
      console.warn('Backend city import sync (local fallback active):', err);
    }
  };

  // Ingest Custom Vehicles from CSV / GeoJSON
  const handleImportCustomFleet = async (customVehicles: Vehicle[], mode: 'replace' | 'append') => {
    if (customVehicles.length === 0) return;
    if (mode === 'replace') {
      setVehicles(customVehicles);
      // Calculate centroid
      const avgLat = customVehicles.reduce((sum, v) => sum + v.location.lat, 0) / customVehicles.length;
      const avgLng = customVehicles.reduce((sum, v) => sum + v.location.lng, 0) / customVehicles.length;
      setCurrentCityCenter({ lat: avgLat, lng: avgLng, zoom: 12.5 });
    } else {
      setVehicles((prev) => [...prev, ...customVehicles]);
    }

    try {
      await fetch('/api/enterprise/fleet/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          records: customVehicles.map((v) => ({
            id: v.id,
            model: v.model,
            type: v.type,
            status: v.status,
            battery: v.battery_fuel_percent,
            lat: v.location.lat,
            lng: v.location.lng,
            speed_kmh: v.speed_kmh
          }))
        })
      });
    } catch (err) {
      console.warn('Backend custom fleet import sync (local fallback active):', err);
    }
  };

  // Window-level file drag listener for instant Data Studio popup
  useEffect(() => {
    const handleWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        setIsImporterOpen(true);
      }
    };
    const handleDragOver = (e: DragEvent) => e.preventDefault();
    window.addEventListener('drop', handleWindowDrop);
    window.addEventListener('dragover', handleDragOver);
    return () => {
      window.removeEventListener('drop', handleWindowDrop);
      window.removeEventListener('dragover', handleDragOver);
    };
  }, []);

  // Initial HTTP State Hydration
  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const data = await fetchSimulationState();
        if (isMounted && data) {
          setState(data);
          if (data.vehicles) setVehicles(data.vehicles);
          if (data.routes) setRoutes(data.routes);
          if (data.orders) setOrders(data.orders);
          if (data.active_incident !== undefined) setActiveIncident(data.active_incident);
          if (data.agent_steps) setAgentSteps(data.agent_steps);
          if (data.events) setEvents(data.events);
          if (data.metrics) setMetrics(data.metrics);
        }
      } catch (err) {
        console.warn('Initial simulation state fetch failed (will connect via WS):', err);
      } finally {
        if (isMounted) {
          setTimeout(() => setIsLoading(false), 500);
        }
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  // Real-Time WebSocket Streaming
  useEffect(() => {
    const handleMessage: WSMessageHandler = (msg) => {
      switch (msg.type) {
        case 'INITIAL_STATE':
          if (msg.state) {
            setState(msg.state);
            setVehicles(msg.state.vehicles || []);
            setRoutes(msg.state.routes || []);
            setOrders(msg.state.orders || []);
            setActiveIncident(msg.state.active_incident || null);
            setAgentSteps(msg.state.agent_steps || []);
            setEvents(msg.state.events || []);
            if (msg.state.metrics) setMetrics(msg.state.metrics);
          }
          break;

        case 'TELEMETRY_TICK':
          if (msg.vehicles) {
            setVehicles(msg.vehicles);
          }
          if (msg.metrics) {
            setMetrics(msg.metrics);
          }
          if (msg.events && msg.events.length > 0) {
            setEvents((prev) => [...msg.events, ...prev].slice(0, 40));
          }
          break;

        case 'INCIDENT_DETECTED':
          if (msg.incident) {
            setActiveIncident(msg.incident);
          }
          break;

        case 'INCIDENT_RESOLVED':
          if (msg.incident) {
            setActiveIncident(null);
          }
          break;

        case 'AGENT_STEP':
          if (msg.step) {
            const newStep = msg.step as AgentStep;
            setAgentSteps((prev) => [...prev, newStep]);
          }
          break;

        case 'FLEET_UPDATED':
          if (msg.vehicles) setVehicles(msg.vehicles);
          if (msg.routes) setRoutes(msg.routes);
          if (msg.orders) setOrders(msg.orders);
          if (msg.active_incident !== undefined) setActiveIncident(msg.active_incident);
          if (msg.events) setEvents(msg.events);
          if (msg.metrics) setMetrics(msg.metrics);
          break;

        case 'ROUTE_UPDATED':
          if (msg.route) {
            setRoutes((prev) => {
              const filtered = prev.filter((r) => r.id !== msg.route.id && r.vehicle_id !== msg.route.vehicle_id);
              return [...filtered, msg.route];
            });
          }
          if (msg.routes) setRoutes(msg.routes);
          if (msg.vehicles) setVehicles(msg.vehicles);
          break;

        case 'SIMULATION_CONFIG':
          setState((prev) => ({
            ...prev,
            is_paused: msg.is_paused !== undefined ? msg.is_paused : prev.is_paused,
            speed_multiplier: msg.speed_multiplier !== undefined ? msg.speed_multiplier : prev.speed_multiplier
          }));
          break;

        default:
          break;
      }
    };

    const unsub = connectFleetWebSocket(handleMessage);
    const unsubStatus = fleetWS.onStatus((s) => setConnectionStatus(s));

    return () => {
      unsub();
      unsubStatus();
      disconnectFleetWebSocket();
    };
  }, []);

  const handleOpenConsole = useCallback((tab?: 'disruptions' | 'fleet' | 'routes') => {
    setConsoleInitialTab(tab || 'disruptions');
    setIsConsoleOpen(true);
  }, []);

  const displayedVehicles = useMemo(() => {
    if (selectedDepot === 'ALL') return vehicles;
    return vehicles.filter(v => (v.depot_id || 'DEPOT-01') === selectedDepot);
  }, [vehicles, selectedDepot]);

  const displayedOrders = useMemo(() => {
    if (selectedDepot === 'ALL') return orders;
    return orders.filter(o => {
      const assignedV = vehicles.find(v => v.id === o.assigned_vehicle_id);
      return assignedV ? (assignedV.depot_id || 'DEPOT-01') === selectedDepot : true;
    });
  }, [orders, vehicles, selectedDepot]);

  const aggregatedState: SimulationState = useMemo(() => {
    const base = state || INITIAL_FALLBACK_STATE;
    return {
      ...base,
      vehicles: displayedVehicles,
      routes,
      orders: displayedOrders,
      active_incident: activeIncident,
      agent_steps: agentSteps,
      events,
      metrics,
      weather: base.weather || INITIAL_FALLBACK_STATE.weather,
      traffic_zones: base.traffic_zones || {}
    };
  }, [state, displayedVehicles, routes, displayedOrders, activeIncident, agentSteps, events, metrics]);

  if (isLoading) {
    return <DynamicLoadingScreen />;
  }

  return (
    <div className="w-screen h-screen flex flex-col bg-[#080C14] text-slate-100 overflow-hidden select-none font-sans">
      {/* Top Navigation Bar */}
      <TopBar
        state={aggregatedState}
        activeTab={activeTab}
        connectionStatus={connectionStatus}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'reports') setIsAuditLogsOpen(true);
          else if (tab === 'simulation') setIsScenariosOpen(true);
        }}
        onOpenCommand={() => setIsCommandOpen(true)}
        onOpenIncidents={() => setIsIncidentsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        selectedDepot={selectedDepot}
        onSelectDepot={setSelectedDepot}
        onOpenDriverModal={() => setIsDriverOpen(true)}
        onOpenPolicies={() => setIsPoliciesOpen(true)}
        onOpenFlightRecorder={() => setIsFlightRecorderOpen(true)}
        onOpenDepots={() => setIsDepotHierarchyOpen(true)}
        onOpenSafety={() => setIsSafetyOpen(true)}
        onOpenCharging={() => setIsChargingOpen(true)}
        onOpenWeather={() => setIsWeatherOpen(true)}
        onOpenYard={() => setIsYardOpen(true)}
        onOpenHOS={() => setIsHOSOpen(true)}
        onOpenMaintenance={() => setIsMaintenanceOpen(true)}
        onOpenConvoy={() => setIsConvoyOpen(true)}
        onOpenCryo={() => setIsCryoOpen(true)}
        onOpenConsole={handleOpenConsole}
        onOpenAuditLogs={() => setIsAuditLogsOpen(true)}
        onOpenImporter={() => setIsImporterOpen(true)}
      />

      {/* Main 3-Column Command Center Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar */}
        <LeftSidebar
          state={aggregatedState}
          onOpenConsole={handleOpenConsole}
          onOpenDeliveries={() => setIsDeliveriesOpen(true)}
          onOpenIncidents={() => setIsIncidentsOpen(true)}
          onOpenAgents={() => setIsTraceOpen(true)}
          onOpenAnalytics={() => setIsAnalyticsOpen(true)}
        />

        {/* Center Panel: Advanced Geospatial Map & Operational Feeds */}
        <main className="flex-1 flex flex-col p-2 space-y-2 overflow-hidden">
          {/* Top Half: Live Geospatial Map */}
          <div className="flex-1 min-h-[380px]">
            <FleetMap
              vehicles={displayedVehicles}
              routes={routes}
              orders={displayedOrders}
              activeIncident={activeIncident}
              weather={aggregatedState.weather}
              trafficZones={aggregatedState.traffic_zones}
              speedMultiplier={aggregatedState.speed_multiplier}
              isPaused={aggregatedState.is_paused}
              selectedVehicleId={selectedVehicleId}
              onSelectVehicle={setSelectedVehicleId}
              onOpenConsole={handleOpenConsole}
              cityCenter={currentCityCenter}
            />
          </div>

          {/* Bottom Half: Split View (Live Events Stream + Active Deliveries Table) */}
          <div className="h-[270px] grid grid-cols-12 gap-2">
            <div className="col-span-4 h-full">
              <LiveEventsPanel events={events} onSelectVehicle={setSelectedVehicleId} />
            </div>
            <div className="col-span-8 h-full">
              <DeliveriesTable 
                orders={displayedOrders} 
                onSelectVehicle={setSelectedVehicleId}
                onTrackOrder={(order) => {
                  setTrackingOrder(order);
                  setIsTrackingOpen(true);
                }}
              />
            </div>
          </div>
        </main>

        {/* Right Panel: Incident Response & Multi-Agent Swarm Feed */}
        <aside className="w-[360px] shrink-0 border-l border-[#1E293B] bg-[#0E131F] p-2 flex flex-col space-y-2 overflow-y-auto">
          {/* 1. Active Incident Card */}
          <ActiveIncidentCard
            incident={activeIncident}
            onInspectTrace={() => setIsTraceOpen(true)}
            onSelectVehicle={setSelectedVehicleId}
          />

          {/* 2. Multi-Agent Swarm Activity Feed */}
          <div className="flex-1 min-h-[250px]">
            <AgentActivityFeed
              steps={agentSteps}
              onOpenTraceModal={() => setIsTraceOpen(true)}
            />
          </div>

          {/* 3. Mission Progress & Scoring */}
          <MissionProgress
            metrics={metrics}
            onOpenScenarios={() => setIsScenariosOpen(true)}
          />
        </aside>
      </div>

      {/* Interactive Modals */}
      <SimulationConsoleModal
        isOpen={isConsoleOpen}
        onClose={() => setIsConsoleOpen(false)}
        vehicles={vehicles}
        orders={orders}
        initialTab={consoleInitialTab}
        onUpdateVehicles={(updated) => setVehicles(updated)}
        onUpdateRoutes={(updated) => setRoutes(updated)}
      />

      <AgentTraceModal
        isOpen={isTraceOpen}
        onClose={() => setIsTraceOpen(false)}
        activeIncident={activeIncident}
        steps={agentSteps}
      />

      <ScenarioPlayerModal
        isOpen={isScenariosOpen}
        onClose={() => setIsScenariosOpen(false)}
        currentLevel={metrics.current_level || 1}
      />

      <DeliveriesModal
        isOpen={isDeliveriesOpen}
        onClose={() => setIsDeliveriesOpen(false)}
        orders={orders}
        onSelectVehicle={setSelectedVehicleId}
      />

      <IncidentsModal
        isOpen={isIncidentsOpen}
        onClose={() => setIsIncidentsOpen(false)}
        activeIncident={activeIncident}
        onInspectTrace={() => setIsTraceOpen(true)}
      />

      <AnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        metrics={metrics}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
      />

      <DriverCompanionModal
        isOpen={isDriverOpen}
        onClose={() => setIsDriverOpen(false)}
        selectedVehicle={vehicles.find(v => v.id === selectedVehicleId) || vehicles[0] || null}
        orders={orders.filter(o => o.assigned_vehicle_id === (selectedVehicleId || vehicles[0]?.id))}
      />

      <EnterprisePolicyModal
        isOpen={isPoliciesOpen}
        onClose={() => setIsPoliciesOpen(false)}
      />

      <FlightRecorderModal
        isOpen={isFlightRecorderOpen}
        onClose={() => setIsFlightRecorderOpen(false)}
        state={aggregatedState}
        activeIncident={activeIncident}
      />

      <DepotHierarchyModal
        isOpen={isDepotHierarchyOpen}
        onClose={() => setIsDepotHierarchyOpen(false)}
        selectedDepot={selectedDepot}
        onSelectDepot={setSelectedDepot}
        vehicles={vehicles}
      />

      <DriverSafetyModal
        isOpen={isSafetyOpen}
        onClose={() => setIsSafetyOpen(false)}
      />

      <SmartChargingModal
        isOpen={isChargingOpen}
        onClose={() => setIsChargingOpen(false)}
      />

      <WeatherRadarModal
        isOpen={isWeatherOpen}
        onClose={() => setIsWeatherOpen(false)}
      />

      <YardManagementModal
        isOpen={isYardOpen}
        onClose={() => setIsYardOpen(false)}
      />

      <HOSComplianceModal
        isOpen={isHOSOpen}
        onClose={() => setIsHOSOpen(false)}
      />

      <PredictiveMaintenanceModal
        isOpen={isMaintenanceOpen}
        onClose={() => setIsMaintenanceOpen(false)}
      />

      <SecureConvoyModal
        isOpen={isConvoyOpen}
        onClose={() => setIsConvoyOpen(false)}
      />

      <CryoColdChainModal
        isOpen={isCryoOpen}
        onClose={() => setIsCryoOpen(false)}
      />

      <CommandBar
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onAction={(action: string, data?: any) => {
          if (action === 'focus_vehicle' && data?.vehicle_id) {
            setSelectedVehicleId(data.vehicle_id);
          } else if (action === 'open_incidents') {
            setIsIncidentsOpen(true);
          } else if (action === 'open_scenarios') {
            setIsScenariosOpen(true);
          }
        }}
      />

      <CustomerTrackingModal
        isOpen={isTrackingOpen}
        onClose={() => setIsTrackingOpen(false)}
        initialOrder={trackingOrder}
        orders={orders}
      />

      <AuditLogsModal
        isOpen={isAuditLogsOpen}
        onClose={() => setIsAuditLogsOpen(false)}
        events={events}
        vehicles={vehicles}
        metrics={metrics}
      />

      <FleetImporterModal
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        currentCityId={currentCityId}
        currentVehicles={vehicles}
        onApplyCityPreset={handleApplyCityPreset}
        onImportCustomFleet={handleImportCustomFleet}
      />
    </div>
  );
};