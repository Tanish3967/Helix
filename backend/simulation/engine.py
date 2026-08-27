import asyncio
import time
import random
from typing import Dict, List, Any, Optional, Set
from datetime import datetime, timedelta
from backend.models.schema import (
    Vehicle, Order, Route, Driver, Incident, AgentStep, LiveEvent, MissionScore,
    VehicleStatus, OrderStatus, IncidentSeverity, SimulationState, Location
)
from backend.simulation.world_data import generate_initial_world_data
from backend.agents.multi_agent_system import MultiAgentOrchestrator
from backend.simulation.blackbox import BlackboxRecorder

class SimulationEngine:
    def __init__(self):
        self.is_running = False
        self.is_paused = False
        self.speed_multiplier = 1.0 # 1.0x, 2.0x, 4.0x
        self.sim_time = datetime.utcnow()
        self.ws_clients: Set[Any] = set()
        
        # Load world data
        self.world_data = generate_initial_world_data()
        self.vehicles: List[Vehicle] = self.world_data["vehicles"]
        self.orders: List[Order] = self.world_data["orders"]
        self.routes: List[Route] = self.world_data["routes"]
        self.drivers: List[Driver] = self.world_data["drivers"]
        self.traffic_zones: Dict[str, Any] = self.world_data["traffic_zones"]
        self.weather: Dict[str, Any] = self.world_data["weather"]
        
        self.active_incident: Optional[Incident] = None
        # Guards against double-firing multi-agent resolution for the same incident
        # (e.g. auto-resolve + an operator "Approve Plan" both targeting it).
        self._resolving_incident_ids: Set[str] = set()
        self.recent_agent_steps: List[AgentStep] = []
        self.events: List[LiveEvent] = []
        
        self.metrics = MissionScore(
            score=1450,
            completed_orders_today=428,
            total_orders_today=500,
            active_incidents_count=0,
            resolved_incidents_count=14,
            avg_resolution_seconds=38.5,
            efficiency_percent=94.2,
            on_time_rate_percent=97.8,
            fuel_cost_today_usd=1284.50,
            current_level=1
        )
        
        self.world_state = {
            "vehicles": self.vehicles,
            "orders": self.orders,
            "routes": self.routes,
            "drivers": self.drivers,
            "traffic_zones": self.traffic_zones,
            "weather": self.weather,
            "metrics": self.metrics
        }
        
        # Multi-agent orchestrator
        self.orchestrator = MultiAgentOrchestrator(
            world_state=self.world_state,
            event_callback=self.broadcast_agent_event
        )
        
        # Autonomous flight recorder & telemetry blackbox
        self.blackbox = BlackboxRecorder()
        
        self._add_event(IncidentSeverity.INFO, "System", "Autonomous Fleet Operations Engine initialized with 100 vehicles & 20 active routes.")

    def _add_event(self, severity: IncidentSeverity, category: str, message: str, vehicle_id: Optional[str] = None, order_id: Optional[str] = None, incident_id: Optional[str] = None):
        ev = LiveEvent(
            id=f"EV-{int(time.time()*1000)}-{random.randint(100, 999)}",
            timestamp=datetime.utcnow().strftime("%H:%M:%S"),
            severity=severity,
            category=category,
            message=message,
            vehicle_id=vehicle_id,
            order_id=order_id,
            incident_id=incident_id
        )
        self.events.insert(0, ev)
        if len(self.events) > 120:
            self.events.pop()
        return ev

    async def broadcast(self, message_dict: Dict[str, Any]):
        """Broadcasts payload to all connected WebSockets."""
        if not self.ws_clients:
            return
        dead_clients = set()
        for ws in self.ws_clients:
            try:
                await ws.send_json(message_dict)
            except Exception:
                dead_clients.add(ws)
        self.ws_clients -= dead_clients

    async def broadcast_agent_event(self, event_data: Dict[str, Any]):
        if event_data.get("type") == "AGENT_STEP":
            step_data = event_data["step"]
            self.recent_agent_steps.append(AgentStep(**step_data))
            if len(self.recent_agent_steps) > 40:
                self.recent_agent_steps.pop(0)
            
            # Log to event feed
            severity = IncidentSeverity.HIGH if step_data["state"] == "RUNNING" else IncidentSeverity.INFO
            self._add_event(
                severity=severity,
                category=step_data["agent_name"],
                message=step_data["summary"],
                incident_id=event_data.get("incident_id")
            )
            
            # Attach live routes & vehicle states for real-time map updates
            event_data["routes"] = [r.model_dump() for r in self.routes if r.is_active]
            event_data["vehicles"] = [v.model_dump() for v in self.vehicles]
            event_data["active_incident"] = self.active_incident.model_dump() if self.active_incident else None
        
        await self.broadcast(event_data)

    def launch_resolution(self, incident: Optional[Incident]) -> bool:
        """Start multi-agent resolution for an incident exactly once.

        Returns True if a resolution task was dispatched, False if the incident is
        missing, already resolved, or a resolution is already in flight. Both the
        autonomous path (disruption auto_resolve) and the operator "Approve Plan"
        action funnel through here, so the id guard prevents a double-fire.
        """
        if incident is None:
            return False
        if incident.resolution_status == "Resolved":
            return False
        if incident.id in self._resolving_incident_ids:
            return False

        self._resolving_incident_ids.add(incident.id)

        async def _run():
            try:
                await self.orchestrator.resolve_incident(incident)
            finally:
                self._resolving_incident_ids.discard(incident.id)

        asyncio.create_task(_run())
        return True

    def get_full_state(self) -> Dict[str, Any]:
        return {
            "vehicles": [v.model_dump() for v in self.vehicles],
            "orders": [o.model_dump() for o in self.orders[:100]], # Active/relevant batch
            "all_orders_count": len(self.orders),
            "routes": [r.model_dump() for r in self.routes if r.is_active],
            "active_incident": self.active_incident.model_dump() if self.active_incident else None,
            "agent_steps": [s.model_dump() for s in self.recent_agent_steps],
            "events": [e.model_dump() for e in self.events[:40]],
            "metrics": self.metrics.model_dump(),
            "weather": self.weather,
            "traffic_zones": self.traffic_zones,
            "sim_time": self.sim_time.strftime("%H:%M:%S"),
            "is_paused": self.is_paused,
            "speed_multiplier": self.speed_multiplier
        }

    async def start(self):
        self.is_running = True
        while self.is_running:
            if not self.is_paused:
                await self.tick()
            await asyncio.sleep(1.0 / max(0.2, self.speed_multiplier))

    def stop(self):
        self.is_running = False

    async def tick(self):
        """Advances simulation by one operational unit."""
        self.sim_time += timedelta(seconds=int(4 * self.speed_multiplier))
        
        # 1. Update vehicle movement along route waypoints
        routes_map = {r.id: r for r in self.routes if r.is_active}
        
        for v in self.vehicles:
            if v.status in [VehicleStatus.ON_ROUTE, VehicleStatus.REASSIGNED] and v.current_route_id in routes_map:
                r = routes_map[v.current_route_id]
                if not r.waypoints:
                    continue
                
                # Check if broken
                if v.status == VehicleStatus.AT_RISK or v.fault_details is not None:
                    v.speed_kmh = 0.0
                    continue
                
                # Calculate movement step
                speed_factor = 1.0 / (r.traffic_multiplier * r.weather_multiplier)
                v.speed_kmh = round(random.uniform(38.0, 52.0) * speed_factor, 1)
                
                # Step waypoints
                if r.current_waypoint_idx < len(r.waypoints) - 1:
                    r.current_waypoint_idx += 1
                    curr_wp = r.waypoints[r.current_waypoint_idx]
                    v.location.lat = curr_wp.lat
                    v.location.lng = curr_wp.lng
                    
                    r.progress_percent = round((r.current_waypoint_idx / (len(r.waypoints) - 1)) * 100, 1)
                    v.battery_fuel_percent = max(5.0, round(v.battery_fuel_percent - random.uniform(0.05, 0.15), 1))
                else:
                    # Completed route!
                    r.is_active = False
                    r.progress_percent = 100.0
                    v.status = VehicleStatus.COMPLETED
                    v.speed_kmh = 0.0
                    
                    # Mark assigned orders delivered
                    for oid in v.assigned_order_ids:
                        o = next((ord for ord in self.orders if ord.id == oid), None)
                        if o and o.status != OrderStatus.DELIVERED:
                            o.status = OrderStatus.DELIVERED
                            self.metrics.completed_orders_today += 1
                            self.metrics.score += 75
                            self._add_event(IncidentSeverity.INFO, "Delivery", f"Order {o.id} successfully delivered to {o.customer_name} by vehicle {v.id}.", vehicle_id=v.id, order_id=o.id)

        # Broadcast telemetry update
        # 5. Record snapshot into autonomous blackbox flight recorder
        self.blackbox.record_tick(
            vehicles=self.vehicles,
            routes=self.routes,
            active_incident=self.active_incident,
            agent_steps=self.recent_agent_steps,
            sim_time=self.sim_time.strftime("%H:%M:%S"),
            metrics=self.metrics
        )

        # Note: weather + traffic_zones ride along each tick (tiny payload) so the
        # frontend map overlays react live to weather/traffic disruptions.
        await self.broadcast({
            "type": "TELEMETRY_TICK",
            "sim_time": self.sim_time.strftime("%H:%M:%S"),
            "is_paused": self.is_paused,
            "speed_multiplier": self.speed_multiplier,
            "vehicles": [
                {
                    "id": v.id,
                    "lat": v.location.lat,
                    "lng": v.location.lng,
                    "speed_kmh": v.speed_kmh,
                    "status": v.status,
                    "battery_fuel_percent": v.battery_fuel_percent,
                    "current_load_kg": v.current_load_kg,
                    "current_route_id": v.current_route_id,
                    "telemetry_health": v.telemetry_health
                } for v in self.vehicles
            ],
            "metrics": self.metrics.model_dump(),
            "weather": self.weather,
            "traffic_zones": self.traffic_zones
        })

    def reset_simulation(self):
        """Resets the simulation to the pristine starting state."""
        self.world_data = generate_initial_world_data()
        self.vehicles = self.world_data["vehicles"]
        self.orders = self.world_data["orders"]
        self.routes = self.world_data["routes"]
        self.drivers = self.world_data["drivers"]
        self.traffic_zones = self.world_data["traffic_zones"]
        self.weather = self.world_data["weather"]
        self.active_incident = None
        self._resolving_incident_ids.clear()
        self.recent_agent_steps = []
        self.events = []
        
        self.metrics = MissionScore(
            score=1450,
            completed_orders_today=428,
            total_orders_today=500,
            active_incidents_count=0,
            resolved_incidents_count=14,
            avg_resolution_seconds=38.5,
            efficiency_percent=94.2,
            on_time_rate_percent=97.8,
            fuel_cost_today_usd=1284.50,
            current_level=1
        )
        
        self.world_state.update({
            "vehicles": self.vehicles,
            "orders": self.orders,
            "routes": self.routes,
            "drivers": self.drivers,
            "traffic_zones": self.traffic_zones,
            "weather": self.weather,
            "metrics": self.metrics
        })
        
        self._add_event(IncidentSeverity.INFO, "System", "Simulation world reset to baseline state. All vehicles, routes, and incidents cleared.")

    def repair_vehicle(self, vehicle_id: str):
        v = next((veh for veh in self.vehicles if veh.id == vehicle_id), None)
        if v:
            v.status = VehicleStatus.ON_ROUTE if v.current_route_id else VehicleStatus.AVAILABLE
            v.fault_details = None
            v.telemetry_health = "Optimal"
            v.speed_kmh = 42.0
            if self.active_incident and vehicle_id in self.active_incident.affected_vehicle_ids:
                self.active_incident.resolution_status = "Resolved"
                self.active_incident.resolved_at = datetime.utcnow().isoformat()
            self._add_event(IncidentSeverity.INFO, "Maintenance", f"Vehicle {vehicle_id} maintenance cleared and returned to operational status.", vehicle_id=vehicle_id)

    def set_traffic_condition(self, zone_id: Optional[str], condition: str):
        mult = 1.0
        if condition.lower() in ["congested", "heavy"]:
            mult = 1.5
        elif condition.lower() in ["accident", "gridlock"]:
            mult = 2.5
        
        if zone_id and zone_id in self.traffic_zones:
            self.traffic_zones[zone_id]["condition"] = condition
            self.traffic_zones[zone_id]["multiplier"] = mult
            zone_name = self.traffic_zones[zone_id]["name"]
        else:
            for z in self.traffic_zones.values():
                z["condition"] = condition
                z["multiplier"] = mult
            zone_name = "Fleet-wide Grid"

        # Apply multiplier to all active routes
        for r in self.routes:
            r.traffic_multiplier = mult

        self._add_event(
            IncidentSeverity.HIGH if mult >= 2.0 else (IncidentSeverity.MEDIUM if mult > 1.0 else IncidentSeverity.INFO),
            "Traffic",
            f"Traffic status in {zone_name} set to '{condition}' ({mult}x delay multiplier)."
        )

    def set_weather_condition(self, condition: str):
        mult = 1.0
        temp = 22.0
        precip = 0.0
        wind = 12.0
        
        c_lower = condition.lower()
        if "rain" in c_lower and "heavy" not in c_lower:
            mult = 1.2
            temp = 16.5
            precip = 3.2
            wind = 22.0
        elif "heavy" in c_lower:
            mult = 1.5
            temp = 14.0
            precip = 9.8
            wind = 36.0
        elif "storm" in c_lower:
            mult = 2.0
            temp = 11.5
            precip = 24.5
            wind = 58.0
        
        self.weather.update({
            "condition": condition,
            "temperature_c": temp,
            "precipitation_rate": precip,
            "wind_speed_kmh": wind,
            "visibility_km": 4.0 if mult >= 1.5 else (7.5 if mult > 1.0 else 10.0),
            "multiplier": mult
        })

        for r in self.routes:
            r.weather_multiplier = mult

        self._add_event(
            IncidentSeverity.CRITICAL if mult >= 2.0 else (IncidentSeverity.MEDIUM if mult > 1.0 else IncidentSeverity.INFO),
            "Weather",
            f"Meteorological alert: Weather shifted to '{condition}' ({temp}°C, {mult}x safety speed buffer)."
        )

    def add_vehicle(self, data: Dict[str, Any]) -> Vehicle:
        """Adds a new vehicle to the fleet dynamically."""
        v_id = data.get("id")
        if not v_id:
            # Generate next V-number
            existing_nums = [int(v.id.replace("V", "")) for v in self.vehicles if v.id.replace("V", "").isdigit()]
            next_num = max(existing_nums, default=600) + 1
            v_id = f"V{next_num}"

        lat = data.get("lat") if data.get("lat") is not None else (37.7790 + random.uniform(-0.01, 0.01))
        lng = data.get("lng") if data.get("lng") is not None else (-122.4050 + random.uniform(-0.01, 0.01))
        model = data.get("model") or "Ford E-Transit"
        v_type = data.get("type") or "Electric Cargo Van"
        battery = data.get("battery_fuel_percent") if data.get("battery_fuel_percent") is not None else 95.0
        capacity = data.get("max_capacity_kg") if data.get("max_capacity_kg") is not None else 650.0
        
        new_v = Vehicle(
            id=v_id,
            model=model,
            license_plate=f"CA-{random.randint(1000, 9999)}",
            type=v_type,
            status=VehicleStatus.AVAILABLE,
            location=Location(lat=lat, lng=lng, address="Central Metro Hub", zone_id="downtown"),
            speed_kmh=0.0,
            battery_fuel_percent=float(battery),
            max_capacity_kg=float(capacity),
            current_load_kg=0.0,
            driver_id=None,
            current_route_id=None,
            assigned_order_ids=[],
            fault_details=None,
            telemetry_health="Optimal"
        )
        self.vehicles.append(new_v)
        self._add_event(IncidentSeverity.INFO, "Fleet Management", f"New vehicle {v_id} ({new_v.model}) onboarded to fleet.", vehicle_id=v_id)
        return new_v

    def remove_vehicle(self, vehicle_id: str) -> bool:
        """Removes a vehicle from the fleet."""
        v = next((veh for veh in self.vehicles if veh.id == vehicle_id), None)
        if not v:
            return False
        
        # Deactivate associated route if any
        if v.current_route_id:
            for r in self.routes:
                if r.id == v.current_route_id:
                    r.is_active = False
        
        self.vehicles = [veh for veh in self.vehicles if veh.id != vehicle_id]
        self.world_state["vehicles"] = self.vehicles
        self._add_event(IncidentSeverity.INFO, "Fleet Management", f"Vehicle {vehicle_id} decommissioned and removed from fleet.", vehicle_id=vehicle_id)
        return True

    def toggle_vehicle_status(self, vehicle_id: str, new_status: Optional[str] = None) -> Optional[Vehicle]:
        """Toggles vehicle status between AVAILABLE and MAINTENANCE, or sets specific status."""
        v = next((veh for veh in self.vehicles if veh.id == vehicle_id), None)
        if not v:
            return None
        
        if new_status:
            v.status = VehicleStatus(new_status)
        else:
            if v.status == VehicleStatus.MAINTENANCE:
                v.status = VehicleStatus.AVAILABLE
                v.fault_details = None
                v.telemetry_health = "Optimal"
            else:
                v.status = VehicleStatus.MAINTENANCE
                v.speed_kmh = 0.0
                v.fault_details = "Disabled for scheduled maintenance"
                v.telemetry_health = "Maintenance Mode"
                
        self._add_event(
            IncidentSeverity.INFO,
            "Fleet Management",
            f"Vehicle {vehicle_id} status updated to '{v.status.value}'.",
            vehicle_id=vehicle_id
        )
        return v

    def modify_vehicle_route(self, vehicle_id: str, dest_lat: float, dest_lng: float, dest_name: str, zone_id: Optional[str] = None, custom_waypoints: Optional[List[Dict[str, Any]]] = None) -> Optional[Route]:
        """Manually reroutes a vehicle to a new destination and updates active waypoints."""
        from backend.simulation.world_data import generate_smooth_waypoints
        
        v = next((veh for veh in self.vehicles if veh.id == vehicle_id), None)
        if not v:
            return None

        if custom_waypoints and len(custom_waypoints) >= 2:
            from backend.models.schema import RouteWaypoint
            waypoints = [
                RouteWaypoint(lat=w.get("lat", 0.0), lng=w.get("lng", 0.0), segment_name=w.get("segment_name", f"Segment-{i+1}"))
                for i, w in enumerate(custom_waypoints)
            ]
        else:
            # Generate new waypoints from current vehicle location to destination
            waypoints = generate_smooth_waypoints(v.location.lat, v.location.lng, dest_lat, dest_lng, num_points=25)
        
        # Deactivate old route
        if v.current_route_id:
            for r in self.routes:
                if r.id == v.current_route_id:
                    r.is_active = False

        new_route_id = f"RT-MANUAL-{vehicle_id}-{int(time.time())}"
        route_colors = ["#10B981", "#3B82F6", "#F59E0B", "#EC4899", "#06B6D4", "#8B5CF6", "#14B8A6", "#F97316"]
        
        new_route = Route(
            id=new_route_id,
            vehicle_id=vehicle_id,
            origin=Location(lat=v.location.lat, lng=v.location.lng, address=f"Current Loc ({vehicle_id})"),
            destination=Location(lat=dest_lat, lng=dest_lng, address=dest_name, zone_id=zone_id or "downtown"),
            waypoints=waypoints,
            current_waypoint_idx=0,
            distance_km=round(random.uniform(6.0, 18.0), 1),
            progress_percent=0.0,
            traffic_multiplier=self.weather.get("multiplier", 1.0),
            weather_multiplier=1.0,
            is_active=True,
            color=random.choice(route_colors)
        )
        
        self.routes.append(new_route)
        v.current_route_id = new_route_id
        v.status = VehicleStatus.ON_ROUTE
        v.fault_details = None
        v.telemetry_health = "Optimal"
        v.speed_kmh = 45.0
        
        self._add_event(
            IncidentSeverity.INFO,
            "Manual Routing",
            f"Vehicle {vehicle_id} manually rerouted to {dest_name} (Route ID: {new_route_id}).",
            vehicle_id=vehicle_id
        )
        return new_route
