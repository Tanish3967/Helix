from typing import List, Optional
from pydantic import BaseModel, Field

class DepotHub(BaseModel):
    id: str
    name: str
    region: str
    lat: float
    lng: float
    capacity_vehicles: int = 50
    active_units: int = 25

class OrganizationTenant(BaseModel):
    tenant_id: str
    org_name: str
    tier: str = "Enterprise"
    depots: List[DepotHub] = Field(default_factory=list)

DEFAULT_DEPOTS = [
    DepotHub(id="DEPOT-01", name="SF Central Hub", region="Northern CA", lat=37.7770, lng=-122.4180, capacity_vehicles=60, active_units=42),
    DepotHub(id="DEPOT-02", name="Oakland Port Logistics", region="East Bay", lat=37.8044, lng=-122.2712, capacity_vehicles=40, active_units=28),
    DepotHub(id="DEPOT-03", name="San Jose Tech Corridor", region="South Bay", lat=37.3382, lng=-121.8863, capacity_vehicles=30, active_units=18)
]
