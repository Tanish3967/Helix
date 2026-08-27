from typing import List, Dict, Any, Tuple
from pydantic import BaseModel, Field

class GeofencePolygon(BaseModel):
    id: str
    name: str
    category: str # "RESTRICTED", "HAZMAT", "LOW_EMISSION", "DEPOT_YARD"
    coordinates: List[List[float]] # [[lat, lng], ...]
    is_active: bool = True

def is_point_in_polygon(lat: float, lng: float, polygon: List[List[float]]) -> bool:
    """Ray casting algorithm to determine if a point is inside a polygon."""
    num_pts = len(polygon)
    inside = False
    p1x, p1y = polygon[0][1], polygon[0][0] # lng, lat
    for i in range(num_pts + 1):
        p2x, p2y = polygon[i % num_pts][1], polygon[i % num_pts][0]
        if min(p1y, p2y) < lat <= max(p1y, p2y):
            if lng <= max(p1x, p2x):
                if p1y != p2y:
                    xinters = (lat - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                if p1x == p2x or lng <= xinters:
                    inside = not inside
        p1x, p1y = p2x, p2y
    return inside

DEFAULT_GEOFENCES = [
    GeofencePolygon(
        id="GEO-01",
        name="Oakland Port HAZMAT Zone",
        category="HAZMAT",
        coordinates=[[37.8000, -122.2850], [37.8120, -122.2850], [37.8120, -122.2650], [37.8000, -122.2650]]
    ),
    GeofencePolygon(
        id="GEO-02",
        name="Financial District Low-Emission Zone",
        category="LOW_EMISSION",
        coordinates=[[37.7880, -122.4080], [37.7990, -122.4080], [37.7990, -122.3920], [37.7880, -122.3920]]
    )
]

class GeofenceManager:
    """Evaluates real-time vehicle coordinates against spatial boundary polygons."""
    def __init__(self, geofences: List[GeofencePolygon] = None):
        self.geofences = geofences or list(DEFAULT_GEOFENCES)

    def check_breaches(self, vehicle_id: str, lat: float, lng: float) -> List[Dict[str, Any]]:
        breaches = []
        for gf in self.geofences:
            if gf.is_active and is_point_in_polygon(lat, lng, gf.coordinates):
                breaches.append({
                    "vehicle_id": vehicle_id,
                    "geofence_id": gf.id,
                    "name": gf.name,
                    "category": gf.category
                })
        return breaches

geofence_mgr = GeofenceManager()
