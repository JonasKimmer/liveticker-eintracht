from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.player_statistic import PlayerStatistic
from app.schemas.player_statistic import PlayerStatisticCreate, PlayerStatisticUpdate


class PlayerStatisticRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self) -> List[PlayerStatistic]:
        return self.db.query(PlayerStatistic).all()

    def get_by_id(self, player_stat_id: int) -> Optional[PlayerStatistic]:
        return (
            self.db.query(PlayerStatistic)
            .filter(PlayerStatistic.id == player_stat_id)
            .first()
        )

    def get_by_match(self, match_id: int) -> List[PlayerStatistic]:
        return (
            self.db.query(PlayerStatistic)
            .filter(PlayerStatistic.match_id == match_id)
            .all()
        )

    def get_by_player(self, player_id: int) -> List[PlayerStatistic]:
        return (
            self.db.query(PlayerStatistic)
            .filter(PlayerStatistic.player_id == player_id)
            .all()
        )

    def get_by_team(self, team_id: int) -> List[PlayerStatistic]:
        return (
            self.db.query(PlayerStatistic)
            .filter(PlayerStatistic.team_id == team_id)
            .all()
        )

    def create(self, player_stat_data: PlayerStatisticCreate) -> PlayerStatistic:
        player_stat = PlayerStatistic(**player_stat_data.model_dump())
        self.db.add(player_stat)
        self.db.commit()
        self.db.refresh(player_stat)
        return player_stat

    def update(
        self, player_stat_id: int, player_stat_data: PlayerStatisticUpdate
    ) -> Optional[PlayerStatistic]:
        player_stat = self.get_by_id(player_stat_id)
        if not player_stat:
            return None

        update_data = player_stat_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(player_stat, key, value)

        self.db.commit()
        self.db.refresh(player_stat)
        return player_stat

    def delete(self, player_stat_id: int) -> bool:
        player_stat = self.get_by_id(player_stat_id)
        if not player_stat:
            return False

        self.db.delete(player_stat)
        self.db.commit()
        return True
