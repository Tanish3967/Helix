import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.routing.osrm_adapter import CommercialRoutingEngine

client = TestClient(app)

def test_telematics_ingestion_and_dtc_anomaly():
    """Tests ingesting live IoT vehicle telemetry and OBD-II trouble codes."""
    payload = {
        "vehicle_id": "V481",
        "lat": 37.7795,
        "lng": -122.4150,
        "speed_kmh": 48.5,
        "battery_fuel_percent": 76.0,
        "dtc_codes": ["P0117"],
        "driver_id": "DRV-104"
    }
    response = client.post("/api/enterprise/telematics/ingest", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["vehicle_id"] == "V481"
    assert data["anomalies_detected"] == 1

def test_driver_proof_of_delivery():
    """Tests digital proof-of-delivery submission and status transition."""
    # First get an existing order
    state_res = client.get("/api/fleet/state")
    assert state_res.status_code == 200
    state_data = state_res.json()
    assert len(state_data["orders"]) > 0
    target_order_id = state_data["orders"][0]["id"]

    pod_payload = {
        "order_id": target_order_id,
        "recipient_name": "Sarah Connor",
        "signature_data": "data:image/svg+xml;base64,PHN2Zz4...",
        "photo_url": "https://s3.fleetops.internal/pod/ORD-101.jpg",
        "notes": "Left securely on front porch."
    }
    response = client.post("/api/enterprise/driver/pod", json=pod_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["status"] == "DELIVERED"

def test_predictive_maintenance_analytics():
    """Tests fleetwide digital twin breakdown risk ratings."""
    response = client.get("/api/enterprise/analytics/predictive")
    assert response.status_code == 200
    data = response.json()
    assert "total_fleet_units" in data
    assert "units_requiring_service" in data
    assert isinstance(data["fleet_health_overview"], list)

def test_esg_carbon_and_smart_charging():
    """Tests ESG carbon metrics and EV depot charging scheduler."""
    response = client.get("/api/enterprise/analytics/esg")
    assert response.status_code == 200
    data = response.json()
    assert "carbon_metrics" in data
    assert "total_co2_kg" in data["carbon_metrics"]
    assert "overnight_charging_schedule" in data

def test_erp_order_webhook_ingestion():
    """Tests external ERP/Shopify order ingestion via webhook."""
    webhook_payload = {
        "customer_name": "Acme Corp Logistics",
        "customer_phone": "+1-415-555-0199",
        "dest_lat": 37.7850,
        "dest_lng": -122.4050,
        "weight_kg": 24.5,
        "priority": "HIGH",
        "tenant_id": "enterprise_freight_corp"
    }
    response = client.post("/api/enterprise/webhooks/order", json=webhook_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "order_id" in data
    assert "assigned_vehicle" in data

@pytest.mark.asyncio
async def test_commercial_routing_engine():
    """Tests commercial vehicle routing engine fallback."""
    engine = CommercialRoutingEngine()
    route = await engine.calculate_route(
        origin_lat=37.7770, origin_lng=-122.4180,
        dest_lat=37.7880, dest_lng=-122.4075,
        avoid_zones=["HWY-101"]
    )
    assert "distance_km" in route
    assert route["distance_km"] > 0
    assert len(route["waypoints"]) > 5

def test_depot_hierarchy_and_scoping():
    """Tests enterprise multi-depot query."""
    response = client.get("/api/enterprise/depots")
    assert response.status_code == 200
    data = response.json()
    assert data["total_depots"] >= 3
    assert any(d["id"] == "DEPOT-01" for d in data["depots"])

def test_driver_hos_duty_logging():
    """Tests FMCSA Hours of Service duty status logging."""
    payload = {
        "driver_id": "DRV-104",
        "status": "ON_DUTY",
        "odometer": 12890.0
    }
    response = client.post("/api/enterprise/driver/hos", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["duty_status"] == "ON_DUTY"

def test_driver_manifest_query():
    """Tests in-cab manifest retrieval."""
    response = client.get("/api/enterprise/driver/DRV-104/manifest")
    assert response.status_code == 200
    data = response.json()
    assert "vehicle" in data
    assert "assigned_orders" in data
    assert "current_eta" in data

def test_public_order_tracking_endpoint():
    """Tests public customer-facing tracking endpoint."""
    state_res = client.get("/api/fleet/state")
    order_id = state_res.json()["orders"][0]["id"]
    
    response = client.get(f"/api/enterprise/tracking/{order_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["order_id"] == order_id
    assert "customer_name" in data
    assert "eta" in data
    assert "destination" in data


