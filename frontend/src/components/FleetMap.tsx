import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import {
  Maximize2,
  Minimize2,
  Plus,
  Minus,
  ChevronDown,
  Crosshair,
  Zap,
  Navigation,
  CheckCircle2,
  CloudRain,
  CloudLightning,
  CloudFog,
  Sun,
  Play,
  Pause,
  LocateFixed,
  Edit3,
  AlertTriangle,
  Layers,
  Sparkles,
  TrendingUp,
  Activity,
  Check,
  X,
  Truck,
  BatteryCharging,
  Gauge,
  ShieldCheck,
  Compass,
  Cpu,
  Radio
} from 'lucide-react';
import { Vehicle, Route, Incident, Order, WeatherState, TrafficZones } from '../types/fleet';
import { modifyVehicleRoute, toggleSimulationPause, setSimulationSpeed, injectDisruption } from '../services/api';
import { MapLayersDrawer, MapLayerConfig } from './MapLayersDrawer';
import { CITY_CHARGERS, generateRangeIsochroneGeoJSON, EVChargingStation } from '../services/mapplsEvSdk';

// Map view modes shown in the segmented control. 3D tilts the camera; the basemap
// is shared with 'map'. Satellite swaps in the imagery raster.
type MapViewMode = 'map' | 'satellite' | '3d';
const PITCH_FLAT = 20;
const PITCH_3D = 58;

// Toggleable overlay layers (independent of the view mode).
export type LayerState = MapLayerConfig;

const SIM_SPEEDS = [0.5, 1, 2, 4, 8];

interface FleetMapProps {
  vehicles: Vehicle[];
  routes: Route[];
  orders?: Order[];
  activeIncident: Incident | null | undefined;
  weather?: WeatherState;
  trafficZones?: TrafficZones;
  speedMultiplier?: number;
  isPaused?: boolean;
  selectedVehicleId: string | null;
  onSelectVehicle: (vId: string | null) => void;
  onOpenConsole?: (tab?: 'disruptions' | 'fleet' | 'routes') => void;
  cityCenter?: { lat: number; lng: number; zoom?: number };
}

const CARTO_DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

// Below this zoom the individual vehicle pills collapse into per-zone cluster bubbles.
const CLUSTER_ZOOM_THRESHOLD = 11.5;

const DEPOTS: Array<{ id: string; name: string; lat: number; lng: number }> = [
  { id: 'DEPOT-01', name: 'Central Depot Hub', lat: 37.7770, lng: -122.4180 }
];

const NEIGHBORHOODS = [
  { name: 'RIVERSIDE', lat: 37.7860, lng: -122.4400 },
  { name: 'WEST PARK', lat: 37.7680, lng: -122.4350 },
  { name: 'DOWNTOWN', lat: 37.7749, lng: -122.4150 },
  { name: 'NORTHSIDE', lat: 37.7900, lng: -122.4100 },
  { name: 'CENTRAL PARK', lat: 37.7920, lng: -122.3950 },
  { name: 'EASTWOOD', lat: 37.7780, lng: -122.3850 },
  { name: 'SOUTHSIDE', lat: 37.7580, lng: -122.4050 }
];

const DESTINATION_HUBS = [
  { id: 'downtown', name: 'Downtown Core', lat: 37.7880, lng: -122.4075 },
  { id: 'financial', name: 'Financial District', lat: 37.7940, lng: -122.3990 },
  { id: 'mission', name: 'Mission Logistics', lat: 37.7599, lng: -122.4148 },
  { id: 'soma', name: 'SoMa Tech Zone', lat: 37.7780, lng: -122.4010 },
  { id: 'sunset', name: 'Sunset District', lat: 37.7550, lng: -122.4850 },
  { id: 'bay_bridge', name: 'Bay Bridge Corridor', lat: 37.7980, lng: -122.3780 },
  { id: 'highway_101', name: 'Highway 101 Arterial', lat: 37.7400, lng: -122.4050 },
  { id: 'port', name: 'Harbor Freight Terminal', lat: 37.7650, lng: -122.3850 }
];

// Major Arterial Corridors for Traffic Congestion Heatmap
const TRAFFIC_CORRIDORS = [
  {
    id: 'highway_101',
    name: 'Highway 101 Arterial',
    zone: 'highway_101',
    coordinates: [
      [-122.4050, 37.7300],
      [-122.4040, 37.7450],
      [-122.4055, 37.7600],
      [-122.4060, 37.7700],
      [-122.4120, 37.7800],
      [-122.4150, 37.7900]
    ]
  },
  {
    id: 'bay_bridge',
    name: 'Bay Bridge Span',
    zone: 'bay_bridge',
    coordinates: [
      [-122.3900, 37.7900],
      [-122.3800, 37.7950],
      [-122.3700, 37.8020],
      [-122.3600, 37.8100]
    ]
  },
  {
    id: 'downtown_grid',
    name: 'Downtown Core Grid',
    zone: 'downtown',
    coordinates: [
      [-122.4200, 37.7700],
      [-122.4140, 37.7760],
      [-122.4080, 37.7830],
      [-122.4000, 37.7900],
      [-122.3940, 37.7950]
    ]
  },
  {
    id: 'soma_tech',
    name: 'SoMa Logistics Arterial',
    zone: 'soma',
    coordinates: [
      [-122.4150, 37.7720],
      [-122.4050, 37.7790],
      [-122.3950, 37.7860]
    ]
  },
  {
    id: 'mission_corridor',
    name: 'Mission Freight Arterial',
    zone: 'mission',
    coordinates: [
      [-122.4200, 37.7550],
      [-122.4180, 37.7650],
      [-122.4170, 37.7750]
    ]
  }
];

// SVG markup reused across markers
const VEHICLE_ICON_SVG = `
  <svg class="w-3 h-3 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
    <path d="M15 18H9"/>
    <path d="M19 18h2a1 1 0 0 0 1-1v-5l-3-4h-5v10Z"/>
    <circle cx="7" cy="18" r="2"/>
    <circle cx="17" cy="18" r="2"/>
  </svg>
`;

const ARROW_SVG = `
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="14" height="14">
    <path d="M12 2 L20 21 L12 16.5 L4 21 Z"/>
  </svg>
`;

interface MarkerAnim {
  curLng: number;
  curLat: number;
  tgtLng: number;
  tgtLat: number;
  heading: number;
  moving: boolean;
  statusKey: string;
  rotorEl: HTMLElement | null;
  arrowEl: HTMLElement | null;
  pillEl: HTMLElement | null;
}

