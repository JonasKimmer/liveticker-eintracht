"""
CompetitionTeamRepository
=========================
Datenbankzugriff für Verein-Liga-Zuordnungen (competition_teams).
"""

import logging
from typing import Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.competition import Competition
from app.models.competition_team import CompetitionTeam

logger = logging.getLogger(__name__)


class CompetitionTeamRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, ct_id: int) -> Optional[CompetitionTeam]:
        return (
            self.db.query(CompetitionTeam).filter(CompetitionTeam.id == ct_id).first()
        )

    def get_competitions_for_team(self, team_id: int) -> list[Competition]:
        """Return distinct competitions the team is assigned to."""
        competition_ids = (
            self.db.query(CompetitionTeam.competition_id)
            .filter(CompetitionTeam.team_id == team_id)
            .distinct()
            .all()
        )
        ids = [row[0] for row in competition_ids]
        if not ids:
            return []
        return (
            self.db.query(Competition)
            .filter(Competition.id.in_(ids))
            .order_by(Competition.position)
            .all()
        )

    def create_by_ids(
        self, season_id: int, competition_id: int, team_id: int
    ) -> tuple[CompetitionTeam, bool]:
        """Idempotent – returns existing entry if already assigned."""
        existing = (
            self.db.query(CompetitionTeam)
            .filter(
                CompetitionTeam.season_id == season_id,
                CompetitionTeam.competition_id == competition_id,
                CompetitionTeam.team_id == team_id,
            )
            .first()
        )
        if existing:
            return existing, False

        entry = CompetitionTeam(
            season_id=season_id,
            competition_id=competition_id,
            team_id=team_id,
        )
        self.db.add(entry)
        try:
            self.db.commit()
            self.db.refresh(entry)
            logger.debug("CompetitionTeam created: id=%s", entry.id)
        except IntegrityError:
            self.db.rollback()
            raise
        return entry, True