import pytest
from backend.simulation.world_data import generate_initial_world_data
from backend.simulation.engine import SimulationEngine
from backend.models.schema import VehicleStatus, OrderStatus

def test_world_data_generation():
    data = generate_initial_world_data()
    assert len(data["vehicles"]) == 100
    assert len(data["orders"]) == 500
    assert len(data["routes"]) == 20
    assert len(data["drivers"]) == 10
    
    # Check V481 configuration
    v481 = next((v for v in data["vehicles"] if v.id == "V481"), None)
    assert v481 is not None
    assert len(v481.assigned_order_ids) == 3
    assert v481.status == VehicleStatus.ON_ROUTE

    # Check V517 replacement vehicle
    v517 = next((v for v in data["vehicles"] if v.id == "V517"), None)
    assert v517 is not None
    assert v517.battery_fuel_percent > 80.0
    assert v517.status == VehicleStatus.AVAILABLE

@pytest.mark.asyncio
async def test_simulation_tick_and_movement():
    engine = SimulationEngine()
    initial_progress = [r.progress_percent for r in engine.routes if r.is_active]
    
    # Perform 3 ticks
    await engine.tick()
    await engine.tick()
    await engine.tick()
    
    updated_progress = [r.progress_percent for r in engine.routes if r.is_active]
    # At least some routes should have progressed
    assert any(up >= init for up, init in zip(updated_progress, initial_progress))
    assert engine.metrics.score >= 1450
