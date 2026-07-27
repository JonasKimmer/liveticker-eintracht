"""
Tests für app/utils: http_errors, llm_context_builders, db_utils
"""
import pytest
from contextlib import contextmanager
from unittest.mock import MagicMock
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from app.utils.http_errors import require_or_404, handle_integrity_error
from app.utils.db_utils import str_or_none
from app.utils.llm_context_builders import (
    ctx_injuries,
    ctx_prediction,
    ctx_h2h,
    ctx_team_stats,
    ctx_standings,
    ctx_live_stats,
    ctx_match_info,
    build_context_str,
)


# ── http_errors ──────────────────────────────────────────────────────────────

class TestRequireOr404:
    def test_returns_object_when_truthy(self):
        obj = {"id": 1}
        assert require_or_404(obj, "not found") is obj

    def test_returns_string_when_truthy(self):
        assert require_or_404("value", "not found") == "value"

    def test_raises_404_for_none(self):
        with pytest.raises(HTTPException) as exc:
            require_or_404(None, "Resource not found")
        assert exc.value.status_code == 404
        assert exc.value.detail == "Resource not found"

    def test_raises_404_for_false(self):
        with pytest.raises(HTTPException) as exc:
            require_or_404(False, "Not found")
        assert exc.value.status_code == 404

    def test_raises_404_for_empty_list(self):
        with pytest.raises(HTTPException):
            require_or_404([], "Empty list")

    def test_returns_zero_integer(self):
        # 0 is falsy but... actually this would raise 404 — expected behavior
        # Documents that 0 is treated as "not found"
        with pytest.raises(HTTPException):
            require_or_404(0, "Zero is falsy")

    def test_returns_list_with_items(self):
        items = [1, 2, 3]
        assert require_or_404(items, "not found") is items


class TestHandleIntegrityError:
    def test_passes_through_on_no_error(self):
        with handle_integrity_error("Conflict"):
            result = 1 + 1
        assert result == 2

    def test_converts_integrity_error_to_409(self):
        with pytest.raises(HTTPException) as exc:
            with handle_integrity_error("Duplicate entry"):
                raise IntegrityError("statement", {}, Exception("unique violation"))
        assert exc.value.status_code == 409
        assert exc.value.detail == "Duplicate entry"

    def test_does_not_catch_other_exceptions(self):
        with pytest.raises(ValueError):
            with handle_integrity_error("Conflict"):
                raise ValueError("something else")


# ── db_utils ─────────────────────────────────────────────────────────────────

class TestStrOrNone:
    def test_returns_none_for_none(self):
        assert str_or_none(None) is None

    def test_returns_none_for_empty_string(self):
        assert str_or_none("") is None

    def test_returns_string_for_nonempty(self):
        assert str_or_none("hello") == "hello"

    def test_returns_string_for_whitespace(self):
        # Whitespace is truthy — preserved
        assert str_or_none("  ") == "  "

    def test_returns_none_for_zero(self):
        # 0 is falsy
        assert str_or_none(0) is None


# ── llm_context_builders ─────────────────────────────────────────────────────

class TestCtxInjuries:
    def test_no_players_returns_no_ausfaelle(self):
        result = ctx_injuries({"team_name": "Eintracht", "players": []})
        assert "Keine Ausfälle" in result
        assert "Eintracht" in result

    def test_players_listed(self):
        data = {
            "team_name": "SGE",
            "players": [
                {"player_name": "Müller", "reason": "Knie", "type": "Ausfall"}
            ],
        }
        result = ctx_injuries(data)
        assert "Müller" in result
        assert "Knie" in result

    def test_missing_team_name_uses_fallback(self):
        result = ctx_injuries({"players": []})
        assert "Unbekannt" in result

    def test_returns_context_section_header(self):
        result = ctx_injuries({"team_name": "X", "players": []})
        assert "### KONTEXT" in result


class TestCtxPrediction:
    def test_contains_home_and_away(self):
        data = {
            "home": {"name": "Eintracht", "form": "WWDLL", "wins_total": 10},
            "away": {"name": "Bayern", "form": "WWWWW", "wins_total": 20},
            "advice": "Bayern gewinnt",
            "percent_home": "30%",
            "percent_draw": "20%",
            "percent_away": "50%",
        }
        result = ctx_prediction(data)
        assert "Eintracht" in result
        assert "Bayern" in result
        assert "Bayern gewinnt" in result
        assert "### KONTEXT" in result


