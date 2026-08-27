import React, { useState, useEffect } from 'react';
import {
  CloudLightning,
  CloudRain,
  Wind,
  Eye,
  AlertTriangle,
  Compass,
  CheckCircle2,
  X,
  Sparkles,
  RefreshCw,
  Navigation,
  Layers,
  Flame,
  Waves
} from 'lucide-react';
import { WeatherHazard } from '../types/fleet';

interface WeatherRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WeatherRadarModal: React.FC<WeatherRadarModalProps> = ({
  isOpen,
  onClose
}) => {
  const [hazards, setHazards] = useState<WeatherHazard[]>([
    {
      id: 'HAZARD-01',
      name: 'Embarcadero Coastal Flood Inundation',
      hazard_type: 'FLASH_FLOOD',
      severity: 'CRITICAL',
      coordinates: [[37.7950, -122.3980], [37.8080, -122.4080], [37.8100, -122.3920], [37.7950, -122.3900]],
      speed_penalty_percent: 65.0,
      wind_speed_kmh: 48.0,
      visibility_km: 0.8,
      precipitation_mm_hr: 42.0,
      is_active: true
    },
    {
      id: 'HAZARD-02',
      name: 'Bay Bridge Maritime Dense Advection Fog',
      hazard_type: 'DENSE_FOG',
      severity: 'HIGH',
      coordinates: [[37.7900, -122.3800], [37.8200, -122.3800], [37.8250, -122.3200], [37.7950, -122.3200]],
      speed_penalty_percent: 45.0,
      wind_speed_kmh: 22.0,
      visibility_km: 0.2,
      precipitation_mm_hr: 2.0,
      is_active: true
    },
    {
      id: 'HAZARD-03',
      name: 'San Bruno Gap High Wind Advisory',
      hazard_type: 'HIGH_WIND',
      severity: 'HIGH',
      coordinates: [[37.6100, -122.4300], [37.6400, -122.4300], [37.6400, -122.3900], [37.6100, -122.3900]],
      speed_penalty_percent: 35.0,
      wind_speed_kmh: 78.0,
      visibility_km: 8.0,
      precipitation_mm_hr: 0.0,
      is_active: true
    }
  ]);
  const [threatenedRoutes, setThreatenedRoutes] = useState<number>(3);
  const [isRerouting, setIsRerouting] = useState<boolean>(false);
  const [rerouteMessage, setRerouteMessage] = useState<string | null>(null);

  const fetchHazards = () => {
    fetch('/api/enterprise/weather/hazards')
      .then(res => res.json())
      .then(data => {
        if (data && data.hazards) {
          setHazards(data.hazards);
          setThreatenedRoutes(data.threatened_routes_count || 0);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (isOpen) {
      fetchHazards();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleReroute = async () => {
    setIsRerouting(true);
    setRerouteMessage(null);
    try {
      const res = await fetch('/api/enterprise/weather/hazards/reroute', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setRerouteMessage(`Autonomous Disaster Detour Applied: Successfully rerouted ${data.diverted_routes_count} active fleet missions around weather hazard polygons!`);
        fetchHazards();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRerouting(false);
    }
  };

  const handleToggle = async (hazardId: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/enterprise/weather/hazards/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hazard_id: hazardId, is_active: !currentStatus })
      });
      const data = await res.json();
      if (data.success) {
        setHazards(prev => prev.map(h => h.id === hazardId ? { ...h, is_active: !currentStatus } : h));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <CloudLightning className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                GEOSPATIAL MICROCLIMATE WEATHER RADAR
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  DISASTER REROUTE ENGINE
                </span>
              </h2>
              <p className="text-xs text-slate-400">Real-time localized flood, fog & high-wind spatial hazards with autonomous detour optimization.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReroute}
              disabled={isRerouting}
              className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
            >
              <Navigation className={`w-3.5 h-3.5 ${isRerouting ? 'animate-spin' : ''}`} />
              <span>{isRerouting ? 'Diverting Swarm...' : 'Trigger Disaster Detour'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Reroute Message Banner */}
        {rerouteMessage && (
          <div className="px-6 py-2.5 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{rerouteMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs font-mono">
          {/* Top Vitals Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10.5px]">ACTIVE HAZARDS</span>
              <div className="text-base sm:text-lg font-bold text-sky-400">{hazards.filter(h => h.is_active).length} Active</div>
              <div className="text-[10px] text-slate-500">3 Total Monitored</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10.5px]">THREATENED CORRIDORS</span>
              <div className="text-lg font-bold text-rose-400">{threatenedRoutes} Routes</div>
              <div className="text-[10px] text-slate-500">Intersecting Hazards</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10.5px]">PEAK WIND GUSTS</span>
              <div className="text-lg font-bold text-amber-400">78 km/h</div>
              <div className="text-[10px] text-slate-500">San Bruno Coastal Gap</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10.5px]">MAX PRECIPITATION</span>
              <div className="text-lg font-bold text-cyan-400">42.0 mm/h</div>
              <div className="text-[10px] text-slate-500">Embarcadero Waterfront</div>
            </div>
          </div>

          {/* Microclimate Hazard Cards */}
          <div className="space-y-3">
            <div className="text-slate-400 text-xs font-bold">LOCALIZED MICROCLIMATE HAZARD POLYGONS</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {hazards.map((hz) => (
                <div
                  key={hz.id}
                  className={`p-4 rounded-xl bg-slate-950 border transition-all space-y-3 ${
                    hz.is_active
                      ? hz.severity === 'CRITICAL'
                        ? 'border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                        : 'border-amber-500/50'
                      : 'border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      hz.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                      'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {hz.hazard_type}
                    </span>
                    <button
                      onClick={() => handleToggle(hz.id, hz.is_active)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                        hz.is_active
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {hz.is_active ? 'ACTIVE' : 'MUTED'}
                    </button>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white">{hz.name}</h3>
                    <p className="text-slate-500 text-[10.5px] mt-0.5">{hz.id} • Speed Penalty: -{hz.speed_penalty_percent}%</p>
                  </div>

                  {/* Microclimate Vitals */}
                  <div className="grid grid-cols-3 gap-2 text-[10px] pt-1 border-t border-slate-800/80">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800/60 text-center">
                      <span className="text-slate-500 flex items-center justify-center gap-1">
                        <Wind className="w-3 h-3 text-cyan-400" /> Wind
                      </span>
                      <div className="text-white font-bold mt-0.5">{hz.wind_speed_kmh} km/h</div>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800/60 text-center">
                      <span className="text-slate-500 flex items-center justify-center gap-1">
                        <Eye className="w-3 h-3 text-amber-400" /> Visib.
                      </span>
                      <div className="text-white font-bold mt-0.5">{hz.visibility_km} km</div>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800/60 text-center">
                      <span className="text-slate-500 flex items-center justify-center gap-1">
                        <CloudRain className="w-3 h-3 text-sky-400" /> Rain
                      </span>
                      <div className="text-white font-bold mt-0.5">{hz.precipitation_mm_hr} mm/h</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Info */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>Spatial Microclimate Doppler Radar active. Dynamic detour algorithms automatically bypass high-risk inundation corridors.</span>
            </div>
            <span className="text-slate-500">Doppler Resolution: 250m</span>
          </div>
        </div>
      </div>
    </div>
  );
};
