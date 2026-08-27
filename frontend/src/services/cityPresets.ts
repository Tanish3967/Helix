import { Vehicle, Location } from '../types/fleet';

export interface CityPreset {
  id: string;
  name: string;
  country: string;
  tagline: string;
  flag: string;
  center: { lat: number; lng: number; zoom: number };
  depots: Array<{ id: string; name: string; lat: number; lng: number }>;
  defaultVehicleCount: number;
  vehicles: Vehicle[];
}

// Generate realistic vehicles within a bounding box
function generateCityVehicles(
  cityPrefix: string,
  count: number,
  baseLat: number,
  baseLng: number,
  spreadLat: number,
  spreadLng: number,
  depotIds: string[]
): Vehicle[] {
  const models = [
    'Rivian Commercial EDV-700',
    'Mercedes-Benz eSprinter High-Roof',
    'Ford E-Transit 350 Cargo',
    'Freightliner eCascadia Semi',
    'Volvo VNR Electric Heavy Haul',
    'BrightDrop Zevo 600 Electric',
    'Skydio X10 Autonomous Delivery Drone',
    'Wingcopter 198 Heavy VTOL Drone',
    'Thermo King Cryo-Reefer Bio-Vault'
  ];

  const types = ['VAN', 'VAN', 'VAN', 'TRUCK', 'TRUCK', 'VAN', 'DRONE', 'DRONE', 'REEFER'];

  const vehicles: Vehicle[] = [];

  for (let i = 1; i <= count; i++) {
    const modelIdx = (i - 1) % models.length;
    const type = types[modelIdx];
    const isDrone = type === 'DRONE';
    const isCryo = type === 'REEFER';

    // Disperse within metropolitan bounding box
    const lat = baseLat + (Math.random() - 0.5) * spreadLat * 2;
    const lng = baseLng + (Math.random() - 0.5) * spreadLng * 2;
    const depotId = depotIds[i % depotIds.length];

    const battery = isDrone
      ? Math.floor(65 + Math.random() * 32)
      : Math.floor(70 + Math.random() * 28);

    const speed = isDrone
      ? Math.floor(45 + Math.random() * 25)
      : Math.floor(25 + Math.random() * 35);

    vehicles.push({
      id: `${cityPrefix}-V${i.toString().padStart(3, '0')}`,
      model: models[modelIdx],
      license_plate: `${cityPrefix}-${Math.floor(1000 + Math.random() * 9000)}`,
      type: type,
      status: i === 7 ? 'AT_RISK' : i === 12 ? 'REASSIGNED' : i % 8 === 0 ? 'AVAILABLE' : 'ON_ROUTE',
      location: { lat, lng, zone_id: `${cityPrefix}-ZONE-${(i % 4) + 1}` },
      speed_kmh: speed,
      battery_fuel_percent: battery,
      max_capacity_kg: isDrone ? 15.0 : isCryo ? 1200.0 : type === 'TRUCK' ? 8500.0 : 650.0,
      current_load_kg: isDrone ? 4.5 : Math.floor(150 + Math.random() * 350),
      driver_id: isDrone ? 'AUTONOMOUS_UAV' : `DRV-${cityPrefix}-${(i % 15) + 101}`,
      current_route_id: `RT-${cityPrefix}-${i.toString().padStart(3, '0')}`,
      assigned_order_ids: [`ORD-${cityPrefix}-${i * 10 + 1}`, `ORD-${cityPrefix}-${i * 10 + 2}`],
      cargo_type: isCryo ? 'PHARMACEUTICAL' : i % 10 === 0 ? 'HAZMAT' : 'GENERAL',
      cargo_temp_c: isCryo ? -80.2 : undefined,
      depot_id: depotId,
      odometer_km: Math.floor(5000 + Math.random() * 45000),
      dtc_faults: i === 7 ? ['P0A1F - Battery Energy Control Module Fault'] : [],
      carbon_kg_today: parseFloat((Math.random() * 14.5).toFixed(1)),
      telemetry_health: i === 7 ? 'Critical DTC Fault' : 'Optimal Telemetry',
      heading: Math.floor(Math.random() * 360)
    });
  }

  return vehicles;
}

