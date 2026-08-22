import React from 'react';
import { 
  AlertTriangle, 
  X, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Zap, 
  Truck, 
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { Incident } from '../types/fleet';

interface IncidentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeIncident: Incident | null | undefined;
  onInspectTrace: () => void;
}

export const IncidentsModal: React.FC<IncidentsModalProps> = ({
  isOpen,
  onClose,
  activeIncident,
  onInspectTrace
}) => {
  if (!isOpen) return null;

  // Mock past resolved incidents for complete incident history
  const pastIncidents = [
    {
      id: 'INC-HIST-9021',
      title: 'Vehicle V492 Battery Sensor Voltage Spike',
      type: 'VEHICLE_BREAKDOWN',
      severity: 'HIGH',
      resolved_at: '10:14 AM',
      duration: '34s',
      assigned_replacement: 'V508',
      deliveries: 4,
      status: 'Resolved'
    },
    {
      id: 'INC-HIST-8842',
      title: 'Highway 101 Multi-Vehicle Congestion',
      type: 'TRAFFIC_CONGESTION',
      severity: 'MEDIUM',
      resolved_at: '09:48 AM',
      duration: '42s',
      assigned_replacement: 'Dynamic Detour',
      deliveries: 12,
      status: 'Resolved'
    },
    {
      id: 'INC-HIST-8119',
      title: 'Mission District Delivery Window SLA Warning',
      type: 'HIGH_PRIORITY_ORDER',
      severity: 'INFO',
      resolved_at: '08:52 AM',
      duration: '18s',
      assigned_replacement: 'Customer Notified',
      deliveries: 2,
      status: 'Resolved'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#0E131F] border border-[#1E293B] rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#141B2D] border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Fleet Incident Management & Log
              </h2>
              <p className="text-xs text-slate-400">
                Track active anomalies, historical incident resolutions, and multi-agent recovery pipelines.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#0E131F] hover:bg-[#1E293B] text-slate-400 hover:text-white border border-[#1E293B] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Active Incident Section */}
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-red-400 mb-2">
              CURRENT LIVE INCIDENT
            </div>

            {activeIncident ? (
              <div className="bg-gradient-to-r from-red-950/60 via-[#141B2D] to-purple-950/40 border border-red-500/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldAlert className="w-5 h-5 text-red-400 animate-pulse" />
                    <div>
                      <h3 className="text-sm font-bold text-white">{activeIncident.title}</h3>
                      <div className="text-xs text-slate-300 mt-0.5">{activeIncident.description}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-red-400 bg-red-500/20 border border-red-500/40 px-2.5 py-1 rounded-full uppercase">
                    {activeIncident.resolution_status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#1E293B]">
                  <div className="bg-[#0E131F]/80 p-2 rounded-lg border border-[#1E293B]">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Affected Vehicle</div>
                    <div className="text-sm font-bold text-white mono mt-0.5">{activeIncident.affected_vehicle_ids[0] || 'V481'}</div>
                  </div>

                  <div className="bg-[#0E131F]/80 p-2 rounded-lg border border-[#1E293B]">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Impacted Deliveries</div>
                    <div className="text-sm font-bold text-white mono mt-0.5">{activeIncident.affected_order_ids.length || 3} Orders</div>
                  </div>

                  <div className="bg-[#0E131F]/80 p-2 rounded-lg border border-[#1E293B]">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Detected At</div>
                    <div className="text-sm font-bold text-cyan-400 mono mt-0.5">10:41 AM</div>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-1">
                  <button
                    onClick={() => {
                      onClose();
                      onInspectTrace();
                    }}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-md shadow-blue-600/30 transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Inspect Multi-Agent Execution Trace</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-[#141B2D] border border-[#1E293B] rounded-xl p-4 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                No active incidents currently detected. Fleet operations running optimally.
              </div>
            )}
          </div>

          {/* Historical Incidents Log */}
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              HISTORICAL INCIDENTS & AUTONOMOUS RESOLUTIONS
            </div>

            <div className="border border-[#1E293B] rounded-xl overflow-hidden divide-y divide-[#1E293B]">
              {pastIncidents.map((inc) => (
                <div key={inc.id} className="p-3 bg-[#141B2D] hover:bg-[#101726] transition-colors flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{inc.title}</div>
                      <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-0.5">
                        <span className="mono">{inc.id}</span>
                        <span>•</span>
                        <span>Resolved in <strong className="text-cyan-400">{inc.duration}</strong></span>
                        <span>•</span>
                        <span>Action: <strong className="text-purple-400">{inc.assigned_replacement}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-[10px] mono font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      {inc.resolved_at}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      {inc.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
