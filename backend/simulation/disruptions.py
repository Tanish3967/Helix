import time
from datetime import datetime
from typing import Optional, Dict, Any
from backend.models.schema import (
    Incident, IncidentType, IncidentSeverity, VehicleStatus, OrderStatus, Location
)
from backend.simulation.engine import SimulationEngine
from backend.models.db import save_incident

class DisruptionManager:
    def __init__(self, engine: SimulationEngine):
        self.engine = engine

    async def trigger_breakdown(self, vehicle_id: str = "V481", fault_type: str = "Engine Failure detected", auto_resolve: bool = True) -> Incident:
        """Injects a vehicle breakdown fault and triggers multi-agent recovery."""
        import random
        
        if not vehicle_id or vehicle_id.upper() in ["RANDOM", "ANY"]:
            on_route_vehicles = [v for v in self.engine.vehicles if v.status == VehicleStatus.ON_ROUTE]
            if on_route_vehicles:
                target_v = random.choice(on_route_vehicles)
            else:
                target_v = random.choice(self.engine.vehicles)
            vehicle_id = target_v.id
            fault_type = random.choice([
                "Engine Overheat & Stalling",
                "Battery Inverter Malfunction",
                "Brake Hydraulic Pressure Loss",
                "Transmission Sensor Fault",
                "Tire Blowout on Arterial Road"
            ])
        else:
            target_v = next((v for v in self.engine.vehicles if v.id == vehicle_id), None)
            if not target_v:
                target_v = self.engine.vehicles[0]
                vehicle_id = target_v.id

        # Update vehicle status
        target_v.status = VehicleStatus.AT_RISK
        target_v.fault_details = fault_type
        target_v.telemetry_health = f"CRITICAL: {fault_type}"
        target_v.speed_kmh = 0.0

        # Mark orders as AT_RISK
        affected_orders = [o for o in self.engine.orders if o.assigned_vehicle_id == vehicle_id]
        if not affected_orders:
            # Reassign active orders nearby to make incident realistic
            affected_orders = [o for o in self.engine.orders if o.status == OrderStatus.IN_TRANSIT][:3]
            for o in affected_orders:
                o.assigned_vehicle_id = vehicle_id
                
        for o in affected_orders:
            o.status = OrderStatus.AT_RISK

        # Create Incident record
        incident_id = f"INC-{int(time.time()*1000)}"
        incident = Incident(
            id=incident_id,
            type=IncidentType.VEHICLE_BREAKDOWN,
            severity=IncidentSeverity.CRITICAL,
            title=f"Vehicle {vehicle_id} Breakdown ({fault_type})",
            description=f"Critical telemetry alert on {target_v.model} ({target_v.license_plate}): {fault_type}. Immediate dispatch reassignment required.",
            affected_vehicle_ids=[vehicle_id],
            affected_order_ids=[o.id for o in affected_orders],
            location=target_v.location,
            detected_at=datetime.utcnow().isoformat(),
            resolution_status="Active"
        )

        self.engine.active_incident = incident
        self.engine.metrics.active_incidents_count += 1
        save_incident(incident.model_dump())

        # Log event
        self.engine._add_event(
            severity=IncidentSeverity.CRITICAL,
            category="Fault Injection",
            message=f"CRITICAL: Vehicle {vehicle_id} breakdown ({fault_type}). {len(affected_orders)} deliveries at risk.",
            vehicle_id=vehicle_id,
            incident_id=incident_id
        )

        # Broadcast incident creation to frontend
        await self.engine.broadcast({
            "type": "INCIDENT_DETECTED",
            "incident": incident.model_dump(),
            "vehicles": [v.model_dump() for v in self.engine.vehicles],
            "orders": [o.model_dump() for o in self.engine.orders],
            "events": [e.model_dump() if hasattr(e, "model_dump") else e for e in self.engine.events[-30:]],
            "metrics": self.engine.metrics.model_dump(),
            "traffic_zones": self.engine.traffic_zones,
            "weather": self.engine.weather
        })

        # Launch Multi-Agent autonomous resolution in background (deferred when the
        # operator opts to approve the plan manually via /simulation/resolve).
        if auto_resolve:
            self.engine.launch_resolution(incident)

        return incident

    async def trigger_traffic_spike(self, zone_id: Optional[str] = "highway_101", condition: str = "Accident", auto_resolve: bool = True) -> Incident:
        """Injects traffic congestion or accident on a key corridor."""
        import random
        if not zone_id or zone_id.upper() in ["RANDOM", "ANY"]:
            zone_id = random.choice(list(self.engine.traffic_zones.keys()))
            condition = random.choice(["Accident", "Congested", "Gridlock"])

        self.engine.set_traffic_condition(zone_id=zone_id, condition=condition)
        zone_info = self.engine.traffic_zones.get(zone_id, {"name": "Highway Corridor", "lat": 37.7400, "lng": -122.4050})

        incident_id = f"INC-TRAFFIC-{int(time.time()*1000)}"
        incident = Incident(
            id=incident_id,
            type=IncidentType.TRAFFIC_CONGESTION,
            severity=IncidentSeverity.HIGH,
            title=f"Traffic Gridlock Alert: {zone_info['name']}",
            description=f"Severe traffic condition '{condition}' detected in {zone_info['name']}. Routes passing through zone require dynamic detour rerouting.",
            affected_vehicle_ids=[v.id for v in self.engine.vehicles if v.status == VehicleStatus.ON_ROUTE][:4],
            affected_order_ids=[],
            location=Location(lat=zone_info.get("lat", 37.7400), lng=zone_info.get("lng", -122.4050)),
            detected_at=datetime.utcnow().isoformat(),
            resolution_status="Active"
        )

        self.engine.active_incident = incident
        self.engine.metrics.active_incidents_count += 1
        save_incident(incident.model_dump())

        await self.engine.broadcast({
            "type": "INCIDENT_DETECTED",
            "incident": incident.model_dump(),
            "vehicles": [v.model_dump() for v in self.engine.vehicles],
            "orders": [o.model_dump() for o in self.engine.orders],
            "events": [e.model_dump() if hasattr(e, "model_dump") else e for e in self.engine.events[-30:]],
            "metrics": self.engine.metrics.model_dump(),
            "traffic_zones": self.engine.traffic_zones,
            "weather": self.engine.weather
        })

        if auto_resolve:
            self.engine.launch_resolution(incident)
        return incident

    async def trigger_weather_alert(self, condition: str = "Storm", auto_resolve: bool = True) -> Incident:
        """Injects severe weather disruption fleet-wide."""
        import random
        if not condition or condition.upper() in ["RANDOM", "ANY"]:
            condition = random.choice(["Storm", "Heavy Rain", "Thunderstorm"])

        self.engine.set_weather_condition(condition=condition)

        incident_id = f"INC-WEATHER-{int(time.time()*1000)}"
        incident = Incident(
            id=incident_id,
            type=IncidentType.SEVERE_WEATHER,
            severity=IncidentSeverity.HIGH,
            title=f"Severe Meteorological Warning: {condition}",
            description=f"Adverse weather condition '{condition}' activated. 2.0x safety speed reduction applied fleet-wide. Rerouting away from exposed corridors.",
            affected_vehicle_ids=[v.id for v in self.engine.vehicles if v.status == VehicleStatus.ON_ROUTE][:6],
            affected_order_ids=[],
            location=Location(lat=37.7749, lng=-122.4194),
            detected_at=datetime.utcnow().isoformat(),
            resolution_status="Active"
        )

        self.engine.active_incident = incident
        self.engine.metrics.active_incidents_count += 1
        save_incident(incident.model_dump())

        await self.engine.broadcast({
            "type": "INCIDENT_DETECTED",
            "incident": incident.model_dump(),
            "vehicles": [v.model_dump() for v in self.engine.vehicles],
            "orders": [o.model_dump() for o in self.engine.orders],
            "events": [e.model_dump() if hasattr(e, "model_dump") else e for e in self.engine.events[-30:]],
            "metrics": self.engine.metrics.model_dump(),
            "traffic_zones": self.engine.traffic_zones,
            "weather": self.engine.weather
        })

        if auto_resolve:
            self.engine.launch_resolution(incident)
        return incident

    async def trigger_delivery_delay(self, order_id: str = "ORD-4811", delay_minutes: float = 25.0, auto_resolve: bool = True) -> Incident:
        """Injects manual customer delivery delay."""
        import random
        if not order_id or order_id.upper() in ["RANDOM", "ANY"]:
            active_orders = [o for o in self.engine.orders if o.status != OrderStatus.DELIVERED]
            if active_orders:
                order = random.choice(active_orders)
            else:
                order = self.engine.orders[0]
            order_id = order.id
            delay_minutes = random.choice([20.0, 25.0, 35.0, 45.0])
        else:
            order = next((o for o in self.engine.orders if o.id == order_id), None)
            if not order:
                order = self.engine.orders[0]
                order_id = order.id

        order.delay_minutes += delay_minutes
        order.status = OrderStatus.AT_RISK

        incident_id = f"INC-DELAY-{int(time.time()*1000)}"
        incident = Incident(
            id=incident_id,
            type=IncidentType.HIGH_PRIORITY_ORDER,
            severity=IncidentSeverity.MEDIUM,
            title=f"Delivery Delay SLA Alert: Order {order_id}",
            description=f"Order {order_id} destined for {order.customer_name} delayed by +{int(delay_minutes)}m. Customer agent alert required.",
            affected_vehicle_ids=[order.assigned_vehicle_id] if order.assigned_vehicle_id else [],
            affected_order_ids=[order_id],
            location=order.destination,
            detected_at=datetime.utcnow().isoformat(),
            resolution_status="Active"
        )

        self.engine.active_incident = incident
        save_incident(incident.model_dump())

        await self.engine.broadcast({
            "type": "INCIDENT_DETECTED",
            "incident": incident.model_dump(),
            "vehicles": [v.model_dump() for v in self.engine.vehicles],
            "orders": [o.model_dump() for o in self.engine.orders],
            "events": [e.model_dump() if hasattr(e, "model_dump") else e for e in self.engine.events[-30:]],
            "metrics": self.engine.metrics.model_dump(),
            "traffic_zones": self.engine.traffic_zones,
            "weather": self.engine.weather
        })

        if auto_resolve:
            self.engine.launch_resolution(incident)
        return incident

    async def trigger_geofence_hazard(self, polygon_coords: Optional[list] = None, hazard_name: str = "Construction & Road Closure", auto_resolve: bool = True) -> Incident:
        """Injects a custom-drawn polygon geofence hazard and reroutes affected vehicles."""
        import random
        if polygon_coords and len(polygon_coords) >= 3:
            avg_lng = sum(p[0] for p in polygon_coords) / len(polygon_coords)
            avg_lat = sum(p[1] for p in polygon_coords) / len(polygon_coords)
        else:
            avg_lat, avg_lng = 37.7820, -122.4100
            polygon_coords = [
                [-122.4150, 37.7850],
                [-122.4050, 37.7850],
                [-122.4050, 37.7780],
                [-122.4150, 37.7780]
            ]
            
        affected_vehicles = []
        for v in self.engine.vehicles:
            d = ((v.location.lat - avg_lat)**2 + (v.location.lng - avg_lng)**2)**0.5
            if d < 0.025 and v.status == VehicleStatus.ON_ROUTE:
                affected_vehicles.append(v.id)
                if len(affected_vehicles) >= 3:
                    break
        if not affected_vehicles:
            on_route_v = [v.id for v in self.engine.vehicles if v.status == VehicleStatus.ON_ROUTE]
            affected_vehicles = [random.choice(on_route_v)] if on_route_v else ["V481"]

        incident_id = f"INC-GEO-{int(time.time()*1000)}"
        incident = Incident(
            id=incident_id,
            type=IncidentType.TRAFFIC_CONGESTION,
            severity=IncidentSeverity.HIGH,
            title=f"Geofence Hazard: {hazard_name}",
            description=f"Operator drew geofence disruption '{hazard_name}' affecting {len(affected_vehicles)} vehicles ({', '.join(affected_vehicles)}). Dynamic multi-agent corridor detour initiated.",
            affected_vehicle_ids=affected_vehicles,
            affected_order_ids=[],
            location=Location(lat=avg_lat, lng=avg_lng, address=hazard_name, zone_id="custom_geofence"),
            detected_at=datetime.utcnow().isoformat(),
            resolution_status="Active"
        )
        self.engine.active_incident = incident
        save_incident(incident.model_dump())
        await self.engine.broadcast({
            "type": "INCIDENT_DETECTED",
            "incident": incident.model_dump(),
            "vehicles": [v.model_dump() for v in self.engine.vehicles],
            "orders": [o.model_dump() for o in self.engine.orders],
            "events": [e.model_dump() if hasattr(e, "model_dump") else e for e in self.engine.events[-30:]],
            "metrics": self.engine.metrics.model_dump(),
            "traffic_zones": self.engine.traffic_zones,
            "weather": self.engine.weather
        })
        if auto_resolve:
            self.engine.launch_resolution(incident)
        return incident
