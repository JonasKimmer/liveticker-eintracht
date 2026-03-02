import logging
from typing import Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.competition_team import CompetitionTeam
from app.schemas.competition_team import CompetitionTeamCreate

logger = logging.getLogger(__name__)


class CompetitionTeamRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_all(
        self,
        season_id: Optional[int] = None,
        competition_id: Optional[int] = None,
        team_id: Optional[int] = None,
    ) -> list[CompetitionTeam]:
        q = self.db.query(CompetitionTeam)
        if season_id:
            q = q.filter(CompetitionTeam.season_id == season_id)
        if competition_id:
            q = q.filter(CompetitionTeam.competition_id == competition_id)
        if team_id:
            q = q.filter(CompetitionTeam.team_id == team_id)
        return q.order_by(CompetitionTeam.id).all()

    def get_by_id(self, ct_id: int) -> Optional[CompetitionTeam]:
        return (
            self.db.query(CompetitionTeam).filter(CompetitionTeam.id == ct_id).first()
        )

    def exists(self, season_id: int, competition_id: int, team_id: int) -> bool:
        return (
            self.db.query(CompetitionTeam.id)
            .filter(
                CompetitionTeam.season_id == season_id,
                CompetitionTeam.competition_id == competition_id,
                CompetitionTeam.team_id == team_id,
            )
            .scalar()
            is not None
        )

    def create(self, data: CompetitionTeamCreate) -> tuple[CompetitionTeam, bool]:
        """Returns (entry, created). If already exists returns existing with created=False."""
        existing = (
            self.db.query(CompetitionTeam)
            .filter(
                CompetitionTeam.season_id == data.season_id,
                CompetitionTeam.competition_id == data.competition_id,
                CompetitionTeam.team_id == data.team_id,
            )
            .first()
        )
        if existing:
            return existing, False

        entry = CompetitionTeam(**data.model_dump())
        self.db.add(entry)
        try:
            self.db.commit()
            self.db.refresh(entry)
            logger.debug("CompetitionTeam created: id=%s", entry.id)
        except IntegrityError:
            self.db.rollback()
            raise
        return entry, True

    def delete(self, ct_id: int) -> bool:
        entry = self.get_by_id(ct_id)
        if not entry:
            return False
        self.db.delete(entry)
        self.db.commit()
        logger.debug("CompetitionTeam deleted: id=%s", ct_id)
        return True
