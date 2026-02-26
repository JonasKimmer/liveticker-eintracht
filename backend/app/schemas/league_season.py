"""
Pydantic Schemas für LeagueSeason.
"""

from pydantic import BaseModel, ConfigDict
from app.schemas.league import League
from app.schemas.season import Season


class LeagueSeasonBase(BaseModel):
    """Basis-Schema für LeagueSeason."""

    league_id: int
    season_id: int
    current_round: str | None = None
    total_rounds: int | None = None


class LeagueSeasonCreate(LeagueSeasonBase):
    """Schema zum Erstellen einer LeagueSeason."""

    pass


class LeagueSeasonUpdate(BaseModel):
    """Schema zum Aktualisieren einer LeagueSeason."""

    current_round: str | None = None
    total_rounds: int | None = None


class LeagueSeason(LeagueSeasonBase):
    """Vollständiges LeagueSeason-Schema (DB → API)."""

    id: int
    league: League  # ← Relationship!
    season: Season  # ← Relationship!

    model_config = ConfigDict(from_attributes=True)


class LeagueSeasonSimple(LeagueSeasonBase):
    """Einfaches Schema ohne Nested Objects (für Listen)."""

    id: int

    model_config = ConfigDict(from_attributes=True)
