# app/main.py
"""
FastAPI Hauptanwendung.
Liveticker-Backend für KI-gestützte Textgenerierung.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import (
    teams,
    matches,
    events,
    ticker_entries,
    ticker,
    leagues,
    seasons,
    league_seasons,
    favorites,
    player_statistics,
    match_statistics,
    lineups,
)
from app.core.database import engine, Base

# Import ALL models so they're registered with Base.metadata
from app.models.team import Team
from app.models.league import League
from app.models.season import Season
from app.models.league_season import LeagueSeason
from app.models.match import Match
from app.models.event import Event
from app.models.ticker_entry import TickerEntry
from app.models.user_favorite import UserFavorite
from app.models.match_statistic import MatchStatistic
from app.models.lineup import Lineup
from app.models.player_statistic import PlayerStatistic
from app.models.synthetic_event import SyntheticEvent
from app.models.team_league import TeamLeague


# DB-Tabellen erstellen (falls nicht vorhanden)
Base.metadata.create_all(bind=engine)


# FastAPI App
app = FastAPI(
    title="Liveticker AI Backend",
    description="KI-gestütztes Redaktionssystem für automatisierte Liveticker-Generierung",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)


# CORS (für React Frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Routes einbinden
app.include_router(teams.router, prefix="/api/v1")
app.include_router(matches.router, prefix="/api/v1")
app.include_router(events.router, prefix="/api/v1")
app.include_router(ticker_entries.router, prefix="/api/v1")
app.include_router(ticker.router, prefix="/api/v1")
app.include_router(leagues.router, prefix="/api/v1")
app.include_router(seasons.router, prefix="/api/v1")
app.include_router(league_seasons.router, prefix="/api/v1")
app.include_router(favorites.router, prefix="/api/v1")
app.include_router(player_statistics.router, prefix="/api/v1")
app.include_router(match_statistics.router, prefix="/api/v1")
app.include_router(lineups.router, prefix="/api/v1")


# Health Check
@app.get("/")
def read_root():
    """Health Check Endpoint."""
    return {"status": "ok", "app": "Liveticker AI Backend", "version": "0.1.0"}


@app.get("/health")
def health_check():
    """Detaillierter Health Check."""
    try:
        from app.core.database import SessionLocal

        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        db_status = True
    except Exception:
        db_status = False

    return {
        "status": "healthy" if db_status else "degraded",
        "database": "connected" if db_status else "disconnected",
    }
