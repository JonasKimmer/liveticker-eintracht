from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import (
    countries,
    teams,
    matches,
    events,
    ticker,
    seasons,
    favorites,
    competitions,
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
    user_favorite,
    synthetic_event,
    standing,
    competition_team,
    lineup,
    match_statistic,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Liveticker AI Backend",
    description="KI-gestütztes Redaktionssystem für automatisierte Liveticker-Generierung",
    version="0.3.0",
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

PREFIX = "/api/v1"

app.include_router(countries.router, prefix=PREFIX)
app.include_router(teams.router, prefix=PREFIX)
app.include_router(seasons.router, prefix=PREFIX)
app.include_router(competitions.router, prefix=PREFIX)
app.include_router(teams.assignment_router, prefix=PREFIX)
app.include_router(matches.router, prefix=PREFIX)
app.include_router(events.router, prefix=PREFIX)
app.include_router(ticker.router, prefix=PREFIX)
app.include_router(favorites.router, prefix=PREFIX)


@app.get("/", tags=["Meta"])
def read_root() -> dict:
    return {"status": "ok", "app": "Liveticker AI Backend", "version": "0.3.0"}


@app.get("/health", tags=["Meta"])
def health_check() -> dict:
    db_ok = check_database_connection()
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
    }
