import React, { useState } from 'react';
import { PackageCheck, PackageX } from 'lucide-react';
import { Order, OrderStatus } from '../types/fleet';

interface DeliveriesTableProps {
  orders: Order[];
  onSelectVehicle?: (vId: string) => void;
  onTrackOrder?: (order: Order) => void;
}

// Map each order status onto a design-system token + display label.
function statusMeta(status: OrderStatus, atRisk: boolean): { color: string; label: string } {
  if (atRisk || status === 'AT_RISK') return { color: 'var(--crit)', label: 'At Risk' };
  switch (status) {
    case 'REASSIGNED':
      return { color: 'var(--violet)', label: 'Reassigned' };
    case 'DELIVERED':
      return { color: 'var(--signal)', label: 'Delivered' };
    case 'CANCELLED':
      return { color: 'var(--ink-faint)', label: 'Cancelled' };
    case 'IN_TRANSIT':
      return { color: 'var(--ion)', label: 'In Transit' };
    default:
      return { color: 'var(--ink-dim)', label: 'Pending' };
  }
}

export const DeliveriesTable: React.FC<DeliveriesTableProps> = ({ orders, onSelectVehicle, onTrackOrder }) => {
  const [tab, setTab] = useState<'affected' | 'all'>('affected');

  const affectedList = orders.filter(
    (o) => o.status === 'AT_RISK' || o.status === 'REASSIGNED' || o.delay_minutes > 0
  );
  const displayList = tab === 'affected' ? affectedList : orders;
  const hasRows = displayList.length > 0;

  const emptyCopy =
    tab === 'affected' ? 'No deliveries at risk — fleet on schedule' : 'No deliveries in the system yet';
  const EmptyIcon = tab === 'affected' ? PackageCheck : PackageX;

  return (
    <section className="panel flex flex-col h-full overflow-hidden">
      {/* Header: title + tab switch */}
      <div className="panel-head">
        <span className="eyebrow">Deliveries</span>
        <div className="segmented" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'affected'}
            className={tab === 'affected' ? 'is-active' : ''}
            onClick={() => setTab('affected')}
          >
            Affected ({affectedList.length})
          </button>
          <button
            role="tab"
            aria-selected={tab === 'all'}
            className={tab === 'all' ? 'is-active' : ''}
            onClick={() => setTab('all')}
          >
            All ({orders.length})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {hasRows ? (
          <table className="w-full text-left border-collapse">
            <thead
              className="sticky top-0 z-[1]"
              style={{ background: 'var(--panel-solid)' }}
            >
              <tr style={{ borderBottom: '1px solid var(--edge)' }}>
                {['Order', 'Customer', 'Orig ETA', 'New ETA', 'Delay', 'Status'].map((h, i) => (
                  <th
                    key={h}
                    className={`py-2 px-3 eyebrow ${i === 5 ? 'text-right pr-4' : ''}`}
                    style={{ fontSize: '9px' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayList.map((order, index) => {
                const isAtRisk = order.status === 'AT_RISK' || order.delay_minutes > 0;
                const meta = statusMeta(order.status, isAtRisk);
                const vId = order.assigned_vehicle_id || undefined;
                const clickable = Boolean(vId && onSelectVehicle);
                const orderId = order.id.startsWith('#') ? order.id : `#${order.id}`;
                return (
                  <tr
                    key={order.id || index}
                    onClick={clickable ? () => onSelectVehicle!(vId!) : undefined}
                    className={`transition-colors ${clickable ? 'cursor-pointer' : ''}`}
                    style={{ borderBottom: '1px solid var(--edge)' }}
                    title={clickable ? `Focus ${vId} on map` : undefined}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(148,163,184,0.05)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                    }}
                  >
                    <td className="py-2.5 px-3 readout text-[11px] font-semibold" style={{ color: 'var(--ink-dim)' }}>
                      {orderId}
                    </td>
                    <td
                      className="py-2.5 px-3 text-[11.5px] font-semibold truncate max-w-[130px]"
                      style={{ color: 'var(--ink)' }}
                    >
                      {order.customer_name}
                    </td>
                    <td className="py-2.5 px-3 readout text-[11px]" style={{ color: 'var(--ink-faint)' }}>
                      {order.original_eta}
                    </td>
                    <td className="py-2.5 px-3 readout text-[11px] font-semibold" style={{ color: 'var(--ink)' }}>
                      {order.revised_eta}
                    </td>
                    <td className="py-2.5 px-3 readout text-[11px]">
                      {order.delay_minutes > 0 ? (
                        <span className="font-bold" style={{ color: 'var(--crit)' }}>
                          +{order.delay_minutes}m
                        </span>
                      ) : (
                        <span style={{ color: 'var(--signal)' }}>On time</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <span
                          className="text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                          style={{
                            color: meta.color,
                            background: `color-mix(in srgb, ${meta.color} 15%, transparent)`,
                            border: `1px solid color-mix(in srgb, ${meta.color} 32%, transparent)`,
                            fontFamily: 'var(--font-mono)'
                          }}
                        >
                          {meta.label}
                        </span>
                        {onTrackOrder && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTrackOrder(order);
                            }}
                            className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-400 border border-slate-700 transition-colors"
                            title="Open Customer Live Tracking Link"
                          >
                            Track
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-2 py-8 text-center">
            <EmptyIcon
              className="w-6 h-6"
              style={{ color: tab === 'affected' ? 'var(--signal)' : 'var(--ink-mute)' }}
            />
            <p className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>
              {emptyCopy}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
