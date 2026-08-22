import React, { useState, useEffect, useRef } from 'react';
import { TopBar } from './components/TopBar';
import { LeftSidebar } from './components/LeftSidebar';
import { FleetMap } from './components/FleetMap';
import { LiveEventsPanel } from './components/LiveEventsPanel';
import { DeliveriesTable } from './components/DeliveriesTable';
import { ActiveIncidentCard } from './components/ActiveIncidentCard';
import { AIRecommendationCard } from './components/AIRecommendationCard';
import { AgentActivityFeed } from './components/AgentActivityFeed';
import { MissionProgress } from './components/MissionProgress';
import { SimulationConsoleModal } from './components/SimulationConsoleModal';
import { ScenarioPlayerModal } from './components/ScenarioPlayerModal';
import { AgentTraceModal } from './components/AgentTraceModal';
import { AnalyticsModal } from './components/AnalyticsModal';
import { SettingsModal } from './components/SettingsModal';
import { IncidentsModal } from './components/IncidentsModal';
import { DeliveriesModal } from './components/DeliveriesModal';
import { CommandBar } from './components/CommandBar';
import { DynamicLoadingScreen } from './components/DynamicLoadingScreen';
import { SimulationState, Vehicle, Route } from './types/fleet';
import { fetchSimulationState } from './services/api';
import { fleetWS, ConnectionStatus } from './services/websocket';

