# FleetOps AI — Autonomous Fleet Operations Simulator

<div align="center">

![FleetOps AI](https://img.shields.io/badge/FleetOps-AI-emerald?style=for-the-badge&logo=compass&logoColor=white)
![Multi-Agent](https://img.shields.io/badge/Architecture-Multi--Agent%20Orchestrator-blue?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%2B%20WebSockets-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript%20%2B%20MapLibre-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Cost](https://img.shields.io/badge/Cost-₹0%20%2F%20%240%20(100%25%20Free%20%26%20Local)-brightgreen?style=for-the-badge)

<p align="center">
  <b>A real-time, map-centric autonomous fleet operations command center powered by multi-agent orchestration.</b><br/>
  Simulates a 100-vehicle metropolitan delivery fleet subjected to dynamic breakdowns, traffic jams, severe storms, and cascading failures — where a team of autonomous, tool-using AI agents detect, investigate, recalculate routes, and resolve disruptions in real time.
</p>

</div>

---

## 🌟 Key Highlights & Why This Project Stands Out

Most AI portfolio projects are shallow "chat with an LLM" wrappers. **FleetOps AI** demonstrates a genuinely agentic, event-driven distributed architecture:

1. **Multi-Agent Orchestration with Specialized Roles:**
   - **Orchestrator Agent:** Listens to live telemetry, triages anomalies, scopes impacted orders, and coordinates recovery.
   - **Traffic Agent:** Evaluates corridor congestion multipliers and calculates arterial delay buffers.
   - **Weather Agent:** Assesses meteorological hazards and enforces risk-aware speed adaptations.
   - **Dispatch Agent:** Searches 100 candidate vehicles, ranks feasibility across distance, payload capacity, and battery charge, and assigns replacements.
   - **Routing Agent:** Synthesizes obstacle-avoiding GPS waypoints, detour corridors, and projected ETAs.
   - **Customer Agent:** Dispatches proactive SMS / webhook delay alerts to affected recipients.

2. **Deterministic Tools vs LLM Reasoning:**
   - LLMs handle reasoning, strategy, and delegation; deterministic code handles spatial Euclidean math, road waypoints, capacity checks, and ETA arithmetic.
   - 100% zero-cost, runs completely locally out of the box with sub-second execution speeds, with native connectors for Ollama (`qwen2.5`, `llama3`) and Gemini.

3. **Gamified Incident Levels (1 through 8):**
   - Progressively challenging scenarios from single vehicle failure (Level 1) to cascading multi-tier compound gridlocks (Level 8).

4. **Live Command-Center Aesthetic:**
   - Dark mode radar console, MapLibre GL JS vector map, animated telemetry waypoints, glowing pulsing incident markers, and real-time step-by-step reasoning trace inspector.

---

## 🏛️ System Architecture

```
                                  ┌────────────────────────────────────────────────────────┐
                                  │            React + TypeScript + Vite                   │
                                  │           (Command Center Dashboard)                   │
                                  │  - MapLibre GL Dark Map & Animated Fleet Markers       │
                                  │  - Live Event Feed & Impacted Deliveries Table         │
                                  │  - Multi-Agent Pipeline Trace Visualizer               │
                                  │  - Simulation Control Console (Manual Injection)       │
                                  │  - Gamification Engine & Level 1-8 Scenarios           │
                                  └──────────────────────────┬─────────────────────────────┘
                                                             │ WebSocket + REST API
                                                             ▼
                                  ┌────────────────────────────────────────────────────────┐
                                  │                   FastAPI Backend                      │
                                  │  - Telemetry Loop (Vehicle Physics, Battery, Speed)    │
                                  │  - Dynamic Weather & Traffic Simulation Engines        │
                                  │  - Event Bus & State Manager (SQLite / In-Memory)      │
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

## ⏱️ 60-Second Interview Demo Script

1. **Start the Fleet (10s):**
   - Open `http://localhost:3000`. Show the live command center with 100 vehicles moving smoothly along realistic metropolitan corridors.
   - Point to the live KPIs: Active Vehicles, On-Time Delivery % (97.8%), and the live Simulation Clock.

2. **Trigger Disruption (15s):**
   - Click **"Trigger Incident"** -> Select **"Break Down Vehicle V481"** (or click **"Levels (1–8)" -> "Level 1"**).
   - Point to the map: Vehicle 481 immediately turns red, and an animated pulsing radar ring highlights the disruption radius.

3. **Show Multi-Agent Reasoning (25s):**
   - Direct attention to the **Multi-Agent Reasoning Pipeline** on the right:
     - **Orchestrator:** Triages 3 affected high-priority orders (`ORD-4811`, `ORD-4812`, `ORD-4813`).
     - **Traffic & Weather Agents:** Query live grid telemetry.
     - **Dispatch Agent:** Evaluates candidate vehicles, rejects `V509` (insufficient payload capacity) and `V526` (low battery), and selects `V517` as optimal.
     - **Routing Agent:** Synthesizes dynamic recovery waypoints.
     - **Customer Agent:** Dispatches proactive SMS notifications to customers.

4. **Observe Autonomous Recovery (10s):**
   - The map updates: `V517` turns purple (Reassigned), the new route polyline renders, the incident status transitions to **"100% Recovered"**, and Mission Score increases (+250 pts).

---

## 🛠️ Quickstart & Local Installation

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Start Backend Server
```bash
# From workspace root
pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
*The backend starts at `http://localhost:8000` with WebSocket endpoint `ws://localhost:8000/ws/fleet` and interactive OpenAPI docs at `http://localhost:8000/docs`.*

### 2. Start Frontend UI
```bash
# In a separate terminal
cd frontend
npm install
npm run dev
```
*Open `http://localhost:3000` in your browser.*

### 3. Run Automated Tests
```bash
# From workspace root
python -m pytest -p asyncio backend/tests
```

---

## 📄 Resume / Portfolio Positioning Bullets

- **Multi-Agent Systems:** Designed and implemented an event-driven multi-agent orchestration architecture in Python/FastAPI using specialized agent nodes (Routing, Traffic, Weather, Dispatch, Customer) equipped with deterministic spatial tools to autonomously resolve real-time logistics failures.
- **Real-Time Web Architecture:** Built a high-frequency WebSocket state synchronization pipeline and interactive MapLibre GL JS operations console rendering 100 simulated vehicles, dynamic polylines, and sub-second anomaly mitigation traces.
- **Autonomous Resilience:** Engineered 8 gamified stress-test scenario levels testing multi-tier constraint satisfaction (vehicle payloads, battery ranges, road choke-points, and SLA preservation).

---

## 📜 License
MIT License. Created for high-impact engineering portfolio and interview demonstrations.
