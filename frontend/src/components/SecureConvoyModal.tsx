import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Radio,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Flame,
  KeyRound,
  Navigation,
  Radar,
  RefreshCw,
  Satellite,
  Siren,
  Sparkles,
  Truck,
  Wifi,
  WifiOff,
  X
} from 'lucide-react';
import { SecureConvoy, SecurityTelemetryAlert } from '../types/fleet';

interface SecureConvoyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecureConvoyModal: React.FC<SecureConvoyModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'mesh' | 'spoofing' | 'vault'>('mesh');
  const [convoys, setConvoys] = useState<SecureConvoy[]>([
    {
      id: 'CONVOY-TITAN-01',
      name: 'Operation Aegis Vault (High-Value Bullion & Defense Cargo)',
      classification: 'HIGH_VALUE_BULLION',
      lead_vehicle_id: 'V481',
      cargo_vault_vehicle_id: 'V517',
      escort_vehicle_id: 'V109',
      convoy_status: 'EN_ROUTE_SECURE',
      inter_vehicle_spacing_meters: 24.5,
      biometric_vault_locked: true,
      vault_tamper_sensor: 'NOMINAL',
      gps_spoofing_detected: false,
      gnss_snr_db: 48.6,
      dead_reckoning_active: false,
      threat_level: 'DEFCON_4_GREEN',
      assigned_route_id: 'RT-CONVOY-01'
    },
    {
      id: 'CONVOY-HAZMAT-02',
      name: 'Operation BioShield (Class 7 Isotope Medical Cargo)',
      classification: 'HAZMAT_CLASS_7_RADIOACTIVE',
      lead_vehicle_id: 'V302',
      cargo_vault_vehicle_id: 'V520',
      escort_vehicle_id: 'V525',
      convoy_status: 'CONVOY_FORMED',
      inter_vehicle_spacing_meters: 35.0,
      biometric_vault_locked: true,
      vault_tamper_sensor: 'NOMINAL',
      gps_spoofing_detected: false,
      gnss_snr_db: 46.2,
      dead_reckoning_active: false,
      threat_level: 'DEFCON_4_GREEN',
      assigned_route_id: 'RT-CONVOY-02'
    }
  ]);

  const [alerts, setAlerts] = useState<SecurityTelemetryAlert[]>([
    {
      id: 'SEC-ALRT-101',
      convoy_id: 'CONVOY-TITAN-01',
      timestamp: new Date().toISOString(),
      alert_type: 'GEO_CORRIDOR_DEVIATION_CLEAR',
      severity: 'LOW',
      countermeasure_triggered: 'AUTOMATED_ESCORT_LANE_SHIELDING'
    }
  ]);

  const [selectedConvoyId, setSelectedConvoyId] = useState<string>('CONVOY-TITAN-01');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isLockingDown, setIsLockingDown] = useState<boolean>(false);
  const [isSimulatingSpoof, setIsSimulatingSpoof] = useState<boolean>(false);
  const [isFormingConvoy, setIsFormingConvoy] = useState<boolean>(false);

  const fetchConvoyData = () => {
    fetch('/api/enterprise/convoy/status')
      .then(res => res.json())
      .then(data => {
        if (data && data.convoys) {
          setConvoys(data.convoys);
        }
        if (data && data.recent_security_alerts) {
          setAlerts(data.recent_security_alerts);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (isOpen) {
      fetchConvoyData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentConvoy = convoys.find(c => c.id === selectedConvoyId) || convoys[0];

  const handleFormConvoy = async () => {
    setIsFormingConvoy(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/enterprise/convoy/form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          convoy_id: selectedConvoyId,
          lead_vehicle_id: 'V481',
          cargo_vault_vehicle_id: 'V517',
          escort_vehicle_id: 'V109',
          classification: 'HIGH_VALUE_BULLION'
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Armored Convoy ${data.convoy_id} Formed: Lead (V481), Vault (V517), Interceptor (V109) synchronized into 25m radar spacing.`);
        fetchConvoyData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFormingConvoy(false);
    }
  };

  const handleTriggerLockdown = async () => {
    setIsLockingDown(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/enterprise/convoy/lockdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          convoy_id: selectedConvoyId,
          reason: 'Manual Hostile Threat Lockdown'
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`EMERGENCY LOCKDOWN ACTIVATED on ${data.convoy_id}: Biometric Deadlocks Engaged • DEFCON 1 CRITICAL • Law Enforcement Dispatched (ETA ${data.law_enforcement_eta_minutes}m).`);
        fetchConvoyData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLockingDown(false);
    }
  };

  const handleSimulateSpoofing = async () => {
    setIsSimulatingSpoof(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/enterprise/convoy/anti-spoofing/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ convoy_id: selectedConvoyId })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Electronic Warfare Attack Intercepted: GNSS Jamming Detected (${data.detected_snr_db} dB). Inertial Dead-Reckoning (INS) engaged with 100% trajectory integrity.`);
        fetchConvoyData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSimulatingSpoof(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white font-mono flex items-center gap-2 flex-wrap">
                AUTONOMOUS HAZMAT & HIGH-VALUE SECURE CONVOY MESH
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  PHASE 13 • DEFCON 4
                </span>
              </h2>
              <p className="text-xs text-slate-400">Armored swarm escort geometry, military GNSS anti-spoofing, and biometric vault deadlocks.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleFormConvoy}
              disabled={isFormingConvoy}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
            >
              <Radar className={`w-3.5 h-3.5 ${isFormingConvoy ? 'animate-spin' : ''}`} />
              <span>{isFormingConvoy ? 'Forming...' : 'Form Armored Convoy'}</span>
            </button>

            <button
              onClick={handleTriggerLockdown}
              disabled={isLockingDown}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
            >
              <Siren className={`w-3.5 h-3.5 ${isLockingDown ? 'animate-spin' : ''}`} />
              <span>{isLockingDown ? 'Locking...' : 'Emergency Lockdown'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Message Banner */}
        {actionMessage && (
          <div className="px-4 sm:px-6 py-2.5 bg-cyan-500/15 border-b border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-4 sm:px-6 gap-2">
          {[
            { id: 'mesh', label: 'Armored Convoy Mesh & Swarm', icon: Truck },
            { id: 'spoofing', label: 'GNSS Anti-Spoofing & EW', icon: Satellite },
            { id: 'vault', label: 'Biometric Vault Telematics', icon: KeyRound }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3 text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs font-mono">
          {/* Top Vitals Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10.5px]">SECURITY STATUS</span>
              <div className="text-base sm:text-lg font-bold text-emerald-400">DEFCON 4 GREEN</div>
              <div className="text-[10px] text-slate-500">Perimeter Secure</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10.5px]">ACTIVE ARMORED CONVOYS</span>
              <div className="text-base sm:text-lg font-bold text-cyan-400">{convoys.length} Formations</div>
              <div className="text-[10px] text-slate-500">6 Vehicles Synchronized</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10.5px]">GNSS SNR HEALTH</span>
              <div className="text-base sm:text-lg font-bold text-white">{currentConvoy.gnss_snr_db} dB</div>
              <div className="text-[10px] text-slate-500">Triple-Band Anti-Jamming</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10.5px]">BIOMETRIC VAULT LOCKS</span>
              <div className="text-base sm:text-lg font-bold text-amber-400">100% Deadlocked</div>
              <div className="text-[10px] text-slate-500">Dual-Custody Verified</div>
            </div>
          </div>

          {/* TAB 1: ARMORED CONVOY MESH & SWARM */}
          {activeTab === 'mesh' && (
            <div className="space-y-4">
              {/* Convoy Selector Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-slate-500 text-xs shrink-0">SELECT CONVOY:</span>
                {convoys.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedConvoyId(c.id)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                      selectedConvoyId === c.id
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-800'
                    }`}
                  >
                    <span>{c.id}</span>
                    <span className="text-[10px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                      {c.classification.replace(/_/g, ' ')}
                    </span>
                  </button>
                ))}
              </div>

              {/* Convoy Formation Radar Layout */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-sm">{currentConvoy.name}</div>
                    <div className="text-slate-400 text-xs">Route ID: {currentConvoy.assigned_route_id} • Inter-Vehicle Radar Spacing: {currentConvoy.inter_vehicle_spacing_meters}m</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
                    {currentConvoy.convoy_status}
                  </span>
                </div>

                {/* 3-Vehicle Escort Formation Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Lead Armored Unit */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 hover:border-cyan-500/40 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-cyan-400 font-bold text-xs">LEAD ARMORED UNIT</span>
                      <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">V481</span>
                    </div>
                    <div className="text-xs text-white font-bold">Ford E-Transit Armored Sweeper</div>
                    <div className="text-[10.5px] text-slate-400">Tactical route scouting, lane clearance & traffic obstacle diversion.</div>
                    <div className="text-[10px] text-emerald-400 pt-1 border-t border-slate-800">Forward Radar: Clear (+45m)</div>
                  </div>

                  {/* Cargo Vault Unit */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/40 space-y-2 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-400 font-bold text-xs">HIGH-SECURITY VAULT</span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">V517</span>
                    </div>
                    <div className="text-xs text-white font-bold">Rivian EDV 700 Armored Vault</div>
                    <div className="text-[10.5px] text-slate-400">Class IV biometric vault, seismic sensors & EMP-shielded cargo bay.</div>
                    <div className="text-[10px] text-amber-300 pt-1 border-t border-slate-800">Biometric Deadlock: ENGAGED</div>
                  </div>

                  {/* Rear Tactical Interceptor */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 hover:border-cyan-500/40 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-cyan-400 font-bold text-xs">REAR INTERCEPTOR</span>
                      <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">V109</span>
                    </div>
                    <div className="text-xs text-white font-bold">Freightliner Tactical Escort</div>
                    <div className="text-[10.5px] text-slate-400">Perimeter trailing shield, tailgater jamming & evasive ram protection.</div>
                    <div className="text-[10px] text-emerald-400 pt-1 border-t border-slate-800">Rear Shield: 24.5m Locked</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GNSS ANTI-SPOOFING & ELECTRONIC WARFARE */}
          {activeTab === 'spoofing' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-slate-300 font-bold text-xs flex items-center gap-2">
                    <Satellite className="w-4 h-4 text-cyan-400" />
                    MILITARY-GRADE GNSS MULTI-CONSTELLATION SIGNAL INTEGRITY
                  </div>
                  <button
                    onClick={handleSimulateSpoofing}
                    disabled={isSimulatingSpoof}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all"
                  >
                    Simulate Jamming Attack
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-slate-500 text-[10.5px]">GPS L1 / L2 / L5</span>
                    <div className="text-base font-bold text-emerald-400">48.6 dB (Optimal)</div>
                    <div className="text-[10px] text-slate-500">Carrier-to-Noise Nominal</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-slate-500 text-[10.5px]">GALILEO E1 / E5A</span>
                    <div className="text-base font-bold text-emerald-400">46.2 dB (Locked)</div>
                    <div className="text-[10px] text-slate-500">OS-NMA Anti-Spoof Authenticated</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-slate-500 text-[10.5px]">INERTIAL DEAD-RECKONING (INS)</span>
                    <div className="text-base font-bold text-cyan-300">Standby Ready</div>
                    <div className="text-[10px] text-slate-500">0.02% Drift Rate (Ring Laser Gyro)</div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 leading-relaxed pt-2">
                  When GNSS signal jamming or carrier overpower spoofing is detected, the tactical mesh autonomously decouples from satellite navigation and locks onto <b>Optical Odometry & Inertial Ring-Laser Dead-Reckoning</b>, ensuring uncompromised trajectory following.
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BIOMETRIC VAULT TELEMATICS */}
          {activeTab === 'vault' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="text-slate-300 font-bold text-xs flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  DUAL-CUSTODY BIOMETRIC VAULT & SEISMIC SENSORS
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-slate-500 text-[10.5px]">VAULT DOOR STATUS</span>
                    <div className="text-base font-bold text-emerald-400 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-emerald-400" />
                      DEADLOCKED
                    </div>
                    <div className="text-[10px] text-slate-500">Class IV High-Strength Steel</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-slate-500 text-[10.5px]">SEISMIC / VIBRATION SENSOR</span>
                    <div className="text-base font-bold text-white">0.02 G (Nominal)</div>
                    <div className="text-[10px] text-slate-500">Tamper Cut-Off Inactive</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-slate-500 text-[10.5px]">DUAL AUTHORIZATION</span>
                    <div className="text-base font-bold text-cyan-300">Central + Driver Key</div>
                    <div className="text-[10px] text-slate-500">2-of-2 Cryptographic Quorum</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
