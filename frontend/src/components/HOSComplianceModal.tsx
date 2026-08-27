import React, { useState, useEffect } from 'react';
import {
  Clock,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  Coffee,
  Truck,
  Moon,
  CheckCircle2,
  X,
  Sparkles,
  RefreshCw,
  Award,
  Download
} from 'lucide-react';
import { ELDLogRecord } from '../types/fleet';

interface HOSComplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HOSComplianceModal: React.FC<HOSComplianceModalProps> = ({
  isOpen,
  onClose
}) => {
  const [eldRecords, setEldRecords] = useState<ELDLogRecord[]>([
    {
      id: 'ELD-1001',
      driver_id: 'DRV-101',
      driver_name: 'Marcus Vance',
      vehicle_id: 'V481',
      current_duty_status: 'DRIVING',
      driving_time_minutes: 420.0,
      on_duty_time_minutes: 540.0,
      cycle_time_minutes: 2100.0,
      time_until_break_minutes: 60.0,
      compliance_status: 'COMPLIANT',
      suggested_rest_stop: 'Bay Area Oasis Plaza Rest Area (Exit 42B)',
      last_status_change: '13:30:00'
    },
    {
      id: 'ELD-1002',
      driver_id: 'DRV-102',
      driver_name: 'Elena Rostova',
      vehicle_id: 'V485',
      current_duty_status: 'ON_DUTY_NOT_DRIVING',
      driving_time_minutes: 310.0,
      on_duty_time_minutes: 480.0,
      cycle_time_minutes: 1800.0,
      time_until_break_minutes: 170.0,
      compliance_status: 'COMPLIANT',
      suggested_rest_stop: 'Oakland Port Commercial Staging Zone',
      last_status_change: '14:15:00'
    },
    {
      id: 'ELD-1003',
      driver_id: 'DRV-103',
      driver_name: 'David Ross',
      vehicle_id: 'V490',
      current_duty_status: 'DRIVING',
      driving_time_minutes: 610.0,
      on_duty_time_minutes: 780.0,
      cycle_time_minutes: 3900.0,
      time_until_break_minutes: 20.0,
      compliance_status: 'APPROACHING_LIMIT',
      suggested_rest_stop: 'San Jose South Truck Plaza (Exit 12)',
      last_status_change: '11:00:00'
    },
    {
      id: 'ELD-1004',
      driver_id: 'DRV-104',
      driver_name: 'Sarah Jenkins',
      vehicle_id: 'V512',
      current_duty_status: 'SLEEPER_BERTH',
      driving_time_minutes: 0.0,
      on_duty_time_minutes: 0.0,
      cycle_time_minutes: 1200.0,
      time_until_break_minutes: 480.0,
      compliance_status: 'COMPLIANT',
      suggested_rest_stop: 'Depot Yard Driver Quarters',
      last_status_change: '10:00:00'
    }
  ]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('DRV-101');
  const [complianceRate, setComplianceRate] = useState<number>(100);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [auditMessage, setAuditMessage] = useState<string | null>(null);

  const fetchLogs = () => {
    fetch('/api/enterprise/hos/logs')
      .then(res => res.json())
      .then(data => {
        if (data && data.eld_records) {
          setEldRecords(data.eld_records);
          setComplianceRate(data.fleet_compliance_percent || 100);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedRecord = eldRecords.find(r => r.driver_id === selectedDriverId) || eldRecords[0];

  const handleStatusChange = async (driverId: string, newStatus: 'OFF_DUTY' | 'SLEEPER_BERTH' | 'DRIVING' | 'ON_DUTY_NOT_DRIVING') => {
    try {
      const res = await fetch('/api/enterprise/hos/duty-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: driverId, new_duty_status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setEldRecords(prev => prev.map(r => r.driver_id === driverId ? { ...r, current_duty_status: newStatus } : r));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportAudit = async () => {
    setIsExporting(true);
    setAuditMessage(null);
    try {
      const res = await fetch('/api/enterprise/hos/audit-export', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setAuditMessage(`DOT/FMCSA Audit Manifest [${data.audit_id}] Certified & Encrypted with SHA-256 Tamper Seal!`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  const driveRemainingHrs = Math.max(0, ((660 - selectedRecord.driving_time_minutes) / 60)).toFixed(1);
  const shiftRemainingHrs = Math.max(0, ((840 - selectedRecord.on_duty_time_minutes) / 60)).toFixed(1);
  const cycleRemainingHrs = Math.max(0, ((4200 - selectedRecord.cycle_time_minutes) / 60)).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                HOURS OF SERVICE (HOS) & ELD COMPLIANCE ENGINE
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  DOT / FMCSA CERTIFIED
                </span>
              </h2>
              <p className="text-xs text-slate-400">Electronic Logging Device (ELD) timelines, mandatory rest breaks, and regulatory audit packages.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportAudit}
              disabled={isExporting}
              className="px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Certifying...' : 'Export DOT Audit'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Audit Banner */}
        {auditMessage && (
          <div className="px-6 py-2.5 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{auditMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs font-mono">
          {/* Top Vitals Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10.5px]">HOS COMPLIANCE</span>
              <div className="text-base sm:text-lg font-bold text-emerald-400">{complianceRate}%</div>
              <div className="text-[10px] text-slate-500">4 Active Drivers</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10.5px]">DRIVE TIME (11H)</span>
              <div className="text-base sm:text-lg font-bold text-sky-400">{driveRemainingHrs}h Left</div>
              <div className="text-[10px] text-slate-500">{selectedRecord.driver_name}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10.5px]">SHIFT LIMIT (14H)</span>
              <div className="text-base sm:text-lg font-bold text-indigo-400">{shiftRemainingHrs}h Left</div>
              <div className="text-[10px] text-slate-500">On-Duty Window</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 text-[10.5px]">NEXT BREAK</span>
              <div className={`text-base sm:text-lg font-bold ${selectedRecord.time_until_break_minutes <= 30 ? 'text-amber-400 animate-pulse' : 'text-cyan-400'}`}>
                {selectedRecord.time_until_break_minutes} min
              </div>
              <div className="text-[10px] text-slate-500">30-min Break Req.</div>
            </div>
          </div>

          {/* Graphical 24-Hour ELD Duty Timeline Visualizer */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-bold flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-indigo-400" />
                24-HOUR ELD ELECTRONIC LOGBOOK GRID — {selectedRecord.driver_name} ({selectedRecord.vehicle_id})
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                selectedRecord.compliance_status === 'COMPLIANT' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {selectedRecord.compliance_status}
              </span>
            </div>

            {/* 4-Line Duty Status Graph */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center gap-2">
                <span className="w-20 text-[10px] text-slate-400">1: OFF DUTY</span>
                <div className="flex-1 h-3.5 bg-slate-900 rounded flex overflow-hidden border border-slate-800">
                  <div className="w-[30%] bg-slate-700/60" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-20 text-[10px] text-slate-400">2: SLEEPER</span>
                <div className="flex-1 h-3.5 bg-slate-900 rounded flex overflow-hidden border border-slate-800">
                  <div className="w-[15%] bg-purple-600/60" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-20 text-[10px] text-sky-400 font-bold">3: DRIVING</span>
                <div className="flex-1 h-3.5 bg-slate-900 rounded flex overflow-hidden border border-slate-800">
                  <div className="w-[50%] bg-sky-500" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-20 text-[10px] text-amber-400">4: ON DUTY</span>
                <div className="flex-1 h-3.5 bg-slate-900 rounded flex overflow-hidden border border-slate-800">
                  <div className="w-[65%] bg-amber-500/80" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800">
              <span>00:00 (Midnight)</span>
              <span>06:00 AM</span>
              <span>12:00 PM (Noon)</span>
              <span>18:00 PM</span>
              <span>24:00 (Midnight)</span>
            </div>
          </div>

          {/* Driver Roster & Interactive Duty Switcher */}
          <div className="space-y-3">
            <div className="text-slate-400 text-xs font-bold">FLEET DRIVER ELD ROSTER & DUTY CONTROLS</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {eldRecords.map((driver) => {
                const isSelected = driver.driver_id === selectedDriverId;
                return (
                  <div
                    key={driver.id}
                    onClick={() => setSelectedDriverId(driver.driver_id)}
                    className={`p-3.5 rounded-xl bg-slate-950 border cursor-pointer transition-all space-y-2.5 ${
                      isSelected
                        ? 'border-indigo-500/80 shadow-[0_0_15px_rgba(99,102,241,0.15)] bg-slate-950'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white text-xs">{driver.driver_name}</span>
                        <span className="text-slate-500 text-[10.5px] ml-2">({driver.vehicle_id})</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
                        driver.current_duty_status === 'DRIVING' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                        driver.current_duty_status === 'ON_DUTY_NOT_DRIVING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        driver.current_duty_status === 'SLEEPER_BERTH' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                        'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {driver.current_duty_status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Suggested Rest Stop: <span className="text-amber-300">{driver.suggested_rest_stop}</span>
                    </div>

                    {/* Quick Duty Buttons */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-800">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStatusChange(driver.driver_id, 'DRIVING'); }}
                        className="py-1 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 text-[9.5px] font-bold border border-sky-500/20"
                      >
                        Driving
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStatusChange(driver.driver_id, 'ON_DUTY_NOT_DRIVING'); }}
                        className="py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[9.5px] font-bold border border-amber-500/20"
                      >
                        On-Duty
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStatusChange(driver.driver_id, 'SLEEPER_BERTH'); }}
                        className="py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-[9.5px] font-bold border border-purple-500/20"
                      >
                        Sleeper
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStatusChange(driver.driver_id, 'OFF_DUTY'); }}
                        className="py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9.5px] font-bold border border-slate-700"
                      >
                        Off-Duty
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
