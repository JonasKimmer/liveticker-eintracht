from sqlalchemy.orm import Session
from app.models.season import Season
from app.schemas.season import SeasonCreate, SeasonUpdate


class SeasonRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self, skip: int = 0, limit: int = 100) -> list[Season]:
        return (
            self.db.query(Season)
            .order_by(Season.starts_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_id(self, season_id: int) -> Season | None:
        return self.db.query(Season).filter(Season.id == season_id).first()

    def get_by_external_id(self, external_id: int) -> Season | None:
        return self.db.query(Season).filter(Season.external_id == external_id).first()

    def get_current(self) -> Season | None:
        """Aktuellste Season anhand starts_at."""
        from datetime import date

        return (
            self.db.query(Season)
            .filter(Season.starts_at <= date.today())
            .order_by(Season.starts_at.desc())
            .first()
        )

    def create(self, season: SeasonCreate) -> Season:
        db_season = Season(**season.model_dump())
        self.db.add(db_season)
        self.db.commit()
        self.db.refresh(db_season)
        return db_season

    def update(self, season_id: int, season_update: SeasonUpdate) -> Season | None:
        db_season = self.get_by_id(season_id)
        if not db_season:
            return None
        for k, v in season_update.model_dump(exclude_unset=True).items():
            setattr(db_season, k, v)
        self.db.commit()
        self.db.refresh(db_season)
        return db_season

    def delete(self, season_id: int) -> bool:
        db_season = self.get_by_id(season_id)
        if not db_season:
            return False
        self.db.delete(db_season)
        self.db.commit()
        return True
