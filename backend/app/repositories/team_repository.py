# ----------------------------------------
# app/repositories/team_repository.py
# ----------------------------------------
from sqlalchemy.orm import Session
from app.models.team import Team
from app.schemas.team import TeamCreate, TeamUpdate


class TeamRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self, skip: int = 0, limit: int = 100) -> list[Team]:
        return self.db.query(Team).offset(skip).limit(limit).all()

    def get_by_id(self, team_id: int) -> Team | None:
        return self.db.query(Team).filter(Team.id == team_id).first()

    def get_by_external_id(self, external_id: int) -> Team | None:
        return self.db.query(Team).filter(Team.external_id == external_id).first()

    def get_countries(self) -> list[str]:
        """Alle Länder aus denen Teams vorhanden sind."""
        rows = (
            self.db.query(Team.country)
            .distinct()
            .filter(Team.country.isnot(None))
            .order_by(Team.country)
            .all()
        )
        return [r.country for r in rows]

    def get_by_country(self, country: str) -> list[Team]:
        """Alle Teams eines Landes."""
        return (
            self.db.query(Team)
            .filter(Team.country == country)
            .order_by(Team.name)
            .all()
        )

    def get_partners(self) -> list[Team]:
        """Alle Partner-Teams."""
        return self.db.query(Team).filter(Team.is_partner == True).all()

    def create(self, team: TeamCreate) -> Team:
        db_team = Team(**team.model_dump())
        self.db.add(db_team)
        self.db.commit()
        self.db.refresh(db_team)
        return db_team

    def update(self, team_id: int, team_update: TeamUpdate) -> Team | None:
        db_team = self.get_by_id(team_id)
        if not db_team:
            return None
        for k, v in team_update.model_dump(exclude_unset=True).items():
            setattr(db_team, k, v)
        self.db.commit()
        self.db.refresh(db_team)
        return db_team

    def delete(self, team_id: int) -> bool:
        db_team = self.get_by_id(team_id)
        if not db_team:
            return False
        self.db.delete(db_team)
        self.db.commit()
        return True
