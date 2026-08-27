import { SimulationState, AgentStep, Incident, LiveEvent, MissionScore, Route, Vehicle } from '../types/fleet';

export type ConnectionStatus = 'connecting' | 'open' | 'closed';

export type WSMessageHandler = (data: {
  type: string;
  state?: SimulationState;
  incident?: Incident;
  active_incident?: Incident | null;
  step?: AgentStep;
  routes?: Route[];
  vehicles?: Array<any>;
  metrics?: MissionScore;
  sim_time?: string;
  [key: string]: any;
}) => void;

type StatusHandler = (status: ConnectionStatus) => void;

/** Live, client-measured link telemetry (real — no fabrication). */
export interface WsMetrics {
  msgPerSec: number;     // all inbound messages over the last rolling second
  tickHz: number;        // TELEMETRY_TICK cadence (Hz), from recent inter-tick intervals
  uptimeMs: number;      // time since the socket last opened (0 when not open)
  totalMessages: number; // messages received this session
  connected: boolean;
}
type MetricsHandler = (metrics: WsMetrics) => void;

/**
 * Derive the WebSocket URL. Mirrors the REST resolution in api.ts: same-origin in
 * production (so the FastAPI-served bundle just works), explicit :8000 in local dev.
 */
function resolveWsUrl(): string {
  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname, port, host } = window.location;
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
    const isDevServer = port === '3000' || port === '5173';
    const target = isDevServer ? `${hostname}:8000` : host;
    return `${wsProtocol}//${target}/ws/fleet`;
  }
  return 'ws://localhost:8000/ws/fleet';
}

class FleetWebSocket {
  private ws: WebSocket | null = null;
  private url: string = resolveWsUrl();
  private listeners: Set<WSMessageHandler> = new Set();
  private statusListeners: Set<StatusHandler> = new Set();
  private reconnectTimer: any = null;
  private reconnectAttempts: number = 0;
  private status: ConnectionStatus = 'closed';

  // --- link telemetry (real, client-measured) ---
  private metricsListeners: Set<MetricsHandler> = new Set();
  private metricsTimer: any = null;
  private msgTimes: number[] = [];   // recent message timestamps (trimmed to a 1s window)
  private tickTimes: number[] = [];  // recent TELEMETRY_TICK timestamps
  private totalMessages: number = 0;
  private openedAt: number | null = null;

  private setStatus(next: ConnectionStatus) {
    if (this.status === next) return;
    this.status = next;
    this.statusListeners.forEach((cb) => cb(next));
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.setStatus('connecting');
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.openedAt = Date.now();
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        this.setStatus('open');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const now = Date.now();
          this.totalMessages += 1;
          this.msgTimes.push(now);
          if (data && data.type === 'TELEMETRY_TICK') {
            this.tickTimes.push(now);
            if (this.tickTimes.length > 12) this.tickTimes.shift();
          }
          this.listeners.forEach((listener) => listener(data));
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      this.ws.onclose = () => {
        this.openedAt = null;
        this.setStatus('closed');
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        if (this.ws) {
          this.ws.close();
        }
      };
    } catch (err) {
      this.setStatus('closed');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    // Exponential backoff capped at 15s, so a downed backend doesn't hammer the network
    // but a brief blip still recovers quickly.
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 15000);
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  subscribe(listener: WSMessageHandler) {
    this.listeners.add(listener);
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.metricsTimer) clearInterval(this.metricsTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.status = 'closed';
    this.statusListeners.forEach((cb) => cb('closed'));
  }

  /** Subscribe to connection-status changes; fires immediately with the current status. */
  onStatus(listener: StatusHandler) {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private computeMetrics(): WsMetrics {
    const now = Date.now();
    // Messages per second over the last rolling second.
    this.msgTimes = this.msgTimes.filter((t) => now - t <= 1000);
    const msgPerSec = this.msgTimes.length;
    // Tick cadence from inter-tick intervals within the last 4s (smoother than instantaneous).
    const recentTicks = this.tickTimes.filter((t) => now - t <= 4000);
    let tickHz = 0;
    if (recentTicks.length >= 2) {
      const spanSec = (recentTicks[recentTicks.length - 1] - recentTicks[0]) / 1000;
      tickHz = spanSec > 0 ? (recentTicks.length - 1) / spanSec : 0;
    }
    return {
      msgPerSec,
      tickHz,
      uptimeMs: this.openedAt ? now - this.openedAt : 0,
      totalMessages: this.totalMessages,
      connected: this.status === 'open'
    };
  }

  /** Subscribe to live link telemetry; fires immediately, then ~once per second. */
  onMetrics(listener: MetricsHandler) {
    this.metricsListeners.add(listener);
    listener(this.computeMetrics());
    if (!this.metricsTimer) {
      this.metricsTimer = setInterval(() => {
        const m = this.computeMetrics();
        this.metricsListeners.forEach((cb) => cb(m));
      }, 1000);
    }
    return () => {
      this.metricsListeners.delete(listener);
      if (this.metricsListeners.size === 0 && this.metricsTimer) {
        clearInterval(this.metricsTimer);
        this.metricsTimer = null;
      }
    };
  }
}

export const fleetWS = new FleetWebSocket();

export function connectFleetWebSocket(handler: WSMessageHandler) {
  fleetWS.connect();
  return fleetWS.subscribe(handler);
}

export function disconnectFleetWebSocket() {
  fleetWS.disconnect();
}
