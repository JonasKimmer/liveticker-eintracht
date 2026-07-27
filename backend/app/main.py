"""
Liveticker AI Backend — FastAPI Application Entry Point
=======================================================
Registriert alle Router, Middleware (CORS) und Static Files.
Die OpenAPI-Dokumentation ist unter /api/docs erreichbar.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import subprocess
import logging

logger = logging.getLogger(__name__)

from app.api.v1 import (
    countries,
    teams,
    matches,
    events,
    ticker,
    seasons,
    competitions,
    media,
    players,
    clips,
)
from app.core.config import settings
from app.core.database import Base, engine, check_database_connection

from app.models import (  # noqa: F401
    country,
    team,
    season,
    competition,
    match,
    event,
    ticker_entry,
    synthetic_event,
    standing,
    competition_team,
    lineup,
    match_statistic,
    media_queue,
    player,
    player_statistic,
    media_clip,
)

STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
os.makedirs(os.path.join(STATIC_DIR, "thumbnails"), exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        result = subprocess.run(["alembic", "upgrade", "head"], capture_output=True, text=True, timeout=60)
        if result.returncode != 0:
            logger.error("Alembic migration failed: %s", result.stderr)
        else:
            logger.info("Alembic migrations applied")
    except Exception as e:
        logger.error("Alembic error: %s", e)
    yield


app = FastAPI(
    lifespan=lifespan,
    title="Liveticker AI Backend",
    description="KI-gestütztes Redaktionssystem für automatisierte Liveticker-Generierung",
    version="0.3.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = "/api/v1"

app.include_router(countries.router, prefix=PREFIX)
app.include_router(teams.router, prefix=PREFIX)
app.include_router(seasons.router, prefix=PREFIX)
app.include_router(competitions.router, prefix=PREFIX)
app.include_router(teams.assignment_router, prefix=PREFIX)
app.include_router(matches.router, prefix=PREFIX)
app.include_router(events.router, prefix=PREFIX)
app.include_router(ticker.router, prefix=PREFIX)
app.include_router(media.router, prefix=PREFIX)
app.include_router(media.ws_router)  # WebSocket ohne /api/v1 Prefix → /ws/media
app.include_router(players.router, prefix=PREFIX)
app.include_router(clips.router, prefix=PREFIX)


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", tags=["Meta"])
def read_root() -> dict:
    return {"status": "ok", "app": "Liveticker AI Backend", "version": "0.3.0"}


@app.get("/health", tags=["Meta"])
def health_check() -> dict:
    return {"status": "healthy"}


@app.get("/health/db", tags=["Meta"])
def health_check_db() -> dict:
    db_ok = check_database_connection()
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
    }
