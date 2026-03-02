import logging
from typing import Optional
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.models.team import Team
from app.schemas.team import TeamCreate, TeamUpdate

logger = logging.getLogger(__name__)


class TeamRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    # ------------------------------------------------------------------ #
    # Internal helpers                                                     #
    # ------------------------------------------------------------------ #

    def _base_query(self):
        return self.db.query(Team).options(joinedload(Team.country))

    # ------------------------------------------------------------------ #
    # Reads                                                                #
    # ------------------------------------------------------------------ #

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        is_partner: Optional[bool] = None,
        hidden: Optional[bool] = None,
    ) -> list[Team]:
        q = self._base_query()
        if is_partner is not None:
            q = q.filter(Team.is_partner_team == is_partner)
        if hidden is not None:
            q = q.filter(Team.hidden == hidden)
        return q.order_by(Team.name).offset(skip).limit(limit).all()

    def get_by_id(self, team_id: int) -> Optional[Team]:
        return self._base_query().filter(Team.id == team_id).first()

    def get_by_uid(self, uid: UUID) -> Optional[Team]:
        return self._base_query().filter(Team.uid == uid).first()

    def get_by_external_id(self, external_id: int) -> Optional[Team]:
        return self._base_query().filter(Team.external_id == external_id).first()

    def exists(self, team_id: int) -> bool:
        return self.db.query(Team.id).filter(Team.id == team_id).scalar() is not None

    # ------------------------------------------------------------------ #
    # Writes                                                               #
    # ------------------------------------------------------------------ #

    def create(self, data: TeamCreate) -> Team:
        team = Team(
            external_id=data.external_id,
            sport=data.sport,
            name=data.name,
            initials=data.initials,
            short_name=data.short_name,
            logo_url=str(data.logo_url) if data.logo_url else None,
            is_partner_team=data.is_partner_team,
            hidden=data.hidden,
            country_id=data.country_id,
            source=data.source,
        )
        self.db.add(team)
        try:
            self.db.commit()
            self.db.refresh(team)
            logger.debug("Team created: %s (id=%s)", team.name, team.id)
        except IntegrityError:
            self.db.rollback()
            raise
        return team

    def update(self, team_id: int, data: TeamUpdate) -> Optional[Team]:
        team = self.get_by_id(team_id)
        if not team:
            return None

        update_data = data.model_dump(exclude_unset=True)
        if "logo_url" in update_data and update_data["logo_url"] is not None:
            update_data["logo_url"] = str(update_data["logo_url"])

        for field, value in update_data.items():
            setattr(team, field, value)

        try:
            self.db.commit()
            self.db.refresh(team)
            logger.debug("Team updated: id=%s", team_id)
        except IntegrityError:
            self.db.rollback()
            raise
        return team

    def upsert(self, data: TeamCreate) -> tuple[Team, bool]:
        """
        Insert or update by external_id.
        Returns (team, created) where created=True if a new row was inserted.
        """
        if data.external_id:
            existing = self.get_by_external_id(data.external_id)
            if existing:
                # Update mutable fields only
                existing.name = data.name
                existing.initials = data.initials
                existing.short_name = data.short_name
                existing.logo_url = str(data.logo_url) if data.logo_url else None
                existing.country_id = data.country_id
                try:
                    self.db.commit()
                    self.db.refresh(existing)
                except IntegrityError:
                    self.db.rollback()
                    raise
                return existing, False

        team = self.create(data)
        return team, True

    def delete(self, team_id: int) -> bool:
        team = self.get_by_id(team_id)
        if not team:
            return False
        self.db.delete(team)
        self.db.commit()
        logger.debug("Team deleted: id=%s", team_id)
        return True
