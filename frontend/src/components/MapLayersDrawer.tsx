import React, { useState } from 'react';
import {
  Layers,
  Shield,
  Zap,
  CloudLightning,
  TrendingUp,
  Truck,
  Sparkles,
  ChevronDown,
  ChevronUp,
  LocateFixed,
  Compass,
  Radio,
  Eye,
  EyeOff,
  Snowflake
} from 'lucide-react';

export interface MapLayerConfig {
  routes: boolean;
  trafficHeatmap: boolean;
  weather: boolean;
  geofences: boolean;
  chargingGrid: boolean;
  convoyMesh: boolean;
  swarmTrails: boolean;
  heatmap: boolean;
  evChargers: boolean;
  evRangeIsochrone: boolean;
}

interface MapLayersDrawerProps {
  layers: MapLayerConfig;
  onToggleLayer: (layer: keyof MapLayerConfig) => void;
  mapStyle: 'map' | 'satellite' | '3d';
  onSetMapStyle: (style: 'map' | 'satellite' | '3d') => void;
  onFocusConvoy?: () => void;
  onFocusIncident?: () => void;
  onFocusDepots?: () => void;
}

export const MapLayersDrawer: React.FC<MapLayersDrawerProps> = ({
  layers,
  onToggleLayer,
  mapStyle,
  onSetMapStyle,
  onFocusConvoy,
  onFocusIncident,
  onFocusDepots
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const layerItems: Array<{
    key: keyof MapLayerConfig;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    activeColor: string;
    activeBg: string;
    activeBorder: string;
  }> = [
    {
      key: 'convoyMesh',
      label: 'Secure Convoy Mesh',
      description: 'Tactical Lead, Vault & Interceptor radar links',
      icon: Shield,
      activeColor: 'text-cyan-300',
      activeBg: 'bg-cyan-500/20',
      activeBorder: 'border-cyan-500/50'
    },
    {
      key: 'swarmTrails',
      label: 'Swarm Velocity Trails',
      description: 'Heading particle tails (>25 km/h)',
      icon: Sparkles,
      activeColor: 'text-emerald-300',
      activeBg: 'bg-emerald-500/20',
      activeBorder: 'border-emerald-500/50'
    },
    {
      key: 'trafficHeatmap',
      label: 'Traffic Corridors',
      description: 'Congestion heatmap & arterial delays',
      icon: TrendingUp,
      activeColor: 'text-amber-300',
      activeBg: 'bg-amber-500/20',
      activeBorder: 'border-amber-500/50'
    },
    {
      key: 'routes',
      label: 'Active Mission Routes',
      description: 'Dynamic OSRM navigation lines & flow pulses',
      icon: Truck,
      activeColor: 'text-violet-300',
      activeBg: 'bg-violet-500/20',
      activeBorder: 'border-violet-500/50'
    },
    {
      key: 'weather',
      label: 'Doppler Weather Hazards',
      description: 'Microclimate fog, storms & flood polygons',
      icon: CloudLightning,
      activeColor: 'text-sky-300',
      activeBg: 'bg-sky-500/20',
      activeBorder: 'border-sky-500/50'
    },
    {
      key: 'evChargers',
      label: 'Mappls EV Chargers SDK',
      description: 'Live 150-350kW Supercharger hubs, plugs & port counts',
      icon: Zap,
      activeColor: 'text-amber-300',
      activeBg: 'bg-amber-500/20',
      activeBorder: 'border-amber-500/50'
    },
    {
      key: 'evRangeIsochrone',
      label: 'EV Range Isochrone',
      description: 'Dynamic Distance-to-Empty (DTE) reachable boundary',
      icon: Compass,
      activeColor: 'text-cyan-300',
      activeBg: 'bg-cyan-500/20',
      activeBorder: 'border-cyan-500/50'
    }
  ];

  const activeCount = Object.values(layers).filter(Boolean).length;

  return (
    <div className="absolute top-16 right-3 z-30 flex flex-col items-end select-none">
      {/* Floating Trigger Pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all shadow-xl backdrop-blur-xl ${
          isOpen
            ? 'bg-slate-900/95 border-cyan-500/60 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
            : 'bg-slate-950/80 hover:bg-slate-900 border-slate-700/80 text-slate-300'
        }`}
        title="Toggle Map Overlays & 3D Perspective Controls"
      >
        <Layers className="w-3.5 h-3.5 text-cyan-400" />
        <span className="hidden sm:inline">MAP LAYERS</span>
        <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-[10px] text-cyan-300 border border-cyan-500/30">
          {activeCount} Active
        </span>
        {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {/* Expanded Control Drawer */}
      {isOpen && (
        <div className="mt-2 w-80 bg-slate-950/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-2xl p-3.5 space-y-3 animate-fadeIn text-xs font-mono">
          {/* Header & 3D Mode Switcher */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              MAP CONTROL HUD
            </span>
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => onSetMapStyle('map')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  mapStyle === 'map' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                2D
              </button>
              <button
                onClick={() => onSetMapStyle('3d')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  mapStyle === '3d' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                3D Tilt
              </button>
              <button
                onClick={() => onSetMapStyle('satellite')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  mapStyle === 'satellite' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                Sat
              </button>
            </div>
          </div>

          {/* Layer Toggle Items List */}
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
            {layerItems.map((item) => {
              const Icon = item.icon;
              const isEnabled = layers[item.key];
              return (
                <button
                  key={item.key}
                  onClick={() => onToggleLayer(item.key)}
                  className={`w-full p-2 rounded-xl border text-left flex items-center justify-between gap-2.5 transition-all ${
                    isEnabled
                      ? `${item.activeBg} ${item.activeBorder} ${item.activeColor}`
                      : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-1 rounded-lg ${isEnabled ? 'bg-black/30' : 'bg-slate-800'}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-xs truncate leading-tight text-white">{item.label}</div>
                      <div className="text-[10px] text-slate-400 truncate leading-tight">{item.description}</div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isEnabled ? (
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Focus Teleport Cluster */}
          <div className="pt-2 border-t border-slate-800 grid grid-cols-3 gap-1.5 text-[10px]">
            {onFocusConvoy && (
              <button
                onClick={onFocusConvoy}
                className="px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-bold truncate transition-all text-center"
              >
                Convoy Link
              </button>
            )}
            {onFocusIncident && (
              <button
                onClick={onFocusIncident}
                className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold truncate transition-all text-center"
              >
                Incident Zone
              </button>
            )}
            {onFocusDepots && (
              <button
                onClick={onFocusDepots}
                className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold truncate transition-all text-center"
              >
                Depot Hub
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
