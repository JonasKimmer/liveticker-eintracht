"""
Ticker Router
=============
Endpunkte für Liveticker-Einträge.

Modi:
- Modus 1 (manuell):     POST /ticker/manual/{match_id}
- Modus 2 (vollautomatisch): POST /ticker/generate/{event_id}
- Modus 3 (hybrid):      POST /ticker/generate/{event_id} → status=draft → PATCH /{id}/publish

Instanzen:
- generic:       neutral, kein Vereinsbezug
- ef_whitelabel: Eintracht-Stil, Few-Shot aus style_references
"""

import asyncio
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.event_repository import EventRepository
from app.repositories.match_repository import MatchRepository
from app.repositories.synthetic_event_repository import SyntheticEventRepository
from app.repositories.ticker_entry_repository import TickerEntryRepository
from app.schemas.ticker_entry import (
    GenerateEventRequest,
    GenerateSyntheticBatchRequest,
    GenerateSyntheticRequest,
    ManualEntryRequest,
    TickerEntryCreate,
    TickerEntryUpdate,
    TickerEntryResponse,
    TickerStatus,
)
from app.services.llm_service import generate_ticker_text
from app.core.constants import resolve_phase
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ticker", tags=["Ticker"])

# Limit concurrent LLM calls to prevent thread pool saturation (konfigurierbar via LLM_CONCURRENCY)
_llm_semaphore = asyncio.Semaphore(settings.LLM_CONCURRENCY)


# ──────────────────────────────────────────────
# Helper
# ──────────────────────────────────────────────


def _score_at_event(event_repo: EventRepository, event, match) -> Optional[str]:
    if not match or not match.home_team or not match.away_team:
        return None
    home_ext = match.home_team.external_id
    away_ext = match.away_team.external_id

    goals = event_repo.get_goals_up_to(
        match.id,
        position=event.position,
        event_id=event.id,
    )
    home_score = away_score = 0
    for g in goals:
        try:
            d = json.loads(g.description or "{}")
        except (ValueError, TypeError):
            continue
        tid = d.get("team_id")
        if g.event_type == "own_goal":
            if tid == home_ext:
                away_score += 1
            elif tid == away_ext:
                home_score += 1
        else:
            if tid == home_ext:
                home_score += 1
            elif tid == away_ext:
                away_score += 1
    return f"{home_score}:{away_score}"


def _build_match_context(match, event_minute: Optional[int]) -> dict:
    if not match:
        return {}
    return {
        "home_team": match.home_team.name if match.home_team else "",
        "away_team": match.away_team.name if match.away_team else "",
        "home_score": match.home_score,
        "away_score": match.away_score,
        "match_state": match.match_state,
        "minute": event_minute,
        "league": match.competition.title if match.competition else None,
    }


def _build_context_data(
    match_context: dict,
    instance: str,
    score_str: Optional[str] = None,
) -> dict:
    """Build the context_data dict passed to generate_ticker_text."""
    score_part = {"score": score_str} if score_str else {}
    if instance == "ef_whitelabel":
        return {
            "home_team": match_context.get("home_team"),
            "away_team": match_context.get("away_team"),
            **score_part,
        }
    return score_part


async def _call_llm(
    *,
    event_type: str,
    event_detail: str = "",
    minute: Optional[int] = None,
    player_name: Optional[str] = None,
    assist_name: Optional[str] = None,
    team_name: Optional[str] = None,
    style: str,
    language: str,
    context_data: dict,
    match_context: dict,
    db: Session,
    instance: str,
    provider: Optional[str] = None,
    model: Optional[str] = None,
) -> tuple[str, str]:
    """Run LLM text generation with semaphore guard."""
    async with _llm_semaphore:
        return await generate_ticker_text(
            event_type=event_type,
            event_detail=event_detail,
            minute=minute,
            player_name=player_name,
            assist_name=assist_name,
            team_name=team_name,
            style=style,
            language=language,
            context_data=context_data,
            match_context=match_context,
            provider=provider,
            model=model,
            db=db,
            instance=instance,
        )


def _make_ai_entry(
    match_id: int,
    text: str,
    model_used: str,
    style: str,
    *,
    status: TickerStatus = TickerStatus.draft,
    event_id: Optional[int] = None,
    synthetic_event_id: Optional[int] = None,
    phase: Optional[str] = None,
    minute: Optional[int] = None,
) -> TickerEntryCreate:
    """Build a TickerEntryCreate for an AI-generated entry."""
    return TickerEntryCreate(
        match_id=match_id,
        event_id=event_id,
        synthetic_event_id=synthetic_event_id,
        text=text,
        source="ai",
        style=style,
        llm_model=model_used,
        phase=phase,
        minute=minute,
        status=status,
    )


