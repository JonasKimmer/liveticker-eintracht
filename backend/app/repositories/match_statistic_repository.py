from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.match_statistic import MatchStatistic
from app.schemas.match_statistic import MatchStatisticCreate, MatchStatisticUpdate


class MatchStatisticRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self) -> List[MatchStatistic]:
        return self.db.query(MatchStatistic).all()

    def get_by_id(self, match_stat_id: int) -> Optional[MatchStatistic]:
        return (
            self.db.query(MatchStatistic)
            .filter(MatchStatistic.id == match_stat_id)
            .first()
        )

    def get_by_match(self, match_id: int) -> List[MatchStatistic]:
        return (
            self.db.query(MatchStatistic)
            .filter(MatchStatistic.match_id == match_id)
            .all()
        )

    def get_by_team(self, team_id: int) -> List[MatchStatistic]:
        return (
            self.db.query(MatchStatistic)
            .filter(MatchStatistic.team_id == team_id)
            .all()
        )

    def create(self, match_stat_data: MatchStatisticCreate) -> MatchStatistic:
        match_stat = MatchStatistic(**match_stat_data.model_dump())
        self.db.add(match_stat)
        self.db.commit()
        self.db.refresh(match_stat)
        return match_stat

    def update(
        self, match_stat_id: int, match_stat_data: MatchStatisticUpdate
    ) -> Optional[MatchStatistic]:
        match_stat = self.get_by_id(match_stat_id)
        if not match_stat:
            return None

        update_data = match_stat_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(match_stat, key, value)

        self.db.commit()
        self.db.refresh(match_stat)
        return match_stat

    def delete(self, match_stat_id: int) -> bool:
        match_stat = self.get_by_id(match_stat_id)
        if not match_stat:
            return False

        self.db.delete(match_stat)
        self.db.commit()
        return True
