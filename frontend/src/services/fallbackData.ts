import { SimulationState, Vehicle, Route, Order, Driver, WeatherState, MissionScore, RouteWaypoint, Location } from '../types/fleet';

const DEPOTS_DEF = [
  { id: 'DEPOT-01', name: 'Central Metro Hub', lat: 37.7790, lng: -122.4050, address: '400 Howard St, San Francisco' },
  { id: 'DEPOT-02', name: 'Mission Distribution Center', lat: 37.7580, lng: -122.4180, address: '2200 Mission St, San Francisco' },
  { id: 'DEPOT-03', name: 'Presidio Northern Hub', lat: 37.7980, lng: -122.4460, address: '120 Presidio Blvd, San Francisco' },
  { id: 'DEPOT-04', name: 'Bayshore Cargo Terminal', lat: 37.7350, lng: -122.3950, address: '1500 Bayshore Hwy, San Francisco' }
];

const ZONES_DEF = [
  { id: 'downtown', name: 'Downtown Core', lat: 37.7880, lng: -122.4075 },
  { id: 'financial', name: 'Financial District', lat: 37.7940, lng: -122.3990 },
  { id: 'mission', name: 'Mission Logistics', lat: 37.7599, lng: -122.4148 },
  { id: 'soma', name: 'SoMa Tech Zone', lat: 37.7780, lng: -122.4010 },
  { id: 'sunset', name: 'Sunset District', lat: 37.7550, lng: -122.4850 },
  { id: 'bay_bridge', name: 'Bay Bridge Corridor', lat: 37.7980, lng: -122.3780 },
  { id: 'highway_101', name: 'Highway 101 Arterial', lat: 37.7400, lng: -122.4050 },
  { id: 'port', name: 'Harbor Freight Terminal', lat: 37.7650, lng: -122.3850 }
];

const VEHICLE_MODELS_DEF = [
  { model: 'Ford E-Transit', type: 'Electric Cargo Van', maxCap: 650 },
  { model: 'Mercedes Sprinter 2500', type: 'High-Roof Van', maxCap: 800 },
  { model: 'Rivian EDV-700', type: 'Smart Electric Van', maxCap: 750 },
  { model: 'Ram ProMaster 3500', type: 'Heavy Logistics Van', maxCap: 900 },
  { model: 'BrightDrop Zevo 600', type: 'Long-Range EV Van', maxCap: 700 }
];

const ROUTE_COLORS_DEF = [
  '#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#06B6D4',
  '#8B5CF6', '#14B8A6', '#F97316', '#6366F1', '#EAB308',
  '#0EA5E9', '#84CC16', '#A855F7', '#D946EF', '#22C55E',
  '#38BDF8', '#FB923C', '#A78BFA', '#4ADE80', '#F43F5E'
];

function generateWaypoints(startLat: number, startLng: number, endLat: number, endLng: number, count = 24): RouteWaypoint[] {
  const pts: RouteWaypoint[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const smoothT = t * t * (3 - 2 * t);
    const lat = startLat + (endLat - startLat) * smoothT + Math.sin(Math.PI * t) * 0.003;
    const lng = startLng + (endLng - startLng) * smoothT + Math.cos(Math.PI * t) * 0.003;
    pts.push({
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      segment_name: `Waypoint-${i + 1}`
    });
  }
  return pts;
}

