import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Sliders,
  CheckCircle2,
  X,
  Zap,
  MapPin,
  ToggleLeft,
  ToggleRight,
  AlertOctagon,
  Cpu
} from 'lucide-react';

interface EnterprisePolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PolicyRule {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
}

interface GeofencePolygon {
  id: string;
  name: string;
  category: string;
  coordinates: number[][];
  is_active: boolean;
}

export const EnterprisePolicyModal: React.FC<EnterprisePolicyModalProps> = ({
  isOpen,
  onClose
}) => {
  const [policies, setPolicies] = useState<PolicyRule[]>([
    {
      id: 'POL-01',
      name: 'Auto-Reroute on Severe Congestion',
      description: 'Automatically calculates and applies detour when traffic multiplier exceeds 1.8x.',
      category: 'ROUTING',
      enabled: true
    },
    {
      id: 'POL-02',
      name: 'Auto-Dispatch Backup Unit on Breakdown',
      description: 'Instantly identifies and reassigns stranded parcels to the nearest available unit.',
      category: 'DISPATCH',
      enabled: true
    },
    {
      id: 'POL-03',
      name: 'Automated Customer Delay Notification',
      description: 'Fires webhook to customer portal when revised ETA extends beyond 15 minutes.',
      category: 'CUSTOMER',
      enabled: true
    },
    {
      id: 'POL-04',
      name: 'Predictive Maintenance Depot Routing',
      description: 'Schedules immediate depot return when critical Diagnostic Trouble Codes are detected.',
      category: 'SAFETY',
      enabled: true
    }
  ]);

  const [geofences, setGeofences] = useState<GeofencePolygon[]>([
    {
      id: 'GEO-01',
      name: 'Oakland Port HAZMAT Zone',
      category: 'HAZMAT',
      coordinates: [[37.8000, -122.2850], [37.8120, -122.2850]],
      is_active: true
    },
    {
      id: 'GEO-02',
      name: 'Financial District Low-Emission Zone',
      category: 'LOW_EMISSION',
      coordinates: [[37.7880, -122.4080], [37.7990, -122.4080]],
      is_active: true
    }
  ]);

  const [activeTab, setActiveTab] = useState<'policies' | 'geofences'>('policies');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/enterprise/policies')
        .then(r => r.json())
        .then(d => d.policies && setPolicies(d.policies))
        .catch(console.error);

      fetch('/api/enterprise/geofences')
        .then(r => r.json())
        .then(d => d.geofences && setGeofences(d.geofences))
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = async (policyId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setPolicies(prev => prev.map(p => p.id === policyId ? { ...p, enabled: nextStatus } : p));
    try {
      await fetch(`/api/enterprise/policies/${policyId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextStatus })
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono">AUTONOMOUS SWARM POLICIES & GEOFENCING</h2>
              <p className="text-xs text-slate-400">Self-healing automation rules and spatial security perimeters.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 gap-2">
          {[
            { id: 'policies', label: 'Self-Healing Policies', icon: Sliders },
            { id: 'geofences', label: 'Spatial Geofences', icon: AlertOctagon }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3 text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-violet-400 text-violet-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-3 text-xs font-mono">
          {activeTab === 'policies' && (
            <div className="space-y-3">
              {policies.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4 hover:border-slate-700 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-xs">{p.name}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        {p.category}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[11px] font-sans leading-relaxed">{p.description}</div>
                  </div>

                  <button
                    onClick={() => handleToggle(p.id, p.enabled)}
                    className="p-1 text-slate-300 hover:text-white transition-colors shrink-0"
                    title={p.enabled ? 'Disable Policy' : 'Enable Policy'}
                  >
                    {p.enabled ? (
                      <ToggleRight className="w-7 h-7 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-7 h-7 text-slate-600" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'geofences' && (
            <div className="space-y-3">
              {geofences.map((g) => (
                <div
                  key={g.id}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-rose-400" />
                      <span className="text-white font-bold text-xs">{g.name}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {g.category}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[10.5px]">Ray-casting spatial breach alert active</div>
                  </div>
                  <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Enforced
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
