"""
SeasonRepository
================
Datenbankzugriff für Saisons inkl. Spieltag-Navigation und Tabellenabfragen.
"""

import logging
import math
from typing import Literal, Optional
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.season import Season
from app.schemas.season import (
    PaginatedSeasonResponse,
    SeasonCreate,
    SeasonResponse,
    SeasonUpdate,
)

logger = logging.getLogger(__name__)

OrderByField = Literal["starts_at_asc", "starts_at_desc", "title_asc", "title_desc"]

_ORDER_MAP = {
    "starts_at_asc": Season.starts_at.asc(),
    "starts_at_desc": Season.starts_at.desc(),
    "title_asc": Season.title.asc(),
    "title_desc": Season.title.desc(),
}


class SeasonRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    # ------------------------------------------------------------------ #
    # Reads                                                                #
    # ------------------------------------------------------------------ #

    def get_paginated(
        self,
        page: int = 1,
        page_size: int = 20,
        order_by: OrderByField = "starts_at_desc",
    ) -> PaginatedSeasonResponse:
        order_clause = _ORDER_MAP.get(order_by, Season.starts_at.desc())
        total = self.db.query(Season).count()
        items = (
            self.db.query(Season)
            .order_by(order_clause)
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        page_count = math.ceil(total / page_size) if page_size else 1
        return PaginatedSeasonResponse(
            items=[SeasonResponse.model_validate(s) for s in items],
            total=total,
            page=page,
            page_size=page_size,
            page_count=page_count,
            has_previous_page=page > 1,
            has_next_page=page < page_count,
        )

    def get_by_id(self, season_id: int) -> Optional[Season]:
        return self.db.query(Season).filter(Season.id == season_id).first()

    def get_by_uid(self, uid: UUID) -> Optional[Season]:
        return self.db.query(Season).filter(Season.uid == uid).first()

    def exists(self, season_id: int) -> bool:
        return (
            self.db.query(Season.id).filter(Season.id == season_id).scalar() is not None
        )

    # ------------------------------------------------------------------ #
    # Writes                                                               #
    # ------------------------------------------------------------------ #

    def create(self, data: SeasonCreate) -> Season:
        season = Season(
            **({"id": data.id} if data.id is not None else {}),
            sport=data.sport,
            title=data.title,
            short_title=data.short_title,
            starts_at=data.starts_at,
            ends_at=data.ends_at,
        )
        self.db.add(season)
        try:
            self.db.commit()
            self.db.refresh(season)
            logger.debug("Season created: %s (id=%s)", season.title, season.id)
        except IntegrityError:
            self.db.rollback()
            raise
        return season

    def update(self, season_id: int, data: SeasonUpdate) -> Optional[Season]:
        season = self.get_by_id(season_id)
        if not season:
            return None

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(season, field, value)

        try:
            self.db.commit()
            self.db.refresh(season)
            logger.debug("Season updated: id=%s", season_id)
        except IntegrityError:
            self.db.rollback()
            raise
        return season

    def delete(self, season_id: int) -> bool:
        season = self.get_by_id(season_id)
        if not season:
            return False
        self.db.delete(season)
        self.db.commit()
        logger.debug("Season deleted: id=%s", season_id)
        return True
