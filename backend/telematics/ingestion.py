import os
from typing import Dict, Any, Optional
from datetime import datetime
from backend.models.schema import TelematicsPacket, IncidentSeverity
from backend.telemetry.logger import log
from backend.spatial.geofencing import geofence_mgr
from backend.simulation.policies import policy_engine

DTC_SEVERITY_MAP = {
    "P0300": ("Engine Misfire Anomaly", IncidentSeverity.HIGH),
    "P0117": ("Coolant Temperature Overheat", IncidentSeverity.CRITICAL),
    "P0562": ("System Low Voltage Battery Drop", IncidentSeverity.MEDIUM),
    "P0420": ("Emissions Efficiency Threshold", IncidentSeverity.LOW),
    "C1201": ("Brake Actuator Control Anomaly", IncidentSeverity.CRITICAL)
}

class TelematicsIngestionGateway:
    """Ingests live IoT vehicle telematics, checks spatial geofences, and triggers real-time anomaly detection."""
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

        detected_anomalies = []

        # Check for Diagnostic Trouble Codes (DTCs)
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

        # Check for Spatial Geofence Breaches
        breaches = geofence_mgr.check_breaches(vehicle.id, packet.lat, packet.lng)
        for b in breaches:
            sev = IncidentSeverity.CRITICAL if b["category"] in ["HAZMAT", "RESTRICTED"] else IncidentSeverity.HIGH
            detected_anomalies.append({
                "code": f"GEOFENCE_{b['category']}",
                "fault": f"Breach in {b['name']}",
                "severity": sev
            })
            self.engine._add_event(
                severity=sev,
                category="Geofence Breach",
                message=f"Spatial Breach: {vehicle.id} entered {b['category']} zone '{b['name']}'",
                vehicle_id=vehicle.id
            )

        # Update Cold-Chain IoT sensors
        if packet.cargo_temp_c is not None:
            vehicle.cargo_temp_c = packet.cargo_temp_c
        if packet.cargo_humidity_percent is not None:
            vehicle.cargo_humidity_percent = packet.cargo_humidity_percent
        if packet.door_open_alert is not None:
            vehicle.door_open_alert = packet.door_open_alert
        if packet.cargo_type:
            vehicle.cargo_type = packet.cargo_type

        # Check Cold-Chain Temperature Excursions & Cargo Door Alarms
        if packet.cargo_temp_c is not None:
            if vehicle.cargo_type == "PHARMACEUTICAL" and (packet.cargo_temp_c < 2.0 or packet.cargo_temp_c > 8.0):
                detected_anomalies.append({
                    "code": "COLD_CHAIN_EXCURSION",
                    "fault": f"Pharma Temp Excursion ({packet.cargo_temp_c}°C outside 2-8°C)",
                    "severity": IncidentSeverity.CRITICAL
                })
                self.engine._add_event(
                    severity=IncidentSeverity.CRITICAL,
                    category="Cold-Chain Alert",
                    message=f"CRITICAL: Pharmaceutical Temp Excursion on {vehicle.id}: {packet.cargo_temp_c}°C (Safe: 2.0°C - 8.0°C)",
                    vehicle_id=vehicle.id
                )
            elif vehicle.cargo_type == "PERISHABLE" and packet.cargo_temp_c > 4.0:
                detected_anomalies.append({
                    "code": "COLD_CHAIN_EXCURSION",
                    "fault": f"Perishable Temp Excursion ({packet.cargo_temp_c}°C > 4.0°C)",
                    "severity": IncidentSeverity.HIGH
                })
                self.engine._add_event(
                    severity=IncidentSeverity.HIGH,
                    category="Cold-Chain Alert",
                    message=f"Perishable Temp Threshold Breached on {vehicle.id}: {packet.cargo_temp_c}°C",
                    vehicle_id=vehicle.id
                )

        if packet.door_open_alert and vehicle.speed_kmh > 10.0:
            detected_anomalies.append({
                "code": "CARGO_DOOR_OPEN",
                "fault": "Cargo door unlatched while in motion",
                "severity": IncidentSeverity.HIGH
            })
            self.engine._add_event(
                severity=IncidentSeverity.HIGH,
                category="Cargo Security",
                message=f"Security Alert: Cargo door open on moving vehicle {vehicle.id} ({vehicle.speed_kmh} km/h)",
                vehicle_id=vehicle.id
            )

        # Broadcast live telemetry update
        await self.engine.broadcast({
            "type": "TELEMATICS_UPDATE",
            "vehicle_id": vehicle.id,
            "location": vehicle.location.model_dump(),
            "speed_kmh": vehicle.speed_kmh,
            "battery_fuel_percent": vehicle.battery_fuel_percent,
            "cargo_temp_c": vehicle.cargo_temp_c,
            "cargo_humidity_percent": vehicle.cargo_humidity_percent,
            "door_open_alert": vehicle.door_open_alert,
            "cargo_type": vehicle.cargo_type,
            "anomalies": detected_anomalies,
            "breaches": breaches
        })

        return {
            "success": True,
            "vehicle_id": vehicle.id,
            "timestamp": datetime.utcnow().isoformat(),
            "anomalies_detected": len(detected_anomalies),
            "breaches_detected": len(breaches)
        }
