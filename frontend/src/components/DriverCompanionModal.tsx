import React, { useState, useEffect } from 'react';
import {
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  Truck,
  PenTool,
  MapPin,
  X,
  Zap,
  UserCheck
} from 'lucide-react';
import { Vehicle, Order } from '../types/fleet';

interface DriverCompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVehicle: Vehicle | null;
  orders: Order[];
}

export const DriverCompanionModal: React.FC<DriverCompanionModalProps> = ({
  isOpen,
  onClose,
  selectedVehicle,
  orders
}) => {
  const [dutyStatus, setDutyStatus] = useState<'DRIVING' | 'ON_DUTY' | 'OFF_DUTY'>('DRIVING');
  const [signatureName, setSignatureName] = useState('Sarah Connor');
  const [isDelivered, setIsDelivered] = useState(false);
  const [detourAccepted, setDetourAccepted] = useState(false);

  if (!isOpen) return null;

  const vehicleId = selectedVehicle?.id || 'V481';
  const assignedOrders = orders.filter(o => o.assigned_vehicle_id === vehicleId || o.status === 'AT_RISK').slice(0, 3);
  const activeOrder = assignedOrders[0] || {
    id: '#ORD-9842',
    customer_name: 'Sarah Connor',
    destination: { address: '500 Howard St, Financial District' },
    revised_eta: '18:42:00',
    weight_kg: 14.5
  };

  const handleSignPOD = async () => {
    try {
      await fetch('/api/enterprise/driver/pod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: activeOrder.id.replace('#', ''),
          recipient_name: signatureName,
          signature_data: 'data:image/svg+xml;base64,e-sig-ok',
          notes: 'Signed via in-cab tablet POD terminal'
        })
      });
      setIsDelivered(true);
      setTimeout(() => setIsDelivered(false), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleHOSChange = async (status: 'DRIVING' | 'ON_DUTY' | 'OFF_DUTY') => {
    setDutyStatus(status);
    try {
      await fetch('/api/enterprise/driver/hos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_id: selectedVehicle?.driver_id || 'DRV-104',
          status: status,
          odometer: selectedVehicle?.odometer_km || 12450.0
        })
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* In-Cab HUD Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white font-mono">IN-CAB COMPANION</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {vehicleId} · {selectedVehicle?.model || 'Ford E-Transit'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">Driver: DRV-104 (Shift: 4.2h · Fatigue: Nominal)</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono">
          {/* FMCSA Hours-of-Service (HOS) Duty Status Bar */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-400 text-[11px]">FMCSA ELD DUTY:</span>
            </div>
            <div className="flex items-center gap-1">
              {(['DRIVING', 'ON_DUTY', 'OFF_DUTY'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => handleHOSChange(st)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                    dutyStatus === st
                      ? 'bg-cyan-500 text-slate-950 shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* AI Detour Prompt Banner if Disrupted */}
          {selectedVehicle?.status === 'AT_RISK' && !detourAccepted && (
            <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-amber-300 font-bold">AI SWARM DETOUR SUGGESTED</div>
                  <div className="text-amber-200/80 text-[11px]">Traffic congestion detected. Detour via Mission St saves 8.4 mins.</div>
                </div>
              </div>
              <button
                onClick={() => setDetourAccepted(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold flex items-center gap-1.5 transition-colors shrink-0"
              >
                <Zap className="w-3.5 h-3.5" />
                Accept Detour
              </button>
            </div>
          )}

          {/* Turn-by-Turn Waypoint Guidance Card */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-cyan-400" />
                <span>NEXT DELIVERY STOP</span>
              </span>
              <span className="text-emerald-400 font-bold">ETA: {activeOrder.revised_eta}</span>
            </div>

            <div className="text-base font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-400" />
              <span>{activeOrder.destination?.address || '500 Howard St, Financial District'}</span>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
              <span>Order: <strong>{activeOrder.id}</strong></span>
              <span>Customer: <strong>{activeOrder.customer_name}</strong></span>
              <span>Weight: <strong>{activeOrder.weight_kg} kg</strong></span>
            </div>
          </div>

          {/* Electronic Proof of Delivery (e-POD) */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-400">
                <PenTool className="w-4 h-4 text-emerald-400" />
                <span>DIGITAL PROOF OF DELIVERY (e-POD)</span>
              </span>
              {isDelivered && (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Delivered & Verified
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                placeholder="Recipient Full Name"
                className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 text-xs"
              />
              <button
                onClick={handleSignPOD}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-1.5 transition-colors"
              >
                <UserCheck className="w-4 h-4" />
                Confirm Delivery
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
