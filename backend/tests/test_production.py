import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.config import settings
from backend.api.auth import hash_password, verify_password, create_access_token

client = TestClient(app)

def test_settings_loaded():
    assert settings.APP_NAME == "FleetOps AI"
    assert settings.PORT == 8000
    assert isinstance(settings.CORS_ORIGINS, list)

def test_password_hashing():
    pwd = "super-secret-operator-pass"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("wrong-pass", hashed) is False

def test_jwt_token_generation():
    token = create_access_token({"sub": "test_commander", "role": "admin"})
    assert isinstance(token, str)
    assert len(token) > 20

def test_health_check_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"

def test_prometheus_metrics_endpoint():
    response = client.get("/api/metrics")
    assert response.status_code == 200
    assert "fleetops_" in response.text or "python_" in response.text

def test_auth_login_bootstrap():
    response = client.post(
        "/api/auth/token",
        json={"username": "operator", "password": "operator"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["role"] in ["admin", "operator"]
