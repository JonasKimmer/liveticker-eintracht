from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import (
    teams,
    matches,
    events,
    ticker_entries,
    ticker,
    seasons,
    favorites,
    player_statistics,
    match_statistics,
    lineups,
    competitions,
)
from app.core.database import engine, Base

from app.models.team import Team
from app.models.season import Season
from app.models.competition import Competition
from app.models.match import Match
from app.models.event import Event
from app.models.ticker_entry import TickerEntry
from app.models.user_favorite import UserFavorite
from app.models.match_statistic import MatchStatistic
from app.models.lineup import Lineup
from app.models.player_statistic import PlayerStatistic
from app.models.synthetic_event import SyntheticEvent
from app.models.standing import Standing

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Liveticker AI Backend",
    description="KI-gestütztes Redaktionssystem für automatisierte Liveticker-Generierung",
    version="0.2.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(teams.router, prefix="/api/v1")
app.include_router(matches.router, prefix="/api/v1")
app.include_router(events.router, prefix="/api/v1")
app.include_router(ticker_entries.router, prefix="/api/v1")
app.include_router(ticker.router, prefix="/api/v1")
app.include_router(seasons.router, prefix="/api/v1")
app.include_router(favorites.router, prefix="/api/v1")
app.include_router(player_statistics.router, prefix="/api/v1")
app.include_router(match_statistics.router, prefix="/api/v1")
app.include_router(lineups.router, prefix="/api/v1")
app.include_router(competitions.router, prefix="/api/v1")


@app.get("/")
def read_root():
    return {"status": "ok", "app": "Liveticker AI Backend", "version": "0.2.0"}


@app.get("/health")
def health_check():
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
