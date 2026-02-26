"""
Season Repository - Data Access Layer.
"""

from sqlalchemy.orm import Session
from app.models.season import Season
from app.schemas.season import SeasonCreate, SeasonUpdate


class SeasonRepository:
    """Repository für Season-Datenbank-Operationen."""

    def __init__(self, db: Session):
        self.db = db

    def get_all(self, skip: int = 0, limit: int = 100) -> list[Season]:
        """Holt alle Seasons."""
        return (
            self.db.query(Season)
            .order_by(Season.year.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_id(self, season_id: int) -> Season | None:
        """Holt Season nach ID."""
        return self.db.query(Season).filter(Season.id == season_id).first()

    def get_by_year(self, year: int) -> Season | None:
        """Holt Season nach Jahr."""
        return self.db.query(Season).filter(Season.year == year).first()

    def get_current(self) -> Season | None:
        """Holt aktuelle Season."""
        return self.db.query(Season).filter(Season.current == True).first()

    def create(self, season: SeasonCreate) -> Season:
        """Erstellt neue Season."""
        db_season = Season(**season.model_dump())
        self.db.add(db_season)
        self.db.commit()
        self.db.refresh(db_season)
        return db_season

    def update(self, season_id: int, season_update: SeasonUpdate) -> Season | None:
        """Aktualisiert Season."""
        db_season = self.get_by_id(season_id)
        if not db_season:
            return None

        update_data = season_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_season, key, value)

        self.db.commit()
        self.db.refresh(db_season)
        return db_season

    def set_current(self, season_id: int) -> Season | None:
        """Setzt Season als aktuelle Season (alle anderen auf False)."""
        # Alle auf False
        self.db.query(Season).update({Season.current: False})

        # Diese auf True
        db_season = self.get_by_id(season_id)
        if db_season:
            db_season.current = True
            self.db.commit()
            self.db.refresh(db_season)

        return db_season
