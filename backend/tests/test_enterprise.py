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

def test_charging_stations_query():
    """Tests EV charging station infrastructure and grid tariff query."""
    response = client.get("/api/enterprise/charging/stations")
    assert response.status_code == 200
    data = response.json()
    assert data["total_stations"] >= 3
    assert "tariff_forecast_24h" in data
    assert "fleet_avg_soc_percent" in data

def test_smart_charging_optimization():
    """Tests autonomous EV grid load balancing and charging scheduler."""
    response = client.post("/api/enterprise/charging/optimize")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "estimated_savings_vs_peak_usd" in data
    assert "charging_schedule" in data

def test_v2g_energy_discharge():
    """Tests Vehicle-to-Grid (V2G) peak shaving power injection."""
    response = client.post("/api/enterprise/charging/v2g-discharge")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "grid_credits_earned_usd" in data
    assert "total_kwh_injected" in data

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
    """Tests enterprise multi-depot query and dynamic utilization metrics."""
    response = client.get("/api/enterprise/depots")
    assert response.status_code == 200
    data = response.json()
    assert data["total_depots"] >= 3
    depot_1 = next(d for d in data["depots"] if d["id"] == "DEPOT-01")
    assert "utilization_percent" in depot_1
    assert "active_units" in depot_1
    assert "charging_bays_available" in depot_1

def test_depot_swarm_rebalance():
    """Tests autonomous cross-depot swarm capacity rebalancing."""
    response = client.post("/api/enterprise/depots/rebalance")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "rebalanced_units" in data
    assert "transfers" in data

def test_depot_vehicles_query():
    """Tests retrieving vehicles scoped to a specific regional hub."""
    response = client.get("/api/enterprise/depots/DEPOT-01/vehicles")
    assert response.status_code == 200
    data = response.json()
    assert data["depot_id"] == "DEPOT-01"
    assert "vehicles" in data
    assert isinstance(data["vehicles"], list)

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

