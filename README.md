# FleetOps AI — Autonomous Fleet Operations Platform

<div align="center">

![FleetOps AI](https://img.shields.io/badge/FleetOps-AI-emerald?style=for-the-badge&logo=compass&logoColor=white)
![Multi-Agent](https://img.shields.io/badge/Architecture-Multi--Agent%20Swarm-blue?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%2B%20WebSockets-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript%20%2B%20MapLibre-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Docker](https://img.shields.io/badge/Deployment-Docker%20%2B%20Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Observability](https://img.shields.io/badge/Observability-Prometheus%20%2B%20JSON%20Logs-E6522C?style=for-the-badge&logo=prometheus&logoColor=white)
![Tests](https://img.shields.io/badge/Tests-69%20Passed-brightgreen?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

<p align="center">
  <b>A real-time, map-centric autonomous fleet operations command center powered by multi-agent swarm orchestration.</b><br/>
  Simulates a 100-vehicle metropolitan delivery fleet subjected to dynamic breakdowns, traffic jams, severe storms, cold-chain temperature breaches, microclimate weather hazards, and cascading failures — where a team of autonomous, tool-using AI agents detect, investigate, recalculate routes, balance depots, and resolve disruptions in real time.
</p>

</div>

---

## 🌟 Key Highlights & Enterprise Architecture

Most AI portfolio projects are simple "chat with an LLM" wrappers. **FleetOps AI** is a production-grade, event-driven distributed autonomous operations platform comprising **14 advanced enterprise phases**:

### 1. Multi-Agent Orchestration Swarm
- **🤖 Orchestrator Agent:** Listens to live telemetry, triages anomalies, scopes impacted orders, and coordinates multi-step recovery.
- **🚗 Traffic Agent:** Evaluates corridor congestion multipliers and calculates arterial delay buffers.
- **🌧️ Weather Agent:** Assesses meteorological hazards and enforces risk-aware speed adaptations.
- **👤 Dispatch Agent:** Evaluates 100 candidate vehicles across payload, distance, and SoC to execute optimal payload transfers.
- **🧭 Routing Agent:** Synthesizes obstacle-avoiding GPS waypoints, detour corridors, and projected ETAs via OSRM.
- **💬 Customer Agent:** Dispatches proactive SMS / webhook delay notifications to affected recipients.

### 2. Enterprise Telematics & Operational Command Modules
- **🛡️ Autonomous Spatial Geofencing & Self-Healing Policies (`POL-01` to `POL-04`):** Ray-casting point-in-polygon boundary breach detection (e.g. HAZMAT zones, Low-Emission districts) with automated self-healing enforcement.
- **⏱️ Time-Travel Mission Replay & Cold-Chain Telematics:** 60-second rolling blackbox flight recorder, incident post-mortem generator, and sensor telemetry (`cargo_temp_c`, `cargo_humidity_percent`, door open security alerts).
- **🏢 Multi-Tenant Regional Enterprise Depots & Swarm Balancing:** Dynamic capacity rebalancing between regional distribution centers (`DEPOT-01 SF Central`, `DEPOT-02 Oakland Port`, `DEPOT-03 San Jose Tech`).
- **👁️ AI Vision Driver Safety Telematics & Real-Time Coaching:** In-cab vision event detection (harsh braking, phone distraction, speeding, fatigue), safety leaderboard rankings, and personalized coaching plans.
- **⚡ Autonomous EV Charging Grid Optimization, V2G & Battery SoH Analytics:** 24-hour dynamic utility tariff scheduling, Vehicle-to-Grid (V2G) peak shaving, regional high-voltage utility substation monitoring (% renewable mix & carbon intensity), battery State of Health (SoH) degradation curves, and active thermal preconditioning for DC fast charging.
- **🔬 AI Predictive Maintenance & Component Failure Prognostics:** Acoustic harmonic vibration analysis ($Hz$), inverter thermal throttling, Remaining Useful Life (RUL) forecasting, and autonomous OEM parts work order dispatching.
- **🛡️ Autonomous HAZMAT & High-Value Secure Convoy Escort Mesh:** Multi-vehicle armored escort formations (Lead Sweeper, High-Security Vault, Rear Tactical Interceptor), military multi-band GNSS anti-spoofing / anti-jamming with inertial dead-reckoning fallback, dual-custody biometric vault deadlocks, and silent panic beacons.
- **❄️ Autonomous Cryogenic & Pharma Cold-Chain Engine:** Sub-zero $-80^\circ\text{C}$ ultra-low temp (ULT) vaccine telematics, NIST-calibrated dual-probe PT100 sensors, Mean Kinetic Temperature ($MKT$) calculations, autonomous liquid nitrogen ($LN_2$) booster pulses, emergency deep-freeze hub diversions, and FDA 21 CFR Part 11 certified audit trails.
- **⛈️ Geospatial Microclimate Weather Hazards & Disaster Rerouting:** Real-time localized flood, dense fog, and high-wind hazard polygons with automated lateral detour route generation.
- **🏭 Autonomous Yard Management System (YMS) & Smart Dock Door Scheduler:** Distribution center dock door allocation (`BAY-01` to `BAY-08`), dwell turnaround timers vs. SLA targets, staged trailer inventory, and optical ALPR gate check-in feeds.
- **🕒 Driver Hours of Service (HOS) & DOT/FMCSA ELD Logbooks:** 4-line 24-hour graphical ELD timeline, mandatory rest break countdowns (11h driving / 14h shift / 70h cycle limits), and certified audit export with SHA-256 tamper seals.
- **📱 Driver In-Cab Companion Tablet & e-POD:** Turn-by-turn navigation, detour approvals, and digital proof-of-delivery with recipient signatures.
- **📦 Public Customer Live Shipment Tracking:** Real-time courier map, animated progress milestones, and estimated delivery countdowns.

---

## 🏛️ System Architecture

```
                                  ┌────────────────────────────────────────────────────────┐
                                  │            React 18 + TypeScript + Vite                │
                                  │           (Command Center Dashboard)                   │
                                  │  - MapLibre GL Dark Map & 100 Animated Fleet Units     │
                                  │  - Top Navigation: YMS, HOS, EV Grid, Weather, Safety │
                                  │  - Live Event Feed & Impacted Deliveries Table         │
                                  │  - Human-Friendly Multi-Agent Trace Visualizer         │
                                  │  - Simulation Control Console (Manual Injection)       │
                                  │  - Gamification Engine & Level 1-8 Scenarios           │
                                  └──────────────────────────┬─────────────────────────────┘
                                                             │ WebSocket + REST API
                                                             ▼
                                  ┌────────────────────────────────────────────────────────┐
                                  │            FastAPI Enterprise Backend                  │
                                  │  - Real-Time Telemetry Loop (Physics, Battery, Sensors)│
                                  │  - Ray-Casting Spatial Geofencing & Weather Hazards    │
                                  │  - Self-Healing Policy Engine & Audit Trail            │
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

## 🏢 Complete Enterprise REST API Suite

| Enterprise Module | Endpoint | Method | Description |
| :--- | :--- | :---: | :--- |
| **Driver HOS & ELD** | `/api/enterprise/hos/logs` | `GET` | Live FMCSA/DOT Electronic Logging Device records and duty timers. |
| **Driver HOS Switcher** | `/api/enterprise/hos/duty-status` | `POST` | Updates driver duty status (`DRIVING`, `ON_DUTY`, `SLEEPER`, `OFF_DUTY`). |
| **FMCSA Audit Export** | `/api/enterprise/hos/audit-export` | `POST` | Generates encrypted 24h ELD audit package with SHA-256 tamper seal. |
| **Yard Management (YMS)** | `/api/enterprise/yard/status` | `GET` | Live dock door states (`BAY-01..08`), staged trailers, and ALPR gate stream. |
| **Autonomous Dock Assign** | `/api/enterprise/yard/dock-assign` | `POST` | Autonomously allocates optimal vacant bay for inbound freight. |
| **ALPR Optical Gate** | `/api/enterprise/yard/gate-event` | `POST` | Processes automated ALPR gate-in / gate-out license plate events. |
| **Microclimate Hazards** | `/api/enterprise/weather/hazards` | `GET` | Microclimate flood, fog, and wind hazard polygons with route intersections. |
| **Disaster Reroute Engine** | `/api/enterprise/weather/hazards/reroute` | `POST` | Autonomously diverts all intersecting routes around weather hazard zones. |
| **EV Charging Stations** | `/api/enterprise/charging/stations` | `GET` | 24h electricity tariff forecast curve, bay occupancy, and hub power draw. |
| **Smart EV Optimization** | `/api/enterprise/charging/optimize` | `POST` | Schedules vehicle charging during lowest-tariff off-peak windows. |
| **V2G Energy Discharge** | `/api/enterprise/charging/v2g-discharge` | `POST` | Dispatches idle vehicles to inject power into grid during peak pricing. |
| **Battery SoH Analytics** | `/api/enterprise/charging/battery-health` | `GET` | Pack degradation, internal resistance ($m\Omega$), cycle count, and thermal risk. |
| **Regional Substations** | `/api/enterprise/charging/substations` | `GET` | High-voltage substation loads, renewable energy mix %, and carbon intensity. |
| **Battery Precondition** | `/api/enterprise/charging/smart-precondition` | `POST` | Thermally primes battery pack to 25°C for DC fast charge & life extension. |
| **Fleet Prognostics (RUL)** | `/api/enterprise/maintenance/fleet-health` | `GET` | Component health scorecards, harmonic vibrations, and RUL curves. |
| **Autonomous Work Orders** | `/api/enterprise/maintenance/work-orders` | `GET` | Active AI work orders, allocated OEM parts kits, and bay schedules. |
| **Dispatch Work Order** | `/api/enterprise/maintenance/work-orders/dispatch` | `POST` | Autonomously intercepts component failure and diverts vehicle to bay. |
| **Complete Work Order** | `/api/enterprise/maintenance/work-orders/{id}/complete` | `POST` | Certifies repair completion and restores vehicle to active fleet. |
| **Secure Convoy Status** | `/api/enterprise/convoy/status` | `GET` | Armored convoy positions, GNSS signal health, threat levels, and vault status. |
| **Form Secure Convoy** | `/api/enterprise/convoy/form` | `POST` | Groups Lead, Vault, and Escort units into synchronized 25m radar mesh. |
| **Emergency Lockdown** | `/api/enterprise/convoy/lockdown` | `POST` | Engages biometric vault deadlock, strobe beacons, and law enforcement dispatch. |
| **GNSS Anti-Spoofing** | `/api/enterprise/convoy/anti-spoofing/simulate` | `POST` | Simulates electronic jamming attack and triggers inertial dead-reckoning fallback. |
| **Cryo Cold-Chain Status** | `/api/enterprise/cryo/status` | `GET` | Sub-zero -80°C chamber telemetry, dual PT100 probes, and MKT calculations. |
| **LN2 Cryo Boost** | `/api/enterprise/cryo/boost` | `POST` | Injects autonomous liquid nitrogen pulse to avert thermal runaway. |
| **Emergency Cryo Divert** | `/api/enterprise/cryo/emergency-divert` | `POST` | Reroutes vehicle to nearest ultra-low temperature staging hub. |
| **FDA 21 CFR Audit Export** | `/api/enterprise/cryo/audit-export` | `GET` | Exports certified FDA 21 CFR Part 11 compliant thermal log certificate. |
| **AI Driver Safety** | `/api/enterprise/safety/leaderboard` | `GET` | Real-time driver safety rankings, risk tiers, and violation statistics. |
| **Driver Scorecard** | `/api/enterprise/safety/drivers/{id}/scorecard`| `GET` | Telemetry breakdown (harsh braking, distraction, fatigue) and coaching tips. |
| **Safety Event Ingestion** | `/api/enterprise/safety/event` | `POST` | Ingests AI vision safety events and triggers real-time coaching alerts. |
| **Multi-Depot Status** | `/api/enterprise/depots` | `GET` | Regional depot metrics, capacity utilization, and active fleet counts. |
| **Swarm Depot Rebalance** | `/api/enterprise/depots/rebalance` | `POST` | Rebalances unassigned vehicle capacity across regional distribution centers. |
| **Blackbox Flight Log** | `/api/enterprise/simulation/flight-log` | `GET` | Retrieves 60-second high-resolution rolling blackbox recording. |
| **Incident Post-Mortem** | `/api/enterprise/simulation/flight-log/post-mortem`| `POST` | Generates executive Markdown incident report with root cause analysis. |
| **Spatial Geofencing** | `/api/enterprise/geofences` | `GET` | Retrieves active spatial polygon boundaries (HAZMAT, Low-Emission). |
| **Self-Healing Policies** | `/api/enterprise/policies` | `GET` | Real-time policy engine states (`POL-01` through `POL-04`). |
| **IoT Telematics Ingestion**| `/api/enterprise/telematics/ingest` | `POST` | Ingests OBD-II DTC codes, cold-chain temperature, and door sensor alerts. |
| **Public Order Tracking** | `/api/enterprise/tracking/{order_id}` | `GET` | White-labeled public tracking portal with live courier coordinates. |
| **Driver e-POD** | `/api/enterprise/driver/pod` | `POST` | Ingests recipient signatures, photos, and marks deliveries complete. |

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

---

## 🧪 Testing & Verification

Run the comprehensive test suite (Unit, API, Multi-Agent Swarm, Database Persistence, Enterprise Telematics, Geofencing, YMS, HOS, and Production Readiness):

```bash
python -m pytest
```
*Current test suite: **54 passed, 0 failed** across all test suites.*

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

## 📜 License
MIT License. Created for high-impact engineering portfolio and production demonstrations.