export const App: React.FC = () => {
  const [state, setState] = useState<SimulationState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('operations');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  // Modals
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(false);
  const [consoleInitialTab, setConsoleInitialTab] = useState<'disruptions' | 'fleet' | 'routes'>('disruptions');
  const [isScenariosOpen, setIsScenariosOpen] = useState<boolean>(false);
  const [isTraceOpen, setIsTraceOpen] = useState<boolean>(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isIncidentsOpen, setIsIncidentsOpen] = useState<boolean>(false);
  const [isDeliveriesOpen, setIsDeliveriesOpen] = useState<boolean>(false);
  const [isCommandOpen, setIsCommandOpen] = useState<boolean>(false);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');

  // Read the latest sound preference from inside the (stable) WS subscription without
  // resubscribing — toggling sound must not tear down the live socket.
  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Alert audio chime
  const playAlertChime = () => {
    if (!soundEnabledRef.current) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      // Audio context may need initial gesture
    }
  };

  // Initial Load & WebSocket Synchronization
  useEffect(() => {
    fetchSimulationState()
      .then(setState)
      .catch(console.error);

    const unsubscribe = fleetWS.subscribe((msg) => {
      if (msg.type === 'INITIAL_STATE' && msg.state) {
        setState(msg.state);
      } else if (msg.type === 'TELEMETRY_TICK') {
        setState((prev) => {
          if (!prev) return prev;
          const vehiclesMap = new Map(msg.vehicles?.map(v => [v.id, v]));
          const updatedVehicles = prev.vehicles.map(v => {
            const u = vehiclesMap.get(v.id);
            if (!u) return v;
            return {
              ...v,
              location: { ...v.location, lat: u.lat, lng: u.lng },
              speed_kmh: u.speed_kmh,
              status: u.status as any,
              battery_fuel_percent: u.battery_fuel_percent,
              current_load_kg: u.current_load_kg,
              current_route_id: u.current_route_id,
              telemetry_health: u.telemetry_health
            };
          });

          return {
            ...prev,
            vehicles: updatedVehicles,
            sim_time: msg.sim_time || prev.sim_time,
            metrics: msg.metrics || prev.metrics,
            // weather + traffic_zones now ride along each tick so map overlays stay live
            weather: msg.weather || prev.weather,
            traffic_zones: msg.traffic_zones || prev.traffic_zones,
            is_paused: msg.is_paused !== undefined ? msg.is_paused : prev.is_paused,
            speed_multiplier: msg.speed_multiplier !== undefined ? msg.speed_multiplier : prev.speed_multiplier
          };
        });
      } else if (msg.type === 'FLEET_UPDATED') {
        setState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            vehicles: (msg.vehicles as Vehicle[]) || prev.vehicles,
            routes: (msg.routes as any) || prev.routes,
            orders: (msg.orders as any[]) || prev.orders,
            events: (msg.events as any[]) || prev.events,
            metrics: msg.metrics || prev.metrics,
            active_incident: msg.active_incident !== undefined ? msg.active_incident : prev.active_incident
          };
        });
      } else if (msg.type === 'ROUTE_UPDATED') {
        setState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            routes: (msg.routes as any) || prev.routes,
            vehicles: (msg.vehicles as Vehicle[]) || prev.vehicles,
            events: (msg.events as any[]) || prev.events
          };
        });
      } else if (msg.type === 'SIMULATION_CONFIG') {
        setState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            is_paused: msg.is_paused !== undefined ? msg.is_paused : prev.is_paused,
            speed_multiplier: msg.speed_multiplier !== undefined ? msg.speed_multiplier : prev.speed_multiplier
          };
        });
      } else if (msg.type === 'INCIDENT_DETECTED' && msg.incident) {
        playAlertChime();
        setState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            active_incident: msg.incident,
            vehicles: (msg.vehicles as Vehicle[]) || prev.vehicles,
            orders: (msg.orders as any[]) || prev.orders,
            events: (msg.events as any[]) || prev.events,
            metrics: msg.metrics || prev.metrics,
            weather: msg.weather || prev.weather,
            traffic_zones: msg.traffic_zones || prev.traffic_zones
          };
        });
      } else if (msg.type === 'INCIDENT_RESOLVING') {
        setState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            active_incident: msg.incident || msg.active_incident || (prev.active_incident ? { ...prev.active_incident, resolution_status: 'Resolving' } : null)
          };
        });
      } else if (msg.type === 'AGENT_STEP' && msg.step) {
        setState((prev) => {
          if (!prev) return prev;
          const newSteps = [...prev.agent_steps, msg.step!];
          if (newSteps.length > 40) newSteps.shift();
          return {
            ...prev,
            agent_steps: newSteps,
            routes: (msg.routes as any) || prev.routes,
            vehicles: (msg.vehicles as Vehicle[]) || prev.vehicles,
            orders: (msg.orders as any[]) || prev.orders,
            metrics: msg.metrics || prev.metrics,
            active_incident: msg.active_incident !== undefined ? msg.active_incident : prev.active_incident
          };
        });
      }
    });

    return () => {
      unsubscribe();
    };
    // Subscribe once; sound preference is read via ref so the socket stays alive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track live backend connection status for the TopBar link pill.
  useEffect(() => {
    const unsub = fleetWS.onStatus(setConnectionStatus);
    return unsub;
  }, []);

  // Global ⌘K / Ctrl+K toggles the Ask-Aegis command bar from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsCommandOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const vehicles = state?.vehicles || [];
  const orders = state?.orders || [];
  const routes = state?.routes || [];
  const activeIncident = state?.active_incident;
  const agentSteps = state?.agent_steps || [];
  const events = state?.events || [];
  const weather = state?.weather;
  const trafficZones = state?.traffic_zones;
  const speedMultiplier = state?.speed_multiplier ?? 1.0;
  const isPaused = state?.is_paused ?? false;
  const metrics = state?.metrics || {
    score: 8620,
    completed_orders_today: 86,
    total_orders_today: 100,
    active_incidents_count: 1,
    resolved_incidents_count: 14,
    avg_resolution_seconds: 38.5,
    efficiency_percent: 92,
    on_time_rate_percent: 92.0,
    fuel_cost_today_usd: 12400.00,
    current_level: 1
  };

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    switch (tabId) {
      case 'fleet':
        setConsoleInitialTab('fleet');
        setIsConsoleOpen(true);
        break;
      case 'analytics':
        setIsAnalyticsOpen(true);
        break;
      case 'simulation':
        setConsoleInitialTab('disruptions');
        setIsConsoleOpen(true);
        break;
      case 'reports':
        setIsDeliveriesOpen(true);
        break;
      default:
        // 'operations' — the live dashboard is already the base view
        break;
    }
  };

  const openCommandBar = () => {
    setIsCommandOpen(true);
  };

  // Route a client-side action returned by the command interpreter to the UI.
  const handleCommandAction = (action: string, data?: any) => {
    switch (action) {
      case 'focus_vehicle':
        if (data?.vehicle_id) setSelectedVehicleId(data.vehicle_id);
        break;
      case 'open_panel':
        switch (data?.panel) {
          case 'analytics':
            setActiveTab('analytics');
            setIsAnalyticsOpen(true);
            break;
          case 'incidents':
            setIsIncidentsOpen(true);
            break;
          case 'deliveries':
            setActiveTab('reports');
            setIsDeliveriesOpen(true);
            break;
          case 'scenarios':
            setIsScenariosOpen(true);
            break;
          case 'trace':
            setIsTraceOpen(true);
            break;
          case 'settings':
            setIsSettingsOpen(true);
            break;
          case 'fleet':
            setActiveTab('fleet');
            setConsoleInitialTab('fleet');
            setIsConsoleOpen(true);
            break;
          case 'console':
          default:
            setActiveTab('simulation');
            setConsoleInitialTab('disruptions');
            setIsConsoleOpen(true);
            break;
        }
        break;
      // sim_config / reset / incident round-trip through the WebSocket, so the
      // dashboard updates itself — no extra client action needed.
      default:
        break;
    }
  };

  const handleUpdateVehicles = (newVehicles: Vehicle[]) => {
    setState((prev) => (prev ? { ...prev, vehicles: newVehicles } : null));
  };

  const handleUpdateRoutes = (newRoutes: Route[]) => {
    setState((prev) => (prev ? { ...prev, routes: newRoutes } : null));
  };

  return (
    <div className="app-canvas flex flex-col h-screen w-screen text-slate-100 overflow-hidden select-none font-sans">
      {isLoading && (
        <DynamicLoadingScreen onComplete={() => setIsLoading(false)} />
      )}

      {/* Top Header Bar */}
      <TopBar
        state={state}
        activeTab={activeTab}
        connectionStatus={connectionStatus}
        onSelectTab={handleSelectTab}
        onOpenCommand={openCommandBar}
        onOpenIncidents={() => setIsIncidentsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
      />

      {/* Main Command Center Grid */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Interactive Navigation Sidebar */}
        <LeftSidebar
          state={state}
          onOpenConsole={(tab) => {
            setConsoleInitialTab(tab || 'disruptions');
            setIsConsoleOpen(true);
          }}
          onOpenDeliveries={() => setIsDeliveriesOpen(true)}
          onOpenIncidents={() => setIsIncidentsOpen(true)}
          onOpenAgents={() => setIsTraceOpen(true)}
          onOpenAnalytics={() => setIsAnalyticsOpen(true)}
        />

        {/* Center Panel: Interactive Map & Live Operations Feed */}
        <main className="flex-1 flex flex-col p-2 gap-2 overflow-y-auto min-h-0 min-w-0">
          {/* Top Half: Dynamic Live Fleet Map */}
          <div className="min-h-[340px] lg:min-h-[380px] flex-1 shrink-0">
            <FleetMap
              vehicles={vehicles}
              routes={routes}
              orders={orders}
              activeIncident={activeIncident}
              weather={weather}
              trafficZones={trafficZones}
              speedMultiplier={speedMultiplier}
              isPaused={isPaused}
              selectedVehicleId={selectedVehicleId}
              onSelectVehicle={setSelectedVehicleId}
            />
          </div>

          {/* Bottom Half: Split View (Live Events Stream + Active Deliveries Table) */}
          <div className="h-[270px] shrink-0 grid grid-cols-12 gap-2">
            <div className="col-span-4 h-full min-h-0">
              <LiveEventsPanel events={events} onSelectVehicle={setSelectedVehicleId} />
            </div>
            <div className="col-span-8 h-full min-h-0">
              <DeliveriesTable 
                orders={orders} 
                onSelectVehicle={setSelectedVehicleId}
              />
            </div>
          </div>
        </main>

        {/* Right Panel: Incident Response & Multi-Agent Swarm Feed */}
        <aside
          className="w-[310px] xl:w-[360px] h-full shrink-0 flex flex-col gap-2.5 p-2.5 overflow-y-auto min-h-0"
          style={{ borderLeft: '1px solid var(--edge)', background: 'rgba(9,13,22,0.55)' }}
        >
          {/* 1. Active Incident Card */}
          <ActiveIncidentCard
            incident={activeIncident}
            onInspectTrace={() => setIsTraceOpen(true)}
            onSelectVehicle={setSelectedVehicleId}
          />

          {/* 2. Functional AI Recommendation — Approve Plan dispatches real resolution */}
          <AIRecommendationCard
            incident={activeIncident}
            onShowAlternatives={() => setIsTraceOpen(true)}
          />

          {/* 3. Agent Activity Pipeline Feed */}
          <div className="shrink-0 min-h-[220px] max-h-[320px] flex flex-col">
            <AgentActivityFeed
              steps={agentSteps}
              onOpenTraceModal={() => setIsTraceOpen(true)}
            />
          </div>

          {/* 4. Mission Progress & Scoring */}
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
        onUpdateVehicles={handleUpdateVehicles}
        onUpdateRoutes={handleUpdateRoutes}
      />

      <ScenarioPlayerModal
        isOpen={isScenariosOpen}
        onClose={() => setIsScenariosOpen(false)}
        currentLevel={metrics.current_level}
      />

      <AgentTraceModal
        isOpen={isTraceOpen}
        onClose={() => setIsTraceOpen(false)}
        steps={agentSteps}
        activeIncident={activeIncident}
      />

      <AnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        metrics={metrics}
      />

      <IncidentsModal
        isOpen={isIncidentsOpen}
        onClose={() => setIsIncidentsOpen(false)}
        activeIncident={activeIncident}
        onInspectTrace={() => setIsTraceOpen(true)}
      />

      <DeliveriesModal
        isOpen={isDeliveriesOpen}
        onClose={() => setIsDeliveriesOpen(false)}
        orders={orders}
        onSelectVehicle={setSelectedVehicleId}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
      />

      {/* Ask-Aegis command bar (⌘K) — the console's live command surface */}
      <CommandBar
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onAction={handleCommandAction}
      />
    </div>
  );
};
