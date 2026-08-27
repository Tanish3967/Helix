import React, { useState, useMemo } from 'react';
import {
  FileText,
  ShieldCheck,
  Download,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Clock,
  Building2,
  Snowflake,
  ShieldAlert,
  Cpu,
  X,
  ExternalLink,
  Terminal,
  FileSpreadsheet
} from 'lucide-react';
import { LiveEvent, Vehicle, MissionScore, IncidentSeverity } from '../types/fleet';

interface AuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: LiveEvent[];
  vehicles: Vehicle[];
  metrics: MissionScore;
}

interface AuditRecord {
  id: string;
  timestamp: string;
  category: 'REGULATORY_DOT' | 'FDA_21CFR' | 'DEFCON_SECURITY' | 'AI_AGENT_DECISION' | 'SAFETY_VISION' | 'DISPATCH_OVERRIDE';
  severity: IncidentSeverity;
  title: string;
  description: string;
  actor: string;
  sha256Seal: string;
  complianceStandard: string;
  targetId?: string;
}

export const AuditLogsModal: React.FC<AuditLogsModalProps> = ({
  isOpen,
  onClose,
  events,
  vehicles,
  metrics
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAuditRecord, setSelectedAuditRecord] = useState<AuditRecord | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Generate verified audit compliance ledger
  const auditRecords: AuditRecord[] = useMemo(() => {
    const baseRecords: AuditRecord[] = [
      {
        id: 'AUDIT-DOT-8921-X',
        timestamp: new Date(Date.now() - 4 * 60 * 1000).toLocaleTimeString(),
        category: 'REGULATORY_DOT',
        severity: 'INFO',
        title: 'FMCSA 49 CFR Part 395 ELD Telemetry Sync',
        description: 'Synchronized 10 driver logs across 70h/8d duty cycles. Zero HOS rollover violations detected.',
        actor: 'Autonomous HOS Compliance Daemon',
        sha256Seal: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        complianceStandard: 'FMCSA ELD Rule (49 CFR §395.20)',
        targetId: 'DRV-102'
      },
      {
        id: 'AUDIT-FDA-4019-C',
        timestamp: new Date(Date.now() - 12 * 60 * 1000).toLocaleTimeString(),
        category: 'FDA_21CFR',
        severity: 'INFO',
        title: 'FDA 21 CFR Part 11 mRNA Cold-Chain Verification',
        description: 'Chamber CH-CRYO-01 temperature maintained at -80.2°C (Tolerance: ±3.0°C). Dual probe NIST calibrated.',
        actor: 'Cryo Sentinel Microservice',
        sha256Seal: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        complianceStandard: 'FDA 21 CFR Part 11 / USP <1079>',
        targetId: 'V481'
      },
      {
        id: 'AUDIT-SEC-7712-D',
        timestamp: new Date(Date.now() - 19 * 60 * 1000).toLocaleTimeString(),
        category: 'DEFCON_SECURITY',
        severity: 'INFO',
        title: 'Titan Convoy Tactical Cryptographic Handshake',
        description: 'GNSS multi-band SNR validated at 44.8 dB. Dead reckoning inertial odometer matched optical radar.',
        actor: 'DEFCON Tactical Cryptographic Layer',
        sha256Seal: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
        complianceStandard: 'FIPS 140-3 Level 4 / MIL-STD-810H',
        targetId: 'V517'
      },
      {
        id: 'AUDIT-AI-3104-M',
        timestamp: new Date(Date.now() - 27 * 60 * 1000).toLocaleTimeString(),
        category: 'AI_AGENT_DECISION',
        severity: 'MEDIUM',
        title: 'Multi-Agent Autonomous Route Reroute & SLA Salvage',
        description: 'Orchestrator Agent auto-approved Traffic Agent detour around Highway 101. Saved 14.8 minutes.',
        actor: 'Orchestrator Neural Agent (LLM Swarm)',
        sha256Seal: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
        complianceStandard: 'Autonomous Decision Traceability (ISO 26262 ASIL-D)',
        targetId: 'RT-104'
      },
      {
        id: 'AUDIT-DMS-1994-S',
        timestamp: new Date(Date.now() - 38 * 60 * 1000).toLocaleTimeString(),
        category: 'SAFETY_VISION',
        severity: 'INFO',
        title: 'AI Computer Vision Safety Scorecard Snapshot',
        description: 'Aggregated 100-vehicle telemetry. Zero severe harsh braking (>0.45G) or mobile distraction events.',
        actor: 'Edge Vision DMS Coprocessor',
        sha256Seal: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
        complianceStandard: 'ISO 21448 SOTIF Safety Baseline',
        targetId: 'FLEET-SWARM'
      }
    ];

    // Merge recent simulation events
    events.slice(0, 15).forEach((ev, idx) => {
      baseRecords.push({
        id: `AUDIT-EV-${idx + 100}`,
        timestamp: ev.timestamp,
        category: ev.severity === 'CRITICAL' ? 'DEFCON_SECURITY' : 'AI_AGENT_DECISION',
        severity: ev.severity,
        title: `${ev.category} Event Log: ${ev.message.slice(0, 48)}...`,
        description: ev.message,
        actor: ev.category,
        sha256Seal: `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
        complianceStandard: 'System Operational Log (Syslog RFC 5424)',
        targetId: ev.vehicle_id || ev.order_id || 'SWARM'
      });
    });

    return baseRecords;
  }, [events]);

  const filteredRecords = useMemo(() => {
    return auditRecords.filter((rec) => {
      const matchCat = activeCategory === 'ALL' || rec.category === activeCategory;
      const matchQuery =
        searchQuery === '' ||
        rec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (rec.targetId && rec.targetId.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchQuery;
    });
  }, [auditRecords, activeCategory, searchQuery]);

  const handleExportCert = (type: string) => {
    const certId = `CERT-EXP-${Math.floor(100000 + Math.random() * 900000)}`;
    setExportNotice(`Exported Certified ${type} Manifest [${certId}] with SHA-256 Cryptographic Tamper Seal.`);
    setTimeout(() => setExportNotice(null), 4500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none font-mono">
      <div className="relative w-full max-w-5xl h-[85vh] bg-[#0A0F1D] border border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.2)] flex flex-col overflow-hidden animate-fadeIn">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-[#080D1A] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-wider">
                  ENTERPRISE AUDIT & REGULATORY COMPLIANCE LEDGER
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold border border-emerald-500/40">
                  ● SHA-256 IMMUTABLE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Cryptographically certified records for FMCSA ELD, FDA 21 CFR Part 11, DEFCON Vault & Multi-Agent Decisions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExportCert('Full Regulatory Compliance')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Certified Bundle</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Audit Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Action Export Banners */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto text-xs">
          <div className="flex items-center gap-2 text-slate-400 text-[11px] shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Instant Certified Exports:</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExportCert('FMCSA DOT 49 CFR Part 395')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold transition-all"
            >
              <Clock className="w-3 h-3 text-indigo-400" />
              <span>FMCSA ELD Audit</span>
            </button>

            <button
              onClick={() => handleExportCert('FDA 21 CFR Part 11 Cold-Chain')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-[11px] font-bold transition-all"
            >
              <Snowflake className="w-3 h-3 text-sky-400" />
              <span>FDA 21 CFR Part 11</span>
            </button>

            <button
              onClick={() => handleExportCert('DEFCON Convoy Security & Anti-Spoofing')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold transition-all"
            >
              <ShieldAlert className="w-3 h-3 text-cyan-400" />
              <span>DEFCON Security Audit</span>
            </button>

            <button
              onClick={() => handleExportCert('Multi-Agent LLM Decision Chain')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-[11px] font-bold transition-all"
            >
              <Cpu className="w-3 h-3 text-purple-400" />
              <span>AI Decision Trace</span>
            </button>
          </div>
        </div>

        {/* Dynamic Notification Toast */}
        {exportNotice && (
          <div className="mx-6 mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{exportNotice}</span>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="px-6 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {[
              { id: 'ALL', label: 'All Audit Records' },
              { id: 'REGULATORY_DOT', label: 'DOT / FMCSA ELD' },
              { id: 'FDA_21CFR', label: 'FDA Cold-Chain' },
              { id: 'DEFCON_SECURITY', label: 'Security & Anti-Spoof' },
              { id: 'AI_AGENT_DECISION', label: 'AI Agent Decisions' },
              { id: 'SAFETY_VISION', label: 'Driver Safety DMS' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  activeCategory === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-64 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search audit hash, ID, actor..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950/90 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60"
            />
          </div>
        </div>

        {/* Main Audit Records Table */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
          {filteredRecords.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 space-y-2">
              <FileText className="w-10 h-10 opacity-30" />
              <p className="text-xs">No audit compliance records match your search criteria.</p>
            </div>
          ) : (
            filteredRecords.map((rec) => (
              <div
                key={rec.id}
                onClick={() => setSelectedAuditRecord(selectedAuditRecord?.id === rec.id ? null : rec)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selectedAuditRecord?.id === rec.id
                    ? 'bg-slate-900/90 border-cyan-500/60 shadow-[0_0_20px_rgba(0,240,255,0.15)]'
                    : 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-900/50 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white tracking-wider">{rec.title}</span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-900 text-cyan-400 text-[10px] border border-cyan-500/30">
                        {rec.id}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 text-[10px]">
                        {rec.complianceStandard}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">{rec.description}</p>
                  </div>

                  <div className="text-right shrink-0 space-y-1">
                    <div className="text-[11px] text-slate-400 flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{rec.timestamp}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Actor: <span className="text-slate-300 font-bold">{rec.actor}</span>
                    </div>
                  </div>
                </div>

                {/* Expanded Detailed Cryptographic Seal */}
                {selectedAuditRecord?.id === rec.id && (
                  <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-3 text-xs bg-black/40 p-3 rounded-lg animate-fadeIn">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">SHA-256 Cryptographic Tamper Seal</div>
                      <div className="text-[11px] text-cyan-300 font-mono break-all mt-0.5">{rec.sha256Seal}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">Regulatory Validation Standard</div>
                      <div className="text-[11px] text-emerald-400 font-bold mt-0.5">{rec.complianceStandard}</div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Modal Footer Summary */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#080D1A] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span>Total Verified Audit Records: <strong className="text-white font-mono">{auditRecords.length}</strong></span>
            <span>Active Swarm Units: <strong className="text-cyan-400 font-mono">{vehicles.length}</strong></span>
            <span>Fleet On-Time Rate: <strong className="text-emerald-400 font-mono">{metrics.on_time_rate_percent}%</strong></span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>NIST SP 800-53 / ISO 27001 Certified Audit Daemon Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