# ──────────────────────────────────────────────
# GET
# ──────────────────────────────────────────────


@router.get(
    "/match/{match_id}",
    response_model=list[TickerEntryResponse],
    summary="Alle Ticker-Einträge eines Spiels (öffentlich)",
)
def get_match_ticker(
    match_id: int,
    all_entries: bool = Query(False, description="Auch Drafts und abgelehnte Einträge"),
    db: Session = Depends(get_db),
) -> list[TickerEntryResponse]:
    return TickerEntryRepository(db).get_by_match(
        match_id, published_only=not all_entries
    )


@router.get(
    "/{entry_id}",
    response_model=TickerEntryResponse,
    summary="Einzelnen Ticker-Eintrag abrufen",
)
def get_ticker_entry(
    entry_id: int,
    db: Session = Depends(get_db),
) -> TickerEntryResponse:
    entry = TickerEntryRepository(db).get_by_id(entry_id)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found"
        )
    return entry


# ──────────────────────────────────────────────
# DELETE
# ──────────────────────────────────────────────


@router.delete(
    "/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Ticker-Eintrag löschen",
)
def delete_ticker_entry(
    entry_id: int,
    db: Session = Depends(get_db),
) -> None:
    deleted = TickerEntryRepository(db).delete(entry_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found"
        )


# ──────────────────────────────────────────────
# PATCH (Modus 3: Human-in-the-Loop)
# ──────────────────────────────────────────────


@router.patch(
    "/{entry_id}",
    response_model=TickerEntryResponse,
    summary="Ticker-Eintrag bearbeiten (Text, Status, Stil)",
)
def update_ticker_entry(
    entry_id: int,
    data: TickerEntryUpdate,
    db: Session = Depends(get_db),
) -> TickerEntryResponse:
    if not data.model_fields_set:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Mindestens ein Feld muss gesetzt sein.",
        )
    entry = TickerEntryRepository(db).update(entry_id, data)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found"
        )
    return entry


@router.patch(
    "/{entry_id}/publish",
    response_model=TickerEntryResponse,
    summary="Modus 3: Draft freigeben und publizieren",
)
def publish_ticker_entry(
    entry_id: int,
    db: Session = Depends(get_db),
) -> TickerEntryResponse:
    repo = TickerEntryRepository(db)
    entry = repo.get_by_id(entry_id)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found"
        )
    if entry.status == TickerStatus.published:
        return entry
    return repo.update(entry_id, TickerEntryUpdate(status=TickerStatus.published))


@router.patch(
    "/{entry_id}/reject",
    response_model=TickerEntryResponse,
    summary="Modus 3: KI-Vorschlag ablehnen",
)
def reject_ticker_entry(
    entry_id: int,
    db: Session = Depends(get_db),
) -> TickerEntryResponse:
    repo = TickerEntryRepository(db)
    entry = repo.get_by_id(entry_id)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found"
        )
    return repo.update(entry_id, TickerEntryUpdate(status=TickerStatus.rejected))


# ──────────────────────────────────────────────
# POST: Modus 1 – Manuell
# ──────────────────────────────────────────────


@router.post(
    "/manual",
    response_model=TickerEntryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Modus 1: Manuellen Ticker-Eintrag erstellen",
)
def create_manual_entry(
    data: ManualEntryRequest,
    db: Session = Depends(get_db),
) -> TickerEntryResponse:
    ticker_repo = TickerEntryRepository(db)
    if data.phase and data.icon and not data.video_url and not data.image_url:
        existing = ticker_repo.get_by_phase(data.match_id, data.phase)
        if existing:
            return existing

    return ticker_repo.create(
        TickerEntryCreate(
            match_id=data.match_id,
            event_id=data.event_id,
            text=data.text,
            source="manual",
            style=data.style,
            icon=data.icon,
            minute=data.minute,
            phase=data.phase,
            image_url=data.image_url,
            video_url=data.video_url,
            status=TickerStatus.published,
        )
    )


# ──────────────────────────────────────────────
# POST: Modus 2 / 3 – KI-Generierung für Event
# ──────────────────────────────────────────────


