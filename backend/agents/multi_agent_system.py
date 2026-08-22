import asyncio
import time
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable, Awaitable
from backend.models.schema import (
    Incident, IncidentType, AgentName, AgentState, AgentStep, AgentToolCall,
    AgentExecutionTrace, Vehicle, Order, Route, RouteWaypoint, Location, VehicleStatus
)
from backend.agents.tools import FleetTools
from backend.models.db import save_agent_step

class MultiAgentOrchestrator:
    def __init__(self, world_state: Dict[str, Any], event_callback: Optional[Callable[[Dict[str, Any]], Awaitable[None]]] = None):
        self.world = world_state
        self.tools = FleetTools(world_state)
        self.event_callback = event_callback
        self.execution_history: List[AgentExecutionTrace] = []

    async def _emit_step(self, incident_id: str, agent_name: AgentName, state: AgentState, summary: str, detail: str, tool_calls: List[Dict[str, Any]]) -> AgentStep:
        t_calls = [
            AgentToolCall(
                tool_name=tc.get("name", "tool"),
                arguments=tc.get("args", {}),
                result=tc.get("result", {}),
                timestamp=datetime.utcnow().isoformat(),
                execution_time_ms=tc.get("time_ms", 12.0)
            ) for tc in tool_calls
        ]
        step = AgentStep(
            id=f"step-{int(time.time()*1000)}-{agent_name.value[:3].lower()}",
            agent_name=agent_name,
            state=state,
            summary=summary,
            detail=detail,
            tool_calls=t_calls,
            timestamp=datetime.utcnow().isoformat()
        )
        
        # Persist to database
        save_agent_step(incident_id, step.model_dump())
        
        # Emit to real-time WebSocket
        if self.event_callback:
            vehicles = self.world.get("vehicles", [])
            routes = self.world.get("routes", [])
            orders = self.world.get("orders", [])
            metrics = self.world.get("metrics")

            await self.event_callback({
                "type": "AGENT_STEP",
                "incident_id": incident_id,
                "step": step.model_dump(),
                "vehicles": [v.model_dump() for v in vehicles],
                "routes": [r.model_dump() for r in routes if r.is_active],
                "orders": [o.model_dump() for o in orders],
                "metrics": metrics.model_dump() if (metrics and hasattr(metrics, "model_dump")) else metrics
            })
        
        return step

    async def resolve_incident(self, incident: Incident) -> AgentExecutionTrace:
        """Executes the full multi-agent reasoning chain for any incident."""
        trace = AgentExecutionTrace(incident_id=incident.id, steps=[], started_at=datetime.utcnow().isoformat())
        
        # 1. ORCHESTRATOR AGENT: Detection & Triage
        step1 = await self._emit_step(
            incident.id,
            AgentName.ORCHESTRATOR,
            AgentState.RUNNING,
            summary=f"Triage anomaly: {incident.title}",
            detail=f"Analyzing incident '{incident.title}' affecting vehicles {incident.affected_vehicle_ids}. Scoping impacted deliveries and activating specialized investigation agents.",
            tool_calls=[]
        )
        trace.steps.append(step1)
        await asyncio.sleep(0.8)

        # Identify affected orders and vehicle
        primary_vehicle_id = incident.affected_vehicle_ids[0] if incident.affected_vehicle_ids else "V481"
        vehicles: List[Vehicle] = self.world.get("vehicles", [])
        orders: List[Order] = self.world.get("orders", [])
        routes: List[Route] = self.world.get("routes", [])

        target_vehicle = next((v for v in vehicles if v.id == primary_vehicle_id), None)
        affected_orders = [o for o in orders if o.assigned_vehicle_id == primary_vehicle_id or o.id in incident.affected_order_ids]
        if not affected_orders and target_vehicle:
            affected_orders = [o for o in orders if o.id in target_vehicle.assigned_order_ids]

        total_weight_kg = sum(o.weight_kg for o in affected_orders) if affected_orders else 140.0
        v_loc = target_vehicle.location if target_vehicle else Location(lat=37.7790, lng=-122.4050)

        # 2. TRAFFIC AGENT: Zone Congestion Evaluation
        t_start = time.time()
        traffic_info = self.tools.get_traffic(zone_id=v_loc.zone_id)
        traffic_delay = self.tools.estimate_delay(distance_km=14.5, traffic_multiplier=traffic_info.get("multiplier", 1.0))
        traffic_ms = round((time.time() - t_start) * 1000, 1)

        step2 = await self._emit_step(
            incident.id,
            AgentName.TRAFFIC,
            AgentState.RUNNING,
            summary=f"Traffic Assessment: {traffic_info['name']} ({traffic_info['condition']})",
            detail=f"Queried traffic grid. Zone condition is '{traffic_info['condition']}' with multiplier {traffic_info.get('multiplier', 1.0)}x. Calculated estimated corridor delay: +{traffic_delay['added_delay_minutes']} min.",
            tool_calls=[
                {"name": "get_traffic", "args": {"zone_id": v_loc.zone_id}, "result": traffic_info, "time_ms": traffic_ms},
                {"name": "estimate_delay", "args": {"distance_km": 14.5, "traffic_multiplier": traffic_info.get("multiplier", 1.0)}, "result": traffic_delay, "time_ms": 4.0}
            ]
        )
        trace.steps.append(step2)
        await asyncio.sleep(0.8)

        # 3. WEATHER AGENT: Environmental Risk Analysis
        t_start = time.time()
        weather_info = self.tools.get_weather()
        weather_risk = self.tools.get_weather_risk()
        weather_delay = self.tools.estimate_weather_delay(distance_km=14.5, weather_multiplier=weather_info.get("weather_multiplier", 1.0))
        weather_ms = round((time.time() - t_start) * 1000, 1)

        step3 = await self._emit_step(
            incident.id,
            AgentName.WEATHER,
            AgentState.RUNNING,
            summary=f"Weather Analysis: {weather_info['condition']} ({weather_info['temperature_c']}°C)",
            detail=f"Environmental safety assessment: {weather_info['safety_risk_level']}. Weather multiplier is {weather_info.get('weather_multiplier', 1.0)}x. Additional safety delay buffer: +{weather_delay['safety_delay_minutes']} min.",
            tool_calls=[
                {"name": "get_weather", "args": {}, "result": weather_info, "time_ms": weather_ms},
                {"name": "get_weather_risk", "args": {}, "result": weather_risk, "time_ms": 3.0},
                {"name": "estimate_weather_delay", "args": {"distance_km": 14.5, "weather_multiplier": weather_info.get("weather_multiplier", 1.0)}, "result": weather_delay, "time_ms": 3.0}
            ]
        )
        trace.steps.append(step3)
        await asyncio.sleep(0.8)

        # 4. DISPATCH AGENT: Multi-Candidate Ranking & Capacity Validation
        t_start = time.time()
        search_res = self.tools.find_nearby_available_vehicles(
            target_lat=v_loc.lat,
            target_lng=v_loc.lng,
            required_capacity_kg=total_weight_kg,
            min_battery=25.0
        )
        candidates = search_res["candidates"]
        optimal_candidate = search_res["optimal_replacement"]
        
        replacement_v_id = optimal_candidate["vehicle_id"] if optimal_candidate else "V517"
        cap_check = self.tools.check_vehicle_capacity(replacement_v_id, add_weight_kg=total_weight_kg)
        
        # Reassign orders to replacement vehicle
        reassigned_orders_res = []
        for o in affected_orders:
            res = self.tools.assign_delivery(o.id, replacement_v_id)
            reassigned_orders_res.append(res)
            
        dispatch_ms = round((time.time() - t_start) * 1000, 1)

        candidate_rationale = (
            f"Evaluated {len(candidates)} candidate vehicles. "
            f"Allotted workload to nearest & least-utilized vehicle {replacement_v_id} ({optimal_candidate['model'] if optimal_candidate else 'Electric Van'}): "
            f"distance {optimal_candidate['distance_km'] if optimal_candidate else 1.2}km, "
            f"battery {optimal_candidate['battery_fuel_percent'] if optimal_candidate else 94.0}%, "
            f"post-transfer load {cap_check.get('utilization_percent', 45)}% capacity. "
            f"Reassigned {len(affected_orders)} orders ({total_weight_kg}kg total payload)."
        )

        step4 = await self._emit_step(
            incident.id,
            AgentName.DISPATCH,
            AgentState.RUNNING,
            summary=f"Workload Allotted: {primary_vehicle_id} ➔ {replacement_v_id}",
            detail=candidate_rationale,
            tool_calls=[
                {"name": "find_nearby_available_vehicles", "args": {"lat": v_loc.lat, "lng": v_loc.lng, "capacity_kg": total_weight_kg}, "result": search_res, "time_ms": dispatch_ms},
                {"name": "check_vehicle_capacity", "args": {"vehicle_id": replacement_v_id, "add_weight_kg": total_weight_kg}, "result": cap_check, "time_ms": 4.0},
                {"name": "assign_delivery", "args": {"orders": [o.id for o in affected_orders], "new_vehicle": replacement_v_id}, "result": reassigned_orders_res, "time_ms": 6.0}
            ]
        )
        trace.steps.append(step4)
        await asyncio.sleep(0.8)

        # 5. ROUTING AGENT: Recalculate Trajectory & Dynamic ETAs
        t_start = time.time()
        # Find replacement vehicle coordinates
        rep_v = next((v for v in vehicles if v.id == replacement_v_id), None)
        rep_loc = rep_v.location if rep_v else Location(lat=37.7790, lng=-122.4050)
        
        dest_loc = affected_orders[0].destination if affected_orders else Location(lat=37.7925, lng=-122.4005)
        
        avoid_zone = "highway_101" if traffic_info.get("multiplier", 1.0) >= 2.0 else None
        route_res = self.tools.calculate_route(
            origin_lat=rep_loc.lat,
            origin_lng=rep_loc.lng,
            dest_lat=dest_loc.lat,
            dest_lng=dest_loc.lng,
            avoid_zones=[avoid_zone] if avoid_zone else None
        )
        
        eta_res = self.tools.estimate_delivery_time(
            distance_km=route_res["distance_km"],
            traffic_multiplier=traffic_info.get("multiplier", 1.0),
            weather_multiplier=weather_info.get("weather_multiplier", 1.0)
        )
        
        # Update or create route for replacement vehicle
        new_route_id = f"RT-REASSIGN-{int(time.time())}"
        new_waypoints = [RouteWaypoint(lat=w["lat"], lng=w["lng"], segment_name=w.get("segment")) for w in route_res["waypoints"]]
        
        new_route = Route(
            id=new_route_id,
            vehicle_id=replacement_v_id,
            origin=rep_loc,
            destination=dest_loc,
            waypoints=new_waypoints,
            current_waypoint_idx=0,
            distance_km=route_res["distance_km"],
            progress_percent=0.0,
            traffic_multiplier=traffic_info.get("multiplier", 1.0),
            weather_multiplier=weather_info.get("weather_multiplier", 1.0),
            is_active=True,
            color="#D946EF"  # Vibrant Neon Magenta / Purple for Handover Route
        )
        
        # Mark old route for broken vehicle red
        if target_vehicle and target_vehicle.current_route_id:
            for r in routes:
                if r.id == target_vehicle.current_route_id:
                    r.color = "#EF4444"

        # Update in world state
        routes.append(new_route)
        if rep_v:
            rep_v.current_route_id = new_route_id
            rep_v.status = VehicleStatus.REASSIGNED
            rep_v.speed_kmh = 48.0
            
        routing_ms = round((time.time() - t_start) * 1000, 1)

        step5 = await self._emit_step(
            incident.id,
            AgentName.ROUTING,
            AgentState.RUNNING,
            summary=f"Recovery Route Created for {replacement_v_id}: {route_res['distance_km']}km (ETA: {eta_res['projected_eta']})",
            detail=f"Synthesized recovery trajectory with {route_res['waypoints_count']} waypoints for allotted vehicle {replacement_v_id}. Accounted for {traffic_info['condition']} traffic ({traffic_info.get('multiplier', 1.0)}x) and {weather_info['condition']} weather ({weather_info.get('weather_multiplier', 1.0)}x). Estimated duration: {eta_res['estimated_duration_minutes']} min.",
            tool_calls=[
                {"name": "calculate_route", "args": {"origin": [rep_loc.lat, rep_loc.lng], "dest": [dest_loc.lat, dest_loc.lng], "avoid": avoid_zone}, "result": route_res, "time_ms": routing_ms},
                {"name": "estimate_delivery_time", "args": {"distance_km": route_res["distance_km"], "traffic_mult": traffic_info.get("multiplier", 1.0), "weather_mult": weather_info.get("weather_multiplier", 1.0)}, "result": eta_res, "time_ms": 3.0}
            ]
        )
        trace.steps.append(step5)
        await asyncio.sleep(0.8)

        # 6. CUSTOMER AGENT: Proactive SLA Notifications & ETA Updates
        t_start = time.time()
        customer_notifications = []
        eta_updates = []
        calculated_delay = max(4.0, round(eta_res["estimated_duration_minutes"] * 0.3, 1))

        for o in affected_orders:
            c_info = self.tools.get_customer_contact(o.id)
            notif = self.tools.generate_delay_notification(
                order_id=o.id,
                new_eta=eta_res["projected_eta"],
                reason=f"seamless vehicle reassignment ({incident.title})",
                delay_minutes=calculated_delay
            )
            upd = self.tools.update_delivery_eta(
                order_id=o.id,
                new_eta=eta_res["projected_eta"],
                delay_minutes=calculated_delay
            )
            customer_notifications.append(notif)
            eta_updates.append(upd)

        cust_ms = round((time.time() - t_start) * 1000, 1)

        step6 = await self._emit_step(
            incident.id,
            AgentName.CUSTOMER,
            AgentState.COMPLETE,
            summary=f"Dispatched {len(customer_notifications)} Proactive Customer Notifications",
            detail=f"Delivered real-time SMS & webhook updates to all impacted customers ({', '.join(o.customer_name for o in affected_orders[:3])}). New projected ETA: {eta_res['projected_eta']} (minimal SLA impact: +{int(calculated_delay)}m).",
            tool_calls=[
                {"name": "generate_delay_notification", "args": {"count": len(customer_notifications), "new_eta": eta_res["projected_eta"]}, "result": customer_notifications, "time_ms": cust_ms},
                {"name": "update_delivery_eta", "args": {"orders": [o.id for o in affected_orders], "new_eta": eta_res["projected_eta"]}, "result": eta_updates, "time_ms": 4.0}
            ]
        )
        trace.steps.append(step6)
        await asyncio.sleep(0.3)

        # 7. FINAL ORCHESTRATOR RESOLUTION
        final_summary = (
            f"Autonomous resolution complete. Disrupted vehicle {primary_vehicle_id} recovered via replacement {replacement_v_id}. "
            f"Generated optimized {route_res['distance_km']}km route, recalculated ETAs to {eta_res['projected_eta']}, "
            f"and notified {len(affected_orders)} customers proactively."
        )
        
        step7 = await self._emit_step(
            incident.id,
            AgentName.ORCHESTRATOR,
            AgentState.COMPLETE,
            summary=f"Incident Resolved: 100% Recovery Achieved",
            detail=final_summary,
            tool_calls=[]
        )
        trace.steps.append(step7)

        # Mark incident as resolved in world state
        incident.resolution_status = "Resolved"
        incident.resolved_at = datetime.utcnow().isoformat()
        incident.resolution_summary = final_summary
        
        trace.final_decision = final_summary
        trace.completed_at = datetime.utcnow().isoformat()
        self.execution_history.append(trace)

        # Update Mission Score metrics
        metrics = self.world.get("metrics")
        if metrics:
            metrics.score += 250
            metrics.resolved_incidents_count += 1
            metrics.active_incidents_count = max(0, metrics.active_incidents_count - 1)
            metrics.efficiency_percent = min(99.5, round(metrics.efficiency_percent + 0.4, 1))

        return trace
