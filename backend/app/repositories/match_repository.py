import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import distinct, func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.models.lineup import Lineup
from app.models.match import Match
from app.models.match_statistic import MatchStatistic
from app.schemas.match import (
    LineupBulkUpdate,
    LineupPlayerInput,
    MatchCreate,
    MatchUpdate,
    StatisticsBulkUpdate,
    TeamStatisticsInput,
)

logger = logging.getLogger(__name__)


class MatchRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    # ------------------------------------------------------------------ #
    # Internal helpers                                                     #
    # ------------------------------------------------------------------ #

    def _base_query(self):
        return self.db.query(Match).options(
            joinedload(Match.home_team),
            joinedload(Match.away_team),
            joinedload(Match.competition),
            joinedload(Match.season),
        )

    # ------------------------------------------------------------------ #
    # Reads                                                                #
    # ------------------------------------------------------------------ #

    def get_paginated(
        self,
        page: int = 1,
        page_size: int = 25,
        team_id: Optional[int] = None,
        competition_id: Optional[int] = None,
        matchday: Optional[int] = None,
        match_state: Optional[str] = None,
    ) -> tuple[list[Match], int]:
        q = self._base_query()
        if team_id:
            q = q.filter(
                or_(Match.home_team_id == team_id, Match.away_team_id == team_id)
            )
        if competition_id:
            q = q.filter(Match.competition_id == competition_id)
        if matchday:
            q = q.filter(Match.matchday == matchday)
        if match_state:
            q = q.filter(Match.match_state == match_state)
        total = q.count()
        items = (
            q.order_by(Match.starts_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return items, total

    def get_by_id(self, match_id: int) -> Optional[Match]:
        return self._base_query().filter(Match.id == match_id).first()

    def get_live(self) -> list[Match]:
        return self._base_query().filter(Match.match_state == "Live").all()

    def get_today(self) -> list[Match]:
        now = datetime.now(timezone.utc)
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = now.replace(hour=23, minute=59, second=59, microsecond=999999)
        return (
            self._base_query()
            .filter(Match.starts_at >= start, Match.starts_at <= end)
            .order_by(Match.starts_at)
            .all()
        )

    def exists(self, match_id: int) -> bool:
        return self.db.query(Match.id).filter(Match.id == match_id).scalar() is not None

    def get_matchdays(self, team_id: int, competition_id: int) -> list[int]:
        """Return sorted distinct matchday numbers for a team in a competition."""
        rows = (
            self.db.query(distinct(Match.matchday))
            .filter(
                Match.competition_id == competition_id,
                Match.matchday.isnot(None),
                or_(Match.home_team_id == team_id, Match.away_team_id == team_id),
            )
            .order_by(Match.matchday)
            .all()
        )
        return [r[0] for r in rows]

    def get_competitions_for_team(self, team_id: int) -> list:
        """Return distinct Competition objects derived from matches the team plays in."""
        from app.models.competition import Competition

        ids = [
            r[0]
            for r in self.db.query(distinct(Match.competition_id))
            .filter(
                Match.competition_id.isnot(None),
                or_(Match.home_team_id == team_id, Match.away_team_id == team_id),
            )
            .all()
        ]
        if not ids:
            return []
        return (
            self.db.query(Competition)
            .filter(Competition.id.in_(ids))
            .order_by(Competition.position)
            .all()
        )

    def get_by_competition_matchday(
        self, team_id: int, competition_id: int, matchday: int
    ) -> list[Match]:
        """Return matches for a team in a specific competition matchday."""
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

    # ------------------------------------------------------------------ #
    # Writes                                                               #
    # ------------------------------------------------------------------ #

    def _serialize_match_data(self, data: MatchCreate | MatchUpdate) -> dict:
        """Convert Pydantic model to dict safe for SQLAlchemy."""
        d = data.model_dump(exclude_unset=True, by_alias=False)
        for jsonb_field in (
            "matchday_title",
            "localized_title",
            "team_home_jersey",
            "team_away_jersey",
        ):
            if jsonb_field in d and d[jsonb_field] is not None:
                val = getattr(data, jsonb_field)
                d[jsonb_field] = (
                    val.model_dump(exclude_none=True)
                    if hasattr(val, "model_dump")
                    else val
                )
        if "match_state" in d and d["match_state"] is not None:
            d["match_state"] = (
                d["match_state"].value
                if hasattr(d["match_state"], "value")
                else d["match_state"]
            )
        if "match_phase" in d and d["match_phase"] is not None:
            d["match_phase"] = (
                d["match_phase"].value
                if hasattr(d["match_phase"], "value")
                else d["match_phase"]
            )
        # Remove fields not present as DB columns
        d.pop("source", None)
        d.pop("kickoff", None)
        return d

    def create(self, data: MatchCreate) -> Match:
        match_data = self._serialize_match_data(data)
        explicit_id = match_data.pop("id", None)
        match = Match(**match_data)
        if explicit_id:
            match.id = explicit_id
        self.db.add(match)
        try:
            self.db.commit()
            self.db.refresh(match)
            logger.debug("Match created: id=%s", match.id)
        except IntegrityError:
            self.db.rollback()
            raise
        return match

    def update(self, match_id: int, data: MatchUpdate) -> Optional[Match]:
        match = self.get_by_id(match_id)
        if not match:
            return None
        for field, value in self._serialize_match_data(data).items():
            setattr(match, field, value)
        try:
            self.db.commit()
            self.db.refresh(match)
            logger.debug("Match updated: id=%s", match_id)
        except IntegrityError:
            self.db.rollback()
            raise
        return match

    def delete(self, match_id: int) -> bool:
        match = self.get_by_id(match_id)
        if not match:
            return False
        self.db.delete(match)
        self.db.commit()
        logger.debug("Match deleted: id=%s", match_id)
        return True

    # ------------------------------------------------------------------ #
    # Lineup                                                               #
    # ------------------------------------------------------------------ #

    def get_lineup(self, match_id: int) -> list[Lineup]:
        return (
            self.db.query(Lineup)
            .filter(Lineup.match_id == match_id)
            .order_by(Lineup.team_id, Lineup.formation_place)
            .all()
        )

    def replace_lineup(
        self, match_id: int, match: Match, data: LineupBulkUpdate
    ) -> list[Lineup]:
        """Delete all existing lineup entries and insert fresh ones (full replace)."""
        self.db.query(Lineup).filter(Lineup.match_id == match_id).delete()

        def _make_entries(
            players: list[LineupPlayerInput], team_id: int
        ) -> list[Lineup]:
            return [
                Lineup(
                    match_id=match_id,
                    team_id=team_id,
                    player_id=p.player_id,
                    jersey_number=p.jersey_number or p.shirt_number,
                    status=p.status.value,
                    formation_place=p.formation_place,
                    formation_position=p.formation_position,
                    position=p.position.value if p.position else None,
                    number_of_goals=p.number_of_goals,
                    has_yellow_card=p.has_yellow_card,
                    has_red_card=p.has_red_card,
                    is_substituted=p.is_substituted,
                    formation=p.formation,
                )
                for p in players
            ]

        home_id = match.home_team_id
        away_id = match.away_team_id

        if not home_id or not away_id:
            raise ValueError(
                "Match must have both home and away teams assigned before setting lineup"
            )

        entries = _make_entries(data.team_home_lineup, home_id) + _make_entries(
            data.team_away_lineup, away_id
        )
        self.db.add_all(entries)
        self.db.commit()
        for e in entries:
            self.db.refresh(e)
        logger.debug(
            "Lineup replaced for match id=%s (%d entries)", match_id, len(entries)
        )
        return entries

    # ------------------------------------------------------------------ #
    # Statistics                                                           #
    # ------------------------------------------------------------------ #

    def get_statistics(self, match_id: int) -> list[MatchStatistic]:
        return (
            self.db.query(MatchStatistic)
            .filter(MatchStatistic.match_id == match_id)
            .all()
        )

    def _upsert_team_statistic(
        self, match_id: int, team_id: int, data: TeamStatisticsInput
    ) -> MatchStatistic:
        stat = (
            self.db.query(MatchStatistic)
            .filter(
                MatchStatistic.match_id == match_id, MatchStatistic.team_id == team_id
            )
            .first()
        )
        update_data = data.model_dump(exclude_unset=True)
        if stat:
            for field, value in update_data.items():
                setattr(stat, field, value)
        else:
            stat = MatchStatistic(match_id=match_id, team_id=team_id, **update_data)
            self.db.add(stat)
        return stat

    def upsert_statistics(
        self, match_id: int, match: Match, data: StatisticsBulkUpdate
    ) -> list[MatchStatistic]:
        if not match.home_team_id or not match.away_team_id:
            raise ValueError("Match must have both home and away teams assigned")

        home_stat = self._upsert_team_statistic(
            match_id, match.home_team_id, data.team_home_statistics
        )
        away_stat = self._upsert_team_statistic(
            match_id, match.away_team_id, data.team_away_statistics
        )
        self.db.commit()
        self.db.refresh(home_stat)
        self.db.refresh(away_stat)
        logger.debug("Statistics upserted for match id=%s", match_id)
        return [home_stat, away_stat]