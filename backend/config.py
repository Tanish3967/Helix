import os
from typing import List, Union

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
    class ConfigBase(BaseSettings):
        model_config = SettingsConfigDict(
            env_file=".env",
            env_file_encoding="utf-8",
            case_sensitive=True,
            extra="ignore"
        )
except ImportError:
    from pydantic import BaseModel
    class ConfigBase(BaseModel):
        pass

class Settings(ConfigBase):
    # App General Settings
    APP_NAME: str = os.getenv("APP_NAME", "FleetOps AI")
    APP_VERSION: str = os.getenv("APP_VERSION", "1.0.0")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() in ["true", "1", "yes"]
    PORT: int = int(os.getenv("PORT", 8000))
    HOST: str = os.getenv("HOST", "0.0.0.0")

    # CORS Whitelist
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]

    # Database Configuration (PostgreSQL/PostGIS or SQLite Fallback)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./fleetops.db")
    DB_POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", 5))
    DB_MAX_OVERFLOW: int = int(os.getenv("DB_MAX_OVERFLOW", 10))

    # Redis Configuration
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    REDIS_ENABLED: bool = os.getenv("REDIS_ENABLED", "false").lower() in ["true", "1", "yes"]

    # Authentication & Security
    AUTH_REQUIRED: bool = os.getenv("AUTH_REQUIRED", "false").lower() in ["true", "1", "yes"]
    SECRET_KEY: str = os.getenv("SECRET_KEY", "fleetops-super-secret-production-key-change-in-env-94829384729")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60 * 24))

    # Rate Limiting
    RATE_LIMIT_DEFAULT: str = os.getenv("RATE_LIMIT_DEFAULT", "120/minute")
    RATE_LIMIT_MUTATION: str = os.getenv("RATE_LIMIT_MUTATION", "30/minute")

    # Observability & Metrics
    PROMETHEUS_ENABLED: bool = os.getenv("PROMETHEUS_ENABLED", "true").lower() in ["true", "1", "yes"]
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_JSON_FORMAT: bool = os.getenv("LOG_JSON_FORMAT", "false").lower() in ["true", "1", "yes"]

settings = Settings()
