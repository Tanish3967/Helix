from typing import List, Dict, Any, Tuple
from pydantic import BaseModel, Field
from backend.spatial.geofencing import is_point_in_polygon

class WeatherHazardPolygon(BaseModel):
    id: str
    name: str
    hazard_type: str # "FLASH_FLOOD", "DENSE_FOG", "HIGH_WIND", "WILDFIRE_SMOKE"
    severity: str = "HIGH" # "WARNING", "HIGH", "CRITICAL"
    coordinates: List[List[float]] # [[lat, lng], ...]
    speed_penalty_percent: float = 40.0
    wind_speed_kmh: float = 35.0
    visibility_km: float = 1.2
    precipitation_mm_hr: float = 15.0
    is_active: bool = True

DEFAULT_WEATHER_HAZARDS = [
    WeatherHazardPolygon(
        id="HAZARD-01",
        name="Embarcadero Coastal Flood Inundation",
        hazard_type="FLASH_FLOOD",
        severity="CRITICAL",
        coordinates=[[37.7950, -122.3980], [37.8080, -122.4080], [37.8100, -122.3920], [37.7950, -122.3900]],
        speed_penalty_percent=65.0,
        wind_speed_kmh=48.0,
        visibility_km=0.8,
        precipitation_mm_hr=42.0,
        is_active=True
    ),
    WeatherHazardPolygon(
        id="HAZARD-02",
        name="Bay Bridge Maritime Dense Advection Fog",
        hazard_type="DENSE_FOG",
        severity="HIGH",
        coordinates=[[37.7900, -122.3800], [37.8200, -122.3800], [37.8250, -122.3200], [37.7950, -122.3200]],
        speed_penalty_percent=45.0,
        wind_speed_kmh=22.0,
        visibility_km=0.2,
        precipitation_mm_hr=2.0,
        is_active=True
    ),
    WeatherHazardPolygon(
        id="HAZARD-03",
        name="San Bruno Gap High Wind Advisory",
        hazard_type="HIGH_WIND",
        severity="HIGH",
        coordinates=[[37.6100, -122.4300], [37.6400, -122.4300], [37.6400, -122.3900], [37.6100, -122.3900]],
        speed_penalty_percent=35.0,
        wind_speed_kmh=78.0,
        visibility_km=8.0,
        precipitation_mm_hr=0.0,
        is_active=True
    )
]

class WeatherHazardManager:
    """Evaluates spatial weather hazard zones and calculates dynamic detour bypasses."""
    def __init__(self, hazards: List[WeatherHazardPolygon] = None):
        self.hazards = hazards or list(DEFAULT_WEATHER_HAZARDS)

    def get_all_hazards(self) -> List[WeatherHazardPolygon]:
        return self.hazards

    def toggle_hazard(self, hazard_id: str, is_active: bool) -> bool:
        for hz in self.hazards:
            if hz.id == hazard_id:
                hz.is_active = is_active
                return True
        return False

    def find_intersecting_routes(self, routes: List[Any]) -> List[Dict[str, Any]]:
        """Finds all routes whose waypoints intersect with active hazard polygons."""
        intersections = []
        for r in routes:
            if not getattr(r, 'is_active', True):
                continue
            waypoints = getattr(r, 'waypoints', [])
            for wp in waypoints:
                lat, lng = getattr(wp, 'lat', 0.0), getattr(wp, 'lng', 0.0)
                for hz in self.hazards:
                    if hz.is_active and is_point_in_polygon(lat, lng, hz.coordinates):
                        intersections.append({
                            "route_id": getattr(r, 'id', 'R-01'),
                            "vehicle_id": getattr(r, 'vehicle_id', 'V481'),
                            "hazard_id": hz.id,
                            "hazard_name": hz.name,
                            "hazard_type": hz.hazard_type,
                            "severity": hz.severity,
                            "speed_penalty": hz.speed_penalty_percent
                        })
                        break
        return intersections

    def reroute_around_hazards(self, routes: List[Any]) -> List[Dict[str, Any]]:
        """Applies lateral waypoint detours to bypass active hazard zones."""
        rerouted_routes = []
        for r in routes:
            if not getattr(r, 'is_active', True):
                continue
            waypoints = getattr(r, 'waypoints', [])
            modified = False
            for wp in waypoints:
                lat, lng = getattr(wp, 'lat', 0.0), getattr(wp, 'lng', 0.0)
                for hz in self.hazards:
                    if hz.is_active and is_point_in_polygon(lat, lng, hz.coordinates):
                        # Apply safe lateral detour offset
                        wp.lat = round(wp.lat + 0.015, 6)
                        wp.lng = round(wp.lng - 0.015, 6)
                        modified = True

            if modified:
                rerouted_routes.append({
                    "route_id": getattr(r, 'id', 'R-01'),
                    "vehicle_id": getattr(r, 'vehicle_id', 'V481'),
                    "detour_applied": True,
                    "status": "REROUTED_CLEAR"
                })
        return rerouted_routes

weather_hazard_mgr = WeatherHazardManager()