@router.post(
    "/generate/{event_id}",
    response_model=TickerEntryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Modus 2/3: KI-Ticker für Partner-API Event generieren",
)
async def generate_for_event(
    event_id: int,
    data: GenerateEventRequest = Body(default_factory=GenerateEventRequest),
    db: Session = Depends(get_db),
) -> TickerEntryResponse:
    event = EventRepository(db).get_by_id(event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )

    ticker_repo = TickerEntryRepository(db)
    existing = ticker_repo.get_by_event(event_id)
    if existing:
        return existing

    match = MatchRepository(db).load_with_teams(event.match_id)
    match_context = _build_match_context(match, event.time)

    try:
        desc = json.loads(event.description or "{}")
    except (ValueError, TypeError):
        desc = {}

    player_name = desc.get("player_name")
    assist_name = desc.get("assist_name")
    event_detail = desc.get("detail") or desc.get("comments") or event.description or ""

    team_id = desc.get("team_id")
    if team_id and match:
        if match.home_team and match.home_team.external_id == team_id:
            team_name = match.home_team.name
        elif match.away_team and match.away_team.external_id == team_id:
            team_name = match.away_team.name
        else:
            team_name = None
    else:
        team_name = desc.get("team_name")

    score_str = None
    if event.event_type in ("goal", "own_goal"):
        score_str = _score_at_event(EventRepository(db), event, match)

    try:
        text, model_used = await _call_llm(
            event_type=event.event_type or "comment",
            event_detail=event_detail,
            minute=event.time,
            player_name=player_name,
            assist_name=assist_name,
            team_name=team_name,
            style=data.style,
            language=data.language,
            context_data=_build_context_data(match_context, data.instance, score_str),
            match_context=match_context,
            provider=data.provider,
            model=data.model,
            db=db,
            instance=data.instance,
        )
    except Exception as e:
        logger.exception("LLM generation failed for event_id=%s", event_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=f"LLM error: {e}"
        )

    return ticker_repo.create(
        _make_ai_entry(
            event.match_id, text, model_used, data.style,
            event_id=event_id,
            status=TickerStatus.published if data.auto_publish else TickerStatus.draft,
        )
    )


# ──────────────────────────────────────────────
# POST: Modus 2 / 3 – KI-Generierung für Synthetic Event
# ──────────────────────────────────────────────


@router.post(
    "/generate-synthetic",
    response_model=TickerEntryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Modus 2/3: KI-Ticker für synthetisches Event generieren",
)
async def generate_for_synthetic_event(
    data: GenerateSyntheticRequest,
    db: Session = Depends(get_db),
) -> TickerEntryResponse:
    synthetic = SyntheticEventRepository(db).get_by_id(data.synthetic_event_id)
    if not synthetic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="SyntheticEvent not found"
        )

    match = MatchRepository(db).load_with_teams(synthetic.match_id)
    match_context = _build_match_context(match, synthetic.minute)

    try:
        text, model_used = await _call_llm(
            event_type=synthetic.type or "comment",
            event_detail="",
            minute=synthetic.minute,
            style=data.style,
            language=data.language,
            context_data=synthetic.data or {},
            match_context=match_context,
            provider=data.provider,
            model=data.model,
            db=db,
            instance=data.instance,
        )
    except Exception as e:
        logger.exception(
            "LLM generation failed for synthetic_event_id=%s", data.synthetic_event_id
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=f"LLM error: {e}"
        )

    phase = resolve_phase(synthetic.type or "")

    event_minute: Optional[int] = None
    try:
        raw = synthetic.data
        d = raw if isinstance(raw, dict) else json.loads(raw or "{}")
        event_minute = d.get("minute")
    except Exception:
        logger.debug("Could not parse minute from synthetic data id=%s", synthetic.id)

    return TickerEntryRepository(db).create(
        _make_ai_entry(
            synthetic.match_id, text, model_used, data.style,
            synthetic_event_id=synthetic.id,
            phase=phase,
            minute=event_minute,
            status=TickerStatus.published if data.auto_publish else TickerStatus.draft,
        )
    )


# ──────────────────────────────────────────────
# POST: Alle Synthetic Events eines Spiels generieren (Auto-Trigger)
# ──────────────────────────────────────────────


