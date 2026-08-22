import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_fleet_state_endpoint():
    response = client.get("/api/fleet/state")
    assert response.status_code == 200
    data = response.json()
    assert "vehicles" in data
    assert len(data["vehicles"]) == 100
    assert "metrics" in data
    assert "weather" in data

def test_scenarios_endpoint():
    response = client.get("/api/simulation/scenarios")
    assert response.status_code == 200
    scenarios = response.json()
    assert len(scenarios) == 8
    assert scenarios[0]["level"] == 1
    assert scenarios[7]["level"] == 8

def test_disruption_injection_endpoint():
    response = client.post("/api/simulation/disrupt", json={
        "type": "BREAKDOWN",
        "vehicle_id": "V481",
        "fault_type": "Alternator Malfunction"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["incident"]["type"] == "VEHICLE_BREAKDOWN"
