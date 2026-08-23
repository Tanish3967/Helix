import pytest
import os
import json
from datetime import datetime
from backend.models.db import (
    init_db,
    save_incident,
    save_agent_step,
    get_recent_incidents,
    SessionLocal,
    UserRecord,
    IncidentRecord,
    AgentExecutionRecord,
    VehicleRecord
)
from backend.api.auth import hash_password, verify_password

def test_database_initialization():
    """Verifies all tables are created properly."""
    init_db()
    db = SessionLocal()
    try:
        # Check that we can query without errors
        users = db.query(UserRecord).all()
        incidents = db.query(IncidentRecord).all()
        executions = db.query(AgentExecutionRecord).all()
        vehicles = db.query(VehicleRecord).all()
        assert isinstance(users, list)
        assert isinstance(incidents, list)
        assert isinstance(executions, list)
        assert isinstance(vehicles, list)
    finally:
        db.close()

def test_user_persistence_and_auth():
    """Tests creating, storing, querying, and verifying user credentials."""
    db = SessionLocal()
    try:
        test_username = f"test_user_{int(datetime.utcnow().timestamp())}"
        plain_pass = "SecurePass123!"
        hashed = hash_password(plain_pass)

        user = UserRecord(
            username=test_username,
            hashed_password=hashed,
            full_name="Fleet Test Commander",
            role="operator",
            is_active=True
        )
        db.add(user)
        db.commit()

        # Query user back
        queried = db.query(UserRecord).filter(UserRecord.username == test_username).first()
        assert queried is not None
        assert queried.username == test_username
        assert queried.role == "operator"
        assert verify_password(plain_pass, queried.hashed_password) is True
        assert verify_password("wrong_pass", queried.hashed_password) is False
    finally:
        db.close()

def test_incident_persistence_and_query():
    """Tests writing and reading incident records and JSON arrays."""
    test_incident_id = f"INC-TEST-{int(datetime.utcnow().timestamp())}"
    incident_data = {
        "id": test_incident_id,
        "type": "VEHICLE_BREAKDOWN",
        "severity": "CRITICAL",
        "title": "Test Critical Engine Fault",
        "description": "Vehicle V481 alternator failure at Mission Bay.",
        "affected_vehicle_ids": ["V481"],
        "affected_order_ids": ["ORD-101", "ORD-102"],
        "resolution_status": "Active",
        "resolution_summary": None
    }

    save_incident(incident_data)

    # Query recent incidents helper
    recent = get_recent_incidents(limit=10)
    found = next((i for i in recent if i["id"] == test_incident_id), None)
    assert found is not None
    assert found["title"] == "Test Critical Engine Fault"
    assert "V481" in found["affected_vehicle_ids"]
    assert "ORD-101" in found["affected_order_ids"]

def test_agent_step_persistence():
    """Tests logging multi-agent tool execution steps to database."""
    test_incident_id = f"INC-TEST-{int(datetime.utcnow().timestamp())}"
    step_data = {
        "agent_name": "Routing Agent",
        "state": "COMPLETE",
        "summary": "Synthesized 24.5 km bypass corridor.",
        "detail": "Routing agent bypassed Highway 101 congestion zone.",
        "tool_calls": [
            {
                "tool_name": "calculate_alternative_routes",
                "arguments": {"avoid_zone": "HWY-101"},
                "result": {"distance_km": 24.5, "waypoints_count": 28},
                "execution_time_ms": 14.2
            }
        ]
    }

    save_agent_step(test_incident_id, step_data)

    db = SessionLocal()
    try:
        steps = db.query(AgentExecutionRecord).filter(AgentExecutionRecord.incident_id == test_incident_id).all()
        assert len(steps) >= 1
        assert steps[0].agent_name == "Routing Agent"
        assert steps[0].state == "COMPLETE"
        
        parsed_tools = json.loads(steps[0].tool_calls)
        assert len(parsed_tools) == 1
        assert parsed_tools[0]["tool_name"] == "calculate_alternative_routes"
    finally:
        db.close()
