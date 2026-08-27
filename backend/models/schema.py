from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

class VehicleStatus(str, Enum):
    ON_ROUTE = "ON_ROUTE"
    AT_RISK = "AT_RISK"
    REASSIGNED = "REASSIGNED"
    AVAILABLE = "AVAILABLE"
    COMPLETED = "COMPLETED"
    MAINTENANCE = "MAINTENANCE"

class OrderPriority(str, Enum):
    HIGH = "HIGH"
    STANDARD = "STANDARD"
    LOW = "LOW"

class OrderStatus(str, Enum):
    PENDING = "PENDING"
    IN_TRANSIT = "IN_TRANSIT"
    AT_RISK = "AT_RISK"
    REASSIGNED = "REASSIGNED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"

class IncidentType(str, Enum):
    VEHICLE_BREAKDOWN = "VEHICLE_BREAKDOWN"
    TRAFFIC_CONGESTION = "TRAFFIC_CONGESTION"
    SEVERE_WEATHER = "SEVERE_WEATHER"
    DRIVER_ANOMALY = "DRIVER_ANOMALY"
    MULTIPLE_FAILURES = "MULTIPLE_FAILURES"
    HIGH_PRIORITY_ORDER = "HIGH_PRIORITY_ORDER"
    COMPOUND_DISRUPTION = "COMPOUND_DISRUPTION"
    CASCADING_FAILURE = "CASCADING_FAILURE"

class IncidentSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"

class AgentName(str, Enum):
    ORCHESTRATOR = "Orchestrator Agent"
    ROUTING = "Routing Agent"
    TRAFFIC = "Traffic Agent"
    WEATHER = "Weather Agent"
    DISPATCH = "Dispatch Agent"
    CUSTOMER = "Customer Agent"

class AgentState(str, Enum):
    PENDING = "PENDING"
    ANALYZING = "ANALYZING"
    RUNNING = "RUNNING"
    COMPLETE = "COMPLETE"
    ERROR = "ERROR"

class WeatherCondition(str, Enum):
    CLEAR = "Clear"
    RAIN = "Rain"
    HEAVY_RAIN = "Heavy Rain"
    STORM = "Storm"

class TrafficCondition(str, Enum):
    NORMAL = "Normal"
    CONGESTED = "Congested"
    ACCIDENT = "Accident"

class Location(BaseModel):
    lat: float
    lng: float
    address: Optional[str] = None
    zone_id: Optional[str] = "Downtown"

class Driver(BaseModel):
    id: str
    name: str
    phone: str
    status: str = "Active"
    shift_hours: float = 3.5
    fatigue_score: float = 0.15
    assigned_vehicle_id: Optional[str] = None
    safety_score: float = 96.5
    harsh_braking_events: int = 0
    distraction_events: int = 0
    speeding_events: int = 0
    coaching_tips: List[str] = Field(default_factory=list)

class DriverSafetyEvent(BaseModel):
    id: str
    driver_id: str
    vehicle_id: str
    event_type: str # "HARSH_BRAKING", "DROWSINESS_DETECTED", "PHONE_DISTRACTION", "LANE_DRIFT", "RAPID_ACCELERATION"
    severity: str = "MEDIUM" # "LOW", "MEDIUM", "HIGH", "CRITICAL"
    g_force: Optional[float] = None
    confidence_score: float = 0.95
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    location: Optional[Location] = None
    coaching_message: Optional[str] = None

class ChargingStation(BaseModel):
    id: str
    name: str
    depot_id: str
    total_bays: int = 12
    occupied_bays: int = 4
    max_power_kw: float = 350.0
    current_draw_kw: float = 140.0
    current_tariff_usd_kwh: float = 0.18
    v2g_supported: bool = True
    status: str = "OPERATIONAL"

class ChargingSession(BaseModel):
    id: str
    station_id: str
    vehicle_id: str
    bay_number: int
    started_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    target_kwh: float = 45.0
    delivered_kwh: float = 18.5
    cost_usd: float = 3.33
    is_v2g: bool = False

class BatteryHealthReport(BaseModel):
    vehicle_id: str
    model: str = "Electric Van"
    state_of_health_pct: float = 94.8 # State of Health (SoH)
    battery_temp_c: float = 26.5
    cycle_count: int = 342
    internal_resistance_mohm: float = 18.2
    thermal_runaway_risk: str = "LOW" # "LOW", "MEDIUM", "HIGH", "CRITICAL"
    remaining_useful_life_km: float = 185000.0
    preconditioning_active: bool = False
    degradation_rate_per_10k_km: float = 0.42

