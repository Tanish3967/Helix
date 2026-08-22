import logging
import json
import sys
from datetime import datetime
from typing import Optional, Dict, Any
from backend.config import settings

class JSONFormatter(logging.Formatter):
    """Formats log records as structured JSON lines for CloudWatch, Datadog, Grafana Loki."""
    def format(self, record: logging.LogRecord) -> str:
        log_data: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "line": record.lineno
        }
        if hasattr(record, "trace_id"):
            log_data["trace_id"] = record.trace_id
        if hasattr(record, "incident_id"):
            log_data["incident_id"] = record.incident_id
        if hasattr(record, "vehicle_id"):
            log_data["vehicle_id"] = record.vehicle_id
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_data)

def setup_logger(name: str = "fleetops") -> logging.Logger:
    logger = logging.getLogger(name)
    level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    logger.setLevel(level)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        if settings.LOG_JSON_FORMAT:
            handler.setFormatter(JSONFormatter())
        else:
            fmt = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
            handler.setFormatter(logging.Formatter(fmt))
        logger.addHandler(handler)

    return logger

log = setup_logger()
