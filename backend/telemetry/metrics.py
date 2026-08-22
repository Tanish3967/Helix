from typing import Any
from fastapi import Response

try:
    from prometheus_client import Counter, Gauge, Histogram, generate_latest, CONTENT_TYPE_LATEST
    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False
    CONTENT_TYPE_LATEST = "text/plain; version=0.0.4; charset=utf-8"
    
    # Mock fallback classes for local zero-dependency development
    class MockMetric:
        def __init__(self, *args, **kwargs):
            self._val = 0
        def inc(self, val=1):
            self._val += val
        def dec(self, val=1):
            self._val -= val
        def set(self, val):
            self._val = val
        def labels(self, *args, **kwargs):
            return self
        def observe(self, val):
            pass

    Gauge = MockMetric
    Counter = MockMetric
    Histogram = MockMetric
    def generate_latest():
        return b"# HELP fleetops_active_vehicles_total Total active vehicles\n# TYPE fleetops_active_vehicles_total gauge\nfleetops_active_vehicles_total 100.0\n"

# ----------------------------------------------------
# Prometheus Fleet Telemetry Metric Instruments
# ----------------------------------------------------

FLEET_ACTIVE_VEHICLES = Gauge(
    "fleetops_active_vehicles_total",
    "Total active vehicles currently in the fleet"
)

FLEET_WS_CONNECTIONS = Gauge(
    "fleetops_websocket_connections_active",
    "Current number of active operator WebSocket stream connections"
)

FLEET_INCIDENTS_TOTAL = Counter(
    "fleetops_incidents_injected_total",
    "Total incidents detected or injected into the simulation",
    ["type", "severity"]
)

FLEET_RESOLUTIONS_TOTAL = Counter(
    "fleetops_incidents_resolved_total",
    "Total autonomous multi-agent incident resolutions completed"
)

FLEET_AGENT_TOOL_DURATION = Histogram(
    "fleetops_agent_tool_execution_seconds",
    "Latency of deterministic agent tool calls",
    ["agent_name", "tool_name"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5)
)

FLEET_HTTP_REQUESTS = Counter(
    "fleetops_http_requests_total",
    "Total HTTP requests handled by the API",
    ["method", "endpoint", "status_code"]
)

def get_prometheus_metrics_response() -> Response:
    """Renders Prometheus metrics payload."""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )
