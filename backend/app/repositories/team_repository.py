import logging
import math
from typing import Optional
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.country import Country
from app.models.team import Team
from app.schemas.team import PaginatedTeamResponse, TeamCreate, TeamResponse, TeamUpdate

logger = logging.getLogger(__name__)


class TeamRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    # ------------------------------------------------------------------ #
    # Reads                                                                #
    # ------------------------------------------------------------------ #

    def get_paginated(
        self,
        page: int = 1,
        page_size: int = 20,
        is_partner: Optional[bool] = None,
        hidden: Optional[bool] = None,
    ) -> PaginatedTeamResponse:
        q = self.db.query(Team)
        if is_partner is not None:
            q = q.filter(Team.is_partner_team == is_partner)
        if hidden is not None:
            q = q.filter(Team.hidden == hidden)
        total = q.count()
        items = (
            q.order_by(Team.position, Team.name)
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        page_count = math.ceil(total / page_size) if page_size else 1
        return PaginatedTeamResponse(
            items=[TeamResponse.model_validate(t) for t in items],
            total=total,
            page=page,
            page_size=page_size,
            page_count=page_count,
            has_previous_page=page > 1,
            has_next_page=page < page_count,
        )

    def get_by_id(self, team_id: int) -> Optional[Team]:
        return self.db.query(Team).filter(Team.id == team_id).first()

    def get_by_uid(self, uid: UUID) -> Optional[Team]:
        return self.db.query(Team).filter(Team.uid == uid).first()

    def get_by_country(self, country_name: str) -> list[Team]:
        return (
            self.db.query(Team)
            .join(Country, Team.country_id == Country.id)
            .filter(Country.name == country_name)
            .order_by(Team.name)
            .all()
        )

    def exists(self, team_id: int) -> bool:
        return self.db.query(Team.id).filter(Team.id == team_id).scalar() is not None

    # ------------------------------------------------------------------ #
    # Writes                                                               #
    # ------------------------------------------------------------------ #

    def _resolve_country_id(self, country_name: str) -> Optional[int]:
        country = (
            self.db.query(Country).filter(Country.name == country_name).first()
        )
        return country.id if country else None

    def create(self, data: TeamCreate) -> Team:
        country_id = None
        if data.country_name:
            country_id = self._resolve_country_id(data.country_name)

        team = Team(
            **({"id": data.id} if data.id is not None else {}),
            sport=data.sport,
            name=data.name,
            initials=data.initials,
            short_name=data.short_name,
            category=data.category.model_dump() if data.category else None,
            logo_url=str(data.logo_url) if data.logo_url else None,
            is_partner_team=data.is_partner_team,
            position=data.position,
            hidden=data.hidden,
            country_id=country_id,
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
        if "category" in update_data and update_data["category"] is not None:
            update_data["category"] = data.category.model_dump(exclude_none=True)

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

    def delete(self, team_id: int) -> bool:
        team = self.get_by_id(team_id)
        if not team:
            return False
        self.db.delete(team)
        self.db.commit()
        logger.debug("Team deleted: id=%s", team_id)
        return True