@router.post(
    "/generate-synthetic-batch/{match_id}",
    response_model=list[TickerEntryResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Alle ungenierierten Synthetic Events eines Spiels generieren",
)
async def generate_synthetic_batch(
    match_id: int,
    data: GenerateSyntheticBatchRequest = Body(
        default_factory=GenerateSyntheticBatchRequest
    ),
    db: Session = Depends(get_db),
) -> list[TickerEntryResponse]:
    synth_repo = SyntheticEventRepository(db)
    synthetics = synth_repo.get_by_match(match_id)
    if not synthetics:
        return []

    ticker_repo = TickerEntryRepository(db)
    existing_ids = ticker_repo.get_existing_synthetic_ids(match_id)
    match = MatchRepository(db).load_with_teams(match_id)
    results = []

    for synthetic in synthetics:
        if synthetic.id in existing_ids:
            continue

        match_context = _build_match_context(match, synthetic.minute)
        try:
            text, model_used = await _call_llm(
                event_type=synthetic.type or "comment",
                event_detail="",
                minute=synthetic.minute,
                style=data.style,
                language=data.language,
                context_data=synthetic.data or {},
                match_context=match_context,
                db=db,
                instance=data.instance,
            )
        except Exception:
            logger.exception(
                "Batch synthetic generation failed for id=%s", synthetic.id
            )
            continue

        phase = resolve_phase(synthetic.type or "")

        entry = ticker_repo.create(
            _make_ai_entry(
                match_id, text, model_used, data.style,
                synthetic_event_id=synthetic.id,
                phase=phase,
                status=TickerStatus.published if data.auto_publish else TickerStatus.draft,
            )
        )
        results.append(entry)

    return results


# ──────────────────────────────────────────────
# POST: Alle Match-Phasen eines Spiels generieren
# ──────────────────────────────────────────────

STANDARD_PHASES = [
    ("match_kickoff",    "FirstHalf",      1),
    ("match_halftime",   "FirstHalfBreak", 45),
    ("match_second_half","SecondHalf",     46),
    ("match_fulltime",   "After",          90),
]


@router.post(
    "/generate-match-phases/{match_id}",
    response_model=list[TickerEntryResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Alle 4 Standard-Spielphasen generieren (Anpfiff, HZ, 2. HZ, Abpfiff)",
)
async def generate_match_phases(
    match_id: int,
    data: GenerateSyntheticBatchRequest = Body(
        default_factory=GenerateSyntheticBatchRequest
    ),
    db: Session = Depends(get_db),
) -> list[TickerEntryResponse]:
    match = MatchRepository(db).load_with_teams(match_id)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Match not found"
        )

    ticker_repo = TickerEntryRepository(db)
    synth_repo = SyntheticEventRepository(db)
    results = []

    for event_type, phase, default_minute in STANDARD_PHASES:
        if ticker_repo.get_by_phase(match_id, phase):
            continue

        synthetic = synth_repo.get_or_create_flush(
            match_id, event_type, {"minute": default_minute}
        )

        match_context = _build_match_context(match, default_minute)
        try:
            text, model_used = await _call_llm(
                event_type=event_type,
                event_detail="",
                minute=default_minute,
                style=data.style,
                language=data.language,
                context_data={},
                match_context=match_context,
                db=db,
                instance=data.instance,
            )
        except Exception:
            logger.exception(
                "Phase generation failed for match_id=%s type=%s", match_id, event_type
            )
            continue

        entry = ticker_repo.create(
            _make_ai_entry(
                match_id, text, model_used, data.style,
                synthetic_event_id=synthetic.id,
                phase=phase,
                minute=default_minute,
                status=TickerStatus.published if data.auto_publish else TickerStatus.draft,
            )
        )
        results.append(entry)

    db.commit()
    return results


# ──────────────────────────────────────────────
# POST: Bulk-Regenerierung (Evaluation)
# ──────────────────────────────────────────────


@router.post(
    "/generate-bulk/{match_id}",
    response_model=list[TickerEntryResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Evaluation: Alle Events eines Spiels mit einem Provider generieren",
)
async def generate_bulk_for_match(
    match_id: int,
    data: GenerateEventRequest = Body(default_factory=GenerateEventRequest),
    db: Session = Depends(get_db),
) -> list[TickerEntryResponse]:
    events = EventRepository(db).get_by_match(match_id)
    if not events:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Keine Events für dieses Spiel",
        )

    match = MatchRepository(db).load_with_teams(match_id)
    ticker_repo = TickerEntryRepository(db)
    results = []

    for event in events:
        match_context = _build_match_context(match, event.time)
        try:
            text, model_used = await _call_llm(
                event_type=event.event_type or "comment",
                event_detail=event.description or "",
                minute=event.time,
                style=data.style,
                language=data.language,
                context_data=_build_context_data(match_context, data.instance),
                match_context=match_context,
                provider=data.provider,
                model=data.model,
                db=db,
                instance=data.instance,
            )
            entry = ticker_repo.create(
                _make_ai_entry(
                    match_id, text, model_used, data.style,
                    event_id=event.id,
                    status=TickerStatus.draft,
                )
            )
            results.append(entry)
        except Exception:
            logger.exception("Bulk generation failed for event_id=%s", event.id)
            continue

    return results
