from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, List, Optional, Union

from pydantic import AnyHttpUrl, EmailStr, Field, PostgresDsn, RedisDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ── Application ───────────────────────────────────────────
    APP_ENV: str = "development"
    APP_NAME: str = "Hospital Asset Management System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str
    ALLOWED_HOSTS: Union[List[str], str] = ["*"]
    CORS_ORIGINS: Union[List[str], str] = []

    @field_validator("ALLOWED_HOSTS", "CORS_ORIGINS", mode="before")
    @classmethod
    def parse_list(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [i.strip() for i in v.split(",") if i.strip()]
        return v

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    @property
    def is_development(self) -> bool:
        return self.APP_ENV == "development"

    # ── PostgreSQL ─────────────────────────────────────────────
    POSTGRES_HOST: str = "postgres"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "hams"
    POSTGRES_USER: str = "hams_user"
    POSTGRES_PASSWORD: str = "hams_password"
    DATABASE_URL: str = ""
    DATABASE_URL_SYNC: str = ""

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_async_db_url(cls, v: str, info: Any) -> str:
        if v:
            return v
        data = info.data
        return (
            f"postgresql+asyncpg://{data.get('POSTGRES_USER')}:"
            f"{data.get('POSTGRES_PASSWORD')}@{data.get('POSTGRES_HOST')}:"
            f"{data.get('POSTGRES_PORT')}/{data.get('POSTGRES_DB')}"
        )

    @field_validator("DATABASE_URL_SYNC", mode="before")
    @classmethod
    def assemble_sync_db_url(cls, v: str, info: Any) -> str:
        if v:
            return v
        data = info.data
        return (
            f"postgresql://{data.get('POSTGRES_USER')}:"
            f"{data.get('POSTGRES_PASSWORD')}@{data.get('POSTGRES_HOST')}:"
            f"{data.get('POSTGRES_PORT')}/{data.get('POSTGRES_DB')}"
        )

    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800
    DB_ECHO: bool = False

    # ── Redis ─────────────────────────────────────────────────
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB: int = 0
    REDIS_URL: str = "redis://redis:6379/0"

    # ── Celery ───────────────────────────────────────────────
    CELERY_BROKER_URL: str = "redis://redis:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/2"
    CELERY_TASK_SERIALIZER: str = "json"
    CELERY_RESULT_SERIALIZER: str = "json"
    CELERY_ACCEPT_CONTENT: List[str] = ["json"]
    CELERY_TIMEZONE: str = "Asia/Kolkata"

    # ── JWT ──────────────────────────────────────────────────
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── MinIO ─────────────────────────────────────────────────
    MINIO_ENDPOINT: str = "minio:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET_ASSETS: str = "hams-assets"
    MINIO_SECURE: bool = False

    # ── Sentry ───────────────────────────────────────────────
    SENTRY_DSN: Optional[str] = None
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1
    SENTRY_ENVIRONMENT: str = "development"

    # ── Email ─────────────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: str = "noreply@hospital.com"
    SMTP_TLS: bool = True

    # ── Logging ──────────────────────────────────────────────
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
