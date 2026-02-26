"""
LeagueSeason Repository - Data Access Layer.
"""

from sqlalchemy.orm import Session, joinedload
from app.models.league_season import LeagueSeason
from app.schemas.league_season import LeagueSeasonCreate, LeagueSeasonUpdate


class LeagueSeasonRepository:
    """Repository für LeagueSeason-Datenbank-Operationen."""

    def __init__(self, db: Session):
        self.db = db

    def get_all(self, skip: int = 0, limit: int = 100) -> list[LeagueSeason]:
        """Holt alle LeagueSeasons mit Relationships."""
        return (
            self.db.query(LeagueSeason)
            .options(joinedload(LeagueSeason.league), joinedload(LeagueSeason.season))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_id(self, league_season_id: int) -> LeagueSeason | None:
        """Holt LeagueSeason nach ID mit Relationships."""
        return (
            self.db.query(LeagueSeason)
            .options(joinedload(LeagueSeason.league), joinedload(LeagueSeason.season))
            .filter(LeagueSeason.id == league_season_id)
            .first()
        )

    def get_by_league_and_season(
        self, league_id: int, season_id: int
    ) -> LeagueSeason | None:
        """Holt LeagueSeason nach Liga und Season."""
        return (
            self.db.query(LeagueSeason)
            .filter(
                LeagueSeason.league_id == league_id, LeagueSeason.season_id == season_id
            )
            .first()
        )

    def get_by_league(self, league_id: int) -> list[LeagueSeason]:
        """Holt alle Seasons einer Liga."""
        return (
            self.db.query(LeagueSeason)
            .options(joinedload(LeagueSeason.season))
            .filter(LeagueSeason.league_id == league_id)
            .all()
        )

    def create(self, league_season: LeagueSeasonCreate) -> LeagueSeason:
        """Erstellt neue LeagueSeason."""
        db_league_season = LeagueSeason(**league_season.model_dump())
        self.db.add(db_league_season)
        self.db.commit()
        self.db.refresh(db_league_season)
        return db_league_season

    def update(
        self, league_season_id: int, league_season_update: LeagueSeasonUpdate
    ) -> LeagueSeason | None:
        """Aktualisiert LeagueSeason."""
        db_league_season = self.get_by_id(league_season_id)
        if not db_league_season:
            return None

        update_data = league_season_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_league_season, key, value)

        self.db.commit()
        self.db.refresh(db_league_season)
        return db_league_season
