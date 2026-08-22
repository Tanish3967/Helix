import random
import math
from typing import List, Dict, Any
from datetime import datetime, timedelta
from backend.models.schema import (
    Vehicle, Driver, Order, Route, RouteWaypoint, Location,
    VehicleStatus, OrderPriority, OrderStatus, WeatherCondition, TrafficCondition
)

# Metro bounding coordinates (San Francisco Metro hub)
METRO_CENTER = {"lat": 37.7749, "lng": -122.4194}

ZONES = [
    {"id": "downtown", "name": "Downtown Core", "lat": 37.7880, "lng": -122.4075, "traffic": "Normal", "multiplier": 1.0},
    {"id": "financial", "name": "Financial District", "lat": 37.7940, "lng": -122.3990, "traffic": "Normal", "multiplier": 1.0},
    {"id": "mission", "name": "Mission Logistics", "lat": 37.7599, "lng": -122.4148, "traffic": "Normal", "multiplier": 1.0},
    {"id": "soma", "name": "SoMa Tech Zone", "lat": 37.7780, "lng": -122.4010, "traffic": "Normal", "multiplier": 1.0},
    {"id": "sunset", "name": "Sunset District", "lat": 37.7550, "lng": -122.4850, "traffic": "Normal", "multiplier": 1.0},
    {"id": "bay_bridge", "name": "Bay Bridge Corridor", "lat": 37.7980, "lng": -122.3780, "traffic": "Normal", "multiplier": 1.0},
    {"id": "highway_101", "name": "Highway 101 Arterial", "lat": 37.7400, "lng": -122.4050, "traffic": "Normal", "multiplier": 1.0},
    {"id": "port", "name": "Harbor Freight Terminal", "lat": 37.7650, "lng": -122.3850, "traffic": "Normal", "multiplier": 1.0}
]

DEPOTS = [
    {"id": "DEPOT-01", "name": "Central Metro Hub", "lat": 37.7790, "lng": -122.4050, "address": "400 Howard St, San Francisco"},
    {"id": "DEPOT-02", "name": "Mission Distribution Center", "lat": 37.7580, "lng": -122.4180, "address": "2200 Mission St, San Francisco"},
    {"id": "DEPOT-03", "name": "Presidio Northern Hub", "lat": 37.7980, "lng": -122.4460, "address": "120 Presidio Blvd, San Francisco"},
    {"id": "DEPOT-04", "name": "Bayshore Cargo Terminal", "lat": 37.7350, "lng": -122.3950, "address": "1500 Bayshore Hwy, San Francisco"}
]

FIRST_NAMES = ["Alex", "Jordan", "Taylor", "Morgan", "Sam", "Chris", "Pat", "Casey", "Riley", "Avery", "Dakota", "Jamie", "Logan", "Jesse", "Reese"]
LAST_NAMES = ["Chen", "Rodriguez", "Smith", "Patel", "Johnson", "Kim", "Nguyen", "Muller", "Davis", "Wilson", "Garcia", "Brown", "Taylor", "Wong"]
VEHICLE_MODELS = [
    ("Ford E-Transit", "Electric Cargo Van", 650.0),
    ("Mercedes Sprinter 2500", "High-Roof Van", 800.0),
    ("Rivian EDV-700", "Smart Electric Van", 750.0),
    ("Ram ProMaster 3500", "Heavy Logistics Van", 900.0),
    ("BrightDrop Zevo 600", "Long-Range EV Van", 700.0)
]

