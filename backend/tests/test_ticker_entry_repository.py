"""
Tests für TickerEntryRepository
================================
Unit-Tests auf Datenbankebene — kein HTTP-Layer.
"""

import pytest

from app.models.match import Match
from app.models.ticker_entry import TickerEntry
from app.repositories.ticker_entry_repository import TickerEntryRepository
from app.schemas.ticker_entry import TickerEntryCreate, TickerEntryUpdate


@pytest.fixture()
def match(db):
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    m = Match(home_score=0, away_score=0, match_state="Live", matchday=1,
              created_at=now, updated_at=now)
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


@pytest.fixture()
def repo(db):
    return TickerEntryRepository(db)


def _make_entry(match_id: int, **kwargs) -> TickerEntryCreate:
    defaults = dict(
        match_id=match_id,
        text="Test",
        source="manual",
        status="published",
    )
    defaults.update(kwargs)
    return TickerEntryCreate(**defaults)


class TestTickerEntryRepositoryCRUD:
    def test_create_and_get_by_id(self, repo, match) -> None:
        entry = repo.create(_make_entry(match.id))
        fetched = repo.get_by_id(entry.id)

        assert fetched is not None
        assert fetched.id == entry.id
        assert fetched.text == "Test"

    def test_get_by_id_missing_returns_none(self, repo) -> None:
        assert repo.get_by_id(999_999) is None

    def test_update_changes_text(self, repo, match) -> None:
        entry = repo.create(_make_entry(match.id, text="Alt"))
        updated = repo.update(entry.id, TickerEntryUpdate(text="Neu"))

        assert updated is not None
        assert updated.text == "Neu"

    def test_update_missing_entry_returns_none(self, repo) -> None:
        result = repo.update(999_999, TickerEntryUpdate(text="X"))
        assert result is None

    def test_delete_existing_entry_returns_true(self, repo, match) -> None:
        entry = repo.create(_make_entry(match.id))
        assert repo.delete(entry.id) is True

    def test_delete_nonexistent_entry_returns_false(self, repo) -> None:
        assert repo.delete(999_999) is False


class TestTickerEntryRepositoryFiltering:
    def test_get_by_match_published_only(self, repo, match) -> None:
        repo.create(_make_entry(match.id, status="published"))
        repo.create(_make_entry(match.id, status="draft"))

        results = repo.get_by_match(match.id, published_only=True)
        assert all(e.status == "published" for e in results)

    def test_get_by_match_all_statuses(self, repo, match) -> None:
        repo.create(_make_entry(match.id, status="published"))
        repo.create(_make_entry(match.id, status="draft"))
        repo.create(_make_entry(match.id, status="rejected"))

        results = repo.get_by_match(match.id, published_only=False)
        statuses = {e.status for e in results}
        assert "draft" in statuses
        assert "rejected" in statuses

    def test_get_by_match_returns_empty_for_unknown_match(self, repo) -> None:
        assert repo.get_by_match(999_999) == []


class TestTickerEntryRepositorySortOrder:
    def test_phase_start_events_sort_last_within_same_minute(self, repo, match) -> None:
        """Anpfiff-Events (phase=FirstHalf, synthetic) sollen in ihrer
        Minute an letzter Position erscheinen — im Frontend damit ganz unten."""
        from app.models.synthetic_event import SyntheticEvent

        synthetic = SyntheticEvent(match_id=match.id, type="match_kickoff", minute=1)
        repo.db.add(synthetic)
        repo.db.commit()
        repo.db.refresh(synthetic)

        goal = repo.create(
            _make_entry(match.id, minute=1, phase="FirstHalf", text="Tor!")
        )
        kickoff_entry = TickerEntry(
            match_id=match.id,
            text="Anpfiff",
            status="published",
            source="ai",
            minute=1,
            phase="FirstHalf",
            synthetic_event_id=synthetic.id,
        )
        repo.db.add(kickoff_entry)
        repo.db.commit()
        repo.db.refresh(kickoff_entry)

        results = repo.get_by_match(match.id, published_only=True)
        ids = [e.id for e in results]

        # Backend sortiert Phase-Start-Events (sort_position=0) ZUERST in ihrer Minute.
        # Das Frontend kehrt diese Reihenfolge dann um (Anpfiff erscheint ganz unten).
        assert ids.index(kickoff_entry.id) < ids.index(goal.id)
