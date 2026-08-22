import React, { useState } from 'react';
import { 
  Settings, 
  X, 
  Volume2, 
  VolumeX, 
  Sliders, 
  ShieldCheck, 
  Radio, 
  RefreshCw, 
  Cpu, 
  Database,
  Check
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  soundEnabled,
  onToggleSound
}) => {
  if (!isOpen) return null;

  const [autoRemediation, setAutoRemediation] = useState<boolean>(true);
  const [telemetryFrequency, setTelemetryFrequency] = useState<number>(1000);
  const [themeAccent, setThemeAccent] = useState<string>('blue');
  const [aiModelProvider, setAiModelProvider] = useState<string>('gemini-2.5-pro');
  const [debugLogs, setDebugLogs] = useState<boolean>(false);
  const [savedToast, setSavedToast] = useState<boolean>(false);

  const handleSave = () => {
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#0E131F] border border-[#1E293B] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-[#141B2D] border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
              <Settings className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                FleetOps System Configuration
              </h2>
              <p className="text-xs text-slate-400">
                Configure autonomous dispatch engine, telemetry streaming, and operator preferences.
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
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Section 1: Autonomous Remediation */}
          <div className="bg-[#141B2D] border border-[#1E293B] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Cpu className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="text-xs font-bold text-white">Autonomous Agent Auto-Remediation</div>
                  <div className="text-[11px] text-slate-400">Automatically trigger multi-agent dispatch & rerouting upon telemetry anomaly</div>
                </div>
              </div>
              <button
                onClick={() => setAutoRemediation(!autoRemediation)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  autoRemediation ? 'bg-purple-600' : 'bg-slate-700'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  autoRemediation ? 'left-6' : 'left-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#1E293B]">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-xs font-bold text-white">Orchestration AI Engine</div>
                  <div className="text-[11px] text-slate-400">Underlying reasoning LLM for dispatch & customer agents</div>
                </div>
              </div>
              <select
                value={aiModelProvider}
                onChange={(e) => setAiModelProvider(e.target.value)}
                className="bg-[#0E131F] border border-[#1E293B] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
              >
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Autonomous)</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Ultra-Low Latency)</option>
                <option value="claude-3-7-sonnet">Claude 3.7 Sonnet</option>
              </select>
            </div>
          </div>

          {/* Section 2: Audio & Alerts */}
          <div className="bg-[#141B2D] border border-[#1E293B] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                )}
                <div>
                  <div className="text-xs font-bold text-white">Audio Chimes & Incident Sirens</div>
                  <div className="text-[11px] text-slate-400">Play auditory chimes upon critical vehicle breakdowns & agent resolutions</div>
                </div>
              </div>
              <button
                onClick={onToggleSound}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  soundEnabled ? 'bg-emerald-600' : 'bg-slate-700'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  soundEnabled ? 'left-6' : 'left-1'
                }`} />
              </button>
            </div>
          </div>

          {/* Section 3: Telemetry & Streaming */}
          <div className="bg-[#141B2D] border border-[#1E293B] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Radio className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="text-xs font-bold text-white">Live Telemetry Rate</div>
                  <div className="text-[11px] text-slate-400">WebSocket broadcast cadence for GPS waypoint progression</div>
                </div>
              </div>
              <select
                value={telemetryFrequency}
                onChange={(e) => setTelemetryFrequency(Number(e.target.value))}
                className="bg-[#0E131F] border border-[#1E293B] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
              >
                <option value={500}>500ms (High Fidelity)</option>
                <option value={1000}>1000ms (Standard 1Hz)</option>
                <option value={2000}>2000ms (Bandwidth Saver)</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#1E293B]">
              <div className="flex items-center space-x-2.5">
                <Database className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-xs font-bold text-white">Verbose Telemetry Debug Logs</div>
                  <div className="text-[11px] text-slate-400">Log raw GeoJSON waypoint vectors to browser console</div>
                </div>
              </div>
              <button
                onClick={() => setDebugLogs(!debugLogs)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  debugLogs ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  debugLogs ? 'left-6' : 'left-1'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#141B2D] border-t border-[#1E293B] flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            {savedToast ? (
              <span className="text-emerald-400 font-bold flex items-center space-x-1">
                <Check className="w-3.5 h-3.5 inline-block" />
                <span>Preferences Saved!</span>
              </span>
            ) : (
              <span>Engine Status: Connected to ws://localhost:8000</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white bg-[#0E131F] hover:bg-[#1E293B] border border-[#1E293B] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition-all shadow-md shadow-blue-600/30"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
