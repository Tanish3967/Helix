import React, { useState } from 'react';
import { 
  Package, 
  X, 
  Search, 
  Clock, 
  MapPin, 
  Truck, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Filter
} from 'lucide-react';
import { Order } from '../types/fleet';

interface DeliveriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  onSelectVehicle?: (vId: string) => void;
}

export const DeliveriesModal: React.FC<DeliveriesModalProps> = ({
  isOpen,
  onClose,
  orders,
  onSelectVehicle
}) => {
  if (!isOpen) return null;

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredOrders = orders.filter((o) => {
    const matchesSearch = 
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.assigned_vehicle_id && o.assigned_vehicle_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.destination.address && o.destination.address.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = 
      statusFilter === 'ALL' ? true :
      statusFilter === 'AT_RISK' ? o.status === 'AT_RISK' || o.delay_minutes > 0 :
      statusFilter === 'IN_TRANSIT' ? o.status === 'IN_TRANSIT' :
      statusFilter === 'DELIVERED' ? o.status === 'DELIVERED' : true;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#0E131F] border border-[#1E293B] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#141B2D] border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-amber-600/20 border border-amber-500/40 flex items-center justify-center">
              <Package className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Live Deliveries & SLA Dispatch Register
              </h2>
              <p className="text-xs text-slate-400">
                Track all metropolitan delivery consignments, customer addresses, live ETAs, and cargo loads.
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

        {/* Filter Bar */}
        <div className="px-6 py-3 bg-[#101726] border-b border-[#1E293B] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search order ID, customer, vehicle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#0E131F] border border-[#1E293B] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none w-72"
              />
            </div>

            <div className="flex items-center space-x-1 bg-[#0E131F] border border-[#1E293B] rounded-lg p-1">
              {['ALL', 'IN_TRANSIT', 'AT_RISK', 'DELIVERED'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase transition-all ${
                    statusFilter === filter
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {filter.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-400 font-semibold">
            Showing <span className="text-white font-bold">{filteredOrders.length}</span> of {orders.length} Deliveries
          </div>
        </div>

        {/* Deliveries Table */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="border border-[#1E293B] rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#101726] text-[10px] uppercase font-bold text-slate-400 border-b border-[#1E293B]">
                <tr>
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Destination</th>
                  <th className="py-2.5 px-3">Assigned Vehicle</th>
                  <th className="py-2.5 px-3">Weight</th>
                  <th className="py-2.5 px-3">ETA</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/60 font-medium">
                {filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-[#141B2D]/80 transition-colors">
                    <td className="py-2.5 px-3 mono font-bold text-white">
                      {o.id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-200 font-semibold">
                      {o.customer_name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[140px]">{o.destination.address || 'Central District'}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      {o.assigned_vehicle_id ? (
                        <button
                          onClick={() => {
                            if (onSelectVehicle) onSelectVehicle(o.assigned_vehicle_id!);
                            onClose();
                          }}
                          className="mono font-bold text-blue-400 hover:text-blue-300 underline cursor-pointer"
                        >
                          {o.assigned_vehicle_id}
                        </button>
                      ) : (
                        <span className="text-slate-500">Unassigned</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 mono text-slate-300">
                      {o.weight_kg} kg
                    </td>
                    <td className="py-2.5 px-3 mono">
                      <div className="text-slate-200">{o.revised_eta || o.original_eta}</div>
                      {o.delay_minutes > 0 && (
                        <div className="text-[10px] text-red-400 font-bold">+{o.delay_minutes} min</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        o.status === 'AT_RISK' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        o.status === 'IN_TRANSIT' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        o.status === 'DELIVERED' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        'bg-slate-700 text-slate-300'
                      }`}>
                        {o.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