class TestCtxH2h:
    def test_no_matches_returns_keine_begegnungen(self):
        result = ctx_h2h({"matches": []})
        assert "Keine historischen Begegnungen" in result

    def test_matches_listed(self):
        data = {"matches": ["0:1 (2023)", "2:0 (2022)", "1:1 (2021)"]}
        result = ctx_h2h(data)
        assert "0:1 (2023)" in result
        assert "### KONTEXT" in result

    def test_only_first_5_shown(self):
        data = {"matches": [f"Match {i}" for i in range(10)]}
        result = ctx_h2h(data)
        assert "Match 5" not in result
        assert "Match 4" in result


class TestCtxTeamStats:
    def test_all_fields_present(self):
        data = {
            "team_name": "SGE",
            "form": "WWDLL",
            "wins_total": 10,
            "draws_total": 5,
            "loses_total": 3,
            "goals_for_avg": 2.1,
            "goals_against_avg": 1.2,
            "most_used_formation": "4-2-3-1",
            "clean_sheets": 4,
        }
        result = ctx_team_stats(data)
        assert "SGE" in result
        assert "4-2-3-1" in result
        assert "### KONTEXT" in result


class TestCtxStandings:
    def test_empty_standings(self):
        result = ctx_standings({"league_name": "Bundesliga", "standings": []})
        assert "Bundesliga" in result

    def test_team_listed(self):
        data = {
            "league_name": "Bundesliga",
            "standings": [
                {
                    "team_name": "Eintracht",
                    "rank": 3,
                    "points": 45,
                    "wins": 14,
                    "draws": 3,
                    "losses": 5,
                    "goals_for": 48,
                    "goals_against": 30,
                }
            ],
        }
        result = ctx_standings(data)
        assert "Eintracht" in result
        assert "Platz 3" in result
        assert "45 Pkt" in result


class TestCtxLiveStats:
    def test_returns_context_with_teams(self):
        data = {
            "home_team": "Eintracht",
            "away_team": "Bayern",
            "triggers": ["goal", "yellow_card"],
            "curr_stats": {"possession": "60/40"},
        }
        result = ctx_live_stats(data)
        assert "Eintracht" in result
        assert "Bayern" in result
        assert "goal" in result


class TestCtxMatchInfo:
    def test_contains_home_and_away(self):
        data = {"home_team": "SGE", "away_team": "FCB"}
        result = ctx_match_info(data)
        assert "SGE" in result
        assert "FCB" in result
        assert "### SPIELKONTEXT" in result

    def test_score_included_when_present(self):
        data = {"home_team": "SGE", "away_team": "FCB", "score": "1:0"}
        result = ctx_match_info(data)
        assert "1:0" in result

    def test_no_score_key_skipped(self):
        data = {"home_team": "SGE", "away_team": "FCB"}
        result = ctx_match_info(data)
        assert "Stand nach diesem Tor" not in result


class TestBuildContextStr:
    def test_empty_context_data_returns_empty_string(self):
        assert build_context_str("goal", None) == ""
        assert build_context_str("goal", {}) == ""

    def test_home_team_key_routes_to_match_info(self):
        data = {"home_team": "SGE", "away_team": "FCB"}
        result = build_context_str("goal", data)
        assert "### SPIELKONTEXT" in result

    def test_pre_match_injuries_routes_correctly(self):
        data = {"team_name": "SGE", "players": []}
        result = build_context_str("pre_match_injuries", data)
        assert "Keine Ausfälle" in result

    def test_pre_match_injuries_with_suffix(self):
        data = {"team_name": "SGE", "players": []}
        result = build_context_str("pre_match_injuries_home", data)
        assert "Keine Ausfälle" in result

    def test_pre_match_prediction(self):
        data = {
            "home": {"name": "A", "form": "W", "wins_total": 1},
            "away": {"name": "B", "form": "L", "wins_total": 0},
            "advice": "A wins",
            "percent_home": "70%",
            "percent_draw": "15%",
            "percent_away": "15%",
        }
        result = build_context_str("pre_match_prediction", data)
        assert "### KONTEXT" in result

    def test_unknown_type_falls_back_to_json(self):
        data = {"foo": "bar"}
        result = build_context_str("unknown_event_type", data)
        assert "### KONTEXT" in result
        assert "foo" in result

    def test_live_stats_update(self):
        # No "home_team" key → routes to ctx_live_stats (not ctx_match_info)
        data = {
            "triggers": ["shots_on_goal"],
            "curr_stats": {"shots": 5},
        }
        result = build_context_str("live_stats_update", data)
        assert "### KONTEXT" in result
