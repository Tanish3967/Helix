import asyncio
from typing import Dict, Any, List
from backend.simulation.disruptions import DisruptionManager
from backend.models.schema import Incident, IncidentType, IncidentSeverity, VehicleStatus, Location

class ScenarioManager:
    def __init__(self, disruption_mgr: DisruptionManager):
        self.mgr = disruption_mgr
        self.engine = disruption_mgr.engine

    def get_all_scenarios(self) -> List[Dict[str, Any]]:
        return [
            {
                "level": 1,
                "title": "Level 1: Vehicle Breakdown",
                "difficulty": "Novice",
                "description": "Vehicle V481 suffers sudden engine failure mid-route with 3 high-priority orders. Autonomous agent must discover nearest candidate (V517), transfer payload, generate recovery route, and alert customers.",
                "ai_challenge": "Single Vehicle Breakdown & Nearest-Neighbor Search",
                "target_metrics": {"max_delay_min": 15.0, "recovery_time_sec": 45.0, "sla_preservation": 98.0}
            },
            {
                "level": 2,
                "title": "Level 2: Heavy Traffic Gridlock",
                "difficulty": "Intermediate",
                "description": "Major accident reported on Highway 101 Arterial (2.5x delay multiplier). Reroute fleet through secondary urban corridors to preserve on-time delivery SLAs.",
                "ai_challenge": "Dynamic Detour Rerouting & Bottleneck Bypass",
                "target_metrics": {"max_delay_min": 10.0, "recovery_time_sec": 35.0, "sla_preservation": 96.0}
            },
            {
                "level": 3,
                "title": "Level 3: Sudden Severe Storm",
                "difficulty": "Intermediate",
                "description": "Severe storm hits the metropolitan area (2.0x safety factor, 58 km/h wind gusts). Weather agent coordinates risk mitigation, speed buffering, and customer communication.",
                "ai_challenge": "Risk-Aware Fleetwide Speed & ETA Buffering",
                "target_metrics": {"max_delay_min": 18.0, "recovery_time_sec": 40.0, "sla_preservation": 95.0}
            },
            {
                "level": 4,
                "title": "Level 4: Driver Fatigue Anomaly",
                "difficulty": "Advanced",
                "description": "Driver DRV-102 telemetry signals high fatigue risk score (0.85). Dispatch agent intervenes to route vehicle to nearest depot and assign certified relief driver.",
                "ai_challenge": "Driver Safety Compliance & Relief Scheduling",
                "target_metrics": {"max_delay_min": 12.0, "recovery_time_sec": 30.0, "sla_preservation": 99.0}
            },
            {
                "level": 5,
                "title": "Level 5: Multiple Vehicle Failures",
                "difficulty": "Expert",
                "description": "Dual simultaneous breakdowns (V481 in SoMa and V488 in Bay Bridge Corridor). Requires multi-agent parallel triage and global fleet capacity re-balancing.",
                "ai_challenge": "Global Fleet Re-balancing & Multi-Vehicle Triage",
                "target_metrics": {"max_delay_min": 20.0, "recovery_time_sec": 55.0, "sla_preservation": 94.0}
            },
            {
                "level": 6,
                "title": "Level 6: High-Priority Emergency Order",
                "difficulty": "Expert",
                "description": "Critical emergency medical shipment arrives at Central Depot requiring express delivery across town within 20 minutes. Preempt standard logistics paths.",
                "ai_challenge": "Dynamic Route Preemption & Priority Fast-Pathing",
                "target_metrics": {"max_delay_min": 5.0, "recovery_time_sec": 25.0, "sla_preservation": 99.5}
            },
            {
                "level": 7,
                "title": "Level 7: Compound Disruption (Traffic + Weather + Fault)",
                "difficulty": "Master",
                "description": "Simultaneous breakdown of V481 + Heavy Rain (1.5x) + Highway 101 Congestion (1.5x). Tests synchronized multi-agent reasoning under compounding constraints.",
                "ai_challenge": "Synchronized Multi-Agent Constraint Reasoning",
                "target_metrics": {"max_delay_min": 22.0, "recovery_time_sec": 50.0, "sla_preservation": 93.0}
            },
            {
                "level": 8,
                "title": "Level 8: Cascading Failure Stress Test",
                "difficulty": "Grandmaster",
                "description": "The Ultimate Stress Test: V481 Broken + Severe Storm (2.0x) + Highway Gridlock (2.5x) + 3 Urgent Orders + V517 low on fuel + V509 near capacity. Tests multi-tiered constraint satisfaction.",
                "ai_challenge": "Multi-Tiered Constraint Satisfaction & Multi-Agent Harmony",
                "target_metrics": {"max_delay_min": 25.0, "recovery_time_sec": 60.0, "sla_preservation": 91.0}
            }
        ]

    async def execute_scenario(self, level: int) -> Incident:
        """Launches the specified scenario level."""
        self.engine.metrics.current_level = level

        if level == 1:
            return await self.mgr.trigger_breakdown(vehicle_id="V481", fault_type="Engine Failure Detected")
        elif level == 2:
            return await self.mgr.trigger_traffic_spike(zone_id="highway_101", condition="Accident")
        elif level == 3:
            return await self.mgr.trigger_weather_alert(condition="Storm")
        elif level == 4:
            # Driver fatigue anomaly
            d = next((drv for drv in self.engine.drivers if drv.id == "DRV-102"), self.engine.drivers[0])
            d.fatigue_score = 0.88
            d.shift_hours = 8.5
            return await self.mgr.trigger_breakdown(vehicle_id=d.assigned_vehicle_id or "V482", fault_type="Driver Fatigue Violation")
        elif level == 5:
            # Multiple breakdowns
            inc = await self.mgr.trigger_breakdown(vehicle_id="V481", fault_type="Engine Overheat")
            # Break second vehicle
            v2 = next((v for v in self.engine.vehicles if v.id == "V488"), self.engine.vehicles[5])
            v2.status = VehicleStatus.AT_RISK
            v2.fault_details = "Tire Blowout"
            v2.speed_kmh = 0.0
            inc.affected_vehicle_ids.append(v2.id)
            return inc
        elif level == 6:
            # High priority rush order
            return await self.mgr.trigger_delivery_delay(order_id="ORD-4811", delay_minutes=35.0)
        elif level == 7:
            # Compound disruption
            self.engine.set_weather_condition("Heavy Rain")
            self.engine.set_traffic_condition("highway_101", "Congested")
            return await self.mgr.trigger_breakdown(vehicle_id="V481", fault_type="Transmission Fault in Heavy Rain")
        elif level == 8:
            # Level 8 Cascading failure
            self.engine.set_weather_condition("Storm")
            self.engine.set_traffic_condition("highway_101", "Accident")
            # Set V517 low battery to stress test capacity constraints
            v517 = next((v for v in self.engine.vehicles if v.id == "V517"), None)
            if v517:
                v517.battery_fuel_percent = 28.0
            return await self.mgr.trigger_breakdown(vehicle_id="V481", fault_type="Level 8 Compound Cascading Failure")
        else:
            return await self.mgr.trigger_breakdown(vehicle_id="V481", fault_type="System Anomaly")