def test_driver_safety_event_ingestion():
    """Tests AI dashcam and accelerometer safety event ingestion with automated coaching."""
    payload = {
        "id": "EV-TEST-SAFE-01",
        "driver_id": "DRV-101",
        "vehicle_id": "V481",
        "event_type": "HARSH_BRAKING",
        "severity": "HIGH",
        "g_force": -0.74,
        "confidence_score": 0.97
    }
    response = client.post("/api/enterprise/safety/event", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "revised_safety_score" in data
    assert "coaching_message" in data

def test_driver_safety_leaderboard():
    """Tests driver safety leaderboard and ranking tier calculation."""
    response = client.get("/api/enterprise/safety/leaderboard")
    assert response.status_code == 200
    data = response.json()
    assert "fleet_safety_score" in data
    assert "leaderboard" in data
    assert len(data["leaderboard"]) > 0
    assert "tier" in data["leaderboard"][0]

def test_driver_safety_scorecard():
    """Tests detailed safety scorecard and telematics breakdown."""
    response = client.get("/api/enterprise/safety/drivers/DRV-101/scorecard")
    assert response.status_code == 200
    data = response.json()
    assert "risk_level" in data
    assert "telematics_breakdown" in data
    assert "active_coaching_tips" in data

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

def test_geofences_listing():
    """Tests retrieving active enterprise spatial geofences."""
    response = client.get("/api/enterprise/geofences")
    assert response.status_code == 200
    data = response.json()
    assert len(data["geofences"]) >= 2
    assert any(g["category"] == "HAZMAT" for g in data["geofences"])

def test_spatial_geofence_point_in_polygon():
    """Tests point-in-polygon ray casting algorithm."""
    from backend.spatial.geofencing import is_point_in_polygon
    poly = [[37.8000, -122.2850], [37.8120, -122.2850], [37.8120, -122.2650], [37.8000, -122.2650]]
    # Point inside polygon
    assert is_point_in_polygon(37.8050, -122.2750, poly) is True
    # Point outside polygon
    assert is_point_in_polygon(37.7500, -122.4000, poly) is False

def test_telematics_geofence_breach_detection():
    """Tests telematics ingestion triggering geofence breach alert."""
    payload = {
        "vehicle_id": "V481",
        "lat": 37.8050,
        "lng": -122.2750, # Inside Oakland Port HAZMAT Zone
        "speed_kmh": 32.0,
        "battery_fuel_percent": 80.0
    }
    response = client.post("/api/enterprise/telematics/ingest", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["breaches_detected"] >= 1

def test_policies_listing_and_toggle():
    """Tests retrieving and toggling autonomous swarm self-healing policies."""
    response = client.get("/api/enterprise/policies")
    assert response.status_code == 200
    data = response.json()
    assert len(data["policies"]) >= 4

    toggle_res = client.post("/api/enterprise/policies/POL-01/toggle", json={"enabled": False})
    assert toggle_res.status_code == 200
    assert toggle_res.json()["enabled"] is False

    # Restore to true
    client.post("/api/enterprise/policies/POL-01/toggle", json={"enabled": True})

def test_flight_log_retrieval():
    """Tests retrieving rolling blackbox flight recorder telemetry snapshots."""
    response = client.get("/api/fleet/flight-log")
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert "snapshots" in data
    assert isinstance(data["snapshots"], list)

def test_incident_post_mortem_generation():
    """Tests AI executive post-mortem root-cause and emissions avoided generation."""
    response = client.get("/api/fleet/incidents/INC-TEST-POSTMORTEM/post-mortem")
    assert response.status_code == 200
    data = response.json()
    assert "root_cause" in data
    assert "minutes_saved" in data
    assert "co2_avoided_kg" in data
    assert "markdown_report" in data
    assert "# Executive Incident Post-Mortem Report" in data["markdown_report"]

def test_flight_log_export():
    """Tests exporting flight recorder JSON audit trail."""
    response = client.post("/api/fleet/flight-log/export")
    assert response.status_code == 200
    data = response.json()
    assert "flight_log" in data
    assert "compliance_hash" in data

def test_cold_chain_pharmaceutical_excursion():
    """Tests cold-chain telematics ingestion triggering excursion alarm for pharma."""
    payload = {
        "vehicle_id": "V481",
        "lat": 37.7770,
        "lng": -122.4180,
        "speed_kmh": 40.0,
        "cargo_type": "PHARMACEUTICAL",
        "cargo_temp_c": 12.5, # Out of safe range (2-8°C)
        "cargo_humidity_percent": 60.0
    }
    response = client.post("/api/enterprise/telematics/ingest", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["anomalies_detected"] >= 1

def test_cargo_door_open_security_alert():
    """Tests cargo door open alert while vehicle is in motion."""
    payload = {
        "vehicle_id": "V481",
        "lat": 37.7770,
        "lng": -122.4180,
        "speed_kmh": 45.0,
        "door_open_alert": True
    }
    response = client.post("/api/enterprise/telematics/ingest", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["anomalies_detected"] >= 1

def test_weather_hazards_listing():
    """Tests retrieving microclimate weather hazard polygons and affected routes."""
    response = client.get("/api/enterprise/weather/hazards")
    assert response.status_code == 200
    data = response.json()
    assert len(data["hazards"]) >= 3
    assert "active_hazard_count" in data
    assert any(h["hazard_type"] == "FLASH_FLOOD" for h in data["hazards"])

def test_weather_disaster_reroute():
    """Tests autonomous dynamic disaster reroute avoiding weather hazards."""
    response = client.post("/api/enterprise/weather/hazards/reroute")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "diverted_routes_count" in data
    assert "rerouted_details" in data

def test_weather_hazard_toggle():
    """Tests activating or deactivating a microclimate hazard zone."""
    response = client.post("/api/enterprise/weather/hazards/toggle", json={"hazard_id": "HAZARD-01", "is_active": False})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["is_active"] is False

def test_yard_status_query():
    """Tests warehouse dock door states and staged trailers in YMS."""
    response = client.get("/api/enterprise/yard/status")
    assert response.status_code == 200
    data = response.json()
    assert data["total_bays"] >= 8
    assert "occupancy_rate_percent" in data
    assert "dock_doors" in data
    assert len(data["staged_trailers"]) >= 4

def test_yard_dock_assignment():
    """Tests autonomous dock bay assignment for inbound freight truck."""
    response = client.post("/api/enterprise/yard/dock-assign", json={"vehicle_id": "V495", "cargo_type": "COLD_CHAIN"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "assigned_bay" in data
    assert data["vehicle_id"] == "V495"

def test_yard_gate_alpr_event():
    """Tests ALPR gate-in automated check-in processing."""
    payload = {
        "id": "GATE-TEST-01",
        "event_type": "GATE_IN",
        "license_plate": "7XYZ901",
        "vehicle_id": "V481",
        "driver_name": "Marcus Vance",
        "assigned_bay": "BAY-01",
        "status": "CLEARED"
    }
    response = client.post("/api/enterprise/yard/gate-event", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["status"] == "PROCESSED"

def test_hos_eld_logs_query():
    """Tests retrieving driver Hours of Service (HOS) and ELD logs."""
    response = client.get("/api/enterprise/hos/logs")
    assert response.status_code == 200
    data = response.json()
    assert data["total_drivers_monitored"] >= 4
    assert "fleet_compliance_percent" in data
    assert "eld_records" in data
    assert len(data["eld_records"]) >= 4

def test_hos_duty_status_update():
    """Tests updating a driver's duty status in ELD logbook."""
    payload = {
        "driver_id": "DRV-101",
        "new_duty_status": "OFF_DUTY",
        "notes": "Driver shift completed at depot"
    }
    response = client.post("/api/enterprise/hos/duty-status", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["new_duty_status"] == "OFF_DUTY"

def test_hos_fmcsa_audit_export():
    """Tests exporting DOT/FMCSA certified ELD audit package."""
    response = client.post("/api/enterprise/hos/audit-export")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "audit_id" in data
    assert "sha256_tamper_seal" in data
    assert data["certification_status"] == "COMPLIANT_CERTIFIED"

def test_charging_battery_health():
    """Tests retrieving fleet battery State of Health (SoH) and degradation analytics."""
    response = client.get("/api/enterprise/charging/battery-health")
    assert response.status_code == 200
    data = response.json()
    assert "reports" in data
    assert len(data["reports"]) >= 4
    assert data["average_state_of_health_pct"] > 80.0
    assert "fleet_pack_chemistry" in data

def test_charging_substations():
    """Tests querying regional utility grid substations and renewable mix."""
    response = client.get("/api/enterprise/charging/substations")
    assert response.status_code == 200
    data = response.json()
    assert "substations" in data
    assert len(data["substations"]) >= 3
    assert data["average_renewable_mix_percent"] > 50.0
    assert "total_grid_load_mw" in data

def test_charging_smart_precondition():
    """Tests thermal preconditioning vehicle battery pack for fast DC charging."""
    response = client.post("/api/enterprise/charging/smart-precondition", json={"vehicle_id": "V481"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["vehicle_id"] == "V481"
    assert data["preconditioned_temp_c"] == 25.0
    assert data["fast_charge_rate_boost_kw"] > 0

def test_maintenance_fleet_health_query():
    """Tests querying fleet-wide component prognostic scorecards and MTBF."""
    response = client.get("/api/enterprise/maintenance/fleet-health")
    assert response.status_code == 200
    data = response.json()
    assert "scorecards" in data
    assert len(data["scorecards"]) >= 4
    assert data["fleet_mean_health_score"] > 80.0
    assert "mean_time_between_failures_hours" in data
    assert data["critical_watchlist_count"] >= 1

def test_maintenance_work_orders_query():
    """Tests querying autonomous AI work orders and allocated OEM parts."""
    response = client.get("/api/enterprise/maintenance/work-orders")
    assert response.status_code == 200
    data = response.json()
    assert "work_orders" in data
    assert len(data["work_orders"]) >= 2
    assert "parts_fulfillment_rate_percent" in data

def test_maintenance_work_order_dispatch():
    """Tests autonomously dispatching an emergency work order and diverting vehicle."""
    payload = {
        "vehicle_id": "V302",
        "component_name": "Inverter Power Module",
        "priority": "URGENT"
    }
    response = client.post("/api/enterprise/maintenance/work-orders/dispatch", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["vehicle_id"] == "V302"
    assert "work_order_id" in data
    assert data["status"] == "DISPATCHED_TO_BAY"

def test_maintenance_work_order_completion():
    """Tests certifying work order completion and vehicle recovery."""
    response = client.post("/api/enterprise/maintenance/work-orders/WO-9042/complete")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["work_order_id"] == "WO-9042"
    assert data["status"] == "COMPLETED"
    assert data["certification"] == "OEM_QUALITY_PASSED"

def test_convoy_status_query():
    """Tests querying active secure convoys, threat levels, and GNSS integrity."""
    response = client.get("/api/enterprise/convoy/status")
    assert response.status_code == 200
    data = response.json()
    assert "convoys" in data
    assert len(data["convoys"]) >= 2
    assert data["total_active_convoys"] >= 2
    assert "gnss_constellations_tracked" in data
    assert data["threat_summary"] == "ALL_CONVOYS_SECURE"

def test_convoy_formation_dispatch():
    """Tests forming an armored 3-vehicle tactical convoy swarm."""
    payload = {
        "convoy_id": "CONVOY-TITAN-01",
        "lead_vehicle_id": "V481",
        "cargo_vault_vehicle_id": "V517",
        "escort_vehicle_id": "V109",
        "classification": "HIGH_VALUE_BULLION"
    }
    response = client.post("/api/enterprise/convoy/form", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["convoy_id"] == "CONVOY-TITAN-01"
    assert data["status"] == "CONVOY_FORMED"
    assert data["radar_interlock_active"] is True

def test_convoy_emergency_lockdown():
    """Tests activating emergency biometric vault deadlock and alert broadcasting."""
    payload = {
        "convoy_id": "CONVOY-TITAN-01",
        "reason": "Hostile Threat Detected"
    }
    response = client.post("/api/enterprise/convoy/lockdown", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["convoy_id"] == "CONVOY-TITAN-01"
    assert data["threat_level"] == "DEFCON_1_CRITICAL"
    assert data["biometric_deadlock_engaged"] is True
    assert data["silent_panic_beacon_broadcasted"] is True

def test_convoy_gps_anti_spoofing_failover():
    """Tests electronic warfare attack interception and inertial dead-reckoning failover."""
    payload = {
        "convoy_id": "CONVOY-TITAN-01"
    }
    response = client.post("/api/enterprise/convoy/anti-spoofing/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["convoy_id"] == "CONVOY-TITAN-01"
    assert data["countermeasure"] == "INERTIAL_DEAD_RECKONING_FAILOVER"
    assert data["trajectory_integrity"] == "100% SECURE"

def test_cryo_status_query():
    """Tests querying fleet cryogenic chambers, dual-probe PT100 temperatures, and MKT scores."""
    response = client.get("/api/enterprise/cryo/status")
    assert response.status_code == 200
    data = response.json()
    assert "chambers" in data
    assert len(data["chambers"]) >= 3
    assert data["fleet_cold_chain_compliance_rate"] > 90.0
    assert "fda_21_cfr_part_11_status" in data

def test_cryo_boost_intervention():
    """Tests autonomous LN2 booster pulse injection to stabilize temperature."""
    payload = {
        "chamber_id": "CRYO-BIO-802",
        "vehicle_id": "V302"
    }
    response = client.post("/api/enterprise/cryo/boost", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["chamber_id"] == "CRYO-BIO-802"
    assert data["stabilized_temp_c"] == -80.0
    assert data["status"] == "STABILIZED"

def test_cryo_emergency_divert():
    """Tests emergency cryogenic depot diversion for endangered biologics."""
    payload = {
        "chamber_id": "CRYO-BIO-802",
        "vehicle_id": "V302",
        "target_depot": "DEPOT-01 SF Central (ULT Hub)"
    }
    response = client.post("/api/enterprise/cryo/emergency-divert", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["vehicle_id"] == "V302"
    assert data["status"] == "DIVERT_IN_PROGRESS"
    assert "estimated_arrival_minutes" in data

def test_cryo_fda_audit_export():
    """Tests exporting FDA 21 CFR Part 11 compliant tamper-sealed audit logs."""
    response = client.get("/api/enterprise/cryo/audit-export")
    assert response.status_code == 200
    data = response.json()
    assert "audit_id" in data
    assert data["nist_traceable"] is True
    assert "data_integrity_sha256" in data
    assert data["temperature_excursion_count"] == 0

def test_global_city_preset_import():
    """Tests loading a global city preset (NYC / Tokyo / London / Berlin)."""
    payload = {
        "city_id": "nyc",
        "city_name": "New York City",
        "center": {"lat": 40.7128, "lng": -74.0060, "zoom": 12.0},
        "vehicles": [
            {
                "id": "NYC-V01",
                "model": "Autonomous Freightliner eCascadia",
                "type": "TRUCK",
                "status": "ON_ROUTE",
                "battery_fuel_percent": 94.0,
                "location": {"lat": 40.7128, "lng": -74.0060},
                "speed_kmh": 40.0
            }
        ]
    }
    response = client.post("/api/enterprise/fleet/import-city", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["city_id"] == "nyc"
    assert data["vehicles_loaded"] >= 1

def test_custom_csv_manifest_import():
    """Tests parsing and ingesting custom vehicle records."""
    payload = {
        "mode": "replace",
        "records": [
            {
                "id": "CUST-01",
                "lat": 37.7800,
                "lng": -122.4100,
                "model": "Rivian EDV-700",
                "type": "VAN",
                "battery": 85.0,
                "status": "AVAILABLE"
            },
            {
                "id": "CUST-02",
                "lat": 37.7900,
                "lng": -122.4000,
                "model": "Tesla Semi Autonomous",
                "type": "TRUCK",
                "battery": 92.0,
                "status": "ON_ROUTE"
            }
        ]
    }
    response = client.post("/api/enterprise/fleet/import-csv", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["vehicles_imported"] == 2
    assert data["total_active_fleet"] == 2

def test_fleet_csv_export():
    """Tests exporting live vehicle telematics as downloadable CSV."""
    response = client.get("/api/enterprise/fleet/export-csv")
    assert response.status_code == 200
    data = response.json()
    assert "filename" in data
    assert "csv_content" in data
    assert "id,model,type,status" in data["csv_content"]

def test_fleet_geojson_export():
    """Tests exporting live fleet as standard RFC 7946 GeoJSON FeatureCollection."""
    response = client.get("/api/enterprise/fleet/export-geojson")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert "features" in data
    assert len(data["features"]) > 0
    assert data["features"][0]["geometry"]["type"] == "Point"

def test_mappls_ev_chargers_query():
    """Tests querying Mappls EV Charging Hubs with live availability and power ratings."""
    response = client.get("/api/enterprise/ev/chargers?city_id=sf")
    assert response.status_code == 200
    data = response.json()
    assert data["city_id"] == "sf"
    assert data["total_stations"] >= 4
    assert len(data["stations"]) >= 4
    assert "power_kw" in data["stations"][0]
    assert "ports_available" in data["stations"][0]

def test_mappls_ev_range_isochrone_calculation():
    """Tests calculating Distance-to-Empty (DTE) and isochrone polygon for EV battery."""
    payload = {
        "lat": 37.7749,
        "lng": -122.4194,
        "battery_percent": 65.0,
        "max_range_km": 300.0
    }
    response = client.post("/api/enterprise/ev/calculate-range", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["distance_to_empty_km"] == 195.0
    assert "range_isochrone_geojson" in data
    assert data["range_isochrone_geojson"]["geometry"]["type"] == "Polygon"
    assert len(data["range_isochrone_geojson"]["geometry"]["coordinates"][0]) >= 36

def test_mappls_ev_auto_charge_route_planner():
    """Tests auto-inserting optimal en-route fast charging stop when battery is low."""
    payload = {
        "vehicle_id": "V-EV01",
        "battery_percent": 28.0,
        "origin": {"lat": 37.7749, "lng": -122.4194},
        "destination": {"lat": 37.8044, "lng": -122.2712}
    }
    response = client.post("/api/enterprise/ev/plan-charge-route", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["charging_required"] is True
    assert "recommended_charger" in data
    assert len(data["optimized_waypoints"]) == 3
    assert data["recommended_charger"]["power_kw"] >= 150



