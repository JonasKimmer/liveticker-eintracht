"""
Test Configuration
==================
Shared pytest fixtures für Datenbank, TestClient und Beispieldaten.

Architektur:
- Reine Unit-Tests (constants, llm_service, evaluation_metrics) brauchen
  keine Fixtures aus dieser Datei.
- Integrations-Tests (repository, API) nutzen die 'db'- und 'client'-Fixtures,
  die eine laufende PostgreSQL-Verbindung voraussetzen.
  Sind nicht erreichbar, werden diese Tests mit pytest.skip übersprungen.
"""

import os
import pytest

# ── Verbindungs-URL aus Umgebung oder .env ───────────────────────────────────
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql://jonaskimmer@localhost:5432/liveticker_eintracht",
)


def _make_test_engine():
    """Erstelle SQLAlchemy-Engine für Tests. Gibt None zurück wenn DB nicht erreichbar."""
    try:
        from sqlalchemy import create_engine, text
        from sqlalchemy.pool import NullPool

        engine = create_engine(
            os.environ["DATABASE_URL"],
            poolclass=NullPool,
        )
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return engine
    except Exception:
        return None


# Lazy-initialisiert beim ersten Zugriff
_engine = None
_db_available = None


def _get_engine():
    global _engine, _db_available
    if _db_available is None:
        _engine = _make_test_engine()
        _db_available = _engine is not None
    return _engine


def _import_all_models():
    """Importiere alle Models damit SQLAlchemy die Mapper registriert."""
    import app.models.country  # noqa: F401
    import app.models.team  # noqa: F401
    import app.models.season  # noqa: F401
    import app.models.competition  # noqa: F401
    import app.models.competition_team  # noqa: F401
    import app.models.match  # noqa: F401
    import app.models.event  # noqa: F401
    import app.models.ticker_entry  # noqa: F401
    import app.models.synthetic_event  # noqa: F401
    import app.models.standing  # noqa: F401
    import app.models.lineup  # noqa: F401
    import app.models.match_statistic  # noqa: F401
    import app.models.media_queue  # noqa: F401
    import app.models.player  # noqa: F401
    import app.models.player_statistic  # noqa: F401
    import app.models.media_clip  # noqa: F401
    import app.models.style_reference  # noqa: F401


@pytest.fixture(scope="session", autouse=True)
def reset_schema():
    """Setzt das DB-Schema einmalig pro Test-Session zurück (drop_all + create_all).

    Stellt sicher dass alle aktuellen Modell-Spalten vorhanden sind —
    auch wenn die DB aus einer früheren Version des Schemas stammt.
    Wird übersprungen wenn keine PostgreSQL-Verbindung verfügbar ist.
    """
    engine = _get_engine()
    if engine is None:
        return

    from app.core.database import Base

    _import_all_models()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


@pytest.fixture()
def db():
    """Transaktionale DB-Session — rollt nach jedem Test zurück.

    Wird übersprungen wenn keine PostgreSQL-Verbindung verfügbar ist.
    """
    engine = _get_engine()
    if engine is None:
        pytest.skip("Keine Datenbankverbindung verfügbar (PostgreSQL nicht erreichbar)")

    from sqlalchemy.orm import sessionmaker
    from app.core.database import Base

    _import_all_models()

    TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestSession()

    yield session

    session.rollback()
    session.close()


@pytest.fixture()
def client(db):
    """TestClient mit überschriebener DB-Dependency."""
    from fastapi.testclient import TestClient
    from app.core.database import get_db
    from app.main import app

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


# ── Beispieldaten ────────────────────────────────────────────────────────────


@pytest.fixture()
def sample_match(db):
    """Minimales Match-Objekt für Tests."""
    from app.models.match import Match
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)
    match = Match(
        home_score=0,
        away_score=0,
        match_state="PreMatch",
        matchday=1,
        created_at=now,
        updated_at=now,
    )
    db.add(match)
    db.commit()
    db.refresh(match)
    return match


@pytest.fixture()
def sample_ticker_entry(db, sample_match):
    """Publizierter Ticker-Eintrag für Tests."""
    from app.models.ticker_entry import TickerEntry

    entry = TickerEntry(
        match_id=sample_match.id,
        text="Testtext",
        status="published",
        source="manual",
        icon="⚽",
        minute=1,
        phase="FirstHalf",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
