"""
CompetitionRepository
=====================
Datenbankzugriff für Wettbewerbe (Ligen, Pokale).
"""

import logging
from typing import Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.competition import Competition
from app.repositories.base import BaseRepository
from app.schemas.competition import CompetitionCreate, CompetitionUpdate
from app.utils.db_utils import str_or_none as _str_or_none

logger = logging.getLogger(__name__)


class CompetitionRepository(BaseRepository[Competition]):
    model = Competition

    def __init__(self, db: Session) -> None:
        super().__init__(db)

    # ------------------------------------------------------------------ #
    # Reads                                                                #
    # ------------------------------------------------------------------ #

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        hidden: Optional[bool] = None,
    ) -> list[Competition]:
        q = self.db.query(Competition)
        if hidden is not None:
            q = q.filter(Competition.hidden == hidden)
        return (
            q.order_by(Competition.position, Competition.title)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_id(self, competition_id: int) -> Optional[Competition]:
        return (
            self.db.query(Competition).filter(Competition.id == competition_id).first()
        )

    # ------------------------------------------------------------------ #
    # Writes                                                               #
    # ------------------------------------------------------------------ #

    def create(self, data: CompetitionCreate) -> Competition:
        competition = Competition(
            **({"id": data.id} if data.id is not None else {}),
            sport=data.sport,
            title=data.title,
            localized_title=data.localized_title.model_dump()
            if data.localized_title
            else None,
            short_title=data.short_title,
            logo_url=_str_or_none(data.logo_url),
            matchcenter_image_url=_str_or_none(data.matchcenter_image_url),
            has_standings_per_matchday=data.has_standings_per_matchday,
            hidden=data.hidden,
            position=data.position,
        )
        self.db.add(competition)
        try:
            self.db.commit()
            self.db.refresh(competition)
            logger.debug(
                "Competition created: %s (id=%s)", competition.title, competition.id
            )
        except IntegrityError:
            self.db.rollback()
            raise
        return competition

    def update(
        self, competition_id: int, data: CompetitionUpdate
    ) -> Optional[Competition]:
        competition = self.get_by_id(competition_id)
        if not competition:
            return None

        update_data = data.model_dump(exclude_unset=True)

        for url_field in ("logo_url", "matchcenter_image_url"):
            if url_field in update_data:
                update_data[url_field] = _str_or_none(update_data[url_field])
        if (
            "localized_title" in update_data
            and update_data["localized_title"] is not None
        ):
            update_data["localized_title"] = data.localized_title.model_dump(
                exclude_none=True
            )

        for field, value in update_data.items():
            setattr(competition, field, value)

        try:
            self.db.commit()
            self.db.refresh(competition)
            logger.debug("Competition updated: id=%s", competition_id)
        except IntegrityError:
            self.db.rollback()
            raise
        return competition

    def delete(self, competition_id: int) -> bool:
        competition = self.get_by_id(competition_id)
        if not competition:
            return False
        self.db.delete(competition)
        self.db.commit()
        logger.debug("Competition deleted: id=%s", competition_id)
        return True
