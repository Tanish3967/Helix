import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal, CornerDownLeft, X, ChevronRight, Loader2 } from 'lucide-react';
import { sendCommand } from '../services/api';

export interface CommandResult {
  success: boolean;
  message: string;
  action?: string;
  data?: any;
}

interface CommandBarProps {
  isOpen: boolean;
  onClose: () => void;
  /** Handle a client-side action returned by the interpreter (focus_vehicle, open_panel, …). */
  onAction: (action: string, data?: any) => void;
}

interface TranscriptEntry {
  id: number;
  command: string;
  message: string;
  success: boolean;
}

// Curated starter commands shown before the operator has typed anything.
const SUGGESTIONS: { cmd: string; hint: string }[] = [
  { cmd: 'status', hint: 'Fleet + sim snapshot' },
  { cmd: 'breakdown V481', hint: 'Inject a vehicle fault' },
  { cmd: 'traffic highway_101 accident', hint: 'Congest a corridor' },
  { cmd: 'speed 2', hint: 'Run at 2×' },
  { cmd: 'focus V486', hint: 'Track a unit on the map' },
  { cmd: 'help', hint: 'Full command reference' }
];

// Actions that reveal something elsewhere in the UI — close the bar so it's visible.
const NAV_ACTIONS = new Set(['focus_vehicle', 'open_panel']);

export const CommandBar: React.FC<CommandBarProps> = ({ isOpen, onClose, onAction }) => {
  const [input, setInput] = useState('');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1); // -1 = live input
  const [busy, setBusy] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  // Focus the prompt whenever the bar opens.
  useEffect(() => {
    if (isOpen) {
      setHistoryIdx(-1);
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Keep the transcript pinned to the latest line.
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [transcript, busy]);

  const run = useCallback(
    async (raw: string) => {
      const command = raw.trim();
      if (!command || busy) return;

      setHistory((h) => [...h, command]);
      setHistoryIdx(-1);
      setInput('');
      setBusy(true);

      let result: CommandResult;
      try {
        result = await sendCommand(command);
      } catch (e) {
        result = { success: false, message: 'Command link unavailable — is the backend running?' };
      }

      seq.current += 1;
      setTranscript((t) => [
        ...t,
        { id: seq.current, command, message: result.message, success: result.success }
      ]);
      setBusy(false);

      if (result.action) {
        onAction(result.action, result.data);
        if (NAV_ACTIONS.has(result.action)) onClose();
      }
      // Return focus to the prompt for the next command.
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [busy, onAction, onClose]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      run(input);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!history.length) return;
      const next = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(next);
      setInput(history[next]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx === -1) return;
      const next = historyIdx + 1;
      if (next >= history.length) {
        setHistoryIdx(-1);
        setInput('');
      } else {
        setHistoryIdx(next);
        setInput(history[next]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4"
      style={{ background: 'rgba(3,5,8,0.82)', backdropFilter: 'blur(3px)', paddingTop: '13vh' }}
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Ask Aegis command bar"
    >
      <div
        className="panel scanlines w-full max-w-[640px] flex flex-col overflow-hidden"
        style={{ boxShadow: 'var(--shadow-pop)', maxHeight: '72vh' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Phosphor accent rail — marks this as the live command surface */}
        <div
          style={{
            height: '2px',
            background: 'linear-gradient(90deg, transparent, var(--signal-2), transparent)',
            boxShadow: '0 0 12px var(--signal-2)'
          }}
        />

        {/* Prompt line */}
        <div className="flex items-center gap-2.5 px-4 h-14 shrink-0" style={{ borderBottom: '1px solid var(--edge)' }}>
          <Terminal className="w-4 h-4 shrink-0" style={{ color: 'var(--signal-2)' }} />
          <span className="term-prompt text-[13px] shrink-0">AEGIS&gt;</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoComplete="off"
            placeholder="Type a command — e.g. breakdown V481, traffic highway_101, status"
            className="flex-1 bg-transparent outline-none text-[13.5px]"
            style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)', caretColor: 'var(--signal-2)' }}
            aria-label="Command input"
          />
          {busy ? (
            <Loader2 className="w-4 h-4 shrink-0 animate-spin" style={{ color: 'var(--signal-2)' }} />
          ) : (
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm shrink-0"
              aria-label="Close command bar"
              title="Close (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Transcript / suggestions */}
        <div ref={logRef} className="flex-1 overflow-y-auto px-4 py-3" style={{ fontFamily: 'var(--font-mono)' }}>
          {transcript.length === 0 ? (
            <div className="space-y-3">
              <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--ink-faint)' }}>
                Operations shell. Drive the fleet with natural language or slash commands — inject
                disruptions, steer playback, dispatch the agent swarm, or jump to any unit.
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.cmd}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => run(s.cmd)}
                    className="group flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors"
                    style={{ background: 'var(--panel-solid)', border: '1px solid var(--edge)' }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--edge-strong)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--edge)';
                    }}
                  >
                    <ChevronRight className="w-3 h-3 shrink-0" style={{ color: 'var(--signal-2)' }} />
                    <span className="flex flex-col min-w-0">
                      <span className="text-[12px] truncate" style={{ color: 'var(--ink)' }}>
                        {s.cmd}
                      </span>
                      <span className="text-[10px] truncate" style={{ color: 'var(--ink-faint)' }}>
                        {s.hint}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {transcript.map((entry) => (
                <div key={entry.id} className="space-y-1">
                  <div className="flex items-center gap-2 text-[12px]">
                    <span className="term-prompt shrink-0">AEGIS&gt;</span>
                    <span style={{ color: 'var(--ink-dim)' }}>{entry.command}</span>
                  </div>
                  <pre
                    className="text-[11.5px] leading-relaxed whitespace-pre-wrap pl-[52px]"
                    style={{
                      color: entry.success ? 'var(--ink-dim)' : 'var(--crit)',
                      fontFamily: 'var(--font-mono)',
                      margin: 0
                    }}
                  >
                    {entry.message}
                  </pre>
                </div>
              ))}
              {busy && (
                <div className="flex items-center gap-2 text-[11.5px] pl-[52px]" style={{ color: 'var(--ink-faint)' }}>
                  <span className="caret" style={{ height: '13px' }} />
                  <span>working…</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer key hints */}
        <div
          className="flex items-center justify-between px-4 h-9 shrink-0 text-[10px]"
          style={{ borderTop: '1px solid var(--edge)', color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}
        >
          <span className="flex items-center gap-1.5">
            <span className="status-dot status-dot--ion" />
            Ask Aegis · live command link
          </span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd style={kbdStyle}>↑</kbd>
              <kbd style={kbdStyle}>↓</kbd>
              history
            </span>
            <span className="flex items-center gap-1">
              <kbd style={kbdStyle}>
                <CornerDownLeft className="w-2.5 h-2.5" />
              </kbd>
              run
            </span>
            <span className="flex items-center gap-1">
              <kbd style={kbdStyle}>esc</kbd>
              close
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};

const kbdStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '16px',
  height: '16px',
  padding: '0 4px',
  borderRadius: '4px',
  background: 'rgba(148,163,184,0.1)',
  border: '1px solid var(--edge)',
  color: 'var(--ink-dim)',
  fontSize: '9.5px'
};