class GridSubstationLoad(BaseModel):
    id: str
    name: str
    region: str
    current_load_mw: float
    capacity_mw: float
    carbon_intensity_gco2_kwh: float
    renewable_mix_percent: float
    transformer_temp_c: float
    grid_stress_level: str = "NORMAL" # "OPTIMAL", "NORMAL", "CONGESTED", "CRITICAL"

class ComponentPrognostic(BaseModel):
    component_name: str # e.g. "Inverter Power Module", "Regenerative Brake Actuator", "Tire Tread & PSI", "Drive Axle Bearing"
    health_score_pct: float = 95.0
    remaining_useful_life_hours: float = 1450.0
    vibration_harmonic_hz: float = 42.5
    operating_temp_c: float = 68.0
    failure_probability_7d: float = 0.02
    failure_mode_description: str = "Nominal electromagnetic & mechanical flux"
    severity: str = "NORMAL" # "NORMAL", "WATCHLIST", "WARNING", "CRITICAL_REPLACE"

class VehicleMaintenanceScorecard(BaseModel):
    vehicle_id: str
    model: str
    overall_health_score: float = 94.0
    odometer_km: float = 48500.0
    prognostics: List[ComponentPrognostic]
    predicted_failure_component: Optional[str] = None
    autonomous_work_order_id: Optional[str] = None

class AutonomousWorkOrder(BaseModel):
    id: str
    vehicle_id: str
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    priority: str = "SCHEDULED" # "URGENT", "HIGH", "SCHEDULED"
    target_component: str
    prescribed_repair_action: str
    required_oem_parts: List[str]
    estimated_downtime_minutes: float = 45.0
    assigned_bay_id: str = "SERVICE-BAY-02"
    status: str = "OPEN_SCHEDULED" # "OPEN_SCHEDULED", "PARTS_ALLOCATED", "IN_PROGRESS", "COMPLETED"

class SecureConvoy(BaseModel):
    id: str
    name: str
    classification: str = "HIGH_VALUE_BULLION" # "HIGH_VALUE_BULLION", "CRITICAL_PHARMA", "HAZMAT_CLASS_7_RADIOACTIVE", "AEROSPACE_DEFENSE"
    lead_vehicle_id: str = "V481"
    cargo_vault_vehicle_id: str = "V517"
    escort_vehicle_id: str = "V109"
    convoy_status: str = "EN_ROUTE_SECURE" # "EN_ROUTE_SECURE", "CONVOY_FORMED", "EVASIVE_REROUTE", "LOCKDOWN_ACTIVE"
    inter_vehicle_spacing_meters: float = 25.0
    biometric_vault_locked: bool = True
    vault_tamper_sensor: str = "NOMINAL" # "NOMINAL", "BREACH_ALERT"
    gps_spoofing_detected: bool = False
    gnss_snr_db: float = 48.2
    dead_reckoning_active: bool = False
    threat_level: str = "DEFCON_4_GREEN" # "DEFCON_4_GREEN", "DEFCON_3_ELEVATED", "DEFCON_2_HIGH", "DEFCON_1_CRITICAL"
    assigned_route_id: str = "RT-CONVOY-01"

class SecurityTelemetryAlert(BaseModel):
    id: str
    convoy_id: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    alert_type: str # "GPS_JAMMING_DETECTED", "VAULT_TAMPER_PRESSURE", "CONVOY_PERIMETER_BREACH", "GEO_CORRIDOR_DEVIATION"
    severity: str = "HIGH" # "LOW", "MEDIUM", "HIGH", "CRITICAL"
    countermeasure_triggered: str = "INERTIAL_DEAD_RECKONING_ENGAGED"

class CryoChamberTelemetry(BaseModel):
    chamber_id: str
    vehicle_id: str
    cargo_type: str = "MRNA_VACCINE_ULT" # "MRNA_VACCINE_ULT", "BLOOD_PLASMA", "CELL_GENE_THERAPY", "BIOPHARMACEUTICAL"
    target_temp_c: float = -80.0
    current_temp_c: float = -78.4
    probe_a_temp_c: float = -78.5
    probe_b_temp_c: float = -78.3
    ambient_exterior_temp_c: float = 24.0
    thermal_drift_rate_c_per_hour: float = 0.12
    dry_ice_mass_remaining_kg: float = 18.5
    liquid_nitrogen_pressure_psi: float = 42.0
    time_to_critical_threshold_minutes: float = 380.0
    mean_kinetic_temperature_c: float = -78.8
    status: str = "NOMINAL" # "NOMINAL", "WARNING_DRIFT", "CRITICAL_RUNAWAY", "STABILIZED"
    nist_certificate_id: str = "NIST-CAL-99214"

