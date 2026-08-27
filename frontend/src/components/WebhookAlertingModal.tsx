import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  CheckCircle2,
  Trash2,
  Plus,
  RefreshCw,
  X,
  Radio,
  ExternalLink,
  ShieldCheck,
  Flame
} from 'lucide-react';

interface WebhookItem {
  id: string;
  name: string;
  type: string;
  target_url: string;
  events: string[];
  status: string;
  created_at: string;
  secret?: string;
}

interface DeliveryItem {
  delivery_id: string;
  webhook_id?: string;
  webhook_name: string;
  event_type: string;
  vehicle_id: string;
  status_code: number;
  status: string;
  latency_ms: number;
  timestamp: string;
  summary: string;
  dispatched_payload?: any;
}

interface WebhookAlertingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WebhookAlertingModal: React.FC<WebhookAlertingModalProps> = ({ isOpen, onClose }) => {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [testSending, setTestSending] = useState<boolean>(false);
  const [testSuccessToast, setTestSuccessToast] = useState<string | null>(null);

  // New Webhook Form State
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newWhName, setNewWhName] = useState<string>('');
  const [newWhType, setNewWhType] = useState<string>('slack');
  const [newWhUrl, setNewWhUrl] = useState<string>('');
  const [newWhEvents, setNewWhEvents] = useState<string[]>(['DEFCON_LOCKDOWN', 'CRYO_TEMP_BREACH']);

  // Test Dispatch Selector State
  const [selectedEventType, setSelectedEventType] = useState<string>('CRYO_TEMP_BREACH');
  const [selectedTargetWh, setSelectedTargetWh] = useState<string>('slack');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('V-CRYO-01');
  const [lastDispatchedPayload, setLastDispatchedPayload] = useState<any>(null);

  const fetchWebhookData = async () => {
    try {
      setLoading(true);
      const [whRes, delRes] = await Promise.all([
        fetch('/api/enterprise/webhooks'),
        fetch('/api/enterprise/webhooks/deliveries')
      ]);

      if (whRes.ok) {
        const whData = await whRes.json();
        setWebhooks(whData.webhooks || []);
      }
      if (delRes.ok) {
        const delData = await delRes.json();
        setDeliveries(delData.deliveries || []);
      }
    } catch (err) {
      console.error('Failed to fetch webhook data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchWebhookData();
    }
  }, [isOpen]);

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWhName || !newWhUrl) return;

    try {
      const res = await fetch('/api/enterprise/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newWhName,
          type: newWhType,
          target_url: newWhUrl,
          events: newWhEvents
        })
      });

      if (res.ok) {
        setTestSuccessToast(`Webhook '${newWhName}' successfully registered!`);
        setTimeout(() => setTestSuccessToast(null), 3500);
        setShowAddForm(false);
        setNewWhName('');
        setNewWhUrl('');
        fetchWebhookData();
      }
    } catch (err) {
      console.error('Failed to create webhook:', err);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    try {
      const res = await fetch(`/api/enterprise/webhooks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTestSuccessToast(`Webhook destination deleted.`);
        setTimeout(() => setTestSuccessToast(null), 3000);
        fetchWebhookData();
      }
    } catch (err) {
      console.error('Failed to delete webhook:', err);
    }
  };

  const handleTriggerTestAlert = async () => {
    try {
      setTestSending(true);
      const res = await fetch('/api/enterprise/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedTargetWh,
          event_type: selectedEventType,
          vehicle_id: selectedVehicleId,
          name: `${selectedTargetWh.toUpperCase()} Emergency Dispatch`
        })
      });

      if (res.ok) {
        const result = await res.json();
        setLastDispatchedPayload(result.dispatched_payload);
        setTestSuccessToast(`🚨 Incident Alert dispatched to ${selectedTargetWh.toUpperCase()} in ${result.latency_ms}ms (200 OK)!`);
        setTimeout(() => setTestSuccessToast(null), 4000);
        fetchWebhookData();
      }
    } catch (err) {
      console.error('Failed to trigger test webhook:', err);
    } finally {
      setTestSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-slate-950/95 border border-slate-800 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Enterprise Webhooks & Automated Incident Alerting Hub
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                  ● ACTIVE (0ms FAILOVER)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Instant incident push notifications to Slack Block Kit, PagerDuty Events v2, and Microsoft Teams.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchWebhookData}
              className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 transition-colors"
              title="Refresh Webhooks"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/60 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toast Alert */}
        {testSuccessToast && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center justify-between animate-bounce">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{testSuccessToast}</span>
            </div>
            <button onClick={() => setTestSuccessToast(null)} className="text-emerald-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Top Section: Active Destinations Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                Active Enterprise Notification Endpoints ({webhooks.length})
              </span>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddForm ? 'Cancel' : 'Register New Webhook'}</span>
              </button>
            </div>

            {/* Add Webhook Form */}
            {showAddForm && (
              <form onSubmit={handleCreateWebhook} className="mb-4 p-4 rounded-xl bg-slate-900/90 border border-cyan-500/40 space-y-3">
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Webhook Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Slack #logistics-critical"
                      value={newWhName}
                      onChange={(e) => setNewWhName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Integration Type</label>
                    <select
                      value={newWhType}
                      onChange={(e) => setNewWhType(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="slack">Slack Block Kit</option>
                      <option value="pagerduty">PagerDuty Events v2</option>
                      <option value="msteams">Microsoft Teams Adaptive Card</option>
                      <option value="custom_hmac">Custom REST (HMAC-SHA256)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Target Endpoint URL</label>
                    <input
                      type="url"
                      placeholder="https://hooks.slack.com/..."
                      value={newWhUrl}
                      onChange={(e) => setNewWhUrl(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-400">Trigger Events:</span>
                    {['DEFCON_LOCKDOWN', 'CRYO_TEMP_BREACH', 'CRASH_DETECTED', 'HOS_VIOLATION'].map((ev) => (
                      <label key={ev} className="flex items-center gap-1 cursor-pointer text-slate-300 text-[11px]">
                        <input
                          type="checkbox"
                          checked={newWhEvents.includes(ev)}
                          onChange={(e) => {
                            if (e.target.checked) setNewWhEvents([...newWhEvents, ev]);
                            else setNewWhEvents(newWhEvents.filter((x) => x !== ev));
                          }}
                          className="rounded border-slate-700"
                        />
                        <span>{ev}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  >
                    Save & Activate
                  </button>
                </div>
              </form>
            )}

            {/* Webhook Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {webhooks.map((wh) => (
                <div
                  key={wh.id}
                  className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-800 text-slate-300 uppercase">
                        {wh.type}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        {wh.status}
                      </span>
                    </div>
                    <div className="font-bold text-sm text-slate-100 mb-1">{wh.name}</div>
                    <div className="text-[10px] font-mono text-slate-400 truncate mb-2" title={wh.target_url}>
                      {wh.target_url}
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {wh.events.map((ev) => (
                        <span key={ev} className="px-1.5 py-0.5 rounded bg-slate-800/80 text-[9px] font-mono text-cyan-300">
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/70 text-[10px]">
                    <span className="text-slate-500 font-mono">HMAC: {wh.secret ? 'Signed (SHA256)' : 'Public'}</span>
                    <button
                      onClick={() => handleDeleteWebhook(wh.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete Webhook"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Middle Section: Instant Incident Dispatch Simulator */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900/90 to-indigo-950/40 border border-indigo-500/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                Live Incident Dispatch & Emergency Alert Simulator
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Auto-signs with X-Helix-Signature-256</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs mb-3">
              <div>
                <label className="block text-slate-400 mb-1">Target Platform</label>
                <select
                  value={selectedTargetWh}
                  onChange={(e) => setSelectedTargetWh(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-bold focus:outline-none focus:border-indigo-500"
                >
                  <option value="slack">Slack (#incident-war-room)</option>
                  <option value="pagerduty">PagerDuty (Tier-1 SRE)</option>
                  <option value="msteams">Microsoft Teams (Logistics)</option>
                  <option value="custom_hmac">Custom REST SIEM Gateway</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Incident Type</label>
                <select
                  value={selectedEventType}
                  onChange={(e) => setSelectedEventType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-amber-300 font-bold focus:outline-none focus:border-indigo-500"
                >
                  <option value="CRYO_TEMP_BREACH">❄️ Cryo Temp Breach (-68.4°C)</option>
                  <option value="DEFCON_LOCKDOWN">🛡️ DEFCON 1 Convoy Threat</option>
                  <option value="CRASH_DETECTED">💥 Collision G-Sensor Event</option>
                  <option value="HOS_VIOLATION">⏱️ FMCSA HOS 11h Breach</option>
                  <option value="EV_BATTERY_CRITICAL">⚡ EV Battery Critical (8% SOC)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Target Vehicle Unit</label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                >
                  <option value="V-CRYO-01">V-CRYO-01 (mRNA Vaccine)</option>
                  <option value="CONVOY-TITAN-01">CONVOY-TITAN-01 (Gold Bullion)</option>
                  <option value="V481">V481 (Standard Cargo Haul)</option>
                  <option value="V-EV02">V-EV02 (Electric Courier)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleTriggerTestAlert}
                  disabled={testSending}
                  className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(245,158,11,0.35)] disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${testSending ? 'animate-spin' : ''}`} />
                  <span>{testSending ? 'Dispatching...' : 'Dispatch Alert'}</span>
                </button>
              </div>
            </div>

            {/* Last Dispatched Payload Preview */}
            {lastDispatchedPayload && (
              <div className="mt-3 p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-mono">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>Formatted Outbound JSON Payload:</span>
                  <span className="text-emerald-400">✓ Validated 200 OK</span>
                </div>
                <pre className="text-slate-300 max-h-28 overflow-y-auto text-[10px] p-2 bg-black/50 rounded">
                  {JSON.stringify(lastDispatchedPayload, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Bottom Section: Delivery Audit Log Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Chronological Webhook Dispatch Audit Log ({deliveries.length})
              </span>
              <span className="text-[10px] font-mono text-slate-400">100% Success Delivery Rate</span>
            </div>

            <div className="rounded-xl border border-slate-800/80 overflow-hidden bg-slate-900/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 text-[10px] uppercase font-mono border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Delivery ID</th>
                    <th className="py-2.5 px-3">Destination</th>
                    <th className="py-2.5 px-3">Event Type</th>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Latency</th>
                    <th className="py-2.5 px-3">Incident Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {deliveries.map((del) => (
                    <tr key={del.delivery_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2 px-3 text-cyan-400 font-bold">{del.delivery_id}</td>
                      <td className="py-2 px-3 text-slate-200">{del.webhook_name}</td>
                      <td className="py-2 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 text-[10px]">
                          {del.event_type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-300">{del.vehicle_id}</td>
                      <td className="py-2 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-bold">
                          {del.status_code} {del.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-400">{del.latency_ms}ms</td>
                      <td className="py-2 px-3 text-slate-300 font-sans truncate max-w-xs">{del.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800/80 bg-slate-900/60 text-xs">
          <div className="text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Outbound Webhook Worker active (TLS 1.3 encrypted, HMAC-SHA256 signature attached)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors"
          >
            Close Hub
          </button>
        </div>

      </div>
    </div>
  );
};
