import json
from datetime import datetime
from typing import Optional, List, Dict, Any, Generator
from sqlalchemy import create_engine, Column, String, Integer, Float, Text, DateTime, Boolean, Index
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from backend.config import settings

# Configure Engine based on Dialect (PostgreSQL vs SQLite)
is_sqlite = settings.DATABASE_URL.startswith("sqlite")

if is_sqlite:
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_pre_ping=True
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class UserRecord(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(128), nullable=True)
    role = Column(String(32), default="operator")  # "admin", "operator", "viewer"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class IncidentRecord(Base):
    __tablename__ = "incidents"

    id = Column(String(64), primary_key=True, index=True)
    type = Column(String(64), index=True)
    severity = Column(String(32))
    title = Column(String(255))
    description = Column(Text)
    affected_vehicle_ids = Column(Text)  # JSON array string
    affected_order_ids = Column(Text)    # JSON array string
    detected_at = Column(DateTime, default=datetime.utcnow, index=True)
    resolved_at = Column(DateTime, nullable=True)
    resolution_status = Column(String(32), default="Active", index=True)
    resolution_summary = Column(Text, nullable=True)

class AgentExecutionRecord(Base):
    __tablename__ = "agent_executions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    incident_id = Column(String(64), index=True)
    agent_name = Column(String(64), index=True)
    state = Column(String(32))
    summary = Column(Text)
    detail = Column(Text)
    tool_calls = Column(Text)  # JSON string
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

class VehicleRecord(Base):
    __tablename__ = "vehicles_history"

    id = Column(String(32), primary_key=True)
    model = Column(String(64))
    type = Column(String(64))
    status = Column(String(32))
    current_lat = Column(Float)
    current_lng = Column(Float)
    battery_fuel_percent = Column(Float)
    last_updated = Column(DateTime, default=datetime.utcnow)

def init_db():
    """Initializes tables and seeds default user if none exist."""
    Base.metadata.create_all(bind=engine)

def get_db() -> Generator[Session, None, None]:
    """FastAPI Dependency for database sessions with automatic cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def save_incident(incident_dict: Dict[str, Any]):
    db = SessionLocal()
    try:
        rec = IncidentRecord(
            id=incident_dict["id"],
            type=incident_dict["type"],
            severity=incident_dict.get("severity", "HIGH"),
            title=incident_dict["title"],
            description=incident_dict["description"],
            affected_vehicle_ids=json.dumps(incident_dict.get("affected_vehicle_ids", [])),
            affected_order_ids=json.dumps(incident_dict.get("affected_order_ids", [])),
            detected_at=datetime.utcnow(),
            resolution_status=incident_dict.get("resolution_status", "Active"),
            resolution_summary=incident_dict.get("resolution_summary")
        )
        db.merge(rec)
        db.commit()
    except Exception as e:
        db.rollback()
    finally:
        db.close()

def save_agent_step(incident_id: str, step_dict: Dict[str, Any]):
    db = SessionLocal()
    try:
        rec = AgentExecutionRecord(
            incident_id=incident_id,
            agent_name=step_dict["agent_name"],
            state=step_dict["state"],
            summary=step_dict["summary"],
            detail=step_dict["detail"],
            tool_calls=json.dumps(step_dict.get("tool_calls", [])),
            timestamp=datetime.utcnow()
        )
        db.add(rec)
        db.commit()
    except Exception as e:
        db.rollback()
    finally:
        db.close()

def get_recent_incidents(limit: int = 50) -> List[Dict[str, Any]]:
    db = SessionLocal()
    try:
        records = db.query(IncidentRecord).order_by(IncidentRecord.detected_at.desc()).limit(limit).all()
        return [
            {
                "id": r.id,
                "type": r.type,
                "severity": r.severity,
                "title": r.title,
                "description": r.description,
                "affected_vehicle_ids": json.loads(r.affected_vehicle_ids or "[]"),
                "affected_order_ids": json.loads(r.affected_order_ids or "[]"),
                "detected_at": r.detected_at.isoformat() if r.detected_at else None,
                "resolved_at": r.resolved_at.isoformat() if r.resolved_at else None,
                "resolution_status": r.resolution_status,
                "resolution_summary": r.resolution_summary
            }
            for r in records
        ]
    finally:
        db.close()