class CryoEmergencyIntervention(BaseModel):
    id: str
    vehicle_id: str
    chamber_id: str
    intervention_type: str # "LN2_PULSE_BOOST", "EMERGENCY_DEPOT_DIVERT", "BACKUP_COMPRESSOR_ENGAGE"
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    resulting_temp_c: float = -80.0
    action_taken: str

class DockDoor(BaseModel):
    id: str
    depot_id: str = "DEPOT-01"
    bay_number: int
    status: str = "VACANT" # "VACANT", "OCCUPIED", "LOADING", "UNLOADING", "MAINTENANCE"
    assigned_vehicle_id: Optional[str] = None
    assigned_order_id: Optional[str] = None
    cargo_type: str = "GENERAL"
    dwell_time_minutes: float = 0.0
    turnaround_target_minutes: float = 45.0

class YardTrailer(BaseModel):
    id: str
    spot_id: str # e.g. "SPOT-A12"
    status: str = "STAGED" # "STAGED", "DOCKED", "GATE_IN_TRANSIT", "GATE_OUT_CLEARED"
    cargo_type: str = "GENERAL"
    seal_intact: bool = True
    temp_c: Optional[float] = None

class GateActivity(BaseModel):
    id: str
    event_type: str # "GATE_IN", "GATE_OUT"
    license_plate: str
    vehicle_id: Optional[str] = None
    driver_name: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    assigned_bay: Optional[str] = None
    status: str = "CLEARED"

class ELDLogRecord(BaseModel):
    id: str
    driver_id: str
    driver_name: str
    vehicle_id: str
    current_duty_status: str = "DRIVING" # "OFF_DUTY", "SLEEPER_BERTH", "DRIVING", "ON_DUTY_NOT_DRIVING"
    driving_time_minutes: float = 420.0 # Limit: 660m (11h)
    on_duty_time_minutes: float = 540.0 # Limit: 840m (14h)
    cycle_time_minutes: float = 2100.0 # Limit: 4200m (70h/8d)
    time_until_break_minutes: float = 90.0 # Must rest before 480m driving
    compliance_status: str = "COMPLIANT" # "COMPLIANT", "APPROACHING_LIMIT", "VIOLATION"
    suggested_rest_stop: str = "Bay Area Oasis Plaza Rest Area (Exit 42B)"
    last_status_change: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class DutyStatusChangeRequest(BaseModel):
    driver_id: str
    new_duty_status: str # "OFF_DUTY", "SLEEPER_BERTH", "DRIVING", "ON_DUTY_NOT_DRIVING"
    notes: Optional[str] = None

class Order(BaseModel):
    id: str
    customer_name: str
    customer_phone: str
    origin: Location
    destination: Location
    priority: OrderPriority = OrderPriority.STANDARD
    status: OrderStatus = OrderStatus.IN_TRANSIT
    weight_kg: float = 12.5
    original_eta: str
    revised_eta: str
    delay_minutes: float = 0.0
    assigned_vehicle_id: Optional[str] = None
    tenant_id: Optional[str] = "default_enterprise"
    depot_id: Optional[str] = "DEPOT-01"
    proof_of_delivery: Optional[Dict[str, Any]] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class RouteWaypoint(BaseModel):
    lat: float
    lng: float
    segment_name: Optional[str] = None

class Route(BaseModel):
    id: str
    vehicle_id: str
    origin: Location
    destination: Location
    waypoints: List[RouteWaypoint]
    current_waypoint_idx: int = 0
    distance_km: float
    progress_percent: float = 0.0
    traffic_multiplier: float = 1.0
    weather_multiplier: float = 1.0
    is_active: bool = True
    color: Optional[str] = None

class Vehicle(BaseModel):
    id: str
    model: str
    license_plate: str = "7SFX000"
    type: str = "Delivery Van"
    status: VehicleStatus = VehicleStatus.ON_ROUTE
    location: Location
    speed_kmh: float = 42.0
    battery_fuel_percent: float = 88.0
    max_capacity_kg: float = 500.0
    current_load_kg: float = 145.0
    driver_id: Optional[str] = None
    current_route_id: Optional[str] = None
    assigned_order_ids: List[str] = Field(default_factory=list)
    fault_details: Optional[str] = None
    telemetry_health: str = "Optimal"
    cargo_temp_c: Optional[float] = None
    cargo_humidity_percent: Optional[float] = None
    door_open_alert: bool = False
    cargo_type: str = "GENERAL" # "GENERAL", "PHARMACEUTICAL", "PERISHABLE", "HAZMAT"
    tenant_id: Optional[str] = "default_enterprise"
    depot_id: Optional[str] = "DEPOT-01"
    odometer_km: float = 12450.0
    dtc_faults: List[str] = Field(default_factory=list)
    carbon_kg_today: float = 18.4
    heading: float = 0.0

