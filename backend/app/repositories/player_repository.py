"""
PlayerRepository
================
Datenbankzugriff für Spieler (CRUD + paginierte Abfragen).
"""

import logging
from typing import Optional

from sqlalchemy.orm import Session

from app.models.player import Player
from app.schemas.player import PlayerCreate, PlayerUpdate, PlayerStatisticsUpdate

logger = logging.getLogger(__name__)


class PlayerRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, player_id: int) -> Optional[Player]:
        return self.db.query(Player).filter(Player.id == player_id).first()

    def get_paginated(
        self,
        page: int = 1,
        page_size: int = 50,
        team_id: Optional[int] = None,
    ) -> tuple[list[Player], int]:
        q = self.db.query(Player).filter(Player.hidden.is_(False))
        if team_id is not None:
            q = q.filter(Player.team_id == team_id)
        total = q.count()
        items = (
            q.order_by(Player.last_name, Player.first_name)
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return items, total

    def create(self, data: PlayerCreate) -> Player:
        player = Player(
            sport=data.sport,
            team_id=data.team_id,
            first_name=data.first_name,
            last_name=data.last_name,
            short_name=data.short_name,
            display_name=data.display_name,
            known_name=data.known_name,
            position=data.position,
            birthday=data.birthday,
            birthplace=data.birthplace,
            weight=data.weight,
            height=data.height,
            jersey_number=data.jersey_number,
            country=data.country,
            joined_on=data.joined_on,
            signing_date=data.signing_date,
            image_url=data.image_url,
            person_hero_image_url=data.person_hero_image_url,
            profile=data.profile,
            hidden=data.hidden,
            statistics=data.statistics.model_dump(by_alias=False) if data.statistics else None,
        )
        if data.id is not None:
            player.id = data.id
        self.db.add(player)
        self.db.commit()
        self.db.refresh(player)
        logger.info("Created player id=%d", player.id)
        return player

    def update(self, player: Player, data: PlayerUpdate) -> Player:
        for field, value in data.model_dump(exclude_unset=True, by_alias=False).items():
            if field == "statistics" and value is not None:
                setattr(player, field, value if isinstance(value, dict) else value)
            elif field != "id":
                setattr(player, field, value)
        self.db.commit()
        self.db.refresh(player)
        return player

    def update_statistics(self, player: Player, data: PlayerStatisticsUpdate) -> Player:
        new_stats = data.statistics.model_dump(exclude_none=True, by_alias=False)
        existing = player.statistics or {}
        existing.update(new_stats)
        player.statistics = existing
        self.db.commit()
        self.db.refresh(player)
        return player

    def delete(self, player: Player) -> None:
        player_id = player.id
        self.db.delete(player)
        self.db.commit()
        logger.info("Deleted player id=%d", player_id)
