"""
Automated Test Suite for Enterprise Security, Identity & Access (RBAC/OIDC),
Telematics Anti-Spoofing Signatures, Circuit Breakers, and Production Probes.
"""

import time
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.config import settings
from backend.telematics.security import (
    sign_telematics_payload,
    verify_telematics_signature
)
from backend.core.circuit_breaker import CircuitBreaker, CircuitState, CircuitBreakerOpenException

client = TestClient(app)

# =========================================================================
# 1. Enterprise Security Headers & Rate Limiting Tests
# =========================================================================
def test_enterprise_security_headers_present():
    """Verifies standard enterprise defense-in-depth HTTP security headers."""
    response = client.get("/api/health/live")
    assert response.status_code == 200
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("X-XSS-Protection") == "1; mode=block"
    assert "Strict-Transport-Security" in response.headers
    assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"

def test_rate_limiting_burst_protection():
    """Verifies that exceeding the sliding window threshold triggers HTTP 429."""
    from backend.main import _RATE_LIMIT_BUCKETS
    test_ip = "192.168.1.99"
    # Seed 305 recent timestamps for this test IP
    now = time.time()
    _RATE_LIMIT_BUCKETS[test_ip] = [now - 10] * 305

    from backend.main import _is_rate_limited
    assert _is_rate_limited(test_ip, max_requests=300, window_sec=60) is True

# =========================================================================
# 2. Enterprise RBAC & OIDC SSO Tests
# =========================================================================
def test_rbac_roles_listing():
    """Verifies querying available enterprise roles and permissions."""
    response = client.get("/api/auth/roles")
    assert response.status_code == 200
    data = response.json()
    assert "available_roles" in data
    assert "super_admin" in data["available_roles"]
    assert "dispatcher" in data["available_roles"]
    assert "safety_officer" in data["available_roles"]
    assert "compliance_auditor" in data["available_roles"]

def test_oidc_sso_exchange():
    """Verifies enterprise OIDC ID token exchange for authenticated session."""
    # Simulated Okta JWT id_token (header.payload.signature)
    simulated_id_token = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJjb21tYW5kZXJAZW50ZXJwcmlzZS5jb20iLCJlbWFpbCI6ImNvbW1hbmRlckBlbnRlcnByaXNlLmNvbSIsIm5hbWUiOiJDb21tYW5kZXIgV2Fsa2VyIiwiZ3JvdXBzIjpbIkZsZWV0T3BzX1N1cGVyQWRtaW5zIl19.simulated_sig"
    payload = {
        "id_token": simulated_id_token,
        "provider": "okta"
    }
    response = client.post("/api/auth/oidc/exchange", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "super_admin"
    assert data["username"] == "commander@enterprise.com"

# =========================================================================
# 3. IoT Telematics Cryptographic Signature & Anti-Spoofing Tests
# =========================================================================
def test_telematics_hardware_hmac_signing_and_verification():
    """Verifies valid hardware-signed telematics packet passes verification."""
    packet = {
        "vehicle_id": "V481",
        "timestamp": time.time(),
        "lat": 37.7749,
        "lng": -122.4194,
        "nonce": f"nonce-{time.time()}"
    }
    sig = sign_telematics_payload(packet)
    is_valid, msg = verify_telematics_signature(packet, sig)
    assert is_valid is True
    assert "Valid authentic" in msg

def test_telematics_replay_attack_rejected():
    """Verifies re-submitting an identical nonce is blocked as a replay attack."""
    fixed_nonce = f"replay-nonce-{time.time()}"
    packet = {
        "vehicle_id": "V481",
        "timestamp": time.time(),
        "lat": 37.7749,
        "lng": -122.4194,
        "nonce": fixed_nonce
    }
    sig = sign_telematics_payload(packet)
    # First submission passes
    is_valid_1, _ = verify_telematics_signature(packet, sig)
    assert is_valid_1 is True

    # Immediate second submission with same nonce is rejected
    is_valid_2, msg_2 = verify_telematics_signature(packet, sig)
    assert is_valid_2 is False
    assert "Replay attack detected" in msg_2

def test_telematics_timestamp_drift_rejected():
    """Verifies old telematics packets outside drift window are rejected."""
    expired_packet = {
        "vehicle_id": "V481",
        "timestamp": time.time() - 300, # 5 minutes old
        "lat": 37.7749,
        "lng": -122.4194,
        "nonce": f"nonce-expired-{time.time()}"
    }
    sig = sign_telematics_payload(expired_packet)
    is_valid, msg = verify_telematics_signature(expired_packet, sig)
    assert is_valid is False
    assert "Timestamp drift" in msg

# =========================================================================
# 4. Resilient Circuit Breaker Tests
# =========================================================================
def test_circuit_breaker_trip_and_fallback():
    """Verifies circuit breaker trips to OPEN after consecutive failures and executes fallback."""
    def faulty_service():
        raise ConnectionError("External API timeout")

    def reliable_fallback():
        return {"status": "FALLBACK_HEURISTIC_APPLIED"}

    cb = CircuitBreaker("Test_LLM_Circuit", fail_max=2, reset_timeout=1, fallback_func=reliable_fallback)

    # Initial state is CLOSED
    assert cb.state == CircuitState.CLOSED

    # Call 1 fails -> failure_count = 1
    res1 = cb.execute(faulty_service)
    assert res1["status"] == "FALLBACK_HEURISTIC_APPLIED"
    assert cb.failure_count == 1
    assert cb.state == CircuitState.CLOSED

    # Call 2 fails -> trips to OPEN
    res2 = cb.execute(faulty_service)
    assert res2["status"] == "FALLBACK_HEURISTIC_APPLIED"
    assert cb.state == CircuitState.OPEN

    # Call 3 is blocked immediately due to OPEN state
    res3 = cb.execute(faulty_service)
    assert res3["status"] == "FALLBACK_HEURISTIC_APPLIED"
    assert cb.total_fallbacks == 3

# =========================================================================
# 5. Kubernetes Deep Health Probes Tests
# =========================================================================
def test_kubernetes_liveness_probe():
    """Tests /api/health/live Kubernetes liveness probe."""
    response = client.get("/api/health/live")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ALIVE"
    assert "version" in data

def test_kubernetes_readiness_probe():
    """Tests /api/health/ready Kubernetes readiness probe."""
    response = client.get("/api/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["READY", "INITIALIZING"]
    assert "database" in data
    assert "active_fleet_count" in data

def test_circuit_breakers_status_probe():
    """Tests /api/health/circuits endpoint returning system resilience metrics."""
    response = client.get("/api/health/circuits")
    assert response.status_code == 200
    data = response.json()
    assert "ai_swarm" in data
    assert "osrm_routing" in data
    assert "weather_radar" in data
    assert data["ai_swarm"]["state"] == "CLOSED"
