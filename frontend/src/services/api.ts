import { SimulationState, ScenarioItem, Incident } from '../types/fleet';

/**
 * Resolve the REST base URL.
 *
 * Production: the FastAPI app serves the built bundle, so the API is same-origin
 * (`/api`). Local dev: the Vite dev server runs on :3000 / :5173 while the backend
 * listens on :8000, so we point at the backend explicitly. This keeps the shipped
 * bundle working behind any host/port without a rebuild.
 */
function resolveApiBase(): string {
  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname, port, origin } = window.location;
    const isDevServer = port === '3000' || port === '5173';
    if (isDevServer) {
      return `${protocol}//${hostname}:8000/api`;
    }
    return `${origin}/api`;
  }
  return 'http://localhost:8000/api';
}

const API_BASE = resolveApiBase();

export async function fetchSimulationState(): Promise<SimulationState> {
  const res = await fetch(`${API_BASE}/fleet/state`);
  if (!res.ok) throw new Error('Failed to fetch simulation state');
  return res.json();
}

export async function fetchScenarios(): Promise<ScenarioItem[]> {
  const res = await fetch(`${API_BASE}/simulation/scenarios`);
  if (!res.ok) throw new Error('Failed to fetch scenarios');
  return res.json();
}

export async function injectDisruption(payload: {
  type: string;
  vehicle_id?: string;
  fault_type?: string;
  zone_id?: string;
  traffic_condition?: string;
  weather_condition?: string;
  order_id?: string;
  delay_minutes?: number;
  level?: number;
  auto_resolve?: boolean;
  polygon_coords?: number[][];
  hazard_name?: string;
}): Promise<{ success: boolean; incident?: Incident }> {
  const res = await fetch(`${API_BASE}/simulation/disrupt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to inject disruption');
  return res.json();
}

/**
 * Approve resolution of the current active incident — dispatches the multi-agent
 * swarm on demand. Backs the "Approve Plan" action for incidents injected with
 * auto_resolve=false (and is a safe no-op if one is already resolving/resolved).
 */
export async function resolveActiveIncident(): Promise<{
  success: boolean;
  message: string;
  incident_id?: string;
}> {
  const res = await fetch(`${API_BASE}/simulation/resolve`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to dispatch incident resolution');
  return res.json();
}

export async function triggerScenario(level: number): Promise<{ success: boolean; level: number; incident: Incident }> {
  const res = await fetch(`${API_BASE}/simulation/scenario/${level}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error(`Failed to launch scenario level ${level}`);
  return res.json();
}

export async function setSimulationSpeed(speed: number): Promise<void> {
  await fetch(`${API_BASE}/simulation/speed?speed=${speed}`, { method: 'POST' });
}

export async function toggleSimulationPause(paused?: boolean): Promise<void> {
  const url = paused !== undefined ? `${API_BASE}/simulation/pause?paused=${paused}` : `${API_BASE}/simulation/pause`;
  await fetch(url, { method: 'POST' });
}

export async function resetSimulation(): Promise<void> {
  await fetch(`${API_BASE}/simulation/reset`, { method: 'POST' });
}

export async function addVehicle(payload: {
  id?: string;
  model: string;
  type: string;
  battery_fuel_percent?: number;
  max_capacity_kg?: number;
  lat?: number;
  lng?: number;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/fleet/vehicles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to add vehicle');
  return res.json();
}

export async function removeVehicle(vehicleId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/fleet/vehicles/${vehicleId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error(`Failed to remove vehicle ${vehicleId}`);
  return res.json();
}

export async function toggleVehicleStatus(vehicleId: string, status?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/fleet/vehicles/${vehicleId}/toggle-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (!res.ok) throw new Error(`Failed to toggle status for vehicle ${vehicleId}`);
  return res.json();
}

export async function modifyVehicleRoute(vehicleId: string, payload: {
  destination_lat?: number;
  destination_lng?: number;
  destination_name?: string;
  zone_id?: string;
  waypoints?: Array<{ lat: number; lng: number; segment_name?: string }>;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/fleet/vehicles/${vehicleId}/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Failed to modify route for vehicle ${vehicleId}`);
  return res.json();
}

/**
 * Send a natural-language / slash operations command to the backend command parser.
 * (Backend endpoint added in Phase E; typed here so callers compile ahead of wiring.)
 */
export async function sendCommand(command: string): Promise<{
  success: boolean;
  message: string;
  action?: string;
  data?: any;
}> {
  const res = await fetch(`${API_BASE}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command })
  });
  if (!res.ok) throw new Error('Command failed');
  return res.json();
}