export function generateInitialFallbackState(): SimulationState {
  const routes: Route[] = [];
  const vehicles: Vehicle[] = [];
  const orders: Order[] = [];

  // Generate 20 Key Metropolitan Delivery Routes
  for (let i = 1; i <= 20; i++) {
    const depot = DEPOTS_DEF[(i - 1) % DEPOTS_DEF.length];
    const zone = ZONES_DEF[(i * 3) % ZONES_DEF.length];
    const destLat = zone.lat + (Math.sin(i * 1.5) * 0.012);
    const destLng = zone.lng + (Math.cos(i * 1.5) * 0.012);
    const waypoints = generateWaypoints(depot.lat, depot.lng, destLat, destLng, 25);
    const vehicleId = i <= 10 ? `V${480 + i}` : `V${500 + i}`;

    routes.push({
      id: `RT-${100 + i}`,
      vehicle_id: vehicleId,
      origin: { lat: depot.lat, lng: depot.lng, address: depot.name, zone_id: 'depot' },
      destination: { lat: destLat, lng: destLng, address: `${zone.name} Logistics Point`, zone_id: zone.id },
      waypoints,
      current_waypoint_idx: Math.min(Math.floor(i * 1.1) + 2, waypoints.length - 2),
      distance_km: Number((12.5 + (i * 0.6)).toFixed(1)),
      progress_percent: Number((20 + (i * 3.5)).toFixed(1)),
      traffic_multiplier: 1.0,
      weather_multiplier: 1.0,
      is_active: true,
      color: ROUTE_COLORS_DEF[(i - 1) % ROUTE_COLORS_DEF.length]
    });
  }

  // Generate 100 Fleet Vehicles
  const vehicleIds = [481, 517, 509, 526];
  for (let v = 400; v <= 499; v++) {
    if (!vehicleIds.includes(v)) vehicleIds.push(v);
  }
  for (let v = 501; v <= 540; v++) {
    if (!vehicleIds.includes(v) && vehicleIds.length < 100) vehicleIds.push(v);
  }

  vehicleIds.slice(0, 100).forEach((vNum, idx) => {
    const vId = `V${vNum}`;
    const modelInfo = VEHICLE_MODELS_DEF[idx % VEHICLE_MODELS_DEF.length];
    const depot = DEPOTS_DEF[idx % DEPOTS_DEF.length];

    if (idx < routes.length) {
      const route = routes[idx];
      route.vehicle_id = vId;
      const wp = route.waypoints[route.current_waypoint_idx] || route.waypoints[0];
      vehicles.push({
        id: vId,
        model: modelInfo.model,
        license_plate: `7SFX${200 + idx}`,
        type: modelInfo.type,
        status: 'ON_ROUTE',
        location: { lat: wp.lat, lng: wp.lng, zone_id: route.destination.zone_id },
        speed_kmh: Number((38 + (idx % 15) * 1.2).toFixed(1)),
        battery_fuel_percent: Number((72 + (idx % 25)).toFixed(0)),
        max_capacity_kg: modelInfo.maxCap,
        current_load_kg: Number((modelInfo.maxCap * 0.45).toFixed(0)),
        driver_id: `DRV-${101 + (idx % 10)}`,
        current_route_id: route.id,
        assigned_order_ids: [`ORD-${1000 + idx}`, `ORD-${2000 + idx}`],
        fault_details: null,
        telemetry_health: 'Optimal',
        depot_id: depot.id
      });
    } else {
      const latOffset = (Math.sin(idx * 2.3) * 0.018);
      const lngOffset = (Math.cos(idx * 2.3) * 0.018);
      vehicles.push({
        id: vId,
        model: modelInfo.model,
        license_plate: `7SFX${300 + idx}`,
        type: modelInfo.type,
        status: 'AVAILABLE',
        location: { lat: Number((depot.lat + latOffset).toFixed(6)), lng: Number((depot.lng + lngOffset).toFixed(6)), address: depot.name, zone_id: 'depot' },
        speed_kmh: 0,
        battery_fuel_percent: Number((85 + (idx % 14)).toFixed(0)),
        max_capacity_kg: modelInfo.maxCap,
        current_load_kg: 0,
        driver_id: null,
        current_route_id: null,
        assigned_order_ids: [],
        fault_details: null,
        telemetry_health: 'Optimal',
        depot_id: depot.id
      });
    }
  });

  // Generate 100 Initial Delivery Orders
  for (let i = 1; i <= 100; i++) {
    const assignedVehicle = vehicles[i % 20];
    orders.push({
      id: `ORD-${4800 + i}`,
      customer_name: `Client #${100 + i} Logistics`,
      customer_phone: '+1 (555) 019-2834',
      origin: { lat: 37.7790, lng: -122.4050, address: 'Central Metro Hub' },
      destination: { lat: 37.7880 + (Math.sin(i) * 0.02), lng: -122.4075 + (Math.cos(i) * 0.02), address: `Delivery Address ${i}` },
      priority: i % 4 === 0 ? 'HIGH' : i % 3 === 0 ? 'LOW' : 'STANDARD',
      status: i <= 20 ? 'IN_TRANSIT' : 'PENDING',
      weight_kg: Number((15 + (i % 30)).toFixed(1)),
      original_eta: new Date(Date.now() + 1800 * 1000).toISOString(),
      revised_eta: new Date(Date.now() + 1800 * 1000).toISOString(),
      delay_minutes: 0,
      assigned_vehicle_id: assignedVehicle?.id || 'V481',
      created_at: new Date().toISOString()
    });
  }

  return {
    vehicles,
    routes,
    orders,
    active_incident: null,
    agent_steps: [
      {
        id: 'STEP-INIT-01',
        agent_name: 'Orchestrator Agent',
        summary: 'Autonomous Swarm Health Monitoring',
        detail: '100 units synchronized across 4 regional depot hubs.',
        state: 'RUNNING',
        tool_calls: [],
        timestamp: new Date().toISOString()
      },
      {
        id: 'STEP-INIT-02',
        agent_name: 'Routing Agent',
        summary: 'Dynamic Traffic & Weather Waypoint Optimization',
        detail: '20 active delivery corridors calibrated and active.',
        state: 'COMPLETE',
        tool_calls: [],
        timestamp: new Date().toISOString()
      }
    ],
    events: [
      {
        id: 'EV-INIT-01',
        timestamp: new Date().toLocaleTimeString(),
        severity: 'INFO',
        category: 'System',
        message: 'Autonomous Swarm Engine initialized with 100 units & 20 active routes.'
      }
    ],
    metrics: {
      score: 1450,
      completed_orders_today: 428,
      total_orders_today: 500,
      active_incidents_count: 0,
      resolved_incidents_count: 14,
      avg_resolution_seconds: 38.5,
      efficiency_percent: 94.2,
      on_time_rate_percent: 98.4,
      fuel_cost_today_usd: 1284.50,
      current_level: 1
    },
    weather: {
      condition: 'SUNNY',
      temperature_c: 18,
      precipitation_rate: 0,
      wind_speed_kmh: 12,
      visibility_km: 10,
      multiplier: 1.0
    },
    traffic_zones: {},
    sim_time: '08:00:00 UTC',
    is_paused: false,
    speed_multiplier: 1
  };
}
