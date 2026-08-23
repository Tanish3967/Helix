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
    license_plate: str
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
    tenant_id: Optional[str] = "default_enterprise"
    depot_id: Optional[str] = "DEPOT-01"
    odometer_km: float = 12450.0
    dtc_faults: List[str] = Field(default_factory=list)
    carbon_kg_today: float = 18.4

class TelematicsPacket(BaseModel):
    vehicle_id: str
    lat: float
    lng: float
    speed_kmh: Optional[float] = None
    battery_fuel_percent: Optional[float] = None
    dtc_codes: List[str] = Field(default_factory=list)
    driver_id: Optional[str] = None
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
