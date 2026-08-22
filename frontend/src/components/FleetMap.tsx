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
  LocateFixed
} from 'lucide-react';
import { Vehicle, Route, Incident, Order, WeatherState, TrafficZones } from '../types/fleet';
import { modifyVehicleRoute, toggleSimulationPause, setSimulationSpeed } from '../services/api';

// Map view modes shown in the segmented control. 3D tilts the camera; the basemap
// is shared with 'map'. Satellite swaps in the imagery raster.
type MapViewMode = 'map' | 'satellite' | '3d';
const PITCH_FLAT = 20;
const PITCH_3D = 58;

// Toggleable overlay layers (independent of the view mode).
interface LayerState {
  routes: boolean;
  traffic: boolean;
  weather: boolean;
  heatmap: boolean;
}

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

// SVG markup reused across markers (kept module-scope so we don't reallocate per render)
const VEHICLE_ICON_SVG = `
  <svg class="w-3 h-3 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
    <path d="M15 18H9"/>
    <path d="M19 18h2a1 1 0 0 0 1-1v-5l-3-4h-5v10Z"/>
    <circle cx="7" cy="18" r="2"/>
    <circle cx="17" cy="18" r="2"/>
  </svg>
`;

// Upward-pointing navigation chevron; the rotor rotates it to the travel bearing.
const ARROW_SVG = `
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="14" height="14">
    <path d="M12 2 L20 21 L12 16.5 L4 21 Z"/>
  </svg>
`;

// Per-marker animation state used by the requestAnimationFrame interpolation loop.
interface MarkerAnim {
  curLng: number;
  curLat: number;
  tgtLng: number;
  tgtLat: number;
  heading: number;      // last known travel bearing in degrees (0 = north, clockwise)
  moving: boolean;      // whether the vehicle is actively travelling (controls arrow visibility)
  statusKey: string;    // cached visual signature so we only rewrite pill HTML on change
  rotorEl: HTMLElement | null;
  arrowEl: HTMLElement | null;
  pillEl: HTMLElement | null;
}

// Great-circle initial bearing from point A to point B, in degrees (0 = north, clockwise).
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

// Resolve the visual treatment (pill class, label, display id) for a vehicle.
function computeVehicleVisual(v: Vehicle, allottedVehicleId?: string) {
  const vDisplay = v.id.includes('-') ? v.id : `V-${v.id.replace('V', '')}`;
  let pillClass = 'marker-pill-available';
  let statusLabel = '';

  if (v.status === 'AT_RISK' || v.fault_details) {
    pillClass = 'marker-pill-at-risk';
    statusLabel = ' ⚠️ BROKEN';
  } else if (v.status === 'REASSIGNED' || v.id === allottedVehicleId) {
    pillClass = 'marker-pill-reassigned';
    statusLabel = ' 🔄 ALLOTTED';
  } else if (v.status === 'ON_ROUTE') {
    pillClass = 'marker-pill-on-route';
  } else if (v.status === 'MAINTENANCE') {
    pillClass = 'marker-pill-completed';
    statusLabel = ' 🔧';
  } else if (v.status === 'COMPLETED') {
    pillClass = 'marker-pill-completed';
  }

  return { vDisplay, pillClass, statusLabel, statusKey: `${pillClass}|${statusLabel}` };
}

