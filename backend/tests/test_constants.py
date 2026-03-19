"""
Tests für app.core.constants
=============================
Stellt sicher, dass resolve_phase alle bekannten Synthetic-Event-Typen
korrekt auflöst — einschließlich der Extra-Zeit-Phasen, die im alten
Batch-Endpunkt gefehlt hatten (Regressions-Test).
"""

import pytest

from app.core.constants import SYNTHETIC_EVENT_PHASE_MAP, resolve_phase


class TestResolvePhaseSyntheticEvents:
    """resolve_phase mappt alle bekannten Synthetic-Event-Typen korrekt."""

    @pytest.mark.parametrize(
        "event_type,expected_phase",
        [
            ("match_kickoff",        "FirstHalf"),
            ("match_halftime",       "FirstHalfBreak"),
            ("match_second_half",    "SecondHalf"),
            ("match_fulltime",       "After"),
            ("match_extra_kickoff",  "ExtraFirstHalf"),
            ("match_extra_halftime", "ExtraBreak"),
            ("match_penalties",      "PenaltyShootout"),
            ("match_fulltime_aet",   "After"),
            ("match_fulltime_pen",   "After"),
        ],
    )
    def test_known_event_types_resolve_correctly(
        self, event_type: str, expected_phase: str
    ) -> None:
        assert resolve_phase(event_type) == expected_phase

    def test_pre_match_prefix_resolves_to_before(self) -> None:
        assert resolve_phase("pre_match_info") == "Before"
        assert resolve_phase("pre_match_injuries") == "Before"
        assert resolve_phase("pre_match") == "Before"

    def test_post_match_prefix_resolves_to_after(self) -> None:
        assert resolve_phase("post_match_summary") == "After"
        assert resolve_phase("post_match") == "After"

    def test_unknown_event_type_returns_none(self) -> None:
        assert resolve_phase("unknown_event") is None
        assert resolve_phase("") is None

    def test_phase_map_completeness_covers_extra_time(self) -> None:
        """Regression: Der alte Batch-Endpunkt hatte nur 4 Einträge und
        fehlte Extra-Zeit-Phasen. Diese müssen im zentralen Map vorhanden sein."""
        required_extra_time_keys = {
            "match_extra_kickoff",
            "match_extra_halftime",
            "match_penalties",
        }
        assert required_extra_time_keys.issubset(SYNTHETIC_EVENT_PHASE_MAP.keys())

    def test_all_map_values_are_non_empty_strings(self) -> None:
        for key, value in SYNTHETIC_EVENT_PHASE_MAP.items():
            assert isinstance(value, str) and value, f"Empty value for key: {key}"
