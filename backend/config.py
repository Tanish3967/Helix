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

    # Enterprise OIDC / SSO Configuration
    OIDC_ENABLED: bool = os.getenv("OIDC_ENABLED", "false").lower() in ["true", "1", "yes"]
    OIDC_ISSUER_URL: str = os.getenv("OIDC_ISSUER_URL", "https://auth.enterprise-fleet.com/oauth2/v1")
    OIDC_CLIENT_ID: str = os.getenv("OIDC_CLIENT_ID", "fleetops-command-center")
    OIDC_CLIENT_SECRET: str = os.getenv("OIDC_CLIENT_SECRET", "fleetops-oidc-secret-token-change-in-vault")
    OIDC_AUDIENCE: str = os.getenv("OIDC_AUDIENCE", "api://fleetops")

    # IoT Telematics Cryptographic Ingestion Security
    TELEMATICS_HMAC_SECRET: str = os.getenv("TELEMATICS_HMAC_SECRET", "telematics-hardware-hmac-secret-2026")
    TELEMATICS_ENFORCE_SIGNATURE: bool = os.getenv("TELEMATICS_ENFORCE_SIGNATURE", "false").lower() in ["true", "1", "yes"]
    MAX_TIMESTAMP_DRIFT_SEC: int = int(os.getenv("MAX_TIMESTAMP_DRIFT_SEC", 60))

    # Circuit Breaker & Fallback Resilience
    CIRCUIT_BREAKER_FAIL_MAX: int = int(os.getenv("CIRCUIT_BREAKER_FAIL_MAX", 3))
    CIRCUIT_BREAKER_RESET_TIMEOUT_SEC: int = int(os.getenv("CIRCUIT_BREAKER_RESET_TIMEOUT_SEC", 15))

    # Rate Limiting
    RATE_LIMIT_DEFAULT: str = os.getenv("RATE_LIMIT_DEFAULT", "120/minute")
    RATE_LIMIT_MUTATION: str = os.getenv("RATE_LIMIT_MUTATION", "30/minute")

    # Observability & Metrics
    PROMETHEUS_ENABLED: bool = os.getenv("PROMETHEUS_ENABLED", "true").lower() in ["true", "1", "yes"]
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_JSON_FORMAT: bool = os.getenv("LOG_JSON_FORMAT", "false").lower() in ["true", "1", "yes"]

settings = Settings()
