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

# Security Headers & Metric Tracking Middleware
@app.middleware("http")
async def security_and_metrics_middleware(request: Request, call_next):
    response: Response = await call_next(request)
    # Security Headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    # Track metrics
    if settings.PROMETHEUS_ENABLED and request.url.path.startswith("/api"):
        FLEET_HTTP_REQUESTS.labels(
            method=request.method,
            endpoint=request.url.path,
            status_code=str(response.status_code)
        ).inc()
        
    return response

# Attach Authentication & Core Fleet Operations API Routers
app.include_router(auth_router)
app.include_router(create_api_router(engine, disruption_mgr, scenario_mgr))

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
