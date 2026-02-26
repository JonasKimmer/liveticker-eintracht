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
    DEBUG: bool = True
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

    # WebSocket
    WS_HEARTBEAT_INTERVAL: int = 30

    # LLM Settings
    LLM_MODEL: str = "gpt-4"
    LLM_TEMPERATURE: float = 0.7
    LLM_MAX_TOKENS: int = 100
    OPENROUTER_MODEL: Optional[str] = "google/gemini-2.0-flash-lite"

    # API-Football Settings
    API_FOOTBALL_BASE_URL: str = "https://v3.football.api-sports.io"
    API_FOOTBALL_RATE_LIMIT: int = 100

    # n8n Webhooks
    N8N_WEBHOOK_LINEUP: str = "http://localhost:5678/webhook/lineups"
    N8N_WEBHOOK_EVENTS: str = "http://localhost:5678/webhook/Events"
    N8N_WEBHOOK_STATISTICS: str = "http://localhost:5678/webhook/statistics"
    N8N_WEBHOOK_PLAYER_STATISTICS: str = (
        "http://localhost:5678/webhook/Player-Statistics"
    )
    N8N_WEBHOOK_PREMATCH: str = "http://localhost:5678/webhook/import-prematch"
    N8N_WEBHOOK_COMPETITIONS: str = (
        "http://localhost:5678/webhook/import-team-competitions"
    )
    N8N_WEBHOOK_MATCHES: str = "http://localhost:5678/webhook/import-matches"
    N8N_WEBHOOK_COUNTRY: str = "http://localhost:5678/webhook/import-country"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()

if not settings.DATABASE_URL:
    raise ValueError("DATABASE_URL must be set in .env file!")
