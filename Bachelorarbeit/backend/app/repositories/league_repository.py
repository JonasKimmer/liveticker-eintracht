"""
League Repository - Data Access Layer.
"""

from sqlalchemy.orm import Session
from app.models.league import League
from app.schemas.league import LeagueCreate, LeagueUpdate


class LeagueRepository:
    """Repository für League-Datenbank-Operationen."""

    def __init__(self, db: Session):
        self.db = db

    def get_all(self, skip: int = 0, limit: int = 100) -> list[League]:
        """Holt alle Ligen."""
        return self.db.query(League).offset(skip).limit(limit).all()

    def get_by_id(self, league_id: int) -> League | None:
        """Holt Liga nach ID."""
        return self.db.query(League).filter(League.id == league_id).first()

    def get_by_external_id(self, external_id: int) -> League | None:
        """Holt Liga nach External ID (API-Football)."""
        return self.db.query(League).filter(League.external_id == external_id).first()

    def create(self, league: LeagueCreate) -> League:
        """Erstellt neue Liga."""
        db_league = League(**league.model_dump())
        self.db.add(db_league)
        self.db.commit()
        self.db.refresh(db_league)
        return db_league

    def update(self, league_id: int, league_update: LeagueUpdate) -> League | None:
        """Aktualisiert Liga."""
        db_league = self.get_by_id(league_id)
        if not db_league:
            return None

        update_data = league_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_league, key, value)

        self.db.commit()
        self.db.refresh(db_league)
        return db_league

    def delete(self, league_id: int) -> bool:
        """Löscht Liga."""
        db_league = self.get_by_id(league_id)
        if not db_league:
            return False

        self.db.delete(db_league)
        self.db.commit()
        return True