class TelematicsPacket(BaseModel):
    vehicle_id: str
    lat: float
    lng: float
    speed_kmh: Optional[float] = None
    battery_fuel_percent: Optional[float] = None
    dtc_codes: List[str] = Field(default_factory=list)
    driver_id: Optional[str] = None
    cargo_temp_c: Optional[float] = None
    cargo_humidity_percent: Optional[float] = None
    door_open_alert: Optional[bool] = None
    cargo_type: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class ProofOfDelivery(BaseModel):
    order_id: str
    recipient_name: str
    signature_data: Optional[str] = None
    photo_url: Optional[str] = None
    delivered_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    notes: Optional[str] = None

class Incident(BaseModel):
    id: str
    type: IncidentType
    severity: IncidentSeverity = IncidentSeverity.HIGH
    title: str
    description: str
    affected_vehicle_ids: List[str] = Field(default_factory=list)
    affected_order_ids: List[str] = Field(default_factory=list)
    location: Optional[Location] = None
    detected_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    resolved_at: Optional[str] = None
    resolution_status: str = "Active" # "Active", "Resolving", "Resolved"
    resolution_summary: Optional[str] = None

class AgentToolCall(BaseModel):
    tool_name: str
    arguments: Dict[str, Any]
    result: Any
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    execution_time_ms: float = 12.0

class AgentStep(BaseModel):
    id: str
    agent_name: AgentName
    state: AgentState = AgentState.PENDING
    summary: str
    detail: str
    tool_calls: List[AgentToolCall] = Field(default_factory=list)
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class AgentExecutionTrace(BaseModel):
    incident_id: str
    steps: List[AgentStep] = Field(default_factory=list)
    final_decision: Optional[str] = None
    started_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    completed_at: Optional[str] = None

class LiveEvent(BaseModel):
    id: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    severity: IncidentSeverity = IncidentSeverity.INFO
    category: str = "Fleet"
    message: str
    vehicle_id: Optional[str] = None
    order_id: Optional[str] = None
    incident_id: Optional[str] = None

class MissionScore(BaseModel):
    score: int = 1450
    completed_orders_today: int = 428
    total_orders_today: int = 500
    active_incidents_count: int = 0
    resolved_incidents_count: int = 14
    avg_resolution_seconds: float = 38.5
    efficiency_percent: float = 94.2
    on_time_rate_percent: float = 97.8
    fuel_cost_today_usd: float = 1284.50
    current_level: int = 1

class DisruptionRequest(BaseModel):
    type: str # "BREAKDOWN", "TRAFFIC", "WEATHER", "DELAY", "REPAIR", "RESET", "SCENARIO", "GEOFENCE"
    vehicle_id: Optional[str] = None
    fault_type: Optional[str] = "Engine Failure"
    zone_id: Optional[str] = None
    traffic_condition: Optional[str] = "Congested"
    weather_condition: Optional[str] = "Storm"
    order_id: Optional[str] = None
    delay_minutes: Optional[float] = 15.0
    level: Optional[int] = None
    polygon_coords: Optional[List[List[float]]] = None
    hazard_name: Optional[str] = "Custom Road Hazard"
    # When False, the incident is created but multi-agent resolution is deferred until
    # an operator approves it (POST /simulation/resolve). Default True = autonomous.
    auto_resolve: Optional[bool] = True

class AddVehicleRequest(BaseModel):
    id: Optional[str] = None
    model: str = "Ford E-Transit"
    type: str = "Electric Cargo Van"
    battery_fuel_percent: float = 95.0
    max_capacity_kg: float = 650.0
    lat: Optional[float] = None
    lng: Optional[float] = None

class ModifyRouteRequest(BaseModel):
    destination_lat: Optional[float] = None
    destination_lng: Optional[float] = None
    destination_name: Optional[str] = "Downtown Core"
    zone_id: Optional[str] = None
    waypoints: Optional[List[Dict[str, Any]]] = None

class ToggleVehicleStatusRequest(BaseModel):
    status: Optional[str] = None # "MAINTENANCE", "AVAILABLE", "ON_ROUTE"

class CommandRequest(BaseModel):
    # Free-text / slash command from the Ask-Aegis command bar.
    command: str

class SimulationState(BaseModel):
    vehicles: List[Vehicle]
    orders: List[Order]
    routes: List[Route]
    active_incident: Optional[Incident] = None
    agent_steps: List[AgentStep] = Field(default_factory=list)
    events: List[LiveEvent] = Field(default_factory=list)
    metrics: MissionScore
    weather: Dict[str, Any]
    traffic_zones: Dict[str, Any]
    sim_time: str
    is_paused: bool = False
    speed_multiplier: float = 1.0
