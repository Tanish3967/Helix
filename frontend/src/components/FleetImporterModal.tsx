import React, { useState, useRef } from 'react';
import {
  Globe,
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileText,
  MapPin,
  Truck,
  Building2,
  RefreshCw,
  X,
  Layers,
  ChevronRight,
  Database,
  Code
} from 'lucide-react';
import { Vehicle } from '../types/fleet';
import { CITY_PRESETS, CityPreset } from '../services/cityPresets';

interface FleetImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCityId: string;
  currentVehicles: Vehicle[];
  onApplyCityPreset: (preset: CityPreset) => void;
  onImportCustomFleet: (vehicles: Vehicle[], mode: 'replace' | 'append') => void;
}

export const FleetImporterModal: React.FC<FleetImporterModalProps> = ({
  isOpen,
  onClose,
  currentCityId,
  currentVehicles,
  onApplyCityPreset,
  onImportCustomFleet
}) => {
  const [activeTab, setActiveTab] = useState<'cities' | 'csv' | 'export'>('cities');
  const [selectedCityKey, setSelectedCityKey] = useState<string>(currentCityId || 'sf');
  const [csvContent, setCsvContent] = useState<string>('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<any[]>([]);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle preset city application
  const handleLoadCity = (key: string) => {
    const preset = CITY_PRESETS[key];
    if (!preset) return;
    setIsProcessing(true);
    setSelectedCityKey(key);
    setTimeout(() => {
      onApplyCityPreset(preset);
      setIsProcessing(false);
      setStatusMessage(`Successfully loaded ${preset.name} with ${preset.vehicles.length} autonomous units!`);
      setTimeout(() => setStatusMessage(null), 4000);
    }, 600);
  };

  // Parse CSV text into preview records
  const handleParseCsv = (raw: string, name: string) => {
    setCsvContent(raw);
    setFileName(name);
    try {
      const lines = raw.trim().split('\n');
      if (lines.length < 2) {
        setParsedPreview([]);
        return;
      }
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
      const records = [];

      for (let i = 1; i < Math.min(lines.length, 50); i++) {
        const cols = lines[i].split(',').map((c) => c.trim().replace(/['"]/g, ''));
        const row: Record<string, any> = {};
        headers.forEach((h, idx) => {
          row[h] = cols[idx] !== undefined ? cols[idx] : '';
        });
        records.push(row);
      }
      setParsedPreview(records);
      setStatusMessage(`Parsed ${lines.length - 1} rows from ${name}.`);
    } catch (err: any) {
      setStatusMessage(`CSV parse error: ${err.message}`);
    }
  };

  // Handle file drop / input
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        handleParseCsv(text, file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        handleParseCsv(text, file.name);
      };
      reader.readAsText(file);
    }
  };

  // Commit imported CSV vehicles into live swarm
  const handleCommitCsvImport = () => {
    if (parsedPreview.length === 0) return;
    setIsProcessing(true);

    const newVehicles: Vehicle[] = parsedPreview.map((row, idx) => {
      const id = row.id || row.vehicle_id || `CUST-V${(idx + 1).toString().padStart(3, '0')}`;
      const lat = parseFloat(row.lat || row.latitude || '37.7749');
      const lng = parseFloat(row.lng || row.longitude || '-122.4194');
      const model = row.model || 'Custom Commercial EV';
      const type = (row.type || 'VAN').toUpperCase();
      const battery = parseFloat(row.battery || row.battery_percent || '88.0');
      const speed = parseFloat(row.speed || row.speed_kmh || '32.0');

      return {
        id,
        model,
        license_plate: row.license_plate || `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
        type,
        status: 'ON_ROUTE',
        location: { lat: isNaN(lat) ? 37.7749 : lat, lng: isNaN(lng) ? -122.4194 : lng },
        speed_kmh: isNaN(speed) ? 30.0 : speed,
        battery_fuel_percent: isNaN(battery) ? 85.0 : battery,
        max_capacity_kg: 750.0,
        current_load_kg: 180.0,
        driver_id: `DRV-CUST-${idx + 101}`,
        current_route_id: `RT-CUST-${idx + 1}`,
        assigned_order_ids: [],
        cargo_type: 'GENERAL',
        odometer_km: 12000.0,
        dtc_faults: [],
        carbon_kg_today: 12.0,
        telemetry_health: 'Optimal Telemetry',
        heading: Math.floor(Math.random() * 360)
      };
    });

    setTimeout(() => {
      onImportCustomFleet(newVehicles, importMode);
      setIsProcessing(false);
      setStatusMessage(`Injected ${newVehicles.length} custom units into live swarm (${importMode} mode)!`);
      setTimeout(() => setStatusMessage(null), 4000);
    }, 600);
  };

  // Download Sample Template CSV
  const handleDownloadSampleCsv = () => {
    const sample = `id,model,type,lat,lng,battery_percent,speed_kmh,status\n` +
      `CUST-001,Rivian Commercial EDV-700,VAN,37.7780,-122.4150,92,34,ON_ROUTE\n` +
      `CUST-002,Tesla Semi Autonomous,TRUCK,37.7850,-122.4080,88,42,ON_ROUTE\n` +
      `CUST-003,Skydio X10 Delivery UAV,DRONE,37.7650,-122.4200,75,55,ON_ROUTE\n` +
      `CUST-004,Thermo King Bio-Vault,REEFER,37.7710,-122.4250,96,28,ON_ROUTE`;

    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'helix_fleet_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download live telematics CSV
  const handleExportLiveCsv = () => {
    const headers = ['id', 'model', 'type', 'status', 'battery_percent', 'lat', 'lng', 'speed_kmh', 'driver_id'];
    const rows = [headers.join(',')];
    currentVehicles.forEach((v) => {
      rows.push(`${v.id},"${v.model}",${v.type},${v.status},${v.battery_fuel_percent},${v.location.lat},${v.location.lng},${v.speed_kmh},${v.driver_id || 'N/A'}`);
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `helix_fleet_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download live GeoJSON
  const handleExportLiveGeoJson = () => {
    const geojson = {
      type: 'FeatureCollection',
      metadata: { generated_at: new Date().toISOString(), total_units: currentVehicles.length },
      features: currentVehicles.map((v) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [v.location.lng, v.location.lat] },
        properties: {
          id: v.id,
          model: v.model,
          type: v.type,
          status: v.status,
          battery: v.battery_fuel_percent,
          speed_kmh: v.speed_kmh
        }
      }))
    };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `helix_fleet_${Date.now()}.geojson`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none font-mono">
      <div className="relative w-full max-w-5xl h-[85vh] bg-[#0A0F1D] border border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.2)] flex flex-col overflow-hidden animate-fadeIn">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-[#080D1A] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-wider">
                  FLEET DATA STUDIO & GLOBAL CITY IMPORTER
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-extrabold border border-cyan-500/40">
                  ● MULTI-CITY READY
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Switch metropolitan regions (SF, NYC, London, Tokyo, Berlin), ingest custom CSV manifests, and export telematics.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Data Studio"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {[
              { id: 'cities', label: '1. Global City Packs', icon: Globe },
              { id: 'csv', label: '2. Custom CSV / GeoJSON Ingestion', icon: FileSpreadsheet },
              { id: 'export', label: '3. Export Live Telematics', icon: Download }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === tab.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-slate-400">
            Active Fleet: <strong className="text-cyan-300">{currentVehicles.length} Units</strong>
          </div>
        </div>

        {/* Dynamic Notification Banner */}
        {statusMessage && (
          <div className="mx-6 mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Tab 1: Global City Packs */}
        {activeTab === 'cities' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.values(CITY_PRESETS).map((preset) => {
                const isSelected = selectedCityKey === preset.id;
                return (
                  <div
                    key={preset.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                      isSelected
                        ? 'bg-cyan-950/30 border-cyan-400 shadow-[0_0_25px_rgba(0,240,255,0.2)]'
                        : 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-900/50 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{preset.flag}</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-900 text-cyan-400 text-[10px] font-bold border border-cyan-500/30">
                          {preset.defaultVehicleCount} Vehicles
                        </span>
                      </div>
                      <h3 className="text-sm font-extrabold text-white mt-2">{preset.name}</h3>
                      <p className="text-xs text-slate-400 font-sans mt-0.5">{preset.tagline}</p>
                    </div>

                    <div className="space-y-1.5 text-xs bg-black/40 p-2.5 rounded-xl border border-slate-900">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Depots Network:</span>
                        <strong className="text-slate-200">{preset.depots.length} Regional Hubs</strong>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Map Coordinates:</span>
                        <span className="text-cyan-300 font-mono text-[10px]">{preset.center.lat.toFixed(3)}, {preset.center.lng.toFixed(3)}</span>
                      </div>
                    </div>

                    <button
                      disabled={isProcessing}
                      onClick={() => handleLoadCity(preset.id)}
                      className={`w-full py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                          : 'bg-slate-900 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}
                    >
                      {isProcessing && selectedCityKey === preset.id ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Flying Camera & Seeding...</span>
                        </>
                      ) : isSelected ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Active Simulation City</span>
                        </>
                      ) : (
                        <>
                          <span>Load & Fly to {preset.name.split(',')[0]}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Custom CSV / GeoJSON Ingestion */}
        {activeTab === 'csv' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col">
            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 rounded-2xl p-6 bg-cyan-950/10 hover:bg-cyan-950/20 transition-all flex flex-col items-center justify-center text-center cursor-pointer space-y-2 group"
            >
              <UploadCloud className="w-10 h-10 text-cyan-400 group-hover:scale-110 transition-transform" />
              <div>
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                  Drag & Drop Fleet Manifest (.CSV / .GeoJSON)
                </h4>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  or click to browse your computer (Auto-detects id, model, type, lat, lng, battery)
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json,.geojson"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>

            {/* Quick Action Bar: Sample Template & Mode Select */}
            <div className="flex items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={handleDownloadSampleCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-bold"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Download Sample Template CSV</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Import Mode:</span>
                <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                  <button
                    onClick={() => setImportMode('replace')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                      importMode === 'replace' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-slate-400'
                    }`}
                  >
                    Replace Entire Fleet
                  </button>
                  <button
                    onClick={() => setImportMode('append')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                      importMode === 'append' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'
                    }`}
                  >
                    Append to Live Fleet
                  </button>
                </div>
              </div>
            </div>

            {/* Parsed Preview Table */}
            {parsedPreview.length > 0 && (
              <div className="flex-1 flex flex-col space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-white">Parsed Manifest Preview ({parsedPreview.length} records):</span>
                  <button
                    onClick={handleCommitCsvImport}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isProcessing ? 'Injecting Swarm...' : `Inject ${parsedPreview.length} Units to Live Simulation`}</span>
                  </button>
                </div>

                <div className="flex-1 overflow-x-auto overflow-y-auto bg-slate-950/90 rounded-xl border border-slate-800 max-h-56">
                  <table className="w-full text-left text-[11px] text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 sticky top-0">
                      <tr>
                        {Object.keys(parsedPreview[0] || {}).map((header) => (
                          <th key={header} className="p-2 border-b border-slate-800 uppercase font-extrabold text-cyan-400">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedPreview.slice(0, 8).map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-900 hover:bg-slate-900/50">
                          {Object.values(row).map((val: any, cIdx) => (
                            <td key={cIdx} className="p-2 font-mono truncate max-w-[140px]">
                              {String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Export Live Telematics */}
        {activeTab === 'export' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-4">
                <div>
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 w-fit">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-extrabold text-white mt-3">Export Fleet Telematics (CSV)</h3>
                  <p className="text-xs text-slate-400 font-sans mt-1">
                    Standard tabular format with ID, model, status, battery, GPS coordinates, speed, and assigned driver.
                  </p>
                </div>
                <button
                  onClick={handleExportLiveCsv}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Live Fleet CSV ({currentVehicles.length} Units)</span>
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-4">
                <div>
                  <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 w-fit">
                    <Code className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-extrabold text-white mt-3">Export Geospatial FeatureCollection (GeoJSON)</h3>
                  <p className="text-xs text-slate-400 font-sans mt-1">
                    RFC 7946 compliant GeoJSON Point collection ready for import into QGIS, ArcGIS, Mapbox, or Python GeoPandas.
                  </p>
                </div>
                <button
                  onClick={handleExportLiveGeoJson}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download RFC 7946 GeoJSON</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#080D1A] flex items-center justify-between text-xs text-slate-400">
          <span>Active City: <strong className="text-white uppercase font-bold">{selectedCityKey}</strong> ({CITY_PRESETS[selectedCityKey]?.name || 'Custom Swarm'})</span>
          <span>Live Coordinates: <strong className="text-cyan-400 font-mono">{CITY_PRESETS[selectedCityKey]?.center.lat.toFixed(4)}, {CITY_PRESETS[selectedCityKey]?.center.lng.toFixed(4)}</strong></span>
        </div>
      </div>
    </div>
  );
};
