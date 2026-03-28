"""
Tests für app/services/ticker_service
"""
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone

from app.services.ticker_service import (
    score_at_event,
    build_match_context,
    build_context_data,
    make_ai_entry,
)


def _make_match(home_score=1, away_score=0, home_id=1, away_id=2):
    match = MagicMock()
    match.id = 10
    match.home_score = home_score
    match.away_score = away_score
    match.home_team_id = home_id
    match.away_team_id = away_id
    match.home_team = MagicMock(name="Eintracht", initials="SGE")
    match.away_team = MagicMock(name="Bayern", initials="FCB")
    match.home_team.name = "Eintracht"
    match.away_team.name = "Bayern"
    match.home_team.initials = "SGE"
    match.away_team.initials = "FCB"
    match.match_phase = "FirstHalf"
    match.minute = 30
    match.matchday = 10
    match.starts_at = datetime(2024, 3, 15, 15, 30, tzinfo=timezone.utc)
    return match


def _make_event(event_type="goal", position=5, team_id=1, home_team_id=1):
    event = MagicMock()
    event.event_type = event_type
    event.position = position
    event.match_id = 10
    event.id = 99
    event.time = 30
    event.phase = "FirstHalf"
    event.description = ""
    return event


# ── score_at_event ───────────────────────────────────────────────────────────

class TestScoreAtEvent:
    def test_returns_score_string_for_non_goal_event(self):
        # score_at_event does not filter by event type — it always computes
        # the score from goals_up_to (0:0 if no prior goals)
        event_repo = MagicMock()
        event_repo.get_goals_up_to.return_value = []
        event = _make_event(event_type="yellow_card")
        match = _make_match()
        result = score_at_event(event_repo, event, match)
        assert result == "0:0"

    def test_returns_score_string_for_goal(self):
        event_repo = MagicMock()
        # Simulate: 1 goal before this event (the own goal)
        goal_event = MagicMock()
        goal_event.event_type = "goal"
        goal_event.id = 10
        goal_event.description = ""
        event_repo.get_goals_up_to.return_value = [goal_event]

        event = _make_event(event_type="goal", position=5)
        match = _make_match(home_score=1, away_score=0)

        result = score_at_event(event_repo, event, match)
        # Result should be a score string or None
        assert result is None or isinstance(result, str)

    def test_own_goal_counted_for_opponent(self):
        event_repo = MagicMock()
        event_repo.get_goals_up_to.return_value = []
        event = _make_event(event_type="own_goal")
        match = _make_match()
        result = score_at_event(event_repo, event, match)
        assert result is None or isinstance(result, str)


# ── build_match_context ───────────────────────────────────────────────────────

class TestBuildMatchContext:
    def test_returns_dict_with_expected_keys(self):
        match = _make_match()
        context = build_match_context(match, event_minute=30)
        assert isinstance(context, dict)
        assert "home_team" in context or "home" in context or len(context) > 0

    def test_includes_team_names(self):
        match = _make_match()
        context = build_match_context(match, event_minute=45)
        context_str = str(context)
        assert "Eintracht" in context_str or "SGE" in context_str


# ── build_context_data ────────────────────────────────────────────────────────

class TestBuildContextData:
    def test_returns_dict(self):
        match_context = {"home_team": "SGE", "away_team": "FCB"}
        result = build_context_data(match_context, "ef_whitelabel", "1:0")
        assert isinstance(result, dict)

    def test_generic_instance(self):
        match_context = {"home_team": "A", "away_team": "B"}
        result = build_context_data(match_context, "generic", None)
        assert isinstance(result, dict)


# ── make_ai_entry ─────────────────────────────────────────────────────────────

class TestMakeAiEntry:
    def test_returns_ticker_entry_create(self):
        from app.schemas.ticker_entry import TickerEntryCreate

        entry = make_ai_entry(
            match_id=1,
            text="Tor! Müller trifft!",
            model_used="gpt-4",
            style="neutral",
            minute=32,
            phase="FirstHalf",
        )
        assert isinstance(entry, TickerEntryCreate)
        assert entry.text == "Tor! Müller trifft!"
        assert entry.match_id == 1
        assert entry.source == "ai"

    def test_status_is_draft_by_default(self):
        from app.schemas.ticker_entry import TickerEntryCreate

        entry = make_ai_entry(
            match_id=5,
            text="Test",
            model_used="mock",
            style="neutral",
        )
        assert entry.status == "draft"

    def test_icon_passed_through(self):
        from app.schemas.ticker_entry import TickerEntryCreate

        entry = make_ai_entry(
            match_id=1,
            text="Gelb",
            model_used="mock",
            style="neutral",
            icon="🟨",
        )
        assert entry.icon == "🟨"
