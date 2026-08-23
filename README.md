# FleetOps AI — Autonomous Fleet Operations Platform

<div align="center">

![FleetOps AI](https://img.shields.io/badge/FleetOps-AI-emerald?style=for-the-badge&logo=compass&logoColor=white)
![Multi-Agent](https://img.shields.io/badge/Architecture-Multi--Agent%20Swarm-blue?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%2B%20WebSockets-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript%20%2B%20MapLibre-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Docker](https://img.shields.io/badge/Deployment-Docker%20%2B%20Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Observability](https://img.shields.io/badge/Observability-Prometheus%20%2B%20JSON%20Logs-E6522C?style=for-the-badge&logo=prometheus&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

<p align="center">
  <b>A real-time, map-centric autonomous fleet operations command center powered by multi-agent swarm orchestration.</b><br/>
  Simulates a 100-vehicle metropolitan delivery fleet subjected to dynamic breakdowns, traffic jams, severe storms, and cascading failures — where a team of autonomous, tool-using AI agents detect, investigate, recalculate routes, and resolve disruptions in real time.
</p>

</div>

---

## 🌟 Key Highlights & Why This Project Stands Out

Most AI portfolio projects are simple "chat with an LLM" wrappers. **FleetOps AI** is an event-driven, distributed autonomous operations platform:

1. **Multi-Agent Orchestration with Specialized Roles:**
   - **🤖 Orchestrator Agent:** Listens to live telemetry, triages anomalies, scopes impacted orders, and coordinates recovery.
   - **🚗 Traffic Agent:** Evaluates corridor congestion multipliers and calculates arterial delay buffers.
   - **🌧️ Weather Agent:** Assesses meteorological hazards and enforces risk-aware speed adaptations.
   - **👤 Dispatch Agent:** Searches 100 candidate vehicles, ranks feasibility across distance, payload capacity, and battery charge, and assigns replacements.
   - **🧭 Routing Agent:** Synthesizes obstacle-avoiding GPS waypoints, detour corridors, and projected ETAs.
   - **💬 Customer Agent:** Dispatches proactive SMS / webhook delay alerts to affected recipients.

2. **Human-Friendly Reasoning & Audit Trace:**
   - Real-time audit modal rendering plain-English action summaries, operational input badges, verified outcome metrics, and execution latency benchmarks.
   - Dual-view toggle: **Executive Human View** (default) vs. **Raw Developer JSON**.

3. **Production-Ready & Enterprise Hardened:**
   - **Containerization:** Multi-stage `Dockerfile` and production `docker-compose.prod.yml` (FastAPI + PostgreSQL/PostGIS + Redis + Caddy SSL Gateway).
   - **Database Layer:** SQLAlchemy connection pooling supporting PostgreSQL/PostGIS in production with zero-config SQLite local fallback.
   - **Security & RBAC:** HMAC-SHA256 JWT tokens, salted password hashing, role permissions (`Admin`, `Operator`, `Viewer`), rate limiting, and security headers.
   - **Observability:** Structured JSON logging with correlation IDs and live Prometheus metric scraping on `/api/metrics`.
   - **CI/CD Suite:** GitHub Actions matrix workflow (`.github/workflows/ci.yml`) for automated testing across Python versions, frontend compilation, and Docker builds.

4. **Gamified Incident Levels (1 through 8):**
   - Progressively challenging scenarios from single vehicle failure (Level 1) to cascading multi-tier compound gridlocks (Level 8).

5. **Instant Reactive WebSocket State Synchronization:**
   - Sub-millisecond snapshot synchronization of vehicle statuses, active routes, delivery lists, and event alerts upon any disruption or operator action.

---

## 🏛️ System Architecture

```
                                  ┌────────────────────────────────────────────────────────┐
                                  │            React + TypeScript + Vite                   │
                                  │           (Command Center Dashboard)                   │
                                  │  - MapLibre GL Dark Map & Animated Fleet Markers       │
                                  │  - Live Event Feed & Impacted Deliveries Table         │
                                  │  - Human-Friendly Multi-Agent Trace Visualizer         │
                                  │  - Simulation Control Console (Manual Injection)       │
                                  │  - Gamification Engine & Level 1-8 Scenarios           │
                                  └──────────────────────────┬─────────────────────────────┘
                                                             │ WebSocket + REST API
                                                             ▼
                                  ┌────────────────────────────────────────────────────────┐
                                  │            FastAPI Enterprise Backend                  │
                                  │  - Real-Time Telemetry Loop (Vehicle Physics, Battery) │
                                  │  - JWT Authentication, RBAC & Security Middleware     │
                                  │  - Prometheus Metrics (/api/metrics) & Structured Logs │
                                  │  - PostgreSQL + PostGIS (with SQLite Local Fallback)   │
                                  └──────────────────────────┬─────────────────────────────┘
                                                             │
                                                             ▼
                                  ┌────────────────────────────────────────────────────────┐
                                  │           Multi-Agent Orchestrator Pipeline            │
                                  │                                                        │
                                  │               ┌───────────────────────┐                │
                                  │               │   Orchestrator Agent  │                │
                                  │               └───────────┬───────────┘                │
                                  │                           │                            │
                                  │       ┌───────────┬───────┴───────┬───────────┐        │
                                  │       ▼           ▼               ▼           ▼        │
                                  │  ┌─────────┐ ┌─────────┐    ┌──────────┐ ┌──────────┐  │
                                  │  │ Traffic │ │ Weather │    │ Dispatch │ │ Routing  │  │
                                  │  │  Agent  │ │  Agent  │    │  Agent   │ │  Agent   │  │
                                  │  └────┬────┘ └────┬────┘    └────┬─────┘ └────┬─────┘  │
                                  │       │           │              │            │        │
                                  │       └───────────┼──────────────┴────────────┘        │
                                  │                   ▼                                    │
                                  │         ┌───────────────────┐                          │
                                  │         │  Customer Agent   │                          │
                                  │         └───────────────────┘                          │
                                  └────────────────────────────────────────────────────────┘
```

---

## 🎮 Gamified Incident Levels (1 to 8)

| Level | Incident Scenario | AI Challenge |
|---|---|---|
| **1** | **Vehicle Breakdown** | Find optimal replacement vehicle (V517 vs constrained V509/V526), transfer payload, reroute, and alert customers. |
| **2** | **Heavy Traffic Gridlock** | Detect major accident on Highway 101 corridor (2.5x multiplier) and generate arterial bypass detours. |
| **3** | **Sudden Severe Storm** | Fleetwide 2.0x safety speed reduction, risk buffering, and proactive delivery window adjustments. |
| **4** | **Driver Fatigue Anomaly** | Telemetry detects driver fatigue score (0.88); dispatch routes vehicle to depot and schedules certified relief driver. |
| **5** | **Multiple Vehicle Failures** | Dual simultaneous breakdowns (V481 in SoMa and V488 at Bay Bridge); global capacity re-balancing. |
| **6** | **High-Priority Emergency Order** | Urgent express medical shipment arrives at Central Hub; preempts standard routes for priority fast-pathing. |
| **7** | **Compound Disruption** | Breakdown + Heavy Rain (1.5x) + Highway Congestion (1.5x) simultaneous multi-constraint reasoning. |
| **8** | **Cascading Failure Stress Test** | The Ultimate Test: V481 Broken + Severe Storm + Highway Gridlock + 3 Urgent Orders + V517 low battery + V509 near capacity. |

---

## 🛠️ Getting Started & Launch Modes

FleetOps AI provides three flexible launch modes tailored for development, local container testing, and full enterprise deployment:

### Launch Modes Comparison

| Mode | Command | Stack / Services | Ports & URLs | Best For |
|---|---|---|---|---|
| **[1] Local Dev Server** | `start.bat local` | Uvicorn (FastAPI) + Vite (React 18) + SQLite | UI: `http://localhost:3000`<br/>API: `http://localhost:8000`<br/>Docs: `http://localhost:8000/docs` | Hot-reloading & UI development |
| **[2] Docker Container** | `start.bat docker` | Multi-stage Container (FastAPI + Bundled SPA) | App: `http://localhost:8000`<br/>Health: `http://localhost:8000/api/health`<br/>Metrics: `http://localhost:8000/api/metrics` | Single-container deployment |
| **[3] Enterprise Prod Stack** | `start.bat prod` | App + PostgreSQL/PostGIS + Redis + Caddy | Gateway: `http://localhost`<br/>App: `http://localhost:8000`<br/>Postgres: `5432` \| Redis: `6379` | Scalable multi-worker deployment |

---

### Method 1: Single-Click Script Launcher (`start.bat`)

Double-click or run [`start.bat`](file:///c:/Users/KIIT/Desktop/Helix/start.bat) from the terminal for an interactive launch menu:

```cmd
start.bat
```

```
================================================================
  FleetOps AI - Autonomous Fleet Operations Platform
================================================================

Select launch mode:
  [1] Local Dev Server (Python FastAPI + React Vite on :3000)
  [2] Docker Container Stack (FastAPI + Bundled SPA on :8000)
  [3] Enterprise Production Stack (Docker + PostgreSQL + Redis + Caddy)

Enter choice [1-3] (Default: 1):
```

Or execute directly via arguments:
```cmd
start.bat docker   # Runs containerized stack (Port 8000)
start.bat prod     # Runs PostgreSQL + Redis + Caddy Production stack
start.bat local    # Runs standard FastAPI + Vite dev servers (:8000 & :3000)
```

---

### Method 2: Manual Local Setup

#### 1. Backend Setup
```bash
pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

### Method 3: Containerized Execution (Docker)

#### Local Containerized Stack
```bash
docker compose up --build
```

#### Enterprise Production Stack (PostgreSQL + PostGIS, Redis, Caddy Reverse Proxy)
```bash
docker compose -f docker-compose.prod.yml up --build -d
```
- **Automatic Healthchecks**: Containers monitor database readiness (`pg_isready`), Redis ping responses, and `/api/health`.
- **Persistent Storage Volumes**: Preserves PostgreSQL database data (`pgdata`) and Redis snapshots (`redisdata`).
- **Reverse Proxy Gateway**: Caddy automates SSL/TLS termination and proxies requests to the backend cluster.

---

## 🧪 Testing & Verification

Run the comprehensive test suite (Unit, API, Multi-Agent Swarm, Database Persistence, and Production Readiness):

```bash
python -m pytest
```
*Current test suite: **18 passed, 0 failed** across `test_agents.py`, `test_api.py`, `test_database.py`, `test_production.py`, and `test_simulation.py`.*

Build and type-check the React frontend:

```bash
cd frontend
npm run build
```

---

## 📊 Telemetry & Observability

- **Metrics Scraping**: `GET /api/metrics` (Prometheus formatted output)
  - `fleetops_active_vehicles_total`: Current active vehicle count.
  - `fleetops_websocket_connections_active`: Live operator WebSocket streams.
  - `fleetops_incidents_injected_total`: Total disruption events.
  - `fleetops_agent_tool_execution_seconds`: Execution latency histogram per tool.
- **Health Check**: `GET /api/health`
- **Structured Logs**: Set `LOG_JSON_FORMAT=true` in `.env` to emit machine-readable JSON logs.

---

## 🔒 Security & Authentication

- **JWT Sessions**: `POST /api/auth/login` returns an access token.
- **RBAC**: Protects mutation endpoints with `Admin`, `Operator`, and `Viewer` role guards.
- **Dev Mode**: `AUTH_REQUIRED=false` (default) permits zero-configuration local testing; set `AUTH_REQUIRED=true` for enterprise deployments.

---

## 📄 Resume / Portfolio Highlights

- **Multi-Agent Swarm Architecture:** Designed and implemented an event-driven multi-agent orchestration architecture in Python/FastAPI using specialized agent nodes equipped with deterministic spatial tools to autonomously resolve real-time logistics failures.
- **Real-Time Web & Spatial Visualization:** Built a high-frequency WebSocket state synchronization pipeline and interactive MapLibre GL JS operations console rendering 100 simulated vehicles, dynamic polylines, and sub-second anomaly mitigation traces.
- **Production Hardening & CI/CD:** Engineered Docker containerization, PostgreSQL/PostGIS connection pooling, Prometheus metrics collection, JWT role-based access control, and automated GitHub Actions verification workflows.

---

## 📜 License
MIT License. Created for high-impact engineering portfolio and production demonstrations.
