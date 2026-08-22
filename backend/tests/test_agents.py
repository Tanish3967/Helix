import pytest
from backend.simulation.engine import SimulationEngine
from backend.simulation.disruptions import DisruptionManager
from backend.agents.tools import FleetTools
from backend.models.schema import AgentState

def test_fleet_tools():
    engine = SimulationEngine()
    tools = FleetTools(engine.world_state)
    
    # 1. Routing calculation
    route_res = tools.calculate_route(37.7790, -122.4050, 37.7897, -122.3972)
    assert route_res["success"] is True
    assert route_res["distance_km"] > 0
    assert len(route_res["waypoints"]) > 10
    
    # 2. Candidate vehicle search
    search_res = tools.find_nearby_available_vehicles(37.7790, -122.4050, required_capacity_kg=100.0)
    assert search_res["candidates_found_count"] > 0
    assert search_res["optimal_replacement"] is not None
    assert search_res["optimal_replacement"]["vehicle_id"].startswith("V")
    assert search_res["optimal_replacement"]["is_capacity_sufficient"] is True

    # 3. Capacity check
    cap = tools.check_vehicle_capacity("V517", add_weight_kg=120.0)
    assert cap["is_capacity_safe"] is True

@pytest.mark.asyncio
async def test_multi_agent_breakdown_resolution():
    engine = SimulationEngine()
    disruption_mgr = DisruptionManager(engine)
    
    # Inject breakdown on V481
    incident = await disruption_mgr.trigger_breakdown(vehicle_id="V481", fault_type="Engine Failure")
    assert incident.type == "VEHICLE_BREAKDOWN"
    assert "V481" in incident.affected_vehicle_ids
    
    # Run orchestrator resolution
    trace = await engine.orchestrator.resolve_incident(incident)
    assert len(trace.steps) == 7
    assert trace.final_decision is not None
    assert incident.resolution_status == "Resolved"
    
    # Verify orders reassigned
    v481_orders = [o for o in engine.orders if o.id in ["ORD-4811", "ORD-4812", "ORD-4813"]]
    assert all(o.status == "REASSIGNED" for o in v481_orders)