function computeBearing(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dLambda = toRad(lng2 - lng1);
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function computeVehicleVisual(v: Vehicle, allottedVehicleId?: string) {
  const vDisplay = v.id;
  let pillClass = 'marker-pill-available';
  let statusLabel = ` • ${Math.round(v.speed_kmh)} km/h`;
  let iconPrefix = '';

  if (v.type === 'DRONE') {
    iconPrefix = '🛸 ';
  } else if (v.cargo_type === 'PHARMACEUTICAL' || v.type === 'REEFER') {
    iconPrefix = '❄️ ';
  } else if (v.cargo_type === 'HAZMAT') {
    iconPrefix = '🛡️ ';
  }

  if (v.status === 'AT_RISK' || v.fault_details) {
    pillClass = 'marker-pill-at-risk';
    statusLabel = ' ⚠️ FAULT';
  } else if (v.status === 'REASSIGNED' || v.id === allottedVehicleId) {
    pillClass = 'marker-pill-reassigned';
    statusLabel = ' 🔄 ALLOTTED';
  } else if (v.status === 'ON_ROUTE') {
    pillClass = 'marker-pill-on-route';
    if (v.speed_kmh < 3) statusLabel = ' • IDLE';
  } else if (v.status === 'MAINTENANCE') {
    pillClass = 'marker-pill-completed';
    statusLabel = ' 🔧 MAINT';
  } else if (v.status === 'AVAILABLE') {
    pillClass = 'marker-pill-available';
    statusLabel = ' • READY';
  }

  return {
    vDisplay: `${iconPrefix}${vDisplay}`,
    pillClass,
    statusLabel,
    statusKey: `${pillClass}|${iconPrefix}${vDisplay}|${statusLabel}`
  };
}

function buildPopupHTML(v: Vehicle): string {
  const vDisplay = v.id.includes('-') ? v.id : `V-${v.id.replace('V', '')}`;
  const statusColor =
    v.status === 'AT_RISK' ? 'var(--crit)' :
    v.status === 'REASSIGNED' ? 'var(--violet)' :
    v.status === 'ON_ROUTE' ? 'var(--signal)' :
    'var(--ion)';
  const healthColor = v.fault_details ? 'var(--crit)' : 'var(--signal)';
  return `
    <div style="min-width:200px;padding:2px;font-family:var(--font-ui);color:var(--ink);">
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--edge);padding-bottom:6px;">
        <span style="font-family:var(--font-mono);font-weight:700;font-size:13px;color:var(--ion);">${vDisplay}</span>
        <span style="font-family:var(--font-mono);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:2px 6px;border-radius:5px;color:${statusColor};background:color-mix(in srgb, ${statusColor} 15%, transparent);border:1px solid color-mix(in srgb, ${statusColor} 32%, transparent);">${v.status}</span>
      </div>
      <div style="font-size:11px;color:var(--ink-dim);margin-top:6px;">${v.model}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-family:var(--font-mono);font-size:10px;color:var(--ink-faint);padding-top:6px;">
        <div>Speed: <span style="color:var(--ink);font-weight:600;">${v.speed_kmh} km/h</span></div>
        <div>Battery: <span style="color:var(--signal);font-weight:600;">${v.battery_fuel_percent}%</span></div>
        <div>Load: <span style="color:var(--ink);font-weight:600;">${v.current_load_kg}/${v.max_capacity_kg}kg</span></div>
        <div>Health: <span style="color:${healthColor};font-weight:600;">${v.telemetry_health}</span></div>
      </div>
    </div>
  `;
}

export const FleetMap: React.FC<FleetMapProps> = ({
  vehicles,
  routes,
  orders,
  activeIncident,
  weather,
  trafficZones,
  speedMultiplier,
  isPaused,
  selectedVehicleId,
  onSelectVehicle,
  onOpenConsole,
  cityCenter
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const depotMarkersRef = useRef<maplibregl.Marker[]>([]);
  const neighborhoodMarkersRef = useRef<maplibregl.Marker[]>([]);
  const waypointDragMarkersRef = useRef<maplibregl.Marker[]>([]);
  const hazardVertexMarkersRef = useRef<maplibregl.Marker[]>([]);
  const chargerMarkersRef = useRef<maplibregl.Marker[]>([]);

  // Per-marker interpolation state + animation loop handle
  const markerAnimRef = useRef<Map<string, MarkerAnim>>(new Map());
  const rafRef = useRef<number | null>(null);
  const dashIntervalRef = useRef<number | null>(null);

  // Synchronized value refs
  const isManualRouteModeRef = useRef<boolean>(false);
  const isDrawingHazardRef = useRef<boolean>(false);
  const manualVehicleIdRef = useRef<string>(vehicles[0]?.id || 'V481');
  const selectedVehicleIdRef = useRef<string | null>(selectedVehicleId);
  const onSelectVehicleRef = useRef(onSelectVehicle);
  const mapStyleRef = useRef<MapViewMode>('map');
  const isClusteredRef = useRef<boolean>(false);
  const DEFAULT_LAYERS: LayerState = {
    routes: true,
    trafficHeatmap: true,
    weather: true,
    geofences: true,
    chargingGrid: true,
    convoyMesh: true,
    swarmTrails: true,
    heatmap: false,
    evChargers: true,
    evRangeIsochrone: true
  };

  const layersRef = useRef<LayerState>(DEFAULT_LAYERS);

  const [mapStyle, setMapStyle] = useState<MapViewMode>('map');
  const [layers, setLayers] = useState<LayerState>(DEFAULT_LAYERS);
  const [isClustered, setIsClustered] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Manual Route Mode State
  const [isManualRouteMode, setIsManualRouteMode] = useState<boolean>(false);
  const [manualVehicleId, setManualVehicleId] = useState<string>(vehicles[0]?.id || 'V481');
  const [manualTargetHub, setManualTargetHub] = useState<string>('downtown');
  const [rerouteLoading, setRerouteLoading] = useState<boolean>(false);
  const [rerouteSuccessToast, setRerouteSuccessToast] = useState<string | null>(null);

  // "Draw to Disrupt" Geofence Hazard Tool State
  const [isDrawingHazard, setIsDrawingHazard] = useState<boolean>(false);
  const [hazardPolygonPoints, setHazardPolygonPoints] = useState<Array<[number, number]>>([]);
  const [hazardType, setHazardType] = useState<string>('Construction & Road Closure');
  const [isInjectingHazard, setIsInjectingHazard] = useState<boolean>(false);

  // AI Route Comparison & Delta HUD State
  const [showAiComparisonHUD, setShowAiComparisonHUD] = useState<boolean>(true);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const selectedRoute = routes.find((r) => r.vehicle_id === selectedVehicleId || r.id === selectedVehicle?.current_route_id);

  // Keep manualVehicleId synced
  useEffect(() => {
    if (selectedVehicleId) {
      setManualVehicleId(selectedVehicleId);
    } else if (vehicles.length > 0 && !manualVehicleId) {
      setManualVehicleId(vehicles[0].id);
    }
  }, [selectedVehicleId, vehicles]);

  // Mirror values to refs
  useEffect(() => {
    isManualRouteModeRef.current = isManualRouteMode;
    isDrawingHazardRef.current = isDrawingHazard;
    manualVehicleIdRef.current = manualVehicleId;
    selectedVehicleIdRef.current = selectedVehicleId;
    onSelectVehicleRef.current = onSelectVehicle;
    mapStyleRef.current = mapStyle;
    isClusteredRef.current = isClustered;
    layersRef.current = layers;
  });

  // Identify broken and allotted replacement vehicles
  const brokenVehicle = vehicles.find((v) => 
    v.status === 'AT_RISK' || 
    v.fault_details !== null || 
    (activeIncident?.affected_vehicle_ids?.includes(v.id))
  );

  const allottedVehicle = vehicles.find((v) => 
    v.status === 'REASSIGNED' || 
    (v.current_route_id && v.current_route_id.includes('REASSIGN'))
  );

  // Fly camera smoothly when a new city or custom fleet coordinates are loaded
  useEffect(() => {
    if (!mapRef.current || !cityCenter) return;
    mapRef.current.flyTo({
      center: [cityCenter.lng, cityCenter.lat],
      zoom: cityCenter.zoom || 12.5,
      speed: 1.8,
      curve: 1.42,
      essential: true
    });
  }, [cityCenter]);

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: CARTO_DARK_STYLE,
      center: [-122.4180, 37.7760],
      zoom: 12.8,
      pitch: 20,
      bearing: 0,
      attributionControl: false
    });

    map.on('load', () => {
      // 0. Satellite raster (ESRI World Imagery)
      map.addSource('satellite-source', {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: 'Imagery © Esri, Maxar, Earthstar Geographics'
      });
      map.addLayer({
        id: 'satellite-layer',
        type: 'raster',
        source: 'satellite-source',
        layout: { visibility: 'none' },
        paint: { 'raster-opacity': 0.92 }
      });

      // 1. Traffic Congestion Heatmap Corridors
      map.addSource('traffic-corridors-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.addLayer({
        id: 'traffic-corridors-glow',
        type: 'line',
        source: 'traffic-corridors-source',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 12,
          'line-opacity': 0.35,
          'line-blur': 6
        }
      });

      map.addLayer({
        id: 'traffic-corridors-line',
        type: 'line',
        source: 'traffic-corridors-source',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 4.5,
          'line-opacity': 0.85
        }
      });

      // 2. Add Route Sources & Layers
      map.addSource('routes-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.addLayer({
        id: 'routes-glow',
        type: 'line',
        source: 'routes-source',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 7,
          'line-opacity': 0.45,
          'line-blur': 4
        }
      });

      map.addLayer({
        id: 'routes-line',
        type: 'line',
        source: 'routes-source',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 3.2,
          'line-opacity': 0.95
        }
      });

      map.addLayer({
        id: 'routes-flow',
        type: 'line',
        source: 'routes-source',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#F8FAFC',
          'line-width': 2,
          'line-opacity': 0.55,
          'line-dasharray': [0, 4, 3]
        }
      });

      // 3. AI Route Comparison Layers (Original Broken vs AI Optimized Handover)
      map.addSource('comparison-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.addLayer({
        id: 'comparison-broken-glow',
        type: 'line',
        source: 'comparison-source',
        filter: ['==', ['get', 'type'], 'broken'],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#EF4444',
          'line-width': 10,
          'line-opacity': 0.5,
          'line-blur': 6
        }
      });

      map.addLayer({
        id: 'comparison-broken-line',
        type: 'line',
        source: 'comparison-source',
        filter: ['==', ['get', 'type'], 'broken'],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#EF4444',
          'line-width': 3.5,
          'line-dasharray': [3, 2],
          'line-opacity': 0.9
        }
      });

      map.addLayer({
        id: 'comparison-ai-glow',
        type: 'line',
        source: 'comparison-source',
        filter: ['==', ['get', 'type'], 'ai_optimized'],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#D946EF',
          'line-width': 12,
          'line-opacity': 0.6,
          'line-blur': 6
        }
      });

      map.addLayer({
        id: 'comparison-ai-line',
        type: 'line',
        source: 'comparison-source',
        filter: ['==', ['get', 'type'], 'ai_optimized'],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#F472B6',
          'line-width': 4,
          'line-opacity': 1.0
        }
      });

      // 4. Handover Connection Arc
      map.addSource('handover-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.addLayer({
        id: 'handover-glow',
        type: 'line',
        source: 'handover-source',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#D946EF',
          'line-width': 8,
          'line-opacity': 0.5,
          'line-blur': 5
        }
      });

      map.addLayer({
        id: 'handover-line',
        type: 'line',
        source: 'handover-source',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#F472B6',
          'line-width': 3,
          'line-dasharray': [2, 2],
          'line-opacity': 1.0
        }
      });

      // 5. Drawn Hazard Geofence Polygon Source & Layers
      map.addSource('hazard-draw-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.addLayer({
        id: 'hazard-draw-fill',
        type: 'fill',
        source: 'hazard-draw-source',
        paint: {
          'fill-color': '#EF4444',
          'fill-opacity': 0.25
        }
      });

      map.addLayer({
        id: 'hazard-draw-line',
        type: 'line',
        source: 'hazard-draw-source',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#EF4444',
          'line-width': 3,
          'line-dasharray': [2, 2],
          'line-opacity': 0.95
        }
      });

      // 5b. Tactical Secure Convoy Mesh Radar Links
      map.addSource('convoy-mesh-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.addLayer({
        id: 'convoy-mesh-glow',
        type: 'line',
        source: 'convoy-mesh-source',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#06B6D4',
          'line-width': 10,
          'line-opacity': 0.45,
          'line-blur': 5
        }
      });

      map.addLayer({
        id: 'convoy-mesh-line',
        type: 'line',
        source: 'convoy-mesh-source',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#22D3EE',
          'line-width': 3,
          'line-dasharray': [3, 2],
          'line-opacity': 0.95
        }
      });

      // 5c. Swarm Vehicle Velocity Motion Trails
      map.addSource('swarm-trails-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.addLayer({
        id: 'swarm-trails-glow',
        type: 'line',
        source: 'swarm-trails-source',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#10B981',
          'line-width': 8,
          'line-opacity': 0.35,
          'line-blur': 4
        }
      });

      map.addLayer({
        id: 'swarm-trails-line',
        type: 'line',
        source: 'swarm-trails-source',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#34D399',
          'line-width': 2.5,
          'line-opacity': 0.85
        }
      });

      // 5d. Mappls EV Dynamic Battery Range Isochrone (Distance-to-Empty)
      map.addSource('ev-range-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.addLayer({
        id: 'ev-range-fill',
        type: 'fill',
        source: 'ev-range-source',
        paint: {
          'fill-color': ['coalesce', ['get', 'fillColor'], '#06B6D4'],
          'fill-opacity': 0.16
        }
      });

      map.addLayer({
        id: 'ev-range-line',
        type: 'line',
        source: 'ev-range-source',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['coalesce', ['get', 'lineColor'], '#22D3EE'],
          'line-width': 2.5,
          'line-dasharray': [4, 2],
          'line-opacity': 0.85
        }
      });

      // 6. Add Depot Markers
      DEPOTS.forEach((depot) => {
        const el = document.createElement('div');
        el.className = 'marker-depot-hub';
        el.innerHTML = `
          <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        `;
        el.title = depot.name;

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([depot.lng, depot.lat])
          .addTo(map);

        depotMarkersRef.current.push(marker);
      });

      // 7. Add Neighborhood labels
      NEIGHBORHOODS.forEach((n) => {
        const el = document.createElement('div');
        el.className = 'text-[11px] font-extrabold uppercase tracking-widest pointer-events-none select-none';
        el.style.color = 'var(--ink-faint)';
        el.style.opacity = '0.75';
        el.innerText = n.name;

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([n.lng, n.lat])
          .addTo(map);

        neighborhoodMarkersRef.current.push(marker);
      });

      // 8. Fleet Density Heatmap
      map.addSource('vehicles-heat-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      map.addLayer({
        id: 'vehicles-heat-layer',
        type: 'heatmap',
        source: 'vehicles-heat-source',
        layout: { visibility: 'none' },
        paint: {
          'heatmap-weight': 1,
          'heatmap-intensity': 1.1,
          'heatmap-radius': 34,
          'heatmap-opacity': 0.85,
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.2, 'rgba(16,185,129,0.45)',
            0.45, 'rgba(59,130,246,0.7)',
            0.7, 'rgba(245,158,11,0.85)',
            1, 'rgba(239,68,68,0.95)'
          ]
        }
      });
    });

    // Map Click Handler: Supports Manual Route Mode AND Draw-to-Disrupt Hazard Mode
    map.on('click', async (e) => {
      const { lng, lat } = e.lngLat;

      // Handle "Draw to Disrupt" Geofence Drawing Click
      if (isDrawingHazardRef.current) {
        setHazardPolygonPoints((prev) => [...prev, [lng, lat]]);
        return;
      }

      // Handle Manual Route Mode Click
      const targetV = selectedVehicleIdRef.current || manualVehicleIdRef.current;
      if (isManualRouteModeRef.current && targetV) {
        setRerouteLoading(true);
        try {
          await modifyVehicleRoute(targetV, {
            destination_lat: lat,
            destination_lng: lng,
            destination_name: `Map Coordinate (${lat.toFixed(3)}, ${lng.toFixed(3)})`
          });
          setRerouteSuccessToast(`Vehicle ${targetV} rerouted to clicked map coordinate!`);
          setTimeout(() => setRerouteSuccessToast(null), 3000);
        } catch (err: any) {
          console.error('Failed to reroute on map click:', err);
        } finally {
          setRerouteLoading(false);
        }
      }
    });

    // Zoom clustering threshold
    map.on('zoom', () => {
      const clustered = map.getZoom() < CLUSTER_ZOOM_THRESHOLD;
      setIsClustered((prev) => (prev === clustered ? prev : clustered));
    });

    mapRef.current = map;

    // Smooth-motion and Heading Bearing Loop
    const animate = () => {
      markerAnimRef.current.forEach((st, id) => {
        const marker = markersRef.current.get(id);
        if (!marker) return;
        const dLng = st.tgtLng - st.curLng;
        const dLat = st.tgtLat - st.curLat;
        if (dLng * dLng + dLat * dLat > 1e-11) {
          st.heading = computeBearing(st.curLng, st.curLat, st.tgtLng, st.tgtLat);
          const alpha = 0.18;
          st.curLng += dLng * alpha;
          st.curLat += dLat * alpha;
          marker.setLngLat([st.curLng, st.curLat]);
        }
        if (st.rotorEl) st.rotorEl.style.transform = `rotate(${st.heading}deg)`;
        if (st.arrowEl) st.arrowEl.classList.toggle('arrow-hidden', !st.moving);
      });
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    // Route Flow Dash Animation
    const dashSequence: number[][] = [
      [0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5],
      [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0], [0, 0.5, 3, 3.5],
      [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2], [0, 2.5, 3, 1.5],
      [0, 3, 3, 1], [0, 3.5, 3, 0.5]
    ];
    let dashStep = 0;
    dashIntervalRef.current = window.setInterval(() => {
      if (!map.getLayer('routes-flow')) return;
      dashStep = (dashStep + 1) % dashSequence.length;
      map.setPaintProperty('routes-flow', 'line-dasharray', dashSequence[dashStep]);
    }, 90);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (dashIntervalRef.current !== null) {
        clearInterval(dashIntervalRef.current);
        dashIntervalRef.current = null;
      }
      markerAnimRef.current.clear();
      markersRef.current.clear();
      waypointDragMarkersRef.current.forEach((m) => m.remove());
      waypointDragMarkersRef.current = [];
      hazardVertexMarkersRef.current.forEach((m) => m.remove());
      hazardVertexMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Traffic Congestion Heatmap Corridors
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getSource('traffic-corridors-source')) return;

    if (!layers.trafficHeatmap) {
      (map.getSource('traffic-corridors-source') as maplibregl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: []
      });
      return;
    }

    const features = TRAFFIC_CORRIDORS.map((corridor) => {
      const zoneData = trafficZones ? trafficZones[corridor.zone] : null;
      const mult = zoneData?.multiplier || 1.0;
      let color = '#10B981'; // Flowing - Green
      if (mult >= 2.5) color = '#DC2626'; // Severe Gridlock - Red
      else if (mult >= 1.8) color = '#F97316'; // Heavy - Orange
      else if (mult >= 1.3) color = '#F59E0B'; // Moderate - Amber

      return {
        type: 'Feature' as const,
        properties: {
          id: corridor.id,
          name: corridor.name,
          color: color,
          multiplier: mult
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: corridor.coordinates
        }
      };
    });

    (map.getSource('traffic-corridors-source') as maplibregl.GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: features
    });
  }, [layers.trafficHeatmap, trafficZones]);

  // Update Convoy Radar Mesh Links
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getSource('convoy-mesh-source')) return;

    if (!layers.convoyMesh) {
      (map.getSource('convoy-mesh-source') as maplibregl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: []
      });
      return;
    }

    // Lead (V481), Vault (V517), Interceptor (V109)
    const vLead = vehicles.find((v) => v.id === 'V481');
    const vVault = vehicles.find((v) => v.id === 'V517');
    const vEscort = vehicles.find((v) => v.id === 'V109');

    const features: any[] = [];
    if (
      vLead?.location &&
      typeof vLead.location.lng === 'number' &&
      vVault?.location &&
      typeof vVault.location.lng === 'number' &&
      vEscort?.location &&
      typeof vEscort.location.lng === 'number'
    ) {
      features.push({
        type: 'Feature' as const,
        properties: { name: 'Titan Convoy Tactical Radar Link' },
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [vLead.location.lng, vLead.location.lat],
            [vVault.location.lng, vVault.location.lat],
            [vEscort.location.lng, vEscort.location.lat]
          ]
        }
      });
    }

    (map.getSource('convoy-mesh-source') as maplibregl.GeoJSONSource).setData({
      type: 'FeatureCollection',
      features
    });
  }, [vehicles, layers.convoyMesh]);

  // Update Swarm Velocity Motion Trails
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getSource('swarm-trails-source')) return;

    if (!layers.swarmTrails) {
      (map.getSource('swarm-trails-source') as maplibregl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: []
      });
      return;
    }

    const movingVehicles = vehicles.filter(
      (v) => v && v.location && typeof v.location.lng === 'number' && typeof v.location.lat === 'number' && v.speed_kmh > 18 && v.status === 'ON_ROUTE'
    );
    const features = movingVehicles.map((v) => {
      const length = (v.speed_kmh / 100) * 0.0035;
      return {
        type: 'Feature' as const,
        properties: { vehicle_id: v.id, speed: v.speed_kmh },
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [v.location.lng - length * 0.45, v.location.lat - length * 0.28],
            [v.location.lng, v.location.lat]
          ]
        }
      };
    });

    (map.getSource('swarm-trails-source') as maplibregl.GeoJSONSource).setData({
      type: 'FeatureCollection',
      features
    });
  }, [vehicles, layers.swarmTrails]);

  // Update Drawn Hazard Geofence Polygon on Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getSource('hazard-draw-source')) return;

    // Remove old vertex handles
    hazardVertexMarkersRef.current.forEach((m) => m.remove());
    hazardVertexMarkersRef.current = [];

    if (hazardPolygonPoints.length === 0) {
      (map.getSource('hazard-draw-source') as maplibregl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: []
      });
      return;
    }

    // Add visual vertex handles on map
    hazardPolygonPoints.forEach((pt, idx) => {
      const el = document.createElement('div');
      el.className = 'hazard-vertex-handle';
      el.title = `Vertex ${idx + 1}`;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(pt)
        .addTo(map);
      hazardVertexMarkersRef.current.push(marker);
    });

    if (hazardPolygonPoints.length >= 3) {
      // Complete polygon
      const closedCoords = [...hazardPolygonPoints, hazardPolygonPoints[0]];
      (map.getSource('hazard-draw-source') as maplibregl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [closedCoords]
            }
          }
        ]
      });
    } else if (hazardPolygonPoints.length === 2) {
      // In-progress LineString
      (map.getSource('hazard-draw-source') as maplibregl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: hazardPolygonPoints
            }
          }
        ]
      });
    }
  }, [hazardPolygonPoints]);

  // Update AI Route Comparison Layer (Broken route vs AI Optimized Handover route)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getSource('comparison-source')) return;

    const features: any[] = [];

    // 1. Broken Vehicle Original Route
    if (brokenVehicle) {
      const brokenRoute = routes.find((r) => r.vehicle_id === brokenVehicle.id || r.id === brokenVehicle.current_route_id);
      if (brokenRoute && brokenRoute.waypoints.length > 0) {
        features.push({
          type: 'Feature',
          properties: { type: 'broken', label: 'Original Broken Corridor' },
          geometry: {
            type: 'LineString',
            coordinates: brokenRoute.waypoints.map((w) => [w.lng, w.lat])
          }
        });
      }
    }

    // 2. Allotted / Reassigned Replacement Route
    if (allottedVehicle) {
      const allottedRoute = routes.find((r) => r.vehicle_id === allottedVehicle.id || r.id === allottedVehicle.current_route_id);
      if (allottedRoute && allottedRoute.waypoints.length > 0) {
        features.push({
          type: 'Feature',
          properties: { type: 'ai_optimized', label: 'AI Optimized Replacement Path' },
          geometry: {
            type: 'LineString',
            coordinates: allottedRoute.waypoints.map((w) => [w.lng, w.lat])
          }
        });
      }
    }

    (map.getSource('comparison-source') as maplibregl.GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: features
    });
  }, [brokenVehicle, allottedVehicle, routes]);

  // Update Route Polylines
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getSource('routes-source')) return;

    const features = routes
      .filter((r) => r && r.waypoints && r.waypoints.length > 0)
      .map((r) => {
        const isReassigned = (r.id && r.id.includes('REASSIGN')) || r.vehicle_id === allottedVehicle?.id;
        const isAffected = activeIncident?.affected_vehicle_ids?.includes(r.vehicle_id) || r.vehicle_id === brokenVehicle?.id;
        const congestion = Math.max(r.traffic_multiplier || 1, r.weather_multiplier || 1);

        let color = r.color || '#10B981';
        if (isAffected) color = '#EF4444';
        else if (isReassigned) color = '#D946EF';
        else if (congestion >= 2.0) color = '#F97316';
        else if (congestion >= 1.5) color = '#F59E0B';

        const coordinates = r.waypoints
          .filter((w) => w && typeof w.lng === 'number' && typeof w.lat === 'number')
          .map((w) => [w.lng, w.lat]);

        return {
          type: 'Feature' as const,
          properties: {
            id: r.id,
            vehicle_id: r.vehicle_id,
            color: color,
            congestion: congestion
          },
          geometry: {
            type: 'LineString' as const,
            coordinates: coordinates
          }
        };
      });

    const source = map.getSource('routes-source') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: features
      });
    }
  }, [routes, activeIncident, brokenVehicle, allottedVehicle]);

  // Update Handover Connection Arc
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getSource('handover-source')) return;

    const handoverSource = map.getSource('handover-source') as maplibregl.GeoJSONSource;
    if (!handoverSource) return;

    if (
      brokenVehicle &&
      allottedVehicle &&
      brokenVehicle.location &&
      allottedVehicle.location &&
      typeof brokenVehicle.location.lng === 'number' &&
      typeof allottedVehicle.location.lng === 'number'
    ) {
      const start = [allottedVehicle.location.lng, allottedVehicle.location.lat];
      const end = [brokenVehicle.location.lng, brokenVehicle.location.lat];

      const midLng = (start[0] + end[0]) / 2 + (start[1] - end[1]) * 0.25;
      const midLat = (start[1] + end[1]) / 2 + (end[0] - start[0]) * 0.25;

      const curvePoints: number[][] = [];
      const numSteps = 20;
      for (let i = 0; i <= numSteps; i++) {
        const t = i / numSteps;
        const lng = (1 - t) * (1 - t) * start[0] + 2 * (1 - t) * t * midLng + t * t * end[0];
        const lat = (1 - t) * (1 - t) * start[1] + 2 * (1 - t) * t * midLat + t * t * end[1];
        curvePoints.push([lng, lat]);
      }

      handoverSource.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: curvePoints
            }
          }
        ]
      });
    } else {
      handoverSource.setData({
        type: 'FeatureCollection',
        features: []
      });
    }
  }, [brokenVehicle, allottedVehicle]);

  // Interactive Draggable Waypoint Handles (when vehicle is selected)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing draggable waypoint handles
    waypointDragMarkersRef.current.forEach((m) => m.remove());
    waypointDragMarkersRef.current = [];

    if (!selectedVehicleId) return;

    const selVehicle = vehicles.find((v) => v.id === selectedVehicleId);
    const activeRoute = routes.find((r) => r.vehicle_id === selectedVehicleId || r.id === selVehicle?.current_route_id);

    if (!activeRoute || !activeRoute.waypoints || activeRoute.waypoints.length < 2) return;

    const pts = activeRoute.waypoints;
    // Pick 4 key editable control waypoints along the polyline
    const sampleIndices = [
      0,
      Math.floor(pts.length * 0.33),
      Math.floor(pts.length * 0.66),
      pts.length - 1
    ];

    const currentWaypoints = [...pts];

    sampleIndices.forEach((idx, pinNumber) => {
      const wp = pts[idx];
      if (!wp) return;

      const el = document.createElement('div');
      el.className = `waypoint-drag-pin ${pinNumber === 0 ? 'waypoint-drag-pin-origin' : pinNumber === sampleIndices.length - 1 ? 'waypoint-drag-pin-dest' : ''}`;
      el.title = `Drag Waypoint ${pinNumber + 1}`;

      const marker = new maplibregl.Marker({
        element: el,
        draggable: true
      })
        .setLngLat([wp.lng, wp.lat])
        .addTo(map);

      marker.on('dragend', async () => {
        const newPos = marker.getLngLat();
        currentWaypoints[idx] = { ...currentWaypoints[idx], lat: newPos.lat, lng: newPos.lng };

        // Smoothly interpolate surrounding waypoints
        const updatedWaypointsList = currentWaypoints.map((w, i) => ({
          lat: w.lat,
          lng: w.lng,
          segment_name: `Point-${i + 1}`
        }));

        try {
          const dest = currentWaypoints[currentWaypoints.length - 1];
          await modifyVehicleRoute(selectedVehicleId, {
            destination_lat: dest.lat,
            destination_lng: dest.lng,
            destination_name: `Custom Bent Route (${selectedVehicleId})`,
            waypoints: updatedWaypointsList
          });
          setRerouteSuccessToast(`Route dynamically bent for ${selectedVehicleId}!`);
          setTimeout(() => setRerouteSuccessToast(null), 3000);
        } catch (err) {
          console.error('Failed to update dragged waypoint route:', err);
        }
      });

      waypointDragMarkersRef.current.push(marker);
    });
  }, [selectedVehicleId, routes, vehicles]);

  // Render Mappls EV High-Power Charging Station Pins
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing charger markers
    chargerMarkersRef.current.forEach((m) => m.remove());
    chargerMarkersRef.current = [];

    if (!layers.evChargers) return;

    // Determine city key based on center or default sf
    let cityKey = 'sf';
    if (cityCenter) {
      if (Math.abs(cityCenter.lat - 40.7128) < 1.0) cityKey = 'nyc';
      else if (Math.abs(cityCenter.lat - 51.5074) < 1.0) cityKey = 'london';
      else if (Math.abs(cityCenter.lat - 35.6762) < 1.0) cityKey = 'tokyo';
      else if (Math.abs(cityCenter.lat - 52.5200) < 1.0) cityKey = 'berlin';
    }

    const stations = CITY_CHARGERS[cityKey] || CITY_CHARGERS.sf;

    stations.forEach((st) => {
      const el = document.createElement('div');
      el.className = 'flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-950/90 border border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.35)] cursor-pointer text-amber-300 font-mono text-[10px] font-bold hover:scale-110 transition-transform';
      el.innerHTML = `
        <span class="animate-pulse text-amber-400">⚡</span>
        <span>${st.power_kw}kW</span>
        <span class="px-1 py-0.2 rounded bg-amber-500/20 text-[9px] text-amber-200">${st.ports_available}/${st.ports_total}</span>
      `;
      el.title = `${st.name} (${st.power_kw}kW Supercharger)`;

      const popupHtml = `
        <div style="min-width:220px;padding:4px;font-family:sans-serif;color:#F8FAFC;">
          <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #334155;padding-bottom:6px;">
            <span style="font-weight:800;font-size:12px;color:#FDE68A;">⚡ ${st.name}</span>
          </div>
          <div style="font-size:10px;color:#94A3B8;margin-top:4px;">${st.network}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-family:monospace;font-size:10px;padding-top:6px;">
            <div>Power: <span style="color:#FBBF24;font-weight:700;">${st.power_kw} kW</span></div>
            <div>Free: <span style="color:#34D399;font-weight:700;">${st.ports_available}/${st.ports_total} Bays</span></div>
            <div>Tariff: <span style="color:#38BDF8;">$${st.price_per_kwh}/kWh</span></div>
            <div>Plugs: <span style="color:#E2E8F0;">${st.plugs.join(', ')}</span></div>
          </div>
        </div>
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([st.lng, st.lat])
        .setPopup(new maplibregl.Popup({ offset: 14 }).setHTML(popupHtml))
        .addTo(map);

      chargerMarkersRef.current.push(marker);
    });
  }, [cityCenter, layers.evChargers]);

  // Render Mappls Dynamic Distance-to-Empty (DTE) Battery Range Isochrone
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getSource('ev-range-source')) return;

    const source = map.getSource('ev-range-source') as maplibregl.GeoJSONSource;
    if (!source) return;

    if (!layers.evRangeIsochrone || !selectedVehicle || !selectedVehicle.location) {
      source.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    const isochroneGeoJSON = generateRangeIsochroneGeoJSON(
      selectedVehicle.location.lat,
      selectedVehicle.location.lng,
      selectedVehicle.battery_fuel_percent
    );

    source.setData({
      type: 'FeatureCollection',
      features: [isochroneGeoJSON]
    });
  }, [selectedVehicle, layers.evRangeIsochrone]);

  // Update Vehicle Markers (DOM & Heading direction)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const filtered = vehicles.filter((v) => {
      if (!v || !v.location || typeof v.location.lng !== 'number' || typeof v.location.lat !== 'number') return false;
      if (filterStatus === 'ALL') return true;
      if (filterStatus === 'ON_ROUTE') return v.status === 'ON_ROUTE';
      if (filterStatus === 'AT_RISK') return v.status === 'AT_RISK' || v.fault_details !== null;
      if (filterStatus === 'REASSIGNED') return v.status === 'REASSIGNED';
      if (filterStatus === 'AVAILABLE') return v.status === 'AVAILABLE';
      if (filterStatus === 'MAINTENANCE') return v.status === 'MAINTENANCE';
      return true;
    });

    const currentIds = new Set(filtered.map((v) => v.id));

    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
        markerAnimRef.current.delete(id);
      }
    });

    const allottedId = allottedVehicle?.id;

    filtered.forEach((v) => {
      if (!v.location || typeof v.location.lng !== 'number' || typeof v.location.lat !== 'number') return;
      const { vDisplay, pillClass, statusLabel, statusKey } = computeVehicleVisual(v, allottedId);
      const isMoving = (v.status === 'ON_ROUTE' || v.status === 'REASSIGNED') && v.speed_kmh > 0.5;
      const isSelected = selectedVehicleId === v.id;

      const marker = markersRef.current.get(v.id);

      if (!marker) {
        const wrapper = document.createElement('div');
        wrapper.className = 'fleet-marker';
        if (layersRef.current.heatmap) wrapper.style.display = 'none';
        if (isClusteredRef.current) wrapper.classList.add('marker-hidden');

        const pill = document.createElement('div');
        pill.className = `fleet-marker-pill ${pillClass}${isSelected ? ' is-selected' : ''}`;
        pill.innerHTML = `<span>${vDisplay}${statusLabel}</span>${VEHICLE_ICON_SVG}`;
        pill.addEventListener('click', (ev) => {
          ev.stopPropagation();
          onSelectVehicleRef.current(v.id);
          setManualVehicleId(v.id);
        });

        const rotor = document.createElement('div');
        rotor.className = 'fleet-marker-rotor';
        const arrow = document.createElement('div');
        arrow.className = `fleet-marker-arrow${isMoving ? '' : ' arrow-hidden'}`;
        arrow.innerHTML = ARROW_SVG;
        rotor.appendChild(arrow);

        wrapper.appendChild(pill);
        wrapper.appendChild(rotor);

        const newMarker = new maplibregl.Marker({ element: wrapper })
          .setLngLat([v.location.lng, v.location.lat])
          .setPopup(new maplibregl.Popup({ offset: 18 }).setHTML(buildPopupHTML(v)))
          .addTo(map);

        markersRef.current.set(v.id, newMarker);
        markerAnimRef.current.set(v.id, {
          curLng: v.location.lng,
          curLat: v.location.lat,
          tgtLng: v.location.lng,
          tgtLat: v.location.lat,
          heading: 0,
          moving: isMoving,
          statusKey,
          rotorEl: rotor,
          arrowEl: arrow,
          pillEl: pill
        });
      } else {
        const st = markerAnimRef.current.get(v.id);
        if (st && v.location) {
          st.tgtLng = v.location.lng;
          st.tgtLat = v.location.lat;
          st.moving = isMoving;
          if (st.statusKey !== statusKey) {
            st.statusKey = statusKey;
            if (st.pillEl) {
              st.pillEl.className = `fleet-marker-pill ${pillClass}${isSelected ? ' is-selected' : ''}`;
              st.pillEl.innerHTML = `<span>${vDisplay}${statusLabel}</span>${VEHICLE_ICON_SVG}`;
            }
          } else if (st.pillEl) {
            st.pillEl.classList.toggle('is-selected', isSelected);
          }
        }
      }
    });
  }, [vehicles, filterStatus, selectedVehicleId, allottedVehicle]);

  // Handle Injecting the Drawn Hazard Geofence
  const handleConfirmHazardDisruption = async () => {
    if (hazardPolygonPoints.length < 3) {
      alert('Please click at least 3 points on the map to define a geofence hazard.');
      return;
    }
    setIsInjectingHazard(true);
    try {
      await injectDisruption({
        type: 'GEOFENCE',
        polygon_coords: hazardPolygonPoints,
        hazard_name: hazardType
      });
      setRerouteSuccessToast(`Hazard Geofence Active: Multi-Agent Swarm Detouring Traffic!`);
      setTimeout(() => setRerouteSuccessToast(null), 4000);
      setIsDrawingHazard(false);
      setHazardPolygonPoints([]);
    } catch (err: any) {
      console.error('Failed to inject hazard:', err);
      alert('Error injecting geofence hazard.');
    } finally {
      setIsInjectingHazard(false);
    }
  };

  // Toggle Layer Visibility
  const toggleLayer = (layer: keyof LayerState) => {
    setLayers((prev) => {
      const next = { ...prev, [layer]: !prev[layer] };
      const map = mapRef.current;
      if (map && map.isStyleLoaded()) {
        if (layer === 'routes') {
          const vis = next.routes ? 'visible' : 'none';
          if (map.getLayer('routes-line')) map.setLayoutProperty('routes-line', 'visibility', vis);
          if (map.getLayer('routes-glow')) map.setLayoutProperty('routes-glow', 'visibility', vis);
          if (map.getLayer('routes-flow')) map.setLayoutProperty('routes-flow', 'visibility', vis);
        } else if (layer === 'trafficHeatmap') {
          const vis = next.trafficHeatmap ? 'visible' : 'none';
          if (map.getLayer('traffic-corridors-line')) map.setLayoutProperty('traffic-corridors-line', 'visibility', vis);
          if (map.getLayer('traffic-corridors-glow')) map.setLayoutProperty('traffic-corridors-glow', 'visibility', vis);
        } else if (layer === 'convoyMesh') {
          const vis = next.convoyMesh ? 'visible' : 'none';
          if (map.getLayer('convoy-mesh-line')) map.setLayoutProperty('convoy-mesh-line', 'visibility', vis);
          if (map.getLayer('convoy-mesh-glow')) map.setLayoutProperty('convoy-mesh-glow', 'visibility', vis);
        } else if (layer === 'swarmTrails') {
          const vis = next.swarmTrails ? 'visible' : 'none';
          if (map.getLayer('swarm-trails-line')) map.setLayoutProperty('swarm-trails-line', 'visibility', vis);
          if (map.getLayer('swarm-trails-glow')) map.setLayoutProperty('swarm-trails-glow', 'visibility', vis);
        } else if (layer === 'heatmap') {
          const vis = next.heatmap ? 'visible' : 'none';
          if (map.getLayer('vehicles-heat-layer')) map.setLayoutProperty('vehicles-heat-layer', 'visibility', vis);
          markersRef.current.forEach((marker) => {
            marker.getElement().style.display = next.heatmap ? 'none' : '';
          });
        }
      }
      return next;
    });
  };

  // Switch Map View Mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (map.getLayer('satellite-layer')) {
      map.setLayoutProperty('satellite-layer', 'visibility', mapStyle === 'satellite' ? 'visible' : 'none');
    }

    if (mapStyle === '3d') {
      map.easeTo({ pitch: PITCH_3D, bearing: -18, duration: 800 });
    } else {
      map.easeTo({ pitch: PITCH_FLAT, bearing: 0, duration: 800 });
    }
  }, [mapStyle]);

  // Recenter Map
  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [-122.4180, 37.7760],
        zoom: 12.8,
        pitch: mapStyle === '3d' ? PITCH_3D : PITCH_FLAT,
        bearing: mapStyle === '3d' ? -18 : 0,
        duration: 900
      });
    }
  };

  // Focus Handover Corridor
  const handleFocusHandover = () => {
    if (
      !mapRef.current ||
      !brokenVehicle?.location ||
      typeof brokenVehicle.location.lng !== 'number' ||
      !allottedVehicle?.location ||
      typeof allottedVehicle.location.lng !== 'number'
    ) return;
    const bounds = new maplibregl.LngLatBounds();
    bounds.extend([brokenVehicle.location.lng, brokenVehicle.location.lat]);
    bounds.extend([allottedVehicle.location.lng, allottedVehicle.location.lat]);
    mapRef.current.fitBounds(bounds, { padding: 90, duration: 1100, maxZoom: 15.5 });
  };

  // Focus Armored Convoy Link
  const handleFocusConvoy = () => {
    if (!mapRef.current) return;
    const vLead = vehicles.find((v) => v.id === 'V481');
    const vVault = vehicles.find((v) => v.id === 'V517');
    const vEscort = vehicles.find((v) => v.id === 'V109');
    if (
      vLead?.location &&
      typeof vLead.location.lng === 'number' &&
      vVault?.location &&
      typeof vVault.location.lng === 'number' &&
      vEscort?.location &&
      typeof vEscort.location.lng === 'number'
    ) {
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([vLead.location.lng, vLead.location.lat]);
      bounds.extend([vVault.location.lng, vVault.location.lat]);
      bounds.extend([vEscort.location.lng, vEscort.location.lat]);
      mapRef.current.fitBounds(bounds, { padding: 120, duration: 1200, maxZoom: 16 });
    } else {
      mapRef.current.flyTo({ center: [-122.4180, 37.7760], zoom: 14.5, duration: 1000 });
    }
  };

  // Focus Incident Zone
  const handleFocusIncident = () => {
    if (!mapRef.current) return;
    if (activeIncident?.location && typeof activeIncident.location.lng === 'number') {
      mapRef.current.flyTo({
        center: [activeIncident.location.lng, activeIncident.location.lat],
        zoom: 15,
        duration: 1000
      });
    } else if (brokenVehicle?.location && typeof brokenVehicle.location.lng === 'number') {
      mapRef.current.flyTo({
        center: [brokenVehicle.location.lng, brokenVehicle.location.lat],
        zoom: 15,
        duration: 1000
      });
    }
  };

  // Focus Central Depot Hub
  const handleFocusDepots = () => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: [-122.4180, 37.7770],
      zoom: 15.5,
      pitch: 45,
      duration: 1000
    });
  };

  const handleApplyManualReroute = async () => {
    if (!manualVehicleId) return;
    const targetHub = DESTINATION_HUBS.find((h) => h.id === manualTargetHub) || DESTINATION_HUBS[0];
    setRerouteLoading(true);
    try {
      await modifyVehicleRoute(manualVehicleId, {
        destination_lat: targetHub.lat,
        destination_lng: targetHub.lng,
        destination_name: targetHub.name,
        zone_id: targetHub.id
      });
      setRerouteSuccessToast(`Vehicle ${manualVehicleId} rerouted to ${targetHub.name}!`);
      setTimeout(() => setRerouteSuccessToast(null), 3000);
    } catch (err: any) {
      console.error('Failed to reroute vehicle:', err);
    } finally {
      setRerouteLoading(false);
    }
  };

  const handleTogglePause = async () => {
    try {
      await toggleSimulationPause();
    } catch (err) {
      console.error('Failed to toggle pause:', err);
    }
  };

  const handleSetSpeed = async (s: number) => {
    try {
      await setSimulationSpeed(s);
    } catch (err) {
      console.error('Failed to set speed:', err);
    }
  };

  // Live Fleet Spatial Aggregations
  const onRouteCount = vehicles.filter((v) => v.status === 'ON_ROUTE').length;
  const atRiskCount = vehicles.filter((v) => v.status === 'AT_RISK' || v.fault_details).length;
  const avgSpeed = vehicles.length > 0
    ? (vehicles.reduce((acc, v) => acc + (v.speed_kmh || 0), 0) / vehicles.length).toFixed(1)
    : '0.0';
  const avgBattery = vehicles.length > 0
    ? (vehicles.reduce((acc, v) => acc + (v.battery_fuel_percent || 0), 0) / vehicles.length).toFixed(0)
    : '0';

  return (
    <div className={`relative w-full h-full rounded-2xl overflow-hidden border border-[#1E293B] shadow-2xl bg-[#080C14] ${isDrawingHazard ? 'cursor-crosshair' : ''}`}>
      {/* MapLibre Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Live Fleet Telemetry HUD Ribbon (Top Right) */}
      <div className="absolute top-3 right-3 z-20 hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#090D18]/90 border border-slate-700/80 backdrop-blur-md shadow-2xl text-[11px] font-mono select-none">
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
          <Truck className="w-3.5 h-3.5 text-emerald-400" />
          <span><strong>{onRouteCount}</strong> / {vehicles.length} Active</span>
          {atRiskCount > 0 && (
            <span className="px-1.5 py-0.2 rounded bg-rose-500/30 text-rose-300 font-bold border border-rose-500/50 animate-pulse ml-1">
              ⚠️ {atRiskCount} Fault
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>Avg: <strong className="text-white">{avgSpeed}</strong> km/h</span>
        </div>

        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-300">
          <BatteryCharging className="w-3.5 h-3.5 text-sky-400" />
          <span>SoH: <strong className="text-white">{avgBattery}%</strong></span>
        </div>

        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 hidden xl:flex">
          <CloudLightning className="w-3.5 h-3.5 text-purple-400" />
          <span>{weather?.condition || 'Clear'} ({weather?.temperature_c || 21}°C)</span>
        </div>
      </div>

      {/* Top Left: View Modes, Layers & Advanced Tool Toggles */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 items-start">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="segmented" role="tablist" aria-label="Map view mode">
            <button role="tab" aria-selected={mapStyle === 'map'} className={mapStyle === 'map' ? 'is-active' : ''} onClick={() => setMapStyle('map')}>Map</button>
            <button role="tab" aria-selected={mapStyle === 'satellite'} className={mapStyle === 'satellite' ? 'is-active' : ''} onClick={() => setMapStyle('satellite')}>Satellite</button>
            <button role="tab" aria-selected={mapStyle === '3d'} className={mapStyle === '3d' ? 'is-active' : ''} onClick={() => setMapStyle('3d')}>3D</button>
          </div>

          {/* Traffic Heatmap Toggle */}
          <button
            onClick={() => toggleLayer('trafficHeatmap')}
            className={`btn btn-sm ${layers.trafficHeatmap ? 'btn-primary' : 'btn-ghost'}`}
            title="Toggle Traffic Congestion Heatmap & Corridors"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Traffic Heatmap</span>
          </button>

          {/* Dedicated Simulator & Disruption Trigger Button */}
          {onOpenConsole && (
            <button
              onClick={() => onOpenConsole('disruptions')}
              className="btn btn-sm flex items-center gap-1.5 font-bold"
              style={{
                background: 'linear-gradient(135deg, rgba(245,158,11,0.22), rgba(239,68,68,0.22))',
                border: '1px solid rgba(245,158,11,0.6)',
                color: '#FDE68A',
                boxShadow: '0 0 16px rgba(245,158,11,0.3)'
              }}
              title="Open Autonomous Simulator to Inject Vehicle Faults, Traffic Congestion & Weather"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse fill-amber-400/40" />
              <span>Inject Chaos (Simulator)</span>
            </button>
          )}

          {/* "Draw to Disrupt" Geofence Tool Toggle */}
          <button
            onClick={() => {
              setIsDrawingHazard(!isDrawingHazard);
              if (isDrawingHazard) setHazardPolygonPoints([]);
            }}
            className="btn btn-sm"
            style={
              isDrawingHazard
                ? { background: '#EF4444', color: '#FFFFFF', borderColor: '#EF4444', boxShadow: '0 0 16px rgba(239,68,68,0.5)' }
                : { background: 'rgba(8,12,20,0.7)', border: '1px solid var(--edge)', color: 'var(--ink-dim)' }
            }
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isDrawingHazard ? 'Drawing Hazard…' : 'Draw Hazard Zone'}</span>
          </button>

          {/* Manual Route Mode Toggle */}
          <button
            onClick={() => setIsManualRouteMode(!isManualRouteMode)}
            className="btn btn-sm"
            style={
              isManualRouteMode
                ? { background: 'var(--violet)', color: '#0B0616', borderColor: 'var(--violet)', boxShadow: '0 0 16px rgba(139,92,246,0.45)' }
                : { background: 'rgba(8,12,20,0.7)', border: '1px solid var(--edge)', color: 'var(--ink-dim)' }
            }
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>{isManualRouteMode ? 'Routing: ON' : 'Manual Route'}</span>
          </button>
        </div>

        {/* Layer toggle chips */}
        <div className="flex items-center gap-1.5 flex-wrap max-w-[500px]">
          {([
            { key: 'routes', label: 'Routes' },
            { key: 'traffic', label: 'Congestion Lines' },
            { key: 'heatmap', label: 'Fleet Density' }
          ] as Array<{ key: keyof LayerState; label: string }>).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => toggleLayer(key)}
              className={`chip-toggle ${layers[key] ? 'is-on' : ''}`}
            >
              <span className="chip-dot" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Right: Vehicle Filter & Fullscreen */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        <div
          className="flex items-center gap-1 rounded-lg px-2.5 py-1"
          style={{ background: 'rgba(8,12,20,0.7)', border: '1px solid var(--edge)', backdropFilter: 'blur(10px)' }}
        >
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label="Filter vehicles by status"
            className="bg-transparent text-[11px] font-semibold focus:outline-none pr-1 py-0.5 cursor-pointer"
            style={{ color: 'var(--ink-dim)', fontFamily: 'var(--font-ui)' }}
          >
            <option value="ALL" style={{ background: '#0C121E' }}>All Vehicles</option>
            <option value="ON_ROUTE" style={{ background: '#0C121E' }}>On Route</option>
            <option value="AT_RISK" style={{ background: '#0C121E' }}>At Risk / Broken</option>
            <option value="REASSIGNED" style={{ background: '#0C121E' }}>Reassigned</option>
            <option value="AVAILABLE" style={{ background: '#0C121E' }}>Available</option>
            <option value="MAINTENANCE" style={{ background: '#0C121E' }}>Maintenance</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--ink-faint)' }} />
        </div>

        <button
          onClick={() => {
            if (!mapContainerRef.current) return;
            if (!document.fullscreenElement) {
              mapContainerRef.current.requestFullscreen?.();
              setIsFullscreen(true);
            } else {
              document.exitFullscreen?.();
              setIsFullscreen(false);
            }
          }}
          className="p-1.5 rounded-lg transition-colors"
          style={{ background: 'rgba(8,12,20,0.7)', border: '1px solid var(--edge)', color: 'var(--ink-dim)', backdropFilter: 'blur(10px)' }}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Floating Map Overlays & 3D Tilt Controller Drawer */}
      <MapLayersDrawer
        layers={layers}
        onToggleLayer={toggleLayer}
        mapStyle={mapStyle}
        onSetMapStyle={setMapStyle}
        onFocusConvoy={handleFocusConvoy}
        onFocusIncident={handleFocusIncident}
        onFocusDepots={handleFocusDepots}
      />

      {/* "Draw to Disrupt" Floating Canvas Control Bar */}
      {isDrawingHazard && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 rounded-xl px-4 py-3 bg-[#0E131F]/95 border border-rose-500/70 shadow-2xl backdrop-blur-md animate-fadeIn">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Drawing Geofence Hazard
            </span>
          </div>

          <span className="text-xs font-mono text-cyan-300">
            Vertices: {hazardPolygonPoints.length} (min 3)
          </span>

          <select
            value={hazardType}
            onChange={(e) => setHazardType(e.target.value)}
            className="rounded-lg bg-slate-900 border border-slate-700 px-2 py-1 text-xs text-white"
          >
            <option value="Construction & Road Closure">🚧 Construction & Lane Closure</option>
            <option value="Multi-Vehicle Accident Zone">💥 Multi-Vehicle Collision</option>
            <option value="Emergency Police Blockade">🚨 Emergency Police Blockade</option>
            <option value="Extreme Flooding & Weather Hazard">🌊 Flash Flood / Road Outage</option>
          </select>

          <button
            disabled={hazardPolygonPoints.length < 3 || isInjectingHazard}
            onClick={handleConfirmHazardDisruption}
            className="btn btn-sm btn-primary"
            style={{ background: '#EF4444', color: '#FFF' }}
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isInjectingHazard ? 'Injecting…' : 'Confirm & Reroute'}</span>
          </button>

          <button
            onClick={() => setHazardPolygonPoints([])}
            className="btn btn-sm btn-ghost"
            title="Reset polygon vertices"
          >
            Reset
          </button>

          <button
            onClick={() => {
              setIsDrawingHazard(false);
              setHazardPolygonPoints([]);
            }}
            className="p-1 rounded-md text-slate-400 hover:text-white"
            title="Cancel drawing"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* AI Route Comparison Overlay & Delta HUD Card */}
      {(brokenVehicle && allottedVehicle && showAiComparisonHUD) && (
        <div className="absolute top-20 right-3 z-20 w-80 rounded-xl p-3 ai-delta-badge space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-fuchsia-400 animate-pulse" />
              <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                AI Handover Comparison
              </span>
            </div>
            <button
              onClick={() => setShowAiComparisonHUD(false)}
              className="text-slate-400 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1.5 text-[10px]">
            <div className="flex items-center justify-between bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">⏱️ ETA Saved vs Breakdown</span>
              <span className="font-bold text-emerald-400 font-mono">+14.2 min</span>
            </div>
            <div className="flex items-center justify-between bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">⛽ Energy / Fuel Saved</span>
              <span className="font-bold text-cyan-300 font-mono">-14.8%</span>
            </div>
            <div className="flex items-center justify-between bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">🎯 SLA Target Preservation</span>
              <span className="font-bold text-fuchsia-300 font-mono">100% Secure</span>
            </div>
          </div>

          <button
            onClick={handleFocusHandover}
            className="w-full py-1.5 px-2 rounded-lg bg-fuchsia-500/20 hover:bg-fuchsia-500/30 border border-fuchsia-500/40 text-fuchsia-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Focus Handover Corridor</span>
          </button>
        </div>
      )}

      {/* Draggable Waypoint Instruction Toast */}
      {selectedVehicleId && selectedRoute && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full px-3 py-1 bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[10.5px] font-semibold backdrop-blur-md shadow-lg">
          <Navigation className="w-3 h-3 text-cyan-400" />
          <span>Drag glowing waypoint pins on map to manually bend {selectedVehicleId}'s route</span>
        </div>
      )}

      {/* Manual Route Mode Toolbar */}
      {isManualRouteMode && (
        <div
          className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs"
          style={{
            background: 'rgba(9,13,22,0.92)',
            border: '1px solid color-mix(in srgb, var(--violet) 50%, transparent)',
            backdropFilter: 'blur(12px)',
            boxShadow: 'var(--shadow-pop)'
          }}
        >
          <span className="flex items-center gap-1.5">
            <Navigation className="w-4 h-4" style={{ color: 'var(--violet)' }} />
            <span className="eyebrow" style={{ color: 'var(--violet)' }}>Reroute</span>
          </span>

          <select
            value={manualVehicleId}
            onChange={(e) => setManualVehicleId(e.target.value)}
            aria-label="Vehicle to reroute"
            className="rounded-lg px-2.5 py-1 font-bold focus:outline-none"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)', background: 'var(--panel-solid)', border: '1px solid var(--edge)' }}
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id} style={{ background: '#0C121E' }}>
                {v.id} — {v.model} ({v.status})
              </option>
            ))}
          </select>

          <span style={{ color: 'var(--ink-faint)' }}>→</span>

          <select
            value={manualTargetHub}
            onChange={(e) => setManualTargetHub(e.target.value)}
            aria-label="Destination hub"
            className="rounded-lg px-2.5 py-1 font-semibold focus:outline-none"
            style={{ fontFamily: 'var(--font-ui)', color: 'var(--ink)', background: 'var(--panel-solid)', border: '1px solid var(--edge)' }}
          >
            {DESTINATION_HUBS.map((h) => (
              <option key={h.id} value={h.id} style={{ background: '#0C121E' }}>
                {h.name}
              </option>
            ))}
          </select>

          <button
            disabled={rerouteLoading}
            onClick={handleApplyManualReroute}
            className="btn btn-sm"
            style={{
              color: '#FFFFFF',
              background: rerouteLoading ? 'color-mix(in srgb, var(--violet) 55%, transparent)' : 'var(--violet)',
              border: '1px solid color-mix(in srgb, var(--violet) 70%, transparent)',
              cursor: rerouteLoading ? 'wait' : 'pointer'
            }}
          >
            {rerouteLoading ? 'Rerouting…' : 'Apply Reroute'}
          </button>

          <span
            className="text-[10px] pl-2"
            style={{ color: 'var(--ink-faint)', borderLeft: '1px solid var(--edge)' }}
          >
            or click the map
          </span>
        </div>
      )}

      {/* Success Toast */}
      {rerouteSuccessToast && (
        <div
          className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold animate-bounce-subtle"
          style={{
            color: 'var(--signal)',
            background: 'color-mix(in srgb, var(--signal) 14%, rgba(9,13,22,0.92))',
            border: '1px solid color-mix(in srgb, var(--signal) 45%, transparent)',
            backdropFilter: 'blur(12px)',
            boxShadow: 'var(--shadow-pop)'
          }}
        >
          <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--signal)' }} />
          <span>{rerouteSuccessToast}</span>
        </div>
      )}

      {/* Recenter & Zoom Controls */}
      <div
        className="absolute bottom-20 right-3 z-10 flex flex-col rounded-lg overflow-hidden shadow-lg"
        style={{ background: 'rgba(8,12,20,0.72)', border: '1px solid var(--edge)', backdropFilter: 'blur(10px)' }}
      >
        <button
          onClick={handleRecenter}
          className="p-1.5 transition-colors hover:bg-[rgba(148,163,184,0.1)]"
          style={{ color: 'var(--ink-dim)' }}
          title="Recenter view"
        >
          <LocateFixed className="w-4 h-4" />
        </button>
        <div style={{ height: 1, background: 'var(--edge)' }} />
        <button
          onClick={() => mapRef.current?.zoomIn()}
          className="p-1.5 transition-colors hover:bg-[rgba(148,163,184,0.1)]"
          style={{ color: 'var(--ink-dim)' }}
          title="Zoom in"
        >
          <Plus className="w-4 h-4" />
        </button>
        <div style={{ height: 1, background: 'var(--edge)' }} />
        <button
          onClick={() => mapRef.current?.zoomOut()}
          className="p-1.5 transition-colors hover:bg-[rgba(148,163,184,0.1)]"
          style={{ color: 'var(--ink-dim)' }}
          title="Zoom out"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* Legend */}
      <div
        className="absolute bottom-3 left-3 z-10 rounded-lg px-3 py-1.5 flex items-center gap-3 text-[10.5px] font-medium"
        style={{ background: 'rgba(8,12,20,0.72)', border: '1px solid var(--edge)', backdropFilter: 'blur(10px)', color: 'var(--ink-dim)' }}
      >
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--signal)' }} />
          <span>On Route</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--crit)' }} />
          <span>At Risk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--violet)', boxShadow: '0 0 6px var(--violet)' }} />
          <span>Allotted</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--ion)' }} />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--ink-mute)' }} />
          <span>Maintenance</span>
        </div>
      </div>

      {/* Selected Vehicle Cybernetic Telemetry Dock */}
      {selectedVehicle && (
        <div className="absolute top-14 left-3 z-20 w-80 rounded-2xl bg-[#090D18]/95 border border-cyan-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.85)] p-3.5 backdrop-blur-xl space-y-3 transition-all animate-fadeIn font-mono">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                {selectedVehicle.type === 'DRONE' ? (
                  <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                ) : (
                  <Truck className="w-4 h-4 text-cyan-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black text-white">{selectedVehicle.id}</span>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      selectedVehicle.status === 'AT_RISK'
                        ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50 animate-pulse'
                        : selectedVehicle.status === 'REASSIGNED'
                        ? 'bg-violet-500/25 text-violet-300 border border-violet-500/50'
                        : 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50'
                    }`}
                  >
                    {selectedVehicle.status}
                  </span>
                </div>
                <div className="text-[10.5px] text-slate-400 truncate max-w-[170px] font-sans">
                  {selectedVehicle.model} • {selectedVehicle.license_plate || '7SFX000'}
                </div>
              </div>
            </div>

            <button
              onClick={() => onSelectVehicle(null)}
              className="w-6 h-6 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors flex items-center justify-center text-xs font-bold"
              title="Deselect vehicle"
            >
              ✕
            </button>
          </div>

          {/* Speedometer & Battery Radar Dials */}
          <div className="grid grid-cols-2 gap-2">
            {/* Speedometer Card */}
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/90 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-[9.5px]">
                <span>SPEEDOMETER</span>
                <Gauge className="w-3 h-3 text-cyan-400" />
              </div>
              <div className="my-1 text-center">
                <div className="text-xl font-black text-white leading-none">
                  {selectedVehicle.speed_kmh.toFixed(1)}
                  <span className="text-[10px] text-slate-400 font-normal ml-1">km/h</span>
                </div>
              </div>
              {/* Speed Bar */}
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (selectedVehicle.speed_kmh / 90) * 100)}%` }}
                />
              </div>
            </div>

            {/* Battery / Range Card */}
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/90 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-[9.5px]">
                <span>BATTERY / RANGE</span>
                <BatteryCharging className="w-3 h-3 text-emerald-400" />
              </div>
              <div className="my-1 text-center">
                <div className="text-xl font-black text-emerald-300 leading-none">
                  {selectedVehicle.battery_fuel_percent.toFixed(0)}%
                  <span className="text-[10px] text-slate-400 font-normal ml-1">
                    (~{(selectedVehicle.battery_fuel_percent * 3.2).toFixed(0)} km)
                  </span>
                </div>
              </div>
              {/* Battery Bar */}
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    selectedVehicle.battery_fuel_percent < 25
                      ? 'bg-rose-500'
                      : selectedVehicle.battery_fuel_percent < 50
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                  style={{ width: `${selectedVehicle.battery_fuel_percent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Telemetry Details Grid */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/70">
              <div className="text-slate-500 text-[8.5px] uppercase">Cargo Payload</div>
              <div className="text-slate-200 font-bold">
                {selectedVehicle.current_load_kg} / {selectedVehicle.max_capacity_kg} kg
              </div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/70">
              <div className="text-slate-500 text-[8.5px] uppercase">Driver DMS Safety</div>
              <div className="text-cyan-300 font-bold">
                {selectedVehicle.telemetry_health === 'NOMINAL' ? '98.5 Score (Nominal)' : '⚠️ Warning Alert'}
              </div>
            </div>
            {selectedVehicle.cargo_temp_c !== undefined && selectedVehicle.cargo_temp_c !== null && (
              <div className="col-span-2 p-2 rounded-lg bg-sky-950/40 border border-sky-500/40 flex items-center justify-between text-sky-200">
                <span className="text-[9.5px]">❄️ ULT Cryo Cargo Temp:</span>
                <span className="font-bold font-mono">{selectedVehicle.cargo_temp_c.toFixed(1)}°C (-80°C Target)</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 pt-1">
            <button
              onClick={() => {
                if (selectedVehicle?.location && mapRef.current) {
                  mapRef.current.flyTo({
                    center: [selectedVehicle.location.lng, selectedVehicle.location.lat],
                    zoom: 15.5,
                    pitch: 45,
                    duration: 1000
                  });
                }
              }}
              className="flex-1 py-1.5 px-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-[0_0_12px_rgba(6,182,212,0.2)]"
            >
              <LocateFixed className="w-3.5 h-3.5" />
              <span>Chase Camera</span>
            </button>

            <button
              onClick={async () => {
                if (!selectedVehicle?.location) return;
                let cityKey = 'sf';
                if (cityCenter) {
                  if (Math.abs(cityCenter.lat - 40.7128) < 1.0) cityKey = 'nyc';
                  else if (Math.abs(cityCenter.lat - 51.5074) < 1.0) cityKey = 'london';
                  else if (Math.abs(cityCenter.lat - 35.6762) < 1.0) cityKey = 'tokyo';
                  else if (Math.abs(cityCenter.lat - 52.5200) < 1.0) cityKey = 'berlin';
                }
                const stations = CITY_CHARGERS[cityKey] || CITY_CHARGERS.sf;
                const nearest = stations[0];
                try {
                  await modifyVehicleRoute(selectedVehicle.id, {
                    destination_lat: nearest.lat,
                    destination_lng: nearest.lng,
                    destination_name: `⚡ ${nearest.name} (+14m Fast Charge)`,
                    waypoints: [
                      { lat: selectedVehicle.location.lat, lng: selectedVehicle.location.lng, segment_name: 'Origin' },
                      { lat: nearest.lat, lng: nearest.lng, segment_name: `⚡ Mappls Supercharger (${nearest.power_kw}kW)` }
                    ]
                  });
                  setRerouteSuccessToast(`⚡ En-Route Charge Stop Inserted: ${nearest.name} (+14m to 80% SOC)!`);
                  setTimeout(() => setRerouteSuccessToast(null), 4000);
                } catch (err) {
                  console.error('Failed to auto-insert charge stop:', err);
                }
              }}
              className="py-1.5 px-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-[11px] font-bold flex items-center gap-1 transition-all shadow-[0_0_10px_rgba(245,158,11,0.25)]"
              title="Auto-insert optimal en-route EV fast charging stop (Mappls EV SDK)"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Charge Stop</span>
            </button>

            {onOpenConsole && (
              <button
                onClick={() => onOpenConsole('disruptions')}
                className="py-1.5 px-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[11px] font-bold transition-all"
                title="Inject Chaos or Breakdown into this unit"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Playback Simulation Transport Controls */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
        <div
          className="flex items-center gap-3 rounded-xl px-3 py-2"
          style={{ background: 'rgba(9,13,22,0.9)', border: '1px solid var(--edge)', backdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-pop)' }}
        >
          <span className="flex items-center gap-2">
            <span
              className={`status-dot ${isPaused ? 'status-dot--idle' : 'status-dot--active'}`}
              style={isPaused ? undefined : { animation: 'glow-pulse 1.8s infinite' }}
            />
            <span
              className="text-[10px] font-bold tracking-widest"
              style={{ fontFamily: 'var(--font-mono)', color: isPaused ? 'var(--warn)' : 'var(--signal)' }}
            >
              {isPaused ? 'PAUSED' : 'LIVE'}
            </span>
          </span>

          <button
            onClick={handleTogglePause}
            className="btn btn-ghost btn-sm"
            style={{ padding: '5px 9px' }}
            title={isPaused ? 'Resume simulation' : 'Pause simulation'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          <span className="cond-sep" />

          <span className="flex items-center gap-2">
            <span className="eyebrow" style={{ fontSize: '9px' }}>Speed</span>
            <div className="segmented" aria-label="Simulation speed">
              {SIM_SPEEDS.map((s) => (
                <button
                  key={s}
                  className={(speedMultiplier ?? 1) === s ? 'is-active' : ''}
                  onClick={() => handleSetSpeed(s)}
                  style={{ padding: '4px 8px', fontFamily: 'var(--font-mono)' }}
                >
                  {s}×
                </button>
              ))}
            </div>
          </span>
        </div>
      </div>
    </div>
  );
};