export const CITY_PRESETS: Record<string, CityPreset> = {
  sf: {
    id: 'sf',
    name: 'San Francisco, USA',
    country: 'United States',
    tagline: 'Silicon Valley & Bay Area Autonomous Fleet Mesh',
    flag: '🌉',
    center: { lat: 37.7749, lng: -122.4194, zoom: 12.5 },
    defaultVehicleCount: 100,
    depots: [
      { id: 'DEPOT-SF-01', name: 'SF Central Logistics Hub', lat: 37.7770, lng: -122.4180 },
      { id: 'DEPOT-SF-02', name: 'Oakland Port Maritime Terminal', lat: 37.8044, lng: -122.2712 },
      { id: 'DEPOT-SF-03', name: 'South SF BioTech Park Hub', lat: 37.6547, lng: -122.4077 },
      { id: 'DEPOT-SF-04', name: 'San Jose Silicon Depot', lat: 37.3382, lng: -121.8863 }
    ],
    vehicles: generateCityVehicles('SF', 100, 37.7749, -122.4194, 0.055, 0.065, ['DEPOT-SF-01', 'DEPOT-SF-02', 'DEPOT-SF-03', 'DEPOT-SF-04'])
  },
  nyc: {
    id: 'nyc',
    name: 'New York City, USA',
    country: 'United States',
    tagline: 'Manhattan, Brooklyn & Queens High-Density Autonomous Grid',
    flag: '🗽',
    center: { lat: 40.7306, lng: -73.9866, zoom: 12.5 },
    defaultVehicleCount: 80,
    depots: [
      { id: 'DEPOT-NYC-01', name: 'Manhattan Midtown Freight Hub', lat: 40.7589, lng: -73.9851 },
      { id: 'DEPOT-NYC-02', name: 'Brooklyn Navy Yard Drone Base', lat: 40.7022, lng: -73.9712 },
      { id: 'DEPOT-NYC-03', name: 'Queens Long Island City Terminal', lat: 40.7447, lng: -73.9485 },
      { id: 'DEPOT-NYC-04', name: 'JFK Air Cargo Bio-Depot', lat: 40.6413, lng: -73.7781 }
    ],
    vehicles: generateCityVehicles('NYC', 80, 40.7306, -73.9866, 0.060, 0.055, ['DEPOT-NYC-01', 'DEPOT-NYC-02', 'DEPOT-NYC-03', 'DEPOT-NYC-04'])
  },
  london: {
    id: 'london',
    name: 'London, UK',
    country: 'United Kingdom',
    tagline: 'Greater London ULEZ Zero-Emission Autonomous Network',
    flag: '🇬🇧',
    center: { lat: 51.5074, lng: -0.1278, zoom: 12.5 },
    defaultVehicleCount: 75,
    depots: [
      { id: 'DEPOT-LDN-01', name: 'City of London Financial Depot', lat: 51.5155, lng: -0.0922 },
      { id: 'DEPOT-LDN-02', name: 'Docklands Canary Wharf Hub', lat: 51.5054, lng: -0.0235 },
      { id: 'DEPOT-LDN-03', name: 'King’s Cross Autonomous Terminal', lat: 51.5308, lng: -0.1238 },
      { id: 'DEPOT-LDN-04', name: 'Heathrow Cargo Logistics Hub', lat: 51.4700, lng: -0.4543 }
    ],
    vehicles: generateCityVehicles('LDN', 75, 51.5074, -0.1278, 0.055, 0.070, ['DEPOT-LDN-01', 'DEPOT-LDN-02', 'DEPOT-LDN-03', 'DEPOT-LDN-04'])
  },
  tokyo: {
    id: 'tokyo',
    name: 'Tokyo, Japan',
    country: 'Japan',
    tagline: 'Kanto Super-Mega Metropolitan High-Speed Delivery Swarm',
    flag: '🇯🇵',
    center: { lat: 35.6762, lng: 139.7503, zoom: 12.5 },
    defaultVehicleCount: 85,
    depots: [
      { id: 'DEPOT-TKO-01', name: 'Shinjuku Super-Hub Depot', lat: 35.6938, lng: 139.7034 },
      { id: 'DEPOT-TKO-02', name: 'Tokyo Bay Odaiba Marine Terminal', lat: 35.6267, lng: 139.7744 },
      { id: 'DEPOT-TKO-03', name: 'Ginza Chuo High-Precision Base', lat: 35.6719, lng: 139.7649 },
      { id: 'DEPOT-TKO-04', name: 'Haneda International Air Logistics', lat: 35.5494, lng: 139.7798 }
    ],
    vehicles: generateCityVehicles('TKO', 85, 35.6762, 139.7503, 0.060, 0.065, ['DEPOT-TKO-01', 'DEPOT-TKO-02', 'DEPOT-TKO-03', 'DEPOT-TKO-04'])
  },
  berlin: {
    id: 'berlin',
    name: 'Berlin, Germany',
    country: 'Germany',
    tagline: 'European Green Corridor & EV Autonomous Swarm',
    flag: '🇩🇪',
    center: { lat: 52.5200, lng: 13.4050, zoom: 12.5 },
    defaultVehicleCount: 65,
    depots: [
      { id: 'DEPOT-BER-01', name: 'Berlin Mitte Central Hub', lat: 52.5244, lng: 13.4105 },
      { id: 'DEPOT-BER-02', name: 'Kreuzberg Tech Logistics Yard', lat: 52.4986, lng: 13.3918 },
      { id: 'DEPOT-BER-03', name: 'Charlottenburg West Terminal', lat: 52.5160, lng: 13.3050 },
      { id: 'DEPOT-BER-04', name: 'BER Airport Autonomous Cargo Park', lat: 52.3667, lng: 13.5033 }
    ],
    vehicles: generateCityVehicles('BER', 65, 52.5200, 13.4050, 0.055, 0.065, ['DEPOT-BER-01', 'DEPOT-BER-02', 'DEPOT-BER-03', 'DEPOT-BER-04'])
  }
};
