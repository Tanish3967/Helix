from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional
from backend.models.schema import (
    DisruptionRequest, Incident, SimulationState, AddVehicleRequest,
    ModifyRouteRequest, ToggleVehicleStatusRequest, CommandRequest
)
from backend.simulation.engine import SimulationEngine
from backend.simulation.disruptions import DisruptionManager
from backend.simulation.scenarios import ScenarioManager
from backend.simulation.commands import CommandInterpreter

def create_api_router(engine: SimulationEngine, disruption_mgr: DisruptionManager, scenario_mgr: ScenarioManager) -> APIRouter:
    router = APIRouter(prefix="/api")
    interpreter = CommandInterpreter(engine, disruption_mgr, scenario_mgr)

    @router.get("/health")
    async def health_check():
        return {"status": "ok", "service": "FleetOps AI Simulation Engine", "version": "1.0.0"}

    @router.get("/fleet/state")
    async def get_simulation_state():
        return engine.get_full_state()

    @router.get("/fleet/vehicles")
    async def get_vehicles(status: Optional[str] = None):
        if status:
            return [v.model_dump() for v in engine.vehicles if v.status.value.lower() == status.lower()]
        return [v.model_dump() for v in engine.vehicles]

    @router.post("/fleet/vehicles")
    async def add_vehicle(req: AddVehicleRequest):
        new_v = engine.add_vehicle(req.model_dump())
        await engine.broadcast({
            "type": "FLEET_UPDATED",
            "vehicles": [v.model_dump() for v in engine.vehicles],
            "routes": [r.model_dump() for r in engine.routes if r.is_active],
            "orders": [o.model_dump() for o in engine.orders],
            "events": [e.model_dump() if hasattr(e, "model_dump") else e for e in engine.events[-30:]],
            "metrics": engine.metrics.model_dump()
        })
        return {"success": True, "vehicle": new_v.model_dump()}

    @router.delete("/fleet/vehicles/{vehicle_id}")
    async def remove_vehicle(vehicle_id: str):
        success = engine.remove_vehicle(vehicle_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Vehicle {vehicle_id} not found")
        await engine.broadcast({
            "type": "FLEET_UPDATED",
            "vehicles": [v.model_dump() for v in engine.vehicles],
            "routes": [r.model_dump() for r in engine.routes if r.is_active],
            "orders": [o.model_dump() for o in engine.orders],
            "events": [e.model_dump() if hasattr(e, "model_dump") else e for e in engine.events[-30:]],
            "metrics": engine.metrics.model_dump()
        })
        return {"success": True, "message": f"Vehicle {vehicle_id} deleted"}

    @router.post("/fleet/vehicles/{vehicle_id}/toggle-status")
    async def toggle_vehicle_status(vehicle_id: str, req: Optional[ToggleVehicleStatusRequest] = None):
        status_val = req.status if (req and req.status) else None
        v = engine.toggle_vehicle_status(vehicle_id, status_val)
        if not v:
            raise HTTPException(status_code=404, detail=f"Vehicle {vehicle_id} not found")
        await engine.broadcast({
            "type": "FLEET_UPDATED",
            "vehicles": [veh.model_dump() for veh in engine.vehicles],
            "routes": [r.model_dump() for r in engine.routes if r.is_active],
            "orders": [o.model_dump() for o in engine.orders],
            "events": [e.model_dump() if hasattr(e, "model_dump") else e for e in engine.events[-30:]],
            "metrics": engine.metrics.model_dump()
        })
        return {"success": True, "vehicle": v.model_dump()}

    @router.post("/fleet/vehicles/{vehicle_id}/route")
    async def modify_vehicle_route(vehicle_id: str, req: ModifyRouteRequest):
        dest_lat = req.destination_lat or 37.7880
        dest_lng = req.destination_lng or -122.4075
        dest_name = req.destination_name or "Custom Target Zone"
        r = engine.modify_vehicle_route(vehicle_id, dest_lat, dest_lng, dest_name, req.zone_id)
        if not r:
            raise HTTPException(status_code=404, detail=f"Vehicle {vehicle_id} not found")
            
        await engine.broadcast({
            "type": "ROUTE_UPDATED",
            "vehicle_id": vehicle_id,
            "route": r.model_dump(),
            "routes": [rt.model_dump() for rt in engine.routes if rt.is_active],
            "vehicles": [v.model_dump() for v in engine.vehicles],
            "events": [e.model_dump() if hasattr(e, "model_dump") else e for e in engine.events[-30:]]
        })
        return {"success": True, "route": r.model_dump()}

    @router.get("/fleet/orders")
    async def get_orders(limit: int = 100, status: Optional[str] = None):
        res = engine.orders
        if status:
            res = [o for o in res if o.status.value.lower() == status.lower()]
        return [o.model_dump() for o in res[:limit]]

    @router.get("/fleet/routes")
    async def get_routes():
        return [r.model_dump() for r in engine.routes if r.is_active]

    @router.get("/fleet/incidents")
    async def get_incidents():
        return {
            "active": engine.active_incident.model_dump() if engine.active_incident else None,
            "resolved_count": engine.metrics.resolved_incidents_count
        }

    @router.get("/fleet/agent-history")
    async def get_agent_history():
        return [t.model_dump() for t in engine.orchestrator.execution_history]

    @router.get("/simulation/scenarios")
    async def get_scenarios():
        return scenario_mgr.get_all_scenarios()

    @router.post("/simulation/disrupt")
    async def inject_disruption(req: DisruptionRequest):
        req_type = req.type.upper()
        # When the operator wants to approve the plan manually, the incident is
        # created but resolution is deferred until POST /simulation/resolve.
        auto_resolve = True if req.auto_resolve is None else req.auto_resolve
        if req_type == "BREAKDOWN":
            v_id = req.vehicle_id or "V481"
            f_type = req.fault_type or "Engine Failure"
            inc = await disruption_mgr.trigger_breakdown(vehicle_id=v_id, fault_type=f_type, auto_resolve=auto_resolve)
            return {"success": True, "incident": inc.model_dump()}

        elif req_type == "TRAFFIC":
            z_id = req.zone_id or "highway_101"
            cond = req.traffic_condition or "Accident"
            inc = await disruption_mgr.trigger_traffic_spike(zone_id=z_id, condition=cond, auto_resolve=auto_resolve)
            return {"success": True, "incident": inc.model_dump()}

        elif req_type == "WEATHER":
            cond = req.weather_condition or "Storm"
            inc = await disruption_mgr.trigger_weather_alert(condition=cond, auto_resolve=auto_resolve)
            return {"success": True, "incident": inc.model_dump()}

        elif req_type == "DELAY":
            o_id = req.order_id or "ORD-4811"
            delay = req.delay_minutes or 20.0
            inc = await disruption_mgr.trigger_delivery_delay(order_id=o_id, delay_minutes=delay, auto_resolve=auto_resolve)
            return {"success": True, "incident": inc.model_dump()}

        elif req_type == "REPAIR":
            v_id = req.vehicle_id or "V481"
            engine.repair_vehicle(v_id)
            await engine.broadcast({
                "type": "FLEET_UPDATED",
                "vehicles": [v.model_dump() for v in engine.vehicles],
                "routes": [r.model_dump() for r in engine.routes if r.is_active],
                "active_incident": engine.active_incident.model_dump() if engine.active_incident else None,
                "events": [e.model_dump() if hasattr(e, "model_dump") else e for e in engine.events[-30:]]
            })
            return {"success": True, "message": f"Vehicle {v_id} repaired"}

        elif req_type == "RESET":
            engine.reset_simulation()
            await engine.broadcast({
                "type": "INITIAL_STATE",
                "state": engine.get_full_state()
            })
            return {"success": True, "message": "Simulation reset to pristine state"}

        elif req_type == "SCENARIO":
            lvl = req.level or 1
            inc = await scenario_mgr.execute_scenario(lvl)
            return {"success": True, "level": lvl, "incident": inc.model_dump()}

        else:
            raise HTTPException(status_code=400, detail=f"Unknown disruption type: {req.type}")

    @router.post("/simulation/scenario/{level}")
    async def trigger_scenario_by_level(level: int):
        if level < 1 or level > 8:
            raise HTTPException(status_code=400, detail="Level must be between 1 and 8")
        inc = await scenario_mgr.execute_scenario(level)
        return {"success": True, "level": level, "incident": inc.model_dump()}

    @router.post("/simulation/speed")
    async def set_speed(speed: float):
        if speed not in [0.5, 1.0, 2.0, 4.0, 8.0]:
            speed = 1.0
        engine.speed_multiplier = speed
        await engine.broadcast({
            "type": "SIMULATION_CONFIG",
            "speed_multiplier": speed,
            "is_paused": engine.is_paused
        })
        return {"success": True, "speed_multiplier": speed}

    @router.post("/simulation/pause")
    async def toggle_pause(paused: Optional[bool] = None):
        if paused is None:
            engine.is_paused = not engine.is_paused
        else:
            engine.is_paused = paused
        await engine.broadcast({
            "type": "SIMULATION_CONFIG",
            "speed_multiplier": engine.speed_multiplier,
            "is_paused": engine.is_paused
        })
        return {"success": True, "is_paused": engine.is_paused}

    @router.post("/simulation/reset")
    async def reset():
        engine.reset_simulation()
        await engine.broadcast({
            "type": "INITIAL_STATE",
            "state": engine.get_full_state()
        })
        return {"success": True, "message": "Simulation world reset"}

    @router.post("/simulation/resolve")
    async def resolve_active_incident():
        """Dispatch the multi-agent swarm to resolve the current active incident.

        Backs the 'Approve Plan' action so an operator can approve resolution for a
        disruption that was injected with auto_resolve=False.
        """
        incident = engine.active_incident
        if not incident:
            raise HTTPException(status_code=404, detail="No active incident to resolve")
        if incident.resolution_status == "Resolved":
            return {"success": True, "message": "Incident already resolved", "incident_id": incident.id}
        incident.resolution_status = "Resolving"
        await engine.broadcast({
            "type": "INCIDENT_RESOLVING",
            "incident": incident.model_dump(),
            "active_incident": incident.model_dump()
        })
        started = engine.launch_resolution(incident)
        if not started:
            return {"success": True, "message": "Resolution already in progress", "incident_id": incident.id}
        return {"success": True, "message": "Multi-agent resolution dispatched", "incident_id": incident.id}

    @router.post("/command")
    async def run_command(req: CommandRequest):
        """Interpret an Ask-Aegis command bar entry and dispatch it.

        Parses free-text / slash commands (pause, speed, breakdown, traffic,
        weather, delay, repair, scenario, resolve, focus, open, status, help)
        and executes them against the live simulation. Returns a uniform
        {success, message, action?, data?} so the frontend can echo a reply and
        optionally run a client-side action (focus a vehicle, open a panel).
        """
        return await interpreter.interpret(req.command)

    return router
