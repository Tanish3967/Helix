export type VehicleStatus = 'ON_ROUTE' | 'AT_RISK' | 'REASSIGNED' | 'AVAILABLE' | 'COMPLETED' | 'MAINTENANCE';
export type OrderPriority = 'HIGH' | 'STANDARD' | 'LOW';
export type OrderStatus = 'PENDING' | 'IN_TRANSIT' | 'AT_RISK' | 'REASSIGNED' | 'DELIVERED' | 'CANCELLED';
export type IncidentType = 'VEHICLE_BREAKDOWN' | 'TRAFFIC_CONGESTION' | 'SEVERE_WEATHER' | 'DRIVER_ANOMALY' | 'MULTIPLE_FAILURES' | 'HIGH_PRIORITY_ORDER' | 'COMPOUND_DISRUPTION' | 'CASCADING_FAILURE';
export type IncidentSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type AgentName = 'Orchestrator Agent' | 'Routing Agent' | 'Traffic Agent' | 'Weather Agent' | 'Dispatch Agent' | 'Customer Agent';
export type AgentState = 'PENDING' | 'ANALYZING' | 'RUNNING' | 'COMPLETE' | 'ERROR';

export interface Location {
  lat: float;
  lng: float;
  address?: string;
  zone_id?: string;
}

type float = number;

export interface Vehicle {
  id: string;
  model: string;
  license_plate: string;
  type: string;
  status: VehicleStatus;
  location: Location;
  speed_kmh: number;
  battery_fuel_percent: number;
  max_capacity_kg: number;
  current_load_kg: number;
  driver_id?: string | null;
  current_route_id?: string | null;
  assigned_order_ids: string[];
  fault_details?: string | null;
  telemetry_health: string;
}

export interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  origin: Location;
  destination: Location;
  priority: OrderPriority;
  status: OrderStatus;
  weight_kg: number;
  original_eta: string;
  revised_eta: string;
  delay_minutes: number;
  assigned_vehicle_id?: string | null;
  created_at: string;
}

export interface RouteWaypoint {
  lat: number;
  lng: number;
  segment_name?: string;
}

export interface Route {
  id: string;
  vehicle_id: string;
  origin: Location;
  destination: Location;
  waypoints: RouteWaypoint[];
  current_waypoint_idx: number;
  distance_km: number;
  progress_percent: number;
  traffic_multiplier: number;
  weather_multiplier: number;
  is_active: boolean;
  color?: string;
}

export interface AddVehiclePayload {
  id?: string;
  model: string;
  type: string;
  battery_fuel_percent?: number;
  max_capacity_kg?: number;
  lat?: number;
  lng?: number;
}

export interface ModifyRoutePayload {
  destination_lat?: number;
  destination_lng?: number;
  destination_name?: string;
  zone_id?: string;
}

export interface Incident {
  id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  title: string;
  description: string;
  affected_vehicle_ids: string[];
  affected_order_ids: string[];
  location?: Location;
  detected_at: string;
  resolved_at?: string | null;
  resolution_status: string;
  resolution_summary?: string | null;
}

export interface AgentToolCall {
  tool_name: string;
  arguments: Record<string, any>;
  result: any;
  timestamp: string;
  execution_time_ms: number;
}

export interface AgentStep {
  id: string;
  agent_name: AgentName;
  state: AgentState;
  summary: string;
  detail: string;
  tool_calls: AgentToolCall[];
  timestamp: string;
}

export interface LiveEvent {
  id: string;
  timestamp: string;
  severity: IncidentSeverity;
  category: string;
  message: string;
  vehicle_id?: string | null;
  order_id?: string | null;
  incident_id?: string | null;
}

export interface MissionScore {
  score: number;
  completed_orders_today: number;
  total_orders_today: number;
  active_incidents_count: number;
  resolved_incidents_count: number;
  avg_resolution_seconds: number;
  efficiency_percent: number;
  on_time_rate_percent: number;
  fuel_cost_today_usd: number;
  current_level: number;
}

export interface ScenarioItem {
  level: number;
  title: string;
  difficulty: string;
  description: string;
  ai_challenge: string;
  target_metrics: {
    max_delay_min: number;
    recovery_time_sec: number;
    sla_preservation: number;
  };
}

export interface WeatherState {
  condition: string;
  temperature_c: number;
  precipitation_rate: number;
  wind_speed_kmh: number;
  visibility_km: number;
  multiplier: number;
}

export interface TrafficZone {
  name: string;
  lat: number;
  lng: number;
  condition: string;
  multiplier: number;
}

export type TrafficZones = Record<string, TrafficZone>;

export interface SimulationState {
  vehicles: Vehicle[];
  orders: Order[];
  all_orders_count?: number;
  routes: Route[];
  active_incident?: Incident | null;
  agent_steps: AgentStep[];
  events: LiveEvent[];
  metrics: MissionScore;
  weather: WeatherState;
  traffic_zones: TrafficZones;
  sim_time: string;
  is_paused: boolean;
  speed_multiplier: number;
}
