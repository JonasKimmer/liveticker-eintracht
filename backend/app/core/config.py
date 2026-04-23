"""
Application Configuration
=========================
Zentrale Konfiguration mit Pydantic Settings.
Lädt Werte aus .env Datei.

Author: Jonas Kimmer
Date: 2025-02-14
"""

from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Liveticker AI System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10

    # API Keys
    API_FOOTBALL_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    OPENROUTER_API_KEY: Optional[str] = None

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # Server
    PUBLIC_BASE_URL: str = "http://localhost:8001"

    # LLM Settings
    OPENROUTER_MODEL: Optional[str] = "google/gemini-2.0-flash-lite-001"
    LLM_CONCURRENCY: int = 8  # Max gleichzeitige LLM-Requests (Semaphore)

    # API-Football Settings
    API_FOOTBALL_BASE_URL: str = "https://v3.football.api-sports.io"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()

if not settings.DATABASE_URL:
    raise ValueError("DATABASE_URL must be set in .env file!")
