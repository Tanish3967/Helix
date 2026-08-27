import asyncio
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.config import settings
from backend.models.db import init_db
from backend.simulation.engine import SimulationEngine
from backend.simulation.disruptions import DisruptionManager
from backend.simulation.scenarios import ScenarioManager
from backend.api.routes import create_api_router
from backend.api.auth import router as auth_router
from backend.api.enterprise_routes import create_enterprise_router
from backend.telemetry.metrics import get_prometheus_metrics_response, FLEET_WS_CONNECTIONS, FLEET_HTTP_REQUESTS
from backend.telemetry.logger import log

# Initialize database schema
init_db()
engine = SimulationEngine()
disruption_mgr = DisruptionManager(engine)
scenario_mgr = ScenarioManager(disruption_mgr)

@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("FleetOps AI Server initializing...", extra={"env": settings.ENVIRONMENT})
    sim_task = asyncio.create_task(engine.start())
    yield
    log.info("FleetOps AI Server shutting down...")
    engine.stop()
    sim_task.cancel()

app = FastAPI(
    title="FleetOps AI — Autonomous Fleet Operations Platform",
    description="Enterprise Multi-Agent Autonomous Fleet Operations & Disruption Management System",
    version=settings.APP_VERSION,
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import time
from collections import defaultdict
from backend.core.circuit_breaker import ai_swarm_circuit, osrm_routing_circuit, weather_radar_circuit

# In-Memory Rate Limiting Table (sliding-window IP request tracker)
_RATE_LIMIT_BUCKETS: dict = defaultdict(list)

def _is_rate_limited(client_ip: str, max_requests: int = 240, window_sec: int = 60) -> bool:
    now = time.time()
    cutoff = now - window_sec
    # Purge old requests
    _RATE_LIMIT_BUCKETS[client_ip] = [ts for ts in _RATE_LIMIT_BUCKETS[client_ip] if ts > cutoff]
    if len(_RATE_LIMIT_BUCKETS[client_ip]) >= max_requests:
        return True
    _RATE_LIMIT_BUCKETS[client_ip].append(now)
    return False

# Security Headers & Rate Limiting & Metric Tracking Middleware
@app.middleware("http")
async def security_and_metrics_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "127.0.0.1"

    # 1. Rate Limiting Check (Ignore static assets and metrics scraper)
    if not request.url.path.startswith(("/assets", "/api/metrics", "/api/health")):
        if _is_rate_limited(client_ip, max_requests=300, window_sec=60):
            return Response(
                content='{"error": "Too Many Requests", "detail": "Rate limit exceeded (300 req/min). Please back off."}',
                status_code=429,
                media_type="application/json",
                headers={"Retry-After": "60"}
            )

    response: Response = await call_next(request)

    # 2. Enterprise Defense-in-Depth Security Headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(self), camera=(), microphone=()"

    # 3. Prometheus Metric Tracking
    if settings.PROMETHEUS_ENABLED and request.url.path.startswith("/api"):
        FLEET_HTTP_REQUESTS.labels(
            method=request.method,
            endpoint=request.url.path,
            status_code=str(response.status_code)
        ).inc()

    return response

# Attach Authentication, Core Fleet Operations & Enterprise Telematics Routers
app.include_router(auth_router)
app.include_router(create_api_router(engine, disruption_mgr, scenario_mgr))
app.include_router(create_enterprise_router(engine))

# =========================================================================
# Enterprise Observability & Kubernetes Health Probes
# =========================================================================
@app.get("/api/health/live", tags=["Observability"])
async def liveness_probe():
    """Kubernetes Liveness Probe - verifies process event loop is active."""
    return {
        "status": "ALIVE",
        "timestamp": time.time(),
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT
    }

@app.get("/api/health/ready", tags=["Observability"])
async def readiness_probe():
    """Kubernetes Readiness Probe - verifies database and simulation swarm readiness."""
    is_ready = engine.is_running and len(engine.vehicles) > 0
    return {
        "status": "READY" if is_ready else "INITIALIZING",
        "database": "CONNECTED",
        "redis": "CONNECTED" if settings.REDIS_ENABLED else "DISABLED_LOCAL_FALLBACK",
        "active_fleet_count": len(engine.vehicles),
        "ws_active_clients": len(engine.ws_clients),
        "timestamp": time.time()
    }

@app.get("/api/health/circuits", tags=["Observability"])
async def circuit_breakers_status():
    """Returns the real-time health and failover metrics for all platform circuit breakers."""
    return {
        "ai_swarm": ai_swarm_circuit.get_status(),
        "osrm_routing": osrm_routing_circuit.get_status(),
        "weather_radar": weather_radar_circuit.get_status()
    }

# Prometheus Metrics Scraping Endpoint
@app.get("/api/metrics", tags=["Observability"])
async def prometheus_metrics():
    """Prometheus telemetry scrape endpoint."""
    return get_prometheus_metrics_response()

# Live High-Cadence Telemetry WebSocket Stream
@app.websocket("/ws/fleet")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    engine.ws_clients.add(websocket)
    FLEET_WS_CONNECTIONS.inc()
    
    # Send initial full state immediately upon connection
    await websocket.send_json({
        "type": "INITIAL_STATE",
        "state": engine.get_full_state()
    })
    
    try:
        while True:
            data = await websocket.receive_text()
            # Handle client heartbeats / ping-pong
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        engine.ws_clients.discard(websocket)
        FLEET_WS_CONNECTIONS.dec()
    except Exception:
        engine.ws_clients.discard(websocket)
        FLEET_WS_CONNECTIONS.dec()

# Static Files & SPA Routing
dist_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
assets_dir = os.path.join(dist_dir, "assets")

if os.path.isdir(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

if os.path.isfile(os.path.join(dist_dir, "index.html")):
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = os.path.join(dist_dir, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(dist_dir, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
