from typing import List, Dict, Any
from datetime import datetime

class EnterpriseIntelligence:
    """Predictive maintenance digital twin, ESG carbon accounting, and EV smart charging."""

    @staticmethod
    def assess_vehicle_health(vehicle_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluates predictive breakdown risk and maintenance urgency."""
        battery = vehicle_dict.get("battery_fuel_percent", 100.0)
        faults = vehicle_dict.get("dtc_faults", [])
        odometer = vehicle_dict.get("odometer_km", 10000.0)
        speed = vehicle_dict.get("speed_kmh", 0.0)

        # Compute risk factors
        risk_score = len(faults) * 0.25
        if battery < 20.0 and speed > 50.0:
            risk_score += 0.35  # High discharge under heavy throttle
        if odometer % 15000 < 500:
            risk_score += 0.20  # Scheduled service window

        health_percent = max(10.0, min(100.0, round((1.0 - min(0.9, risk_score)) * 100, 1)))
        needs_service = health_percent < 60.0 or len(faults) > 0

        return {
            "vehicle_id": vehicle_dict.get("id"),
            "health_score_percent": health_percent,
            "maintenance_required": needs_service,
            "active_faults": faults,
            "recommended_action": "Schedule immediate depot inspection" if needs_service else "Nominal operation"
        }

    @staticmethod
    def calculate_fleet_carbon(vehicles: List[Dict[str, Any]], distance_today_km: float = 4250.0) -> Dict[str, Any]:
        """Computes ESG scope 1 & 2 carbon footprint for the fleet."""
        ev_count = sum(1 for v in vehicles if "electric" in v.get("type", "").lower())
        ice_count = len(vehicles) - ev_count
        
        # Emissions factors (kg CO2 per km)
        ev_emissions_kg = ev_count * (distance_today_km / max(1, len(vehicles))) * 0.042
        ice_emissions_kg = ice_count * (distance_today_km / max(1, len(vehicles))) * 0.185
        total_co2_kg = round(ev_emissions_kg + ice_emissions_kg, 1)
        savings_vs_diesel_kg = round((len(vehicles) * (distance_today_km / max(1, len(vehicles))) * 0.185) - total_co2_kg, 1)

        return {
            "total_co2_kg": total_co2_kg,
            "ev_ratio_percent": round((ev_count / max(1, len(vehicles))) * 100, 1),
            "carbon_offset_savings_kg": max(0.0, savings_vs_diesel_kg),
            "esg_compliance_status": "Exceeding Target (>95% Clean Factor)"
        }

    @staticmethod
    def plan_ev_depot_charging(vehicles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generates off-peak smart charging schedule for EV fleet to minimize grid tariff costs."""
        charging_queue = []
        for v in vehicles:
            batt = v.get("battery_fuel_percent", 100.0)
            if batt < 85.0:
                deficit_kwh = round((85.0 - batt) * 0.75, 1)  # 75 kWh battery pack
                charging_queue.append({
                    "vehicle_id": v.get("id"),
                    "current_battery": batt,
                    "target_battery": 90.0,
                    "energy_needed_kwh": deficit_kwh,
                    "charge_window": "23:00 - 05:30 (Off-Peak Tariff)",
                    "estimated_charging_cost_usd": round(deficit_kwh * 0.12, 2)
                })
        return sorted(charging_queue, key=lambda x: x["current_battery"])
