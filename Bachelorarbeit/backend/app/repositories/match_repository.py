from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from app.models.match import Match
from app.models.league_season import LeagueSeason
from app.schemas.match import MatchCreate, MatchUpdate


class MatchRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self, skip: int = 0, limit: int = 100) -> list[Match]:
        return (
            self.db.query(Match)
            .options(
                joinedload(Match.home_team),
                joinedload(Match.away_team),
                joinedload(Match.league_season),
            )
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_id(self, match_id: int) -> Match | None:
        return (
            self.db.query(Match)
            .options(
                joinedload(Match.home_team),
                joinedload(Match.away_team),
                joinedload(Match.league_season),
            )
            .filter(Match.id == match_id)
            .first()
        )

    def get_by_league_season(
        self, league_season_id: int, skip: int = 0, limit: int = 100
    ) -> list[Match]:
        return (
            self.db.query(Match)
            .options(joinedload(Match.home_team), joinedload(Match.away_team))
            .filter(Match.league_season_id == league_season_id)
            .order_by(Match.match_date)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_round(self, league_season_id: int, round: str) -> list[Match]:
        return (
            self.db.query(Match)
            .options(joinedload(Match.home_team), joinedload(Match.away_team))
            .filter(Match.league_season_id == league_season_id, Match.round == round)
            .order_by(Match.match_date)
            .all()
        )

    def get_by_team(self, team_id: int, skip: int = 0, limit: int = 100) -> list[Match]:
        return (
            self.db.query(Match)
            .options(joinedload(Match.home_team), joinedload(Match.away_team))
            .filter(or_(Match.home_team_id == team_id, Match.away_team_id == team_id))
            .order_by(Match.match_date.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_live(self) -> list[Match]:
        return (
            self.db.query(Match)
            .options(joinedload(Match.home_team), joinedload(Match.away_team))
            .filter(Match.status == "live")
            .all()
        )

    def get_by_date(self, date: datetime) -> list[Match]:
        start = date.replace(hour=0, minute=0, second=0)
        end = date.replace(hour=23, minute=59, second=59)
        return (
            self.db.query(Match)
            .options(joinedload(Match.home_team), joinedload(Match.away_team))
            .filter(Match.match_date >= start, Match.match_date <= end)
            .order_by(Match.match_date)
            .all()
        )

    def get_competitions_by_team(self, team_id: int) -> list[LeagueSeason]:
        from app.models.team_league import TeamLeague
        from app.models.season import Season

        return (
            self.db.query(LeagueSeason)
            .options(
                joinedload(LeagueSeason.league),
                joinedload(LeagueSeason.season),
            )
            .join(TeamLeague, TeamLeague.league_id == LeagueSeason.league_id)
            .join(Season, Season.id == LeagueSeason.season_id)
            .filter(
                TeamLeague.team_id == team_id,
                TeamLeague.season_year == Season.year,
            )
            .distinct()
            .all()
        )

    def get_matchdays_by_team_and_competition(
        self, team_id: int, league_season_id: int
    ) -> list[str]:
        """Liest Spieltage aus league_seasons.rounds (JSONB).
        Fallback auf matches.round wenn rounds noch nicht importiert."""
        import json

        ls = (
            self.db.query(LeagueSeason)
            .filter(LeagueSeason.id == league_season_id)
            .first()
        )

        if ls and ls.rounds:
            rounds = ls.rounds
            if isinstance(rounds, str):
                rounds = json.loads(rounds)
            return rounds if isinstance(rounds, list) else []

        # Fallback: aus bereits importierten Matches lesen
        rows = (
            self.db.query(Match.round)
            .filter(
                Match.league_season_id == league_season_id,
                or_(Match.home_team_id == team_id, Match.away_team_id == team_id),
            )
            .distinct()
            .order_by(Match.round)
            .all()
        )
        return [r.round for r in rows if r.round]

    def get_by_team_competition_matchday(
        self, team_id: int, league_season_id: int, round: str
    ) -> list[Match]:
        return (
            self.db.query(Match)
            .options(
                joinedload(Match.home_team),
                joinedload(Match.away_team),
            )
            .filter(
                Match.league_season_id == league_season_id,
                Match.round == round,
                or_(Match.home_team_id == team_id, Match.away_team_id == team_id),
            )
            .order_by(Match.match_date)
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
