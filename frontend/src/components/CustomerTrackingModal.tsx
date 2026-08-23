import React, { useState, useEffect } from 'react';
import {
  Package,
  CheckCircle2,
  Clock,
  MapPin,
  Truck,
  User,
  X,
  Search,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { Order } from '../types/fleet';

interface CustomerTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrder: Order | null;
  orders: Order[];
}

export const CustomerTrackingModal: React.FC<CustomerTrackingModalProps> = ({
  isOpen,
  onClose,
  initialOrder,
  orders
}) => {
  const [searchId, setSearchId] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (initialOrder) {
      setSelectedOrder(initialOrder);
      setSearchId(initialOrder.id);
    } else if (orders.length > 0) {
      setSelectedOrder(orders[0]);
      setSearchId(orders[0].id);
    }
  }, [initialOrder, orders]);

  if (!isOpen) return null;

  const handleSearch = () => {
    const clean = searchId.replace('#', '').trim().toLowerCase();
    const match = orders.find(o => o.id.replace('#', '').toLowerCase() === clean);
    if (match) setSelectedOrder(match);
  };

  const order = selectedOrder || initialOrder || orders[0];
  const isDelivered = order?.status === 'DELIVERED';
  const isAtRisk = order?.status === 'AT_RISK' || (order?.delay_minutes || 0) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Brand Banner */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-cyan-950/80 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-extrabold tracking-wider font-mono text-white flex items-center gap-2">
                <span>FLEETOPS TRACKING</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  LIVE PORTAL
                </span>
              </div>
              <div className="text-[10px] text-slate-400">Public Commercial Shipment Tracking</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono">
          {/* Tracking Search Input */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Enter Tracking # (e.g. ORD-9842 / ERP-1001)"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-colors"
            >
              Track
            </button>
          </div>

          {order ? (
            <>
              {/* Order Delivery Status Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">SHIPMENT ID: <strong className="text-white">{order.id}</strong></span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isDelivered
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : isAtRisk
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    }`}
                  >
                    {isDelivered ? 'DELIVERED' : isAtRisk ? 'IN TRANSIT · SLIGHT DELAY' : 'ON SCHEDULE'}
                  </span>
                </div>

                {/* Progress Steps */}
                <div className="grid grid-cols-4 gap-1.5 pt-2 pb-1">
                  {[
                    { label: 'Ingested', done: true },
                    { label: 'Dispatched', done: true },
                    { label: 'In Transit', done: true },
                    { label: 'Delivered', done: isDelivered }
                  ].map((step, idx) => (
                    <div key={idx} className="space-y-1 text-center">
                      <div className={`h-1.5 rounded-full ${step.done ? 'bg-emerald-400' : 'bg-slate-800'}`} />
                      <div className={`text-[9px] ${step.done ? 'text-slate-200' : 'text-slate-600'}`}>{step.label}</div>
                    </div>
                  ))}
                </div>

                {/* Estimated Arrival Banner */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-emerald-300">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>Estimated Arrival Time:</span>
                  </div>
                  <span className="text-sm font-bold text-white">{order.revised_eta}</span>
                </div>
              </div>

              {/* Destination & Courier Info */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="text-slate-500 text-[10px] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" /> Destination
                  </div>
                  <div className="text-white font-bold truncate">{order.customer_name}</div>
                  <div className="text-slate-400 text-[10.5px] truncate">{order.destination?.address || 'Downtown Core'}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="text-slate-500 text-[10px] flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-cyan-400" /> Courier Assigned
                  </div>
                  <div className="text-white font-bold truncate">Unit {order.assigned_vehicle_id || 'V481'}</div>
                  <div className="text-slate-400 text-[10.5px]">Electric Van · 42 km/h</div>
                </div>
              </div>

              {/* Verified Digital e-POD Certificate if Delivered */}
              {isDelivered && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="text-emerald-300 font-bold">Proof of Delivery Verified</div>
                      <div className="text-emerald-400/70 text-[10px]">Signed by: {order.customer_name}</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400">e-Signature Stamped</span>
                </div>
              )}
            </>
          ) : (
            <div className="p-6 text-center text-slate-500">Order not found. Please enter a valid tracking number.</div>
          )}
        </div>
      </div>
    </div>
  );
};
