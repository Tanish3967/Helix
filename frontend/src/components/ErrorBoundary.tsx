import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Terminal, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05070A] text-slate-100 p-6 select-none font-mono">
          <div className="max-w-xl w-full bg-[#0D1515] border border-rose-500/50 rounded-2xl p-6 shadow-[0_0_50px_rgba(239,68,68,0.25)] space-y-4 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wider flex items-center gap-2">
                  <span>COMMAND CENTER TELEMETRY INTERCEPTION</span>
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] border border-rose-500/40">
                    ERR-RECOVER
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  An unexpected UI exception was isolated. Subsystem telemetry remains preserved.
                </p>
              </div>
            </div>

            {/* Error Message Box */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
              <div className="text-[11px] font-bold text-rose-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                <span>{this.state.error?.name || 'Runtime Exception'}:</span>
              </div>
              <div className="text-xs text-slate-200 font-sans break-words leading-relaxed">
                {this.state.error?.message || 'Unknown render exception.'}
              </div>
            </div>

            {/* Stack trace preview (collapsed/compact) */}
            {this.state.errorInfo?.componentStack && (
              <div className="max-h-32 overflow-y-auto p-2.5 rounded-lg bg-black/60 border border-slate-900 text-[10px] text-slate-500 leading-normal">
                {this.state.errorInfo.componentStack}
              </div>
            )}

            {/* Recovery Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
              >
                Attempt In-Memory Recovery
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-Initialize Command Center</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
