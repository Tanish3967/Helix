# AGENT_CONTEXT.md — Helix / FleetOps AI System Master Reference

> **Purpose**: This document serves as the single source of truth for AI agents, developers, and autonomous coding assistants working on **Helix (FleetOps AI)**. It provides a complete overview of the architecture, directory structure, all completed subsystems (Phases 1–16), security & resilience layers, and pending roadmap items.

---

## 🧭 1. Executive Project Overview

**Helix (FleetOps AI)** is an enterprise-grade autonomous fleet operations, simulation, and real-time disruption self-healing platform. It enables logistics operators, defense convoys, cold-chain distributors, and EV fleets to monitor, simulate, and autonomously resolve real-time road disruptions, mechanical faults, weather hazards, and regulatory breaches.

### Technology Stack
- **Backend**: Python 3.13, FastAPI, WebSockets (60 FPS real-time broadcasts), Pydantic v2, SQLAlchemy, SQLite (Dev) / PostgreSQL + PostGIS (Prod), TimescaleDB, Redis Pub/Sub & Caching.
- **Frontend**: React 18, TypeScript, Vite 5, Tailwind CSS, MapLibre GL 3D Canvas, Lucide Icons.
- **AI & Swarm Intelligence**: Multi-Agent system (Router, Dispatcher, Safety Officer, Maintenance, and Supervisor agents) with deterministic fallback heuristics.
- **DevOps & Infrastructure**: Docker multi-stage builds, `docker-compose.prod.yml`, Caddy / Envoy reverse proxy with TLS 1.3, Kubernetes health probes, Prometheus metrics.

---

## 📁 2. Repository Directory Structure

