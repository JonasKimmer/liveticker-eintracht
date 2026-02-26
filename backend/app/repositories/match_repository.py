from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from app.models.match import Match
from app.models.competition import Competition
from app.schemas.match import MatchCreate, MatchUpdate


class MatchRepository:
    def __init__(self, db: Session):
        self.db = db

    def _base_query(self):
        return self.db.query(Match).options(
            joinedload(Match.home_team),
            joinedload(Match.away_team),
            joinedload(Match.competition),
            joinedload(Match.season),
        )

    def get_all(self, skip: int = 0, limit: int = 100) -> list[Match]:
        return self._base_query().offset(skip).limit(limit).all()

    def get_by_id(self, match_id: int) -> Match | None:
        return self._base_query().filter(Match.id == match_id).first()

    def get_by_competition(
        self, competition_id: int, skip: int = 0, limit: int = 100
    ) -> list[Match]:
        return (
            self._base_query()
            .filter(Match.competition_id == competition_id)
            .order_by(Match.starts_at)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_matchday(self, competition_id: int, matchday: int) -> list[Match]:
        return (
            self._base_query()
            .filter(Match.competition_id == competition_id, Match.matchday == matchday)
            .order_by(Match.starts_at)
            .all()
        )

    def get_by_team(self, team_id: int, skip: int = 0, limit: int = 100) -> list[Match]:
        return (
            self._base_query()
            .filter(or_(Match.home_team_id == team_id, Match.away_team_id == team_id))
            .order_by(Match.starts_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_live(self) -> list[Match]:
        return self._base_query().filter(Match.match_state == "Live").all()

    def get_by_date(self, date: datetime) -> list[Match]:
        start = date.replace(hour=0, minute=0, second=0)
        end = date.replace(hour=23, minute=59, second=59)
        return (
            self._base_query()
            .filter(Match.starts_at >= start, Match.starts_at <= end)
            .order_by(Match.starts_at)
            .all()
        )

    def get_competitions_by_team(self, team_id: int) -> list[Competition]:
        return (
            self.db.query(Competition)
            .join(
                Match, or_(Match.home_team_id == team_id, Match.away_team_id == team_id)
            )
            .filter(Match.competition_id == Competition.id)
            .distinct()
            .all()
        )

    def get_matchdays_by_team_and_competition(
        self, team_id: int, competition_id: int
    ) -> list[int]:
        rows = (
            self.db.query(Match.matchday)
            .filter(
                Match.competition_id == competition_id,
                or_(Match.home_team_id == team_id, Match.away_team_id == team_id),
                Match.matchday.isnot(None),
            )
            .distinct()
            .order_by(Match.matchday)
            .all()
        )
        return [r.matchday for r in rows]

    def get_by_team_competition_matchday(
        self, team_id: int, competition_id: int, matchday: int
    ) -> list[Match]:
        return (
            self._base_query()
            .filter(
                Match.competition_id == competition_id,
                Match.matchday == matchday,
                or_(Match.home_team_id == team_id, Match.away_team_id == team_id),
            )
            .order_by(Match.starts_at)
            .all()
        )

    def create(self, match: MatchCreate) -> Match:
        db_match = Match(**match.model_dump())
        self.db.add(db_match)
        self.db.commit()
        self.db.refresh(db_match)
        return db_match

    def update(self, match_id: int, match_update: MatchUpdate) -> Match | None:
        db_match = self.get_by_id(match_id)
        if not db_match:
            return None
        for k, v in match_update.model_dump(exclude_unset=True).items():
            setattr(db_match, k, v)
        self.db.commit()
        self.db.refresh(db_match)
        return db_match

    def delete(self, match_id: int) -> bool:
        db_match = self.get_by_id(match_id)
        if not db_match:
            return False
        self.db.delete(db_match)
        self.db.commit()
        return True
