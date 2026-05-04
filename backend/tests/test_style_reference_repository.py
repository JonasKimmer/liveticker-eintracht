"""
Tests für StyleReferenceRepository
====================================
Prüft Few-Shot-Abruf, Fallback-Logik und League-Filter.
"""

import pytest

from app.models.style_reference import StyleReference
from app.repositories.style_reference_repository import StyleReferenceRepository


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture()
def repo(db):
    return StyleReferenceRepository(db)


_ref_counter = 0


def _ref(db, event_type: str, instance: str = "ef_whitelabel",
         text: str | None = None, league: str | None = None) -> StyleReference:
    global _ref_counter
    _ref_counter += 1
    if text is None:
        text = f"Beispieltext {_ref_counter} für {event_type}."
    r = StyleReference(event_type=event_type, instance=instance, text=text, league=league)
    db.add(r)
    db.flush()
    db.refresh(r)
    return r


# ── Grundlegende Abruf-Tests ─────────────────────────────────────────────────

class TestGetSamplesBasic:
    def test_returns_matching_references(self, repo, db) -> None:
        _ref(db, "goal")
        _ref(db, "goal")
        results = repo.get_samples("goal")
        assert len(results) >= 1
        assert all(r.event_type == "goal" for r in results)

    def test_respects_limit(self, repo, db) -> None:
        for _ in range(5):
            _ref(db, "yellow_card")
        results = repo.get_samples("yellow_card", limit=2)
        assert len(results) <= 2

    def test_filters_by_instance(self, repo, db) -> None:
        _ref(db, "goal", instance="ef_whitelabel")
        _ref(db, "goal", instance="generic")
        results = repo.get_samples("goal", instance="generic")
        assert all(r.instance == "generic" for r in results)

    def test_empty_when_no_match(self, repo) -> None:
        results = repo.get_samples("nonexistent_event_type_xyz")
        assert results == []

    def test_filters_short_texts(self, repo, db) -> None:
        _ref(db, "comment", text="kurz")  # < 20 Zeichen → wird gefiltert
        _ref(db, "comment", text="Ein langer Beispieltext für Tests.")
        results = repo.get_samples("comment", min_text_length=20)
        assert all(len(r.text) >= 20 for r in results)


# ── League-Filter ────────────────────────────────────────────────────────────

class TestLeagueFilter:
    def test_returns_league_specific_if_enough(self, repo, db) -> None:
        for _ in range(3):
            _ref(db, "goal", league="bundesliga")
        results = repo.get_samples("goal", league="bundesliga", limit=3)
        assert len(results) == 3
        assert all(r.league is not None for r in results)

    def test_falls_back_to_all_leagues_if_too_few(self, repo, db) -> None:
        # Nur 1 Liga-spezifisch → Fallback auf alle
        _ref(db, "substitution", league="champions_league")
        for _ in range(3):
            _ref(db, "substitution", league=None)
        results = repo.get_samples("substitution", league="champions_league", limit=3)
        assert len(results) >= 1

    def test_league_filter_case_insensitive(self, repo, db) -> None:
        for _ in range(3):
            _ref(db, "goal", league="Bundesliga")
        results = repo.get_samples("goal", league="bundesliga", limit=3)
        assert len(results) == 3


# ── Fallback-Logik (_FALLBACK_MAP) ──────────────────────────────────────────

class TestFallbackMap:
    def test_kick_off_falls_back_to_comment(self, repo, db) -> None:
        _ref(db, "comment")
        results = repo.get_samples("kick_off")
        assert len(results) >= 1

    def test_halftime_falls_back_to_halftime_comment(self, repo, db) -> None:
        _ref(db, "halftime_comment")
        results = repo.get_samples("halftime")
        assert len(results) >= 1

    def test_fulltime_falls_back_to_post_match(self, repo, db) -> None:
        _ref(db, "post_match")
        results = repo.get_samples("fulltime")
        assert len(results) >= 1

    def test_no_fallback_returns_empty(self, repo) -> None:
        # Event-Typ ohne Fallback und ohne Daten
        results = repo.get_samples("red_card_xyz_nonexistent")
        assert results == []