// Popup HTML for a vehicle (kept fresh so open popups reflect live telemetry).
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
  onSelectVehicle
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const depotMarkersRef = useRef<maplibregl.Marker[]>([]);
  const incidentPulseRef = useRef<maplibregl.Marker | null>(null);
  const neighborhoodMarkersRef = useRef<maplibregl.Marker[]>([]);
  const zoneMarkersRef = useRef<maplibregl.Marker[]>([]);
  const clusterMarkersRef = useRef<maplibregl.Marker[]>([]);

  // Per-marker interpolation state + the animation frame handle driving smooth motion.
  const markerAnimRef = useRef<Map<string, MarkerAnim>>(new Map());
  const rafRef = useRef<number | null>(null);
  // Interval handle for the marching-ants route flow animation.
  const dashIntervalRef = useRef<number | null>(null);

  // Value refs so the (once-initialized) map click handler always reads current state
  // without needing to tear down and rebuild the map on every change.
  const isManualRouteModeRef = useRef<boolean>(false);
  const manualVehicleIdRef = useRef<string>(vehicles[0]?.id || 'V481');
  const selectedVehicleIdRef = useRef<string | null>(selectedVehicleId);
  const onSelectVehicleRef = useRef(onSelectVehicle);
  const mapStyleRef = useRef<MapViewMode>('map');
  const isClusteredRef = useRef<boolean>(false);
  const layersRef = useRef<LayerState>({ routes: true, traffic: true, weather: true, heatmap: false });

  const [mapStyle, setMapStyle] = useState<MapViewMode>('map');
  const [layers, setLayers] = useState<LayerState>({ routes: true, traffic: true, weather: true, heatmap: false });
  const [isClustered, setIsClustered] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Manual Route Mode State
  const [isManualRouteMode, setIsManualRouteMode] = useState<boolean>(false);
  const [manualVehicleId, setManualVehicleId] = useState<string>(vehicles[0]?.id || 'V481');
  const [manualTargetHub, setManualTargetHub] = useState<string>('downtown');
  const [rerouteLoading, setRerouteLoading] = useState<boolean>(false);
  const [rerouteSuccessToast, setRerouteSuccessToast] = useState<string | null>(null);

  // Keep manualVehicleId synced
  useEffect(() => {
    if (selectedVehicleId) {
      setManualVehicleId(selectedVehicleId);
    } else if (vehicles.length > 0 && !manualVehicleId) {
      setManualVehicleId(vehicles[0].id);
    }
  }, [selectedVehicleId, vehicles]);

  // Mirror the latest values into refs so the persistent map click handler stays current.
  useEffect(() => {
    isManualRouteModeRef.current = isManualRouteMode;
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
      // 0. Satellite raster (ESRI World Imagery) — hidden until the Satellite tab is picked.
      //    Added first so it sits beneath route lines & DOM markers.
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

      // 1. Add Route Sources & Layers
      map.addSource('routes-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      // Background route glow layer
      map.addLayer({
        id: 'routes-glow',
        type: 'line',
        source: 'routes-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 7,
          'line-opacity': 0.45,
          'line-blur': 4
        }
      });

      // Foreground route line layer
      map.addLayer({
        id: 'routes-line',
        type: 'line',
        source: 'routes-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 3.2,
          'line-opacity': 0.95
        }
      });

      // Animated "marching ants" flow overlay — a bright dashed line whose dash
      // offset is stepped over time to convey direction of travel along each route.
      map.addLayer({
        id: 'routes-flow',
        type: 'line',
        source: 'routes-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#F8FAFC',
          'line-width': 2,
          'line-opacity': 0.55,
          'line-dasharray': [0, 4, 3]
        }
      });

      // 2. Add Handover Arc Source & Layer
      map.addSource('handover-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      map.addLayer({
        id: 'handover-glow',
        type: 'line',
        source: 'handover-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
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
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#F472B6',
          'line-width': 3,
          'line-dasharray': [2, 2],
          'line-opacity': 1.0
        }
      });

      // 3. Add Depot Markers
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

      // 4. Add Neighborhood labels
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

      // 5. Fleet-density heatmap surface — hidden until the Heatmap tab is picked.
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

    // Map Click in Manual Route Mode (reads live values via refs — see sync effect above)
    map.on('click', async (e) => {
      const { lng, lat } = e.lngLat;
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

    // Collapse individual pills into per-zone cluster bubbles when zoomed out.
    map.on('zoom', () => {
      const clustered = map.getZoom() < CLUSTER_ZOOM_THRESHOLD;
      setIsClustered((prev) => (prev === clustered ? prev : clustered));
    });

    mapRef.current = map;

    // Smooth-motion loop: ease each marker toward its latest target position and
    // point its heading arrow in the direction of travel. Runs for the map's lifetime.
    const animate = () => {
      markerAnimRef.current.forEach((st, id) => {
        const marker = markersRef.current.get(id);
        if (!marker) return;
        const dLng = st.tgtLng - st.curLng;
        const dLat = st.tgtLat - st.curLat;
        if (dLng * dLng + dLat * dLat > 1e-11) {
          st.heading = computeBearing(st.curLng, st.curLat, st.tgtLng, st.tgtLat);
          const alpha = 0.18; // exponential ease — smooth at any sim speed, re-targets each tick
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

    // Marching-ants dash animation for the route flow overlay. Stepping through a
    // sequence of dash arrays shifts the gap along the line, reading as forward motion.
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
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Route Polylines
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getSource('routes-source')) return;

    const features = routes.map((r) => {
      const isReassigned = r.id.includes('REASSIGN') || r.vehicle_id === allottedVehicle?.id;
      const isAffected = activeIncident?.affected_vehicle_ids?.includes(r.vehicle_id) || r.vehicle_id === brokenVehicle?.id;

      // Congestion = worst of traffic vs weather delay multiplier along the route.
      const congestion = Math.max(r.traffic_multiplier || 1, r.weather_multiplier || 1);

      let color = r.color || '#10B981';
      if (isAffected) color = '#EF4444';          // incident / broken vehicle — always red
      else if (isReassigned) color = '#D946EF';    // recovery handover — always magenta
      else if (congestion >= 2.0) color = '#F97316'; // severe congestion — orange
      else if (congestion >= 1.5) color = '#F59E0B'; // moderate congestion — amber

      const coordinates = r.waypoints.map((w) => [w.lng, w.lat]);

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

    if (brokenVehicle && allottedVehicle) {
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

  // Update Vehicle Markers (create/refresh DOM; smooth motion handled by the rAF loop)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const filtered = vehicles.filter((v) => {
      if (filterStatus === 'ALL') return true;
      if (filterStatus === 'ON_ROUTE') return v.status === 'ON_ROUTE';
      if (filterStatus === 'AT_RISK') return v.status === 'AT_RISK' || v.fault_details !== null;
      if (filterStatus === 'REASSIGNED') return v.status === 'REASSIGNED';
      if (filterStatus === 'AVAILABLE') return v.status === 'AVAILABLE';
      if (filterStatus === 'MAINTENANCE') return v.status === 'MAINTENANCE';
      return true;
    });

    const currentIds = new Set(filtered.map((v) => v.id));

    // Remove markers (and their anim state) for vehicles no longer shown
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
        markerAnimRef.current.delete(id);
      }
    });

    const allottedId = allottedVehicle?.id;

    filtered.forEach((v) => {
      const { vDisplay, pillClass, statusLabel, statusKey } = computeVehicleVisual(v, allottedId);
      const isMoving = (v.status === 'ON_ROUTE' || v.status === 'REASSIGNED') && v.speed_kmh > 0.5;
      const isSelected = selectedVehicleId === v.id;

      const marker = markersRef.current.get(v.id);

      if (!marker) {
        // Wrapper -> pill + rotor(arrow). The .fleet-marker* CSS drives layout & rotation.
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
        const anim = markerAnimRef.current.get(v.id);
        if (anim) {
          // Re-target for the smooth-motion loop (do NOT snap position here)
          anim.tgtLng = v.location.lng;
          anim.tgtLat = v.location.lat;
          anim.moving = isMoving;

          const pill = anim.pillEl;
          if (pill) {
            if (anim.statusKey !== statusKey) {
              // Visual signature changed — rewrite class + label
              pill.className = `fleet-marker-pill ${pillClass}${isSelected ? ' is-selected' : ''}`;
              pill.innerHTML = `<span>${vDisplay}${statusLabel}</span>${VEHICLE_ICON_SVG}`;
              anim.statusKey = statusKey;
            } else {
              // Cheap selection toggle only
              pill.classList.toggle('is-selected', isSelected);
            }
          }
        }

        // Keep an open popup's telemetry fresh
        const popup = marker.getPopup();
        if (popup && popup.isOpen()) popup.setHTML(buildPopupHTML(v));
      }
    });
  }, [vehicles, filterStatus, selectedVehicleId, allottedVehicle]);

  // Apply the selected view mode: swap the satellite raster + tilt the camera (3D).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      if (map.getLayer('satellite-layer')) {
        map.setLayoutProperty('satellite-layer', 'visibility', mapStyle === 'satellite' ? 'visible' : 'none');
      }
      const targetPitch = mapStyle === '3d' ? PITCH_3D : PITCH_FLAT;
      if (Math.abs(map.getPitch() - targetPitch) > 0.5) {
        map.easeTo({ pitch: targetPitch, duration: 700 });
      }
    };
    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [mapStyle]);

  // Apply overlay-layer toggles: route lines + fleet-density heatmap surface.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      if (!map.getLayer('vehicles-heat-layer')) return;
      const heatOn = layers.heatmap;
      map.setLayoutProperty('vehicles-heat-layer', 'visibility', heatOn ? 'visible' : 'none');

      // Route lines: hidden when Routes is off; dimmed beneath the heatmap when on.
      const routeVis = layers.routes ? 'visible' : 'none';
      ['routes-line', 'routes-glow', 'routes-flow'].forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', routeVis);
      });
      if (layers.routes) {
        if (map.getLayer('routes-line')) map.setPaintProperty('routes-line', 'line-opacity', heatOn ? 0.15 : 0.95);
        if (map.getLayer('routes-glow')) map.setPaintProperty('routes-glow', 'line-opacity', heatOn ? 0.04 : 0.45);
      }

      // Hide pill markers while the density surface is up so it reads unobstructed.
      markersRef.current.forEach((m) => { m.getElement().style.display = heatOn ? 'none' : ''; });
    };
    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [layers.routes, layers.heatmap]);

  // Feed live vehicle positions into the heatmap source (only while heatmap is active).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layers.heatmap || !map.getSource('vehicles-heat-source')) return;
    const src = map.getSource('vehicles-heat-source') as maplibregl.GeoJSONSource;
    src.setData({
      type: 'FeatureCollection',
      features: vehicles.map((v) => ({
        type: 'Feature' as const,
        properties: {},
        geometry: { type: 'Point' as const, coordinates: [v.location.lng, v.location.lat] }
      }))
    });
  }, [vehicles, layers.heatmap]);

  // Traffic congestion zone labels — DOM markers over any zone with elevated delay.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Rebuild from scratch each time (zone set is tiny).
    zoneMarkersRef.current.forEach((m) => m.remove());
    zoneMarkersRef.current = [];
    if (!trafficZones || !layers.traffic) return;

    Object.values(trafficZones).forEach((z) => {
      const mult = z?.multiplier || 1;
      if (!z || mult <= 1.0) return; // only surface congested corridors
      const severe = mult >= 2.0;
      const el = document.createElement('div');
      el.className = `zone-label ${severe ? 'zone-label-severe' : 'zone-label-moderate'}`;
      el.innerHTML = `<span class="zone-dot"></span><span>${z.name} · ${z.condition} ${mult}x</span>`;
      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([z.lng, z.lat])
        .addTo(map);
      zoneMarkersRef.current.push(marker);
    });
  }, [trafficZones, layers.traffic]);

  // Cluster vehicles into per-zone count bubbles when zoomed out; show pills otherwise.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear any existing cluster bubbles up front.
    clusterMarkersRef.current.forEach((m) => m.remove());
    clusterMarkersRef.current = [];

    const active = isClustered && !layers.heatmap;

    // Toggle pill visibility to match the current mode.
    markersRef.current.forEach((m) => {
      m.getElement().classList.toggle('marker-hidden', active);
    });

    if (!active) return;

    // Same status filter the pills use, so bubble counts match the visible fleet.
    const filtered = vehicles.filter((v) => {
      if (filterStatus === 'ALL') return true;
      if (filterStatus === 'ON_ROUTE') return v.status === 'ON_ROUTE';
      if (filterStatus === 'AT_RISK') return v.status === 'AT_RISK' || v.fault_details !== null;
      if (filterStatus === 'REASSIGNED') return v.status === 'REASSIGNED';
      if (filterStatus === 'AVAILABLE') return v.status === 'AVAILABLE';
      if (filterStatus === 'MAINTENANCE') return v.status === 'MAINTENANCE';
      return true;
    });

    // Bucket each vehicle into its nearest destination-hub centroid.
    const buckets = DESTINATION_HUBS.map((h) => ({ hub: h, count: 0, atRisk: 0 }));
    filtered.forEach((v) => {
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < DESTINATION_HUBS.length; i++) {
        const h = DESTINATION_HUBS[i];
        const dLng = v.location.lng - h.lng;
        const dLat = v.location.lat - h.lat;
        const d = dLng * dLng + dLat * dLat;
        if (d < bestD) { bestD = d; best = i; }
      }
      buckets[best].count++;
      if (v.status === 'AT_RISK' || v.fault_details) buckets[best].atRisk++;
    });

    buckets.forEach(({ hub, count, atRisk }) => {
      if (count === 0) return;
      const risky = atRisk > 0;
      const el = document.createElement('div');
      el.className = 'fleet-cluster-bubble';
      const bubbleColor = risky ? 'var(--crit)' : 'var(--ion)';
      el.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:44px;height:44px;border-radius:999px;cursor:pointer;backdrop-filter:blur(10px);background:color-mix(in srgb, ${bubbleColor} 16%, rgba(9,13,22,0.92));border:2px solid color-mix(in srgb, ${bubbleColor} 65%, transparent);color:${bubbleColor};box-shadow:0 6px 18px rgba(0,0,0,0.5);">
          <span style="font-size:14px;font-weight:800;line-height:1;font-family:var(--font-mono);">${count}</span>
          <span style="font-size:7px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;opacity:0.8;line-height:1;margin-top:2px;">units</span>
        </div>
      `;
      el.title = `${count} vehicle${count > 1 ? 's' : ''} near ${hub.name}${risky ? ` · ${atRisk} at risk` : ''}`;
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        map.flyTo({ center: [hub.lng, hub.lat], zoom: 13.2, duration: 900 });
      });
      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([hub.lng, hub.lat])
        .addTo(map);
      clusterMarkersRef.current.push(marker);
    });
  }, [isClustered, vehicles, filterStatus, layers.heatmap]);

  // Update Pulsing Incident Radar Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (brokenVehicle) {
      const loc = brokenVehicle.location;
      if (!incidentPulseRef.current) {
        const pulseEl = document.createElement('div');
        pulseEl.className = 'relative flex items-center justify-center pointer-events-none';
        pulseEl.innerHTML = `
          <div class="absolute w-44 h-44 rounded-full border border-dashed" style="border-color:color-mix(in srgb, var(--crit) 80%, transparent);background:color-mix(in srgb, var(--crit) 10%, transparent);"></div>
          <div class="absolute w-44 h-44 rounded-full animate-pulse-ring" style="background:color-mix(in srgb, var(--crit) 20%, transparent);border:1px solid var(--crit);"></div>
          <div class="absolute w-28 h-28 rounded-full animate-pulse-ring-delayed" style="background:color-mix(in srgb, var(--crit) 20%, transparent);border:1px solid color-mix(in srgb, var(--crit) 80%, transparent);"></div>
        `;

        incidentPulseRef.current = new maplibregl.Marker({ element: pulseEl })
          .setLngLat([loc.lng, loc.lat])
          .addTo(map);
      } else {
        incidentPulseRef.current.setLngLat([loc.lng, loc.lat]);
      }
    } else {
      if (incidentPulseRef.current) {
        incidentPulseRef.current.remove();
        incidentPulseRef.current = null;
      }
    }
  }, [brokenVehicle]);

  // Direct Manual Route Action Handler
  const handleApplyManualReroute = async () => {
    const targetV = selectedVehicleId || manualVehicleId;
    const hub = DESTINATION_HUBS.find((h) => h.id === manualTargetHub) || DESTINATION_HUBS[0];
    if (!targetV) return;

    setRerouteLoading(true);
    try {
      await modifyVehicleRoute(targetV, {
        destination_lat: hub.lat,
        destination_lng: hub.lng,
        destination_name: hub.name,
        zone_id: hub.id
      });
      setRerouteSuccessToast(`Vehicle ${targetV} rerouted to ${hub.name}! Waypoints active.`);
      setTimeout(() => setRerouteSuccessToast(null), 3500);

      // Fly map to show the rerouted vehicle
      const v = vehicles.find((veh) => veh.id === targetV);
      if (v && mapRef.current) {
        mapRef.current.flyTo({ center: [hub.lng, hub.lat], zoom: 13.5, duration: 1000 });
      }
    } catch (err: any) {
      console.error('Failed to manually reroute:', err);
    } finally {
      setRerouteLoading(false);
    }
  };

  const handleFocusHandover = () => {
    if (!mapRef.current) return;
    if (brokenVehicle && allottedVehicle) {
      const bounds = new maplibregl.LngLatBounds()
        .extend([brokenVehicle.location.lng, brokenVehicle.location.lat])
        .extend([allottedVehicle.location.lng, allottedVehicle.location.lat]);
      mapRef.current.fitBounds(bounds, { padding: 90, maxZoom: 14.5, duration: 1200 });
    } else if (brokenVehicle) {
      mapRef.current.flyTo({ center: [brokenVehicle.location.lng, brokenVehicle.location.lat], zoom: 14.2, duration: 1000 });
    }
  };

  // Return the camera to the depot-centered default framing for the current mode.
  const handleRecenter = () => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({
      center: [-122.4180, 37.7760],
      zoom: 12.8,
      pitch: mapStyle === '3d' ? PITCH_3D : PITCH_FLAT,
      bearing: 0,
      duration: 900
    });
  };

  const toggleLayer = (key: keyof LayerState) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Playback controls — drive the shared simulation clock via the REST control surface.
  // State flows back through the SIMULATION_CONFIG / TELEMETRY_TICK websocket messages.
  const handleTogglePause = () => {
    toggleSimulationPause(!isPaused).catch((err) => console.error('Failed to toggle pause:', err));
  };
  const handleSetSpeed = (speed: number) => {
    setSimulationSpeed(speed).catch((err) => console.error('Failed to set sim speed:', err));
  };

  // ---- Derived environmental + selection readouts for the overlay UI ----
  const weatherMult = weather?.multiplier ?? 1.0;
  const weatherCond = weather?.condition ? String(weather.condition) : 'Clear';
  const wcLower = weatherCond.toLowerCase();
  const hasStorm = weatherMult >= 2.0 || wcLower.includes('storm') || wcLower.includes('thunder');
  const hasRain = weatherMult > 1.0 || wcLower.includes('rain') || hasStorm;
  const hasFog = wcLower.includes('fog') || wcLower.includes('mist') || (weather ? weather.visibility_km <= 5.0 : false);
  const showWeatherOverlay = hasStorm || hasRain || hasFog;
  const WeatherIcon = hasStorm ? CloudLightning : hasFog ? CloudFog : hasRain ? CloudRain : Sun;

  const zoneList = trafficZones ? Object.values(trafficZones) : [];
  const congestedZones = zoneList.filter((z) => (z?.multiplier || 1) > 1.0);
  const worstZoneMult = zoneList.reduce((m, z) => Math.max(m, z?.multiplier || 1), 1);
  const trafficLabel = worstZoneMult >= 2.0 ? 'Heavy' : worstZoneMult >= 1.5 ? 'Moderate' : 'Clear';

  // ETA for the currently selected vehicle, derived from its active route.
  const selectedVehicle = selectedVehicleId ? vehicles.find((v) => v.id === selectedVehicleId) : undefined;
  const selectedRoute = selectedVehicle
    ? routes.find((r) => r.vehicle_id === selectedVehicle.id && r.is_active) || routes.find((r) => r.vehicle_id === selectedVehicle.id)
    : undefined;
  let etaInfo: { minutes: number; remainingKm: number; progress: number } | null = null;
  if (selectedVehicle && selectedRoute) {
    const progress = Math.min(100, Math.max(0, selectedRoute.progress_percent || 0));
    const remainingKm = (selectedRoute.distance_km || 0) * (1 - progress / 100);
    const mult = Math.max(selectedRoute.traffic_multiplier || 1, selectedRoute.weather_multiplier || 1);
    const baseSpeed = (selectedVehicle.speed_kmh || 0) > 5 ? selectedVehicle.speed_kmh : 32; // cruise fallback when idling
    const effSpeed = baseSpeed / mult;
    etaInfo = { minutes: effSpeed > 0 ? (remainingKm / effSpeed) * 60 : 0, remainingKm, progress };
  }
  const formatEta = (min: number) => {
    if (!isFinite(min) || min <= 0) return 'Arriving';
    if (min < 1) return '<1 min';
    if (min < 60) return `${Math.round(min)} min`;
    return `${Math.floor(min / 60)}h ${Math.round(min % 60)}m`;
  };

  return (
    <div
      className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl"
      style={{ background: '#060A12', border: '1px solid var(--edge)' }}
    >
      {/* MapLibre Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Atmospheric weather overlay (rain / storm / fog) — sits above the map,
          below the control chrome; pointer-events:none so map stays interactive. */}
      {showWeatherOverlay && (
        <div className="weather-overlay">
          {hasStorm && <div className="weather-storm-tint" />}
          {hasRain && <div className="weather-rain-layer" />}
          {hasFog && <div className="weather-fog-layer" />}
          {hasStorm && <div className="weather-lightning-layer" />}
        </div>
      )}

      {/* Top Center: Workload Handover Active Banner */}
      {brokenVehicle && allottedVehicle && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 rounded-xl px-4 py-2 animate-bounce-subtle"
          style={{
            background: 'rgba(9,13,22,0.92)',
            border: '1px solid color-mix(in srgb, var(--violet) 50%, transparent)',
            backdropFilter: 'blur(12px)',
            boxShadow: 'var(--shadow-pop)'
          }}
        >
          <span className="flex items-center gap-2">
            <Zap className="w-4 h-4 animate-pulse" style={{ color: 'var(--violet)', fill: 'var(--violet)' }} />
            <span className="text-xs font-bold" style={{ color: 'var(--ink)' }}>
              Workload Handover:{' '}
              <span className="readout font-extrabold" style={{ color: 'var(--crit)' }}>{brokenVehicle.id}</span>
              {' → '}
              <span className="readout font-extrabold" style={{ color: 'var(--violet)' }}>{allottedVehicle.id}</span>
            </span>
          </span>

          <span style={{ height: 16, width: 1, background: 'var(--edge)' }} />

          <button
            onClick={handleFocusHandover}
            className="btn btn-sm"
            style={{
              color: 'var(--violet)',
              background: 'color-mix(in srgb, var(--violet) 18%, transparent)',
              border: '1px solid color-mix(in srgb, var(--violet) 40%, transparent)'
            }}
          >
            <Crosshair className="w-3 h-3" />
            <span>Focus Handover</span>
          </button>
        </div>
      )}

      {/* Top Left: view mode + layer chips + manual reroute toggle */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 items-start">
        <div className="flex items-center gap-2">
          <div className="segmented" role="tablist" aria-label="Map view mode">
            <button role="tab" aria-selected={mapStyle === 'map'} className={mapStyle === 'map' ? 'is-active' : ''} onClick={() => setMapStyle('map')}>Map</button>
            <button role="tab" aria-selected={mapStyle === 'satellite'} className={mapStyle === 'satellite' ? 'is-active' : ''} onClick={() => setMapStyle('satellite')}>Satellite</button>
            <button role="tab" aria-selected={mapStyle === '3d'} className={mapStyle === '3d' ? 'is-active' : ''} onClick={() => setMapStyle('3d')}>3D</button>
          </div>

          {/* Manual Route Mode Toggle */}
          <button
            onClick={() => setIsManualRouteMode(!isManualRouteMode)}
            className="btn btn-sm"
            aria-pressed={isManualRouteMode}
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
        <div className="flex items-center gap-1.5 flex-wrap max-w-[440px]">
          {([
            { key: 'routes', label: 'Routes' },
            { key: 'traffic', label: 'Traffic' },
            { key: 'weather', label: 'Weather' },
            { key: 'heatmap', label: 'Heatmap' }
          ] as Array<{ key: keyof LayerState; label: string }>).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => toggleLayer(key)}
              className={`chip-toggle ${layers[key] ? 'is-on' : ''}`}
              aria-pressed={layers[key]}
            >
              <span className="chip-dot" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Right: Vehicle Filter & Fullscreen */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
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

      {/* Interactive Manual Route Mode Toolbar (when active) — sits above the playback bar */}
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

      {/* Bottom Right: Floating Controls (recenter + zoom) */}
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

      {/* Bottom Left: Map Legend */}
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
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(148,163,184,0.25)', border: '1px solid var(--edge-strong)' }} />
          <span>Depot</span>
        </div>
      </div>

      {/* Selected-vehicle ETA readout (below the style tabs, only when a vehicle is picked) */}
      {selectedVehicle && etaInfo && (
        <div className="absolute top-14 left-3 z-10">
          <div className="conditions-chip">
            <span className="flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5" style={{ color: 'var(--ion)' }} />
              <span className="readout font-bold" style={{ color: 'var(--ink)' }}>{selectedVehicle.id}</span>
            </span>
            <span className="cond-sep" />
            <span style={{ color: 'var(--ink-faint)' }}>ETA <span className="font-bold" style={{ color: 'var(--ink)' }}>{formatEta(etaInfo.minutes)}</span></span>
            <span className="cond-sep" />
            <span style={{ color: 'var(--ink-faint)' }}>{etaInfo.remainingKm.toFixed(1)} km · {etaInfo.progress.toFixed(0)}%</span>
          </div>
        </div>
      )}

      {/* Bottom Center: Conditions HUD (stacked) + Playback transport */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
        {(weather || congestedZones.length > 0) && (
          <div className="conditions-chip">
            {weather && (
              <>
                <span className="flex items-center gap-1.5">
                  <WeatherIcon
                    className="w-3.5 h-3.5"
                    style={{ color: hasStorm ? 'var(--violet)' : hasRain ? 'var(--ion)' : hasFog ? 'var(--ink-faint)' : 'var(--warn)' }}
                  />
                  <span className="font-bold" style={{ color: 'var(--ink)' }}>{weatherCond}</span>
                  <span style={{ color: 'var(--ink-faint)' }}>{weather.temperature_c}°C</span>
                </span>
                <span className="cond-sep" />
                <span style={{ color: 'var(--ink-dim)' }}>Vis {weather.visibility_km}km</span>
                <span style={{ color: 'var(--ink-dim)' }}>Wind {weather.wind_speed_kmh}km/h</span>
                <span className="cond-sep" />
              </>
            )}
            <span className="flex items-center gap-1.5">
              <span style={{ color: 'var(--ink-faint)' }}>Traffic</span>
              <span
                className="font-bold"
                style={{ color: worstZoneMult >= 2 ? 'var(--crit)' : worstZoneMult >= 1.5 ? 'var(--warn)' : 'var(--signal)' }}
              >
                {trafficLabel}
              </span>
              {congestedZones.length > 0 && (
                <span style={{ color: 'var(--ink-mute)' }}>
                  ({congestedZones.length} zone{congestedZones.length > 1 ? 's' : ''})
                </span>
              )}
            </span>
          </div>
        )}

        {/* Playback / simulation transport — drives the shared sim clock */}
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