```
Helix/
├── backend/
│   ├── agents/                   # Multi-Agent Swarm Intelligence & LLM orchestrators
│   │   └── multi_agent_system.py # Supervisor, Router, Dispatcher, Safety & Maintenance agents
│   ├── analytics/                # Telemetry aggregations, carbon calculators, ETA models
│   ├── api/                      # REST API Endpoints & Dependency Injection
│   │   ├── auth.py               # Enterprise OIDC/SAML SSO, JWT, and Granular RBAC guards
│   │   ├── routes.py             # Core Fleet Operations (Vehicles, Routes, Orders, Simulator)
│   │   └── enterprise_routes.py  # 16 Enterprise Subsystems (Cryo, Convoy, HOS, EV, Webhooks)
│   ├── core/                     # Core system utilities & resilience
│   │   └── circuit_breaker.py    # 3-State Circuit Breaker (CLOSED, OPEN, HALF_OPEN) & fallbacks
│   ├── models/                   # Pydantic & SQLAlchemy data schemas
│   │   ├── db.py                 # SQLite / PostgreSQL database models and connection pool
│   │   └── schema.py             # Vehicle, Route, Order, Incident, Telematics Pydantic models
│   ├── routing/                  # OSRM / Haversine routing algorithms and waypoint interpolation
│   ├── simulation/               # Real-Time Physics & Disruption Simulation Engine
│   │   ├── engine.py             # Main 60fps simulation tick loop, state manager & WS broadcaster
│   │   ├── disruptions.py        # Active disruption injection (Traffic, Weather, Vehicle Faults)
│   │   ├── scenarios.py          # Preset simulation scenarios (Flash Flood, Grid Outage, etc.)
│   │   ├── blackbox.py           # Aviation-grade flight recorder & time-travel telemetry buffer
│   │   ├── policies.py           # Self-healing SLA policy engine & auto-resolution rules
│   │   └── world_data.py         # Initial vehicle fleets, depot hubs, and route coordinates
│   ├── spatial/                  # Geospatial Computation & Geofencing
│   │   ├── geofencing.py         # Ray-casting point-in-polygon & HAZMAT geofence evaluation
│   │   └── weather_hazards.py    # Doppler weather polygon generation & radar intersection math
│   ├── telematics/               # IoT Telematics Ingestion & Security
│   │   ├── ingestion.py          # CAN-bus / GPS telematics parser
│   │   └── security.py           # Hardware HMAC-SHA256 signature verification & anti-replay
│   ├── telemetry/                # Observability & Metrics
│   │   ├── logger.py             # Structured JSON logger
│   │   └── metrics.py            # Prometheus scraping endpoint metrics
│   ├── tests/                    # Comprehensive Automated Test Suites (91/91 passing)
│   │   ├── test_agents.py        # Multi-agent swarm tests
│   │   ├── test_api.py           # Core fleet API endpoints
│   │   ├── test_database.py      # SQLite / PostgreSQL persistence
│   │   ├── test_enterprise.py    # 16 Enterprise subsystems & Webhooks tests
│   │   ├── test_enterprise_security.py # RBAC, OIDC, HMAC signatures, Rate Limiting, Circuit Breakers
│   │   ├── test_production.py    # Auth, JWT, and production bootstrap tests
│   │   └── test_simulation.py    # Physics tick, movement, and disruption injection tests
│   ├── config.py                 # Application settings, environment variables & OIDC config
│   └── main.py                   # FastAPI app entry point, security middleware, and k8s probes
│
├── frontend/
│   ├── src/
│   │   ├── components/           # UI Modals, Canvas & Spatial Telemetry Panels
│   │   │   ├── FleetMap.tsx      # MapLibre GL 3D Map, Floating HUD, Telemetry Dock, Waypoint Dragging
│   │   │   ├── TopBar.tsx        # Command Bar, Navigation Tabs, Quick Action Badges
│   │   │   ├── LeftSidebar.tsx   # Swarm metrics, active units list, and quick filters
│   │   │   ├── WebhookAlertingModal.tsx # Phase 16: Slack, PagerDuty, MS Teams Webhook Dispatcher
│   │   │   ├── AuditLogsModal.tsx # Searchable SHA-256 ledger & FDA/DOT 1-click export
│   │   │   ├── FleetImporterModal.tsx # Fleet Data Studio (SF, NYC, London, Tokyo, Berlin & CSV)
│   │   │   ├── MapLayersDrawer.tsx # Map layer controls (EV Chargers, Isochrones, Radar, Geofences)
│   │   │   ├── CryoColdChainModal.tsx # -80°C ULT vaccine preservation & LN2 emergency boost
│   │   │   ├── SecureConvoyModal.tsx  # DEFCON 1 lockdown & optical radar failover
│   │   │   ├── PredictiveMaintenanceModal.tsx # RUL wear curves & autonomous work order dispatch
│   │   │   ├── HOSComplianceModal.tsx # FMCSA 11h/14h driver rest compliance
│   │   │   ├── YardManagementModal.tsx # Terminal trailer intake & ALPR gate scanner
│   │   │   ├── WeatherRadarModal.tsx   # Live Doppler radar overlay & storm diversion
│   │   │   ├── SmartChargingModal.tsx  # V2G peak-shaving & depot EV charging queue
│   │   │   ├── DriverSafetyModal.tsx   # In-cab DMS scorecard & G-sensor collision review
│   │   │   ├── DepotHierarchyModal.tsx # Multi-depot capacity gauges & swarm rebalancing
│   │   │   ├── FlightRecorderModal.tsx # Aviation blackbox scrubbable timeline playback
│   │   │   ├── EnterprisePolicyModal.tsx # Self-healing SLA policy thresholds
│   │   │   ├── SimulationConsoleModal.tsx # Chaos Disruption Injector & manual reroutes
│   │   │   └── ScenarioPlayerModal.tsx    # Preset scenario player
│   │   ├── services/
│   │   │   ├── api.ts            # Frontend Axios/Fetch client
│   │   │   ├── websocket.ts      # Real-time WebSocket connection manager & reconnect loop
│   │   │   ├── mapplsEvSdk.ts    # Mappls EV Chargers SDK & Dynamic DTE Isochrone generator
│   │   │   ├── cityPresets.ts    # Global city packs (SF, NYC, London, Tokyo, Berlin)
│   │   │   └── fallbackData.ts   # Offline simulation seed data
│   │   ├── types/
│   │   │   └── fleet.ts          # Core TypeScript interfaces (Vehicle, Route, Order, etc.)
│   │   ├── App.tsx               # Main application container & modal coordinator
│   │   ├── index.css             # Neon Cybernetic styling tokens, glassmorphism utilities
│   │   └── main.tsx              # React DOM entry point
│   ├── package.json              # Frontend dependencies
│   ├── tsconfig.json             # TypeScript compiler settings
│   └── vite.config.ts            # Vite bundler configuration
│
├── Dockerfile                    # Multi-stage production container build
├── docker-compose.prod.yml       # Production Compose (FastAPI + PostgreSQL PostGIS + Redis + Caddy)
├── pytest.ini                    # Pytest configuration
└── AGENT_CONTEXT.md              # THIS MASTER REFERENCE FILE
```

