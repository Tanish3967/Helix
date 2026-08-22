import math
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from backend.models.schema import Location, RouteWaypoint, OrderStatus, VehicleStatus

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0 # Earth radius in kilometers
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = (math.sin(dLat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dLon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

class FleetTools:
    def __init__(self, world_state: Dict[str, Any]):
        self.world = world_state

    # ----------------------------------------------------
    # ROUTING AGENT TOOLS
    # ----------------------------------------------------
    def calculate_route(self, origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float, avoid_zones: Optional[List[str]] = None) -> Dict[str, Any]:
        """Calculates optimal path, waypoints, and distance between two points."""
        dist_km = haversine_distance(origin_lat, origin_lng, dest_lat, dest_lng)
        # Apply slight road-network factor (1.3x Euclidean for city grids)
        road_dist_km = round(dist_km * 1.32, 2)
        
        num_points = max(15, min(35, int(dist_km * 4)))
        waypoints = []
        
        # Check if detour is needed
        detour_shift = 0.008 if avoid_zones and len(avoid_zones) > 0 else 0.0
        
        angle = math.atan2(dest_lat - origin_lat, dest_lng - origin_lng)
        perp_angle = angle + math.pi / 2

        for i in range(num_points):
            t = i / (num_points - 1)
            smooth_t = t * t * (3 - 2 * t)
            lat = origin_lat + (dest_lat - origin_lat) * smooth_t
            lng = origin_lng + (dest_lng - origin_lng) * smooth_t
            
            # Apply detour curve if avoiding zones
            lateral_offset = math.sin(math.pi * t) * detour_shift
            lat += lateral_offset * math.cos(perp_angle)
            lng += lateral_offset * math.sin(perp_angle)
            
            waypoints.append({"lat": round(lat, 6), "lng": round(lng, 6), "segment": f"Seg-{i+1}"})

        return {
            "success": True,
            "origin": {"lat": origin_lat, "lng": origin_lng},
            "destination": {"lat": dest_lat, "lng": dest_lng},
            "distance_km": road_dist_km,
            "waypoints_count": len(waypoints),
            "waypoints": waypoints,
            "avoiding_zones": avoid_zones or []
        }

    def calculate_alternative_routes(self, origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float, avoid_zone: str) -> Dict[str, Any]:
        """Calculates alternative detour routes avoiding congested or dangerous zones."""
        primary_route = self.calculate_route(origin_lat, origin_lng, dest_lat, dest_lng, avoid_zones=[avoid_zone])
        # Add 12% distance penalty for detour
        detour_km = round(primary_route["distance_km"] * 1.14, 2)
        primary_route["distance_km"] = detour_km
        primary_route["route_type"] = "Detour / Safe Corridor"
        primary_route["bypassed_zone"] = avoid_zone
        return primary_route

    def estimate_delivery_time(self, distance_km: float, speed_kmh: float = 40.0, traffic_multiplier: float = 1.0, weather_multiplier: float = 1.0) -> Dict[str, Any]:
        """Estimates transit time in minutes incorporating traffic and weather slowdown multipliers."""
        effective_speed = max(12.0, (speed_kmh / (traffic_multiplier * weather_multiplier)))
        transit_hours = distance_km / effective_speed
        transit_minutes = round(transit_hours * 60.0, 1)
        
        now = datetime.utcnow()
        eta_time = (now + timedelta(minutes=transit_minutes)).strftime("%H:%M:%S")
        
        return {
            "distance_km": distance_km,
            "effective_speed_kmh": round(effective_speed, 1),
            "traffic_multiplier": traffic_multiplier,
            "weather_multiplier": weather_multiplier,
            "estimated_duration_minutes": transit_minutes,
            "projected_eta": eta_time
        }

    # ----------------------------------------------------
    # TRAFFIC AGENT TOOLS
    # ----------------------------------------------------
    def get_traffic(self, route_id: Optional[str] = None, zone_id: Optional[str] = None) -> Dict[str, Any]:
        """Returns traffic congestion level and multiplier for a route or zone."""
        zones = self.world.get("traffic_zones", {})
        if zone_id and zone_id in zones:
            z_info = zones[zone_id]
            return {
                "zone_id": zone_id,
                "name": z_info["name"],
                "condition": z_info["condition"],
                "multiplier": z_info["multiplier"],
                "status": "Congested" if z_info["multiplier"] > 1.2 else "Normal"
            }
        
        # Check global or first affected zone
        high_traffic_zones = [z for z in zones.values() if z["multiplier"] > 1.2]
        if high_traffic_zones:
            top = high_traffic_zones[0]
            return {
                "zone_id": "active_hotspot",
                "name": top["name"],
                "condition": top["condition"],
                "multiplier": top["multiplier"],
                "congestion_level": "Severe (Accident)" if top["multiplier"] >= 2.0 else "Moderate Delay"
            }
        
        return {
            "zone_id": "all",
            "name": "Metropolitan Grid",
            "condition": "Normal",
            "multiplier": 1.0,
            "congestion_level": "Smooth Flow"
        }

    def get_congestion(self, segment_or_zone: str) -> Dict[str, Any]:
        """Fetches detailed congestion statistics."""
        return self.get_traffic(zone_id=segment_or_zone)

    def estimate_delay(self, distance_km: float, traffic_multiplier: float) -> Dict[str, Any]:
        """Calculates exact traffic delay buffer in minutes."""
        base_minutes = (distance_km / 45.0) * 60.0
        traffic_minutes = base_minutes * traffic_multiplier
        added_delay = round(traffic_minutes - base_minutes, 1)
        return {
            "traffic_multiplier": traffic_multiplier,
            "base_duration_min": round(base_minutes, 1),
            "congested_duration_min": round(traffic_minutes, 1),
            "added_delay_minutes": max(0.0, added_delay)
        }

    # ----------------------------------------------------
    # WEATHER AGENT TOOLS
    # ----------------------------------------------------
    def get_weather(self, location: Optional[str] = None) -> Dict[str, Any]:
        """Returns live weather metrics: temperature, precipitation, wind, visibility."""
        weather = self.world.get("weather", {
            "condition": "Clear",
            "temperature_c": 22.0,
            "precipitation_rate": 0.0,
            "wind_speed_kmh": 12.0,
            "visibility_km": 10.0,
            "multiplier": 1.0
        })
        risk_level = "Low"
        if weather.get("multiplier", 1.0) >= 2.0 or weather.get("condition") == "Storm":
            risk_level = "Critical / Severe Risk"
        elif weather.get("multiplier", 1.0) >= 1.5 or weather.get("condition") == "Heavy Rain":
            risk_level = "Moderate Hazard"
        elif weather.get("multiplier", 1.0) > 1.0:
            risk_level = "Minor Wet Surface Advisory"

        return {
            "condition": weather.get("condition", "Clear"),
            "temperature_c": weather.get("temperature_c", 22.0),
            "precipitation_rate": weather.get("precipitation_rate", 0.0),
            "wind_speed_kmh": weather.get("wind_speed_kmh", 12.0),
            "visibility_km": weather.get("visibility_km", 10.0),
            "weather_multiplier": weather.get("multiplier", 1.0),
            "safety_risk_level": risk_level
        }

    def get_weather_risk(self, route_id: Optional[str] = None) -> Dict[str, Any]:
        """Evaluates weather risk factor along a route corridor."""
        weather = self.get_weather()
        return {
            "route_id": route_id,
            "weather_condition": weather["condition"],
            "risk_assessment": weather["safety_risk_level"],
            "speed_reduction_recommended_percent": round((1.0 - (1.0 / weather["weather_multiplier"])) * 100, 1) if weather["weather_multiplier"] > 1.0 else 0.0
        }

    def estimate_weather_delay(self, distance_km: float, weather_multiplier: float) -> Dict[str, Any]:
        """Calculates safety speed reduction delay buffer."""
        base_minutes = (distance_km / 45.0) * 60.0
        weather_minutes = base_minutes * weather_multiplier
        added_delay = round(weather_minutes - base_minutes, 1)
        return {
            "weather_multiplier": weather_multiplier,
            "safety_delay_minutes": max(0.0, added_delay)
        }

    # ----------------------------------------------------
    # DISPATCH AGENT TOOLS
    # ----------------------------------------------------
    def find_nearby_available_vehicles(self, target_lat: float, target_lng: float, required_capacity_kg: float = 0.0, min_battery: float = 25.0, max_radius_km: float = 25.0) -> Dict[str, Any]:
        """Searches fleet for available replacement vehicles ranked by distance, capacity, and battery."""
        vehicles = self.world.get("vehicles", [])
        candidates = []

        for v in vehicles:
            # Check vehicle status or available capacity
            is_candidate = v.status in ["AVAILABLE", "ON_ROUTE"] and v.fault_details is None
            if not is_candidate:
                continue

            dist = haversine_distance(target_lat, target_lng, v.location.lat, v.location.lng)
            if dist > max_radius_km:
                continue

            remaining_cap = v.max_capacity_kg - v.current_load_kg
            has_capacity = remaining_cap >= required_capacity_kg
            has_battery = v.battery_fuel_percent >= min_battery

            # Score calculation (lower is better, prioritized by distance, battery health, available capacity)
            score = dist * 1.5 + (100.0 - v.battery_fuel_percent) * 0.2 + (0 if has_capacity else 500) + (0 if has_battery else 1000)

            candidates.append({
                "vehicle_id": v.id,
                "model": v.model,
                "status": v.status,
                "distance_km": dist,
                "battery_fuel_percent": v.battery_fuel_percent,
                "current_load_kg": v.current_load_kg,
                "max_capacity_kg": v.max_capacity_kg,
                "remaining_capacity_kg": round(remaining_cap, 1),
                "is_capacity_sufficient": has_capacity,
                "is_battery_sufficient": has_battery,
                "ranking_score": round(score, 1)
            })

        # Sort by best ranking score
        candidates.sort(key=lambda c: c["ranking_score"])

        top_optimal = candidates[0] if candidates else None

        return {
            "search_origin": {"lat": target_lat, "lng": target_lng},
            "required_capacity_kg": required_capacity_kg,
            "min_battery_threshold": min_battery,
            "candidates_found_count": len(candidates),
            "candidates": candidates[:6], # Top 6 candidates
            "optimal_replacement": top_optimal
        }

    def check_vehicle_capacity(self, vehicle_id: str, add_weight_kg: float = 0.0) -> Dict[str, Any]:
        """Validates payload limits on a specific vehicle."""
        vehicles = self.world.get("vehicles", [])
        v = next((v for v in vehicles if v.id == vehicle_id), None)
        if not v:
            return {"success": False, "error": f"Vehicle {vehicle_id} not found"}
        
        projected_load = v.current_load_kg + add_weight_kg
        is_safe = projected_load <= v.max_capacity_kg
        
        return {
            "vehicle_id": vehicle_id,
            "current_load_kg": v.current_load_kg,
            "added_weight_kg": add_weight_kg,
            "projected_load_kg": projected_load,
            "max_capacity_kg": v.max_capacity_kg,
            "utilization_percent": round((projected_load / v.max_capacity_kg) * 100, 1),
            "is_capacity_safe": is_safe
        }

    def check_driver_status(self, driver_id: str) -> Dict[str, Any]:
        """Evaluates driver shift status and safety compliance."""
        drivers = self.world.get("drivers", [])
        d = next((d for d in drivers if d.id == driver_id), None)
        if not d:
            return {"success": True, "driver_id": driver_id, "status": "Active / Unassigned", "fatigue_score": 0.1}
        
        is_fatigued = d.fatigue_score > 0.65 or d.shift_hours > 8.0
        return {
            "driver_id": driver_id,
            "name": d.name,
            "status": "Warning (Fatigue)" if is_fatigued else d.status,
            "shift_hours": d.shift_hours,
            "fatigue_score": d.fatigue_score,
            "is_eligible_for_urgent_dispatch": not is_fatigued
        }

    def assign_delivery(self, order_id: str, new_vehicle_id: str) -> Dict[str, Any]:
        """Reassigns an order to a replacement vehicle."""
        orders = self.world.get("orders", [])
        vehicles = self.world.get("vehicles", [])
        
        order = next((o for o in orders if o.id == order_id), None)
        target_v = next((v for v in vehicles if v.id == new_vehicle_id), None)
        
        if not order:
            return {"success": False, "error": f"Order {order_id} not found"}
        if not target_v:
            return {"success": False, "error": f"Vehicle {new_vehicle_id} not found"}
        
        old_v_id = order.assigned_vehicle_id
        order.assigned_vehicle_id = new_vehicle_id
        order.status = OrderStatus.REASSIGNED
        
        # Update vehicle payloads
        target_v.current_load_kg += order.weight_kg
        if order.id not in target_v.assigned_order_ids:
            target_v.assigned_order_ids.append(order.id)
            
        target_v.status = VehicleStatus.REASSIGNED
        
        return {
            "success": True,
            "order_id": order_id,
            "previous_vehicle_id": old_v_id,
            "assigned_vehicle_id": new_vehicle_id,
            "new_vehicle_model": target_v.model,
            "new_vehicle_load_kg": target_v.current_load_kg,
            "timestamp": datetime.utcnow().isoformat()
        }

    # ----------------------------------------------------
    # CUSTOMER AGENT TOOLS
    # ----------------------------------------------------
    def get_customer_contact(self, order_id: str) -> Dict[str, Any]:
        """Retrieves customer recipient info and address for an order."""
        orders = self.world.get("orders", [])
        order = next((o for o in orders if o.id == order_id), None)
        if not order:
            return {"success": False, "error": f"Order {order_id} not found"}
        
        return {
            "order_id": order.id,
            "customer_name": order.customer_name,
            "customer_phone": order.customer_phone,
            "destination_address": order.destination.address,
            "priority": order.priority,
            "original_eta": order.original_eta,
            "revised_eta": order.revised_eta,
            "delay_minutes": order.delay_minutes
        }

    def generate_delay_notification(self, order_id: str, new_eta: str, reason: str, delay_minutes: float = 0.0) -> Dict[str, Any]:
        """Drafts automated proactive SMS alert for customer."""
        orders = self.world.get("orders", [])
        order = next((o for o in orders if o.id == order_id), None)
        c_name = order.customer_name if order else "Valued Customer"
        
        message = (
            f"FleetOps Alert for {c_name}: Your shipment ({order_id}) has been dynamically rerouted "
            f"due to {reason}. Your updated delivery ETA is {new_eta} (+{int(delay_minutes)}m delay). "
            f"Our autonomous fleet agent is ensuring minimal disruption. Live tracking: fleetops.ai/track/{order_id}"
        )
        
        return {
            "order_id": order_id,
            "recipient": c_name,
            "notification_type": "SMS & Push Notification",
            "message_body": message,
            "status": "QUEUED_AND_DISPATCHED",
            "timestamp": datetime.utcnow().isoformat()
        }

    def update_delivery_eta(self, order_id: str, new_eta: str, delay_minutes: float = 0.0) -> Dict[str, Any]:
        """Updates official order ETA and registers status in central order book."""
        orders = self.world.get("orders", [])
        order = next((o for o in orders if o.id == order_id), None)
        if not order:
            return {"success": False, "error": f"Order {order_id} not found"}
        
        order.revised_eta = new_eta
        order.delay_minutes = delay_minutes
        if delay_minutes > 10.0:
            order.status = OrderStatus.AT_RISK
        
        return {
            "success": True,
            "order_id": order_id,
            "original_eta": order.original_eta,
            "revised_eta": new_eta,
            "delay_minutes": delay_minutes,
            "status": order.status
        }
