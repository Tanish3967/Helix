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
  odometer_km?: number;
  depot_id?: string;
  tenant_id?: string;
  dtc_faults?: string[];
  cargo_temp_c?: number | null;
  cargo_humidity_percent?: number | null;
  door_open_alert?: boolean;
  cargo_type?: string;
  carbon_kg_today?: number;
  heading?: number;
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

export interface Driver {
  id: string;
  name: string;
  phone: string;
  status: string;
  shift_hours: number;
  fatigue_score: number;
  assigned_vehicle_id?: string | null;
  safety_score?: number;
  harsh_braking_events?: number;
  distraction_events?: number;
  speeding_events?: number;
  coaching_tips?: string[];
}

export interface DriverSafetyEvent {
  id: string;
  driver_id: string;
  vehicle_id: string;
  event_type: string;
  severity: string;
  g_force?: number;
  confidence_score: number;
  timestamp: string;
  coaching_message?: string;
}

export interface ChargingStation {
  id: string;
  name: string;
  depot_id: string;
  total_bays: number;
  occupied_bays: number;
  max_power_kw: number;
  current_draw_kw: number;
  current_tariff_usd_kwh: number;
  v2g_supported: boolean;
  status: string;
}

export interface ChargingSession {
  id: string;
  station_id: string;
  vehicle_id: string;
  bay_number: number;
  started_at: string;
  target_kwh: number;
  delivered_kwh: number;
  cost_usd: number;
  is_v2g: boolean;
}

export interface BatteryHealthReport {
  vehicle_id: string;
  model: string;
  state_of_health_pct: number;
  battery_temp_c: number;
  cycle_count: number;
  internal_resistance_mohm: number;
  thermal_runaway_risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  remaining_useful_life_km: number;
  preconditioning_active: boolean;
  degradation_rate_per_10k_km: number;
}

export interface GridSubstationLoad {
  id: string;
  name: string;
  region: string;
  current_load_mw: number;
  capacity_mw: number;
  carbon_intensity_gco2_kwh: number;
  renewable_mix_percent: number;
  transformer_temp_c: number;
  grid_stress_level: 'OPTIMAL' | 'NORMAL' | 'CONGESTED' | 'CRITICAL';
}

export interface WeatherHazard {
  id: string;
  name: string;
  hazard_type: string;
  severity: string;
  coordinates: number[][];
  speed_penalty_percent: number;
  wind_speed_kmh: number;
  visibility_km: number;
  precipitation_mm_hr: number;
  is_active: boolean;
}

export interface DockDoor {
  id: string;
  depot_id: string;
  bay_number: number;
  status: 'VACANT' | 'OCCUPIED' | 'LOADING' | 'UNLOADING' | 'MAINTENANCE';
  assigned_vehicle_id?: string | null;
  assigned_order_id?: string | null;
  cargo_type: string;
  dwell_time_minutes: number;
  turnaround_target_minutes: number;
}

export interface YardTrailer {
  id: string;
  spot_id: string;
  status: string;
  cargo_type: string;
  seal_intact: boolean;
  temp_c?: number | null;
}

export interface GateActivity {
  id: string;
  event_type: 'GATE_IN' | 'GATE_OUT';
  license_plate: string;
  vehicle_id?: string | null;
  driver_name?: string | null;
  timestamp: string;
  assigned_bay?: string | null;
  status: string;
}

export interface ELDLogRecord {
  id: string;
  driver_id: string;
  driver_name: string;
  vehicle_id: string;
  current_duty_status: 'OFF_DUTY' | 'SLEEPER_BERTH' | 'DRIVING' | 'ON_DUTY_NOT_DRIVING';
  driving_time_minutes: number;
  on_duty_time_minutes: number;
  cycle_time_minutes: number;
  time_until_break_minutes: number;
  compliance_status: 'COMPLIANT' | 'APPROACHING_LIMIT' | 'VIOLATION';
  suggested_rest_stop: string;
  last_status_change: string;
}

export interface ComponentPrognostic {
  component_name: string;
  health_score_pct: number;
  remaining_useful_life_hours: number;
  vibration_harmonic_hz: number;
  operating_temp_c: number;
  failure_probability_7d: number;
  failure_mode_description: string;
  severity: 'NORMAL' | 'WATCHLIST' | 'WARNING' | 'CRITICAL_REPLACE';
}

export interface VehicleMaintenanceScorecard {
  vehicle_id: string;
  model: string;
  overall_health_score: number;
  odometer_km: number;
  prognostics: ComponentPrognostic[];
  predicted_failure_component?: string | null;
  autonomous_work_order_id?: string | null;
}

export interface AutonomousWorkOrder {
  id: string;
  vehicle_id: string;
  created_at: string;
  priority: 'URGENT' | 'HIGH' | 'SCHEDULED';
  target_component: string;
  prescribed_repair_action: string;
  required_oem_parts: string[];
  estimated_downtime_minutes: number;
  assigned_bay_id: string;
  status: 'OPEN_SCHEDULED' | 'PARTS_ALLOCATED' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface SecureConvoy {
  id: string;
  name: string;
  classification: 'HIGH_VALUE_BULLION' | 'CRITICAL_PHARMA' | 'HAZMAT_CLASS_7_RADIOACTIVE' | 'AEROSPACE_DEFENSE';
  lead_vehicle_id: string;
  cargo_vault_vehicle_id: string;
  escort_vehicle_id: string;
  convoy_status: 'EN_ROUTE_SECURE' | 'CONVOY_FORMED' | 'EVASIVE_REROUTE' | 'LOCKDOWN_ACTIVE';
  inter_vehicle_spacing_meters: number;
  biometric_vault_locked: boolean;
  vault_tamper_sensor: 'NOMINAL' | 'BREACH_ALERT';
  gps_spoofing_detected: boolean;
  gnss_snr_db: number;
  dead_reckoning_active: boolean;
  threat_level: 'DEFCON_4_GREEN' | 'DEFCON_3_ELEVATED' | 'DEFCON_2_HIGH' | 'DEFCON_1_CRITICAL';
  assigned_route_id: string;
}

export interface SecurityTelemetryAlert {
  id: string;
  convoy_id: string;
  timestamp: string;
  alert_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  countermeasure_triggered: string;
}

export interface CryoChamberTelemetry {
  chamber_id: string;
  vehicle_id: string;
  cargo_type: 'MRNA_VACCINE_ULT' | 'BLOOD_PLASMA' | 'CELL_GENE_THERAPY' | 'BIOPHARMACEUTICAL';
  target_temp_c: number;
  current_temp_c: number;
  probe_a_temp_c: number;
  probe_b_temp_c: number;
  ambient_exterior_temp_c: number;
  thermal_drift_rate_c_per_hour: number;
  dry_ice_mass_remaining_kg: number;
  liquid_nitrogen_pressure_psi: number;
  time_to_critical_threshold_minutes: number;
  mean_kinetic_temperature_c: number;
  status: 'NOMINAL' | 'WARNING_DRIFT' | 'CRITICAL_RUNAWAY' | 'STABILIZED';
  nist_certificate_id: string;
}

export interface CryoEmergencyIntervention {
  id: string;
  vehicle_id: string;
  chamber_id: string;
  intervention_type: 'LN2_PULSE_BOOST' | 'EMERGENCY_DEPOT_DIVERT' | 'BACKUP_COMPRESSOR_ENGAGE';
  timestamp: string;
  resulting_temp_c: number;
  action_taken: string;
}

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