---

## 🚀 3. What Has Been Done Till Now (Detailed Phase Breakdown)

| Phase / Subsystem | Key Capabilities & Operational Purpose | Key Files & Endpoints |
| :--- | :--- | :--- |
| **Phase 1: Core Simulation Engine** | 60 FPS tick physics, realistic vehicle velocity, battery drain, dynamic route progress. | `engine.py`, `world_data.py`, `WS /ws/fleet` |
| **Phase 2: Multi-Agent AI Swarm** | Supervisor, Router, Dispatcher, Safety, and Maintenance agents resolving disruptions autonomously. | `multi_agent_system.py`, `/api/fleet/agents/*` |
| **Phase 3: Geospatial Canvas** | 3D MapLibre GL canvas, interactive waypoint dragging, "Draw to Disrupt" geofence tool, AI Route Comparison Delta HUD. | `FleetMap.tsx`, `geofencing.py` |
| **Phase 4: Chaos Disruption Engine** | Injection of vehicle mechanical faults, traffic bottlenecks, and storm hazards. | `disruptions.py`, `scenarios.py` |
| **Phase 5: Public Order Tracking** | Customer-facing delivery status, driver position, and live ETA tracking. | `/api/enterprise/tracking/{order_id}` |
| **Phase 6: Flight Blackbox** | Aviation-grade time-travel telemetry buffer with scrubbable historical playback. | `blackbox.py`, `FlightRecorderModal.tsx` |
| **Phase 7: Self-Healing Policies** | Configurable SLA breach thresholds, reroute sensitivities, and auto-dispatch rules. | `policies.py`, `EnterprisePolicyModal.tsx` |
| **Phase 8: In-Cab Driver Tablet** | Paperless driver workflow, turn-by-turn HUD, touch digital signature e-POD. | `DriverCompanionModal.tsx`, `/api/enterprise/driver/*` |
| **Phase 9: Multi-Depot Hierarchy** | Regional depot load balancing, capacity gauges, and swarm inter-depot transfers. | `DepotHierarchyModal.tsx`, `/api/enterprise/depots/*` |
| **Phase 10: AI Driver Safety & DMS** | In-cab computer vision distraction alerts, harsh braking G-sensor events, safety scorecard. | `DriverSafetyModal.tsx`, `/api/enterprise/safety/*` |
| **Phase 11: EV Smart Grid** | Depot charging bay queues, V2G bidirectional peak-shaving, battery health optimization. | `SmartChargingModal.tsx`, `/api/enterprise/charging/*` |
| **Phase 12: Weather Radar** | Live Doppler radar overlay, precipitation indices, automated storm avoidance rerouting. | `weather_hazards.py`, `WeatherRadarModal.tsx` |
| **Phase 12.5: Yard Management (YMS)** | Terminal trailer intake, ALPR gate camera license plate scanner, dock turnaround timers. | `YardManagementModal.tsx`, `/api/enterprise/yard/*` |
| **Phase 13: FMCSA HOS ELD** | 49 CFR §395 commercial driver rest compliance, 11h driving / 14h on-duty timers, certified DOT CSV export. | `HOSComplianceModal.tsx`, `/api/enterprise/hos/*` |
| **Phase 13.5: Predictive Maintenance** | Remaining Useful Life (RUL) wear curves, DTC fault codes, 1-click autonomous work order dispatch. | `PredictiveMaintenanceModal.tsx`, `/api/enterprise/maintenance/*` |
| **Phase 14: Secure Convoy** | Defense-grade transport for high-value cargo, DEFCON 1 lockdown, optical radar anti-spoofing failover. | `SecureConvoyModal.tsx`, `/api/enterprise/convoy/*` |
| **Phase 14.5: Cryo Cold-Chain** | -80°C ultra-low temperature mRNA vaccine preservation, emergency LN2 boost, FDA 21 CFR Part 11 ledger. | `CryoColdChainModal.tsx`, `/api/enterprise/cryo/*` |
| **Phase 15: Mappls EV Chargers SDK** | Bajaj Chetak reference architecture: Dynamic Distance-to-Empty (DTE) range isochrone polygon, live 150-350kW supercharger pins with port availability, and auto-charge en-route planner. | `mapplsEvSdk.ts`, `FleetMap.tsx`, `/api/enterprise/ev/*` |
| **Fleet Data Studio** | 5 Global City packs (SF, NYC, London, Tokyo, Berlin) with 3D camera flight, universal CSV/GeoJSON drag-drop parser with live column mapper, and 1-click telematics CSV/GeoJSON export. | `FleetImporterModal.tsx`, `cityPresets.ts`, `/api/enterprise/fleet/*` |
| **Map Visual Overhaul** | Floating Spatial Telemetry HUD ribbon (Active units, velocity, SoH, weather), high-contrast neon markers (`V481 • 42 km/h`), and Cybernetic Telemetry Dock (radial speedometer, battery range gauge, DMS scorecard). | `FleetMap.tsx`, `index.css` |
| **Enterprise Security Suite** | Enterprise OIDC / OAuth2 SSO exchange (`POST /api/auth/oidc/exchange`), granular RBAC role guards, automated Defense-in-Depth security headers (HSTS, CSP, X-Frame-Options), sliding-window IP rate limiter, hardware IoT HMAC-SHA256 anti-spoofing signature verification, 3-state Circuit Breaker engine, and Kubernetes deep probes. | `auth.py`, `config.py`, `security.py`, `circuit_breaker.py`, `main.py` |
| **Phase 16: Webhook & Alerting Hub** | Automated incident push notifications to Slack Block Kit, PagerDuty Events v2, MS Teams Adaptive Cards, and REST HMAC gateways; interactive dispatch simulator and chronological delivery audit log. | `WebhookAlertingModal.tsx`, `/api/enterprise/webhooks/*` |

