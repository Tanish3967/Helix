import os
from typing import Dict, Any, Optional
from datetime import datetime
from backend.models.schema import TelematicsPacket, IncidentSeverity
from backend.telemetry.logger import log

DTC_SEVERITY_MAP = {
    "P0300": ("Engine Misfire Anomaly", IncidentSeverity.HIGH),
    "P0117": ("Coolant Temperature Overheat", IncidentSeverity.CRITICAL),
    "P0562": ("System Low Voltage Battery Drop", IncidentSeverity.MEDIUM),
    "P0420": ("Emissions Efficiency Threshold", IncidentSeverity.LOW),
    "C1201": ("Brake Actuator Control Anomaly", IncidentSeverity.CRITICAL)
}

class TelematicsIngestionGateway:
    """Ingests live IoT vehicle telematics and triggers real-time anomaly detection."""
    def __init__(self, engine):
        self.engine = engine

    async def ingest_packet(self, packet: TelematicsPacket) -> Dict[str, Any]:
        vehicle = next((v for v in self.engine.vehicles if v.id == packet.vehicle_id), None)
        if not vehicle:
            return {"success": False, "error": f"Vehicle {packet.vehicle_id} not found in fleet"}

        # Update core telematics coordinates & vitals
        vehicle.location.lat = packet.lat
        vehicle.location.lng = packet.lng
        if packet.speed_kmh is not None:
            vehicle.speed_kmh = packet.speed_kmh
        if packet.battery_fuel_percent is not None:
            vehicle.battery_fuel_percent = max(0.0, min(100.0, packet.battery_fuel_percent))
        if packet.driver_id:
            vehicle.driver_id = packet.driver_id

        # Check for Diagnostic Trouble Codes (DTCs)
        detected_anomalies = []
        if packet.dtc_codes:
            vehicle.dtc_faults = list(set(vehicle.dtc_faults + packet.dtc_codes))
            for code in packet.dtc_codes:
                fault_title, severity = DTC_SEVERITY_MAP.get(code, (f"Diagnostic Code {code}", IncidentSeverity.MEDIUM))
                detected_anomalies.append({"code": code, "fault": fault_title, "severity": severity})
                
                self.engine._add_event(
                    severity=severity,
                    category="IoT Telematics",
                    message=f"OBD-II Fault {code} on {vehicle.id}: {fault_title}",
                    vehicle_id=vehicle.id
                )

        # Broadcast live telemetry update
        await self.engine.broadcast({
            "type": "TELEMATICS_UPDATE",
            "vehicle_id": vehicle.id,
            "location": vehicle.location.model_dump(),
            "speed_kmh": vehicle.speed_kmh,
            "battery_fuel_percent": vehicle.battery_fuel_percent,
            "anomalies": detected_anomalies
        })

        return {
            "success": True,
            "vehicle_id": vehicle.id,
            "timestamp": datetime.utcnow().isoformat(),
            "anomalies_detected": len(detected_anomalies)
        }