def generate_smooth_waypoints(start_lat: float, start_lng: float, end_lat: float, end_lng: float, num_points: int = 25) -> List[RouteWaypoint]:
    waypoints = []
    # Add gentle realistic curvature simulating street grid turns
    angle = math.atan2(end_lat - start_lat, end_lng - start_lng)
    perp_angle = angle + math.pi / 2
    curve_amplitude = random.uniform(-0.006, 0.006)

    for i in range(num_points):
        t = i / (num_points - 1)
        # S-curve ease for realistic street movement
        smooth_t = t * t * (3 - 2 * t)
        lat = start_lat + (end_lat - start_lat) * smooth_t
        lng = start_lng + (end_lng - start_lng) * smooth_t
        
        # Add slight perpendicular deviation
        lateral_offset = math.sin(math.pi * t) * curve_amplitude
        lat += lateral_offset * math.cos(perp_angle)
        lng += lateral_offset * math.sin(perp_angle)
        
        waypoints.append(RouteWaypoint(lat=round(lat, 6), lng=round(lng, 6), segment_name=f"Segment-{i+1}"))
    return waypoints

def generate_initial_world_data() -> Dict[str, Any]:
    random.seed(42) # Seed for consistent initial state
    
    # 1. Generate 10 Drivers
    drivers: List[Driver] = []
    for i in range(1, 11):
        name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
        drivers.append(Driver(
            id=f"DRV-{100+i}",
            name=name,
            phone=f"+1 (555) {random.randint(200, 999)}-{random.randint(1000, 9999)}",
            status="Active",
            shift_hours=round(random.uniform(1.5, 6.0), 1),
            fatigue_score=round(random.uniform(0.05, 0.35), 2),
            assigned_vehicle_id=None
        ))

    ROUTE_COLORS = [
        "#10B981", "#3B82F6", "#F59E0B", "#EC4899", "#06B6D4",
        "#8B5CF6", "#14B8A6", "#F97316", "#6366F1", "#EAB308",
        "#0EA5E9", "#84CC16", "#A855F7", "#D946EF", "#22C55E",
        "#38BDF8", "#FB923C", "#A78BFA", "#4ADE80", "#F43F5E"
    ]

    # 2. Generate 20 Key Metropolitan Routes
    routes: List[Route] = []
    for i in range(1, 21):
        depot = DEPOTS[(i - 1) % len(DEPOTS)]
        zone = ZONES[(i * 3) % len(ZONES)]
        
        # Add random destination offset in target zone
        dest_lat = zone["lat"] + random.uniform(-0.015, 0.015)
        dest_lng = zone["lng"] + random.uniform(-0.015, 0.015)
        
        waypoints = generate_smooth_waypoints(depot["lat"], depot["lng"], dest_lat, dest_lng, num_points=random.randint(20, 30))
        dist_km = round(random.uniform(8.5, 24.0), 1)
        route_color = ROUTE_COLORS[(i - 1) % len(ROUTE_COLORS)]
        
        routes.append(Route(
            id=f"RT-{100+i}",
            vehicle_id=f"V{480 + i}" if i <= 10 else f"V{500 + i}",
            origin=Location(lat=depot["lat"], lng=depot["lng"], address=depot["name"], zone_id="depot"),
            destination=Location(lat=dest_lat, lng=dest_lng, address=f"{zone['name']} Delivery Zone", zone_id=zone["id"]),
            waypoints=waypoints,
            current_waypoint_idx=random.randint(2, len(waypoints) - 8),
            distance_km=dist_km,
            progress_percent=round(random.uniform(15.0, 65.0), 1),
            traffic_multiplier=1.0,
            weather_multiplier=1.0,
            is_active=True,
            color=route_color
        ))

    # 3. Generate 100 Vehicles
    vehicles: List[Vehicle] = []
    vehicle_ids = [481, 517, 509, 526] + [v for v in range(400, 500) if v not in [481]] + [v for v in range(501, 540) if v not in [517, 509, 526]]
    vehicle_ids = vehicle_ids[:100]

    for idx, v_num in enumerate(vehicle_ids):
        v_id = f"V{v_num}"
        model_info = random.choice(VEHICLE_MODELS)
        
        # Vehicles with active routes
        if idx < len(routes):
            route = routes[idx]
            route.vehicle_id = v_id
            curr_wp = route.waypoints[route.current_waypoint_idx]
            status = VehicleStatus.ON_ROUTE
            loc = Location(lat=curr_wp.lat, lng=curr_wp.lng, zone_id=route.destination.zone_id)
            speed = round(random.uniform(35.0, 55.0), 1)
            battery = round(random.uniform(65.0, 95.0), 1)
            load = round(random.uniform(120.0, model_info[2] * 0.75), 1)
            route_id = route.id
            driver_id = drivers[idx % len(drivers)].id
            drivers[idx % len(drivers)].assigned_vehicle_id = v_id
        else:
            # Staging/Available vehicles distributed near depots and key logistics nodes
            depot = random.choice(DEPOTS)
            status = VehicleStatus.AVAILABLE
            lat = depot["lat"] + random.uniform(-0.01, 0.01)
            lng = depot["lng"] + random.uniform(-0.01, 0.01)
            loc = Location(lat=lat, lng=lng, zone_id="depot", address=depot["name"])
            speed = 0.0
            battery = round(random.uniform(80.0, 99.0), 1)
            load = round(random.uniform(0.0, 50.0), 1)
            route_id = None
            driver_id = None

        # Ensure V481 is configured with 3 assigned deliveries on Route 4
        if v_id == "V481":
            battery = 82.0
            load = 210.0
            status = VehicleStatus.ON_ROUTE
            telemetry_health = "Optimal"
        elif v_id == "V517": # Target replacement vehicle
            battery = 94.0
            load = 45.0
            status = VehicleStatus.AVAILABLE
            telemetry_health = "Optimal"
        elif v_id == "V509": # Constrained vehicle (low capacity)
            battery = 78.0
            load = model_info[2] * 0.92
            status = VehicleStatus.AVAILABLE
            telemetry_health = "Optimal"
        elif v_id == "V526": # Constrained vehicle (low battery)
            battery = 18.0
            load = 60.0
            status = VehicleStatus.AVAILABLE
            telemetry_health = "Low Battery Warning"
        else:
            telemetry_health = "Optimal"

        vehicles.append(Vehicle(
            id=v_id,
            model=model_info[0],
            license_plate=f"7SFX{random.randint(100, 999)}",
            type=model_info[1],
            status=status,
            location=loc,
            speed_kmh=speed,
            battery_fuel_percent=battery,
            max_capacity_kg=model_info[2],
            current_load_kg=load,
            driver_id=driver_id,
            current_route_id=route_id,
            assigned_order_ids=[],
            fault_details=None,
            telemetry_health=telemetry_health
        ))

    # 4. Generate 500 Orders
    orders: List[Order] = []
    now = datetime.utcnow()
    
    # Specific orders for V481 as defined in PRD
    v481_orders = [
        Order(
            id="ORD-4811",
            customer_name="Salesforce Tower Logistics",
            customer_phone="+1 (415) 555-0192",
            origin=Location(lat=37.7790, lng=-122.4050, address="400 Howard St Hub"),
            destination=Location(lat=37.7897, lng=-122.3972, address="415 Mission St, SF"),
            priority=OrderPriority.HIGH,
            status=OrderStatus.IN_TRANSIT,
            weight_kg=45.0,
            original_eta=(now + timedelta(minutes=22)).strftime("%H:%M:%S"),
            revised_eta=(now + timedelta(minutes=22)).strftime("%H:%M:%S"),
            delay_minutes=0.0,
            assigned_vehicle_id="V481"
        ),
        Order(
            id="ORD-4812",
            customer_name="Biotech Labs Inc",
            customer_phone="+1 (415) 555-0143",
            origin=Location(lat=37.7790, lng=-122.4050, address="400 Howard St Hub"),
            destination=Location(lat=37.7680, lng=-122.3920, address="1700 Owens St, SF"),
            priority=OrderPriority.HIGH,
            status=OrderStatus.IN_TRANSIT,
            weight_kg=60.0,
            original_eta=(now + timedelta(minutes=35)).strftime("%H:%M:%S"),
            revised_eta=(now + timedelta(minutes=35)).strftime("%H:%M:%S"),
            delay_minutes=0.0,
            assigned_vehicle_id="V481"
        ),
        Order(
            id="ORD-4813",
            customer_name="Pacific FinTech HQ",
            customer_phone="+1 (415) 555-0188",
            origin=Location(lat=37.7790, lng=-122.4050, address="400 Howard St Hub"),
            destination=Location(lat=37.7925, lng=-122.4005, address="555 California St, SF"),
            priority=OrderPriority.STANDARD,
            status=OrderStatus.IN_TRANSIT,
            weight_kg=35.0,
            original_eta=(now + timedelta(minutes=48)).strftime("%H:%M:%S"),
            revised_eta=(now + timedelta(minutes=48)).strftime("%H:%M:%S"),
            delay_minutes=0.0,
            assigned_vehicle_id="V481"
        )
    ]
    orders.extend(v481_orders)
    
    # Assign order IDs to V481
    for v in vehicles:
        if v.id == "V481":
            v.assigned_order_ids = [o.id for o in v481_orders]

    # Generate remaining 497 orders distributed across active vehicles and pending queue
    active_vehicles = [v for v in vehicles if v.status == VehicleStatus.ON_ROUTE and v.id != "V481"]
    
    for i in range(4, 501):
        order_id = f"ORD-{1000 + i}"
        customer_first = random.choice(FIRST_NAMES)
        customer_last = random.choice(LAST_NAMES)
        company_suffix = random.choice(["Enterprises", "Labs", "Studios", "Medical", "Design Co", "Solutions", "Retail", "HQ"])
        customer_name = f"{customer_first} {customer_last} ({company_suffix})" if i % 3 == 0 else f"{customer_first} {customer_last}"
        
        origin_depot = random.choice(DEPOTS)
        target_zone = random.choice(ZONES)
        
        dest_lat = target_zone["lat"] + random.uniform(-0.015, 0.015)
        dest_lng = target_zone["lng"] + random.uniform(-0.015, 0.015)
        
        priority = OrderPriority.HIGH if random.random() < 0.20 else (OrderPriority.STANDARD if random.random() < 0.70 else OrderPriority.LOW)
        eta_minutes = random.randint(15, 120)
        
        # Assign to active vehicles
        assigned_v_id = None
        status = OrderStatus.PENDING
        if active_vehicles and i < 200:
            target_v = random.choice(active_vehicles)
            assigned_v_id = target_v.id
            status = OrderStatus.IN_TRANSIT
            target_v.assigned_order_ids.append(order_id)
        elif i >= 400:
            status = OrderStatus.DELIVERED
        
        orders.append(Order(
            id=order_id,
            customer_name=customer_name,
            customer_phone=f"+1 (415) 555-{random.randint(1000, 9999)}",
            origin=Location(lat=origin_depot["lat"], lng=origin_depot["lng"], address=origin_depot["name"]),
            destination=Location(lat=round(dest_lat, 6), lng=round(dest_lng, 6), address=f"{random.randint(100, 999)} Market St, Zone: {target_zone['name']}"),
            priority=priority,
            status=status,
            weight_kg=round(random.uniform(5.0, 75.0), 1),
            original_eta=(now + timedelta(minutes=eta_minutes)).strftime("%H:%M:%S"),
            revised_eta=(now + timedelta(minutes=eta_minutes)).strftime("%H:%M:%S"),
            delay_minutes=0.0,
            assigned_vehicle_id=assigned_v_id
        ))

    # 5. Traffic Zones Map
    traffic_zones = {z["id"]: {"name": z["name"], "lat": z["lat"], "lng": z["lng"], "condition": "Normal", "multiplier": 1.0} for z in ZONES}

    # 6. Weather Initial State
    weather = {
        "condition": WeatherCondition.CLEAR,
        "temperature_c": 22.5,
        "precipitation_rate": 0.0,
        "wind_speed_kmh": 14.0,
        "visibility_km": 10.0,
        "multiplier": 1.0
    }

    return {
        "vehicles": vehicles,
        "orders": orders,
        "routes": routes,
        "drivers": drivers,
        "traffic_zones": traffic_zones,
        "weather": weather,
        "depots": DEPOTS
    }