---

## 🧪 4. Current Test & Build Status

- **Automated Backend Tests**: **91 / 91 Tests Passing** (`pytest -v`).
- **Frontend TypeScript & Vite Production Bundle**: **100% Clean (0 Errors, 0 Warnings)** in 10.54s.
- **Active Git Branches**:
  - `main`: Core platform, 15 enterprise engines, Mappls EV SDK, Fleet Data Studio, Map visual overhaul.
  - `feature/enterprise-security-and-production-hardening`: Enterprise OIDC SSO, RBAC, IoT HMAC signatures, Rate Limiting, Circuit Breakers, and Phase 16 Webhooks Hub.

---

## 📋 5. What Is Pending / Future Enterprise Roadmap

If asked to continue expanding the platform, here are the highest-impact future roadmap items:

1. **PWA & In-Cab Offline Service Worker**:
   - Progressive Web App manifest + Service Worker caching for in-cab tablet.
   - Offline IndexedDB queue enabling drivers in cellular dead zones to complete drop-offs and collect digital signatures with automatic sync upon reconnect.
2. **Voice AI Radio & Natural Language Dispatcher**:
   - WebRTC / speech-to-text audio interface allowing dispatchers to issue voice commands ("*Helix, reroute all refrigerated units away from Downtown flood*").
   - Synthesized voice broadcast directly into driver in-cab tablets.
3. **Advanced ML Weibull Degradation Models**:
   - Scikit-learn / PyTorch regression curves estimating exact component failure dates and wear rates for commercial brakes and battery cells.
4. **Multi-Tenant SaaS Partitioning with PostgreSQL RLS**:
   - Row-Level Security (RLS) policies isolating separate enterprise organizations and carrier partners on a shared database cluster.
5. **High-Throughput Kafka Ingestion Gateway**:
   - Apache Kafka / AWS Kinesis connector scaling GPS telematics ingestion to 50,000+ pings/second across global fleet operations.

---

## 🛠️ 6. How to Run & Verify the Platform

### Running the Backend
```bash
# Windows
start.bat

# Or manually:
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### Running the Frontend
```bash
cd frontend
npm run dev
```

### Executing All Tests
```bash
pytest -v
```

### Production Build
```bash
npm --prefix frontend run build
```
