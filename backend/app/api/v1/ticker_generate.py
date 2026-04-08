"""
Ticker Generate Router
======================
KI-Generierungs-Endpunkte für Ticker-Einträge (Modus 2 / 3).

Enthält:
- POST /ticker/generate/{event_id}          — Partner-API Event
- POST /ticker/generate-synthetic           — Synthetisches Event
- POST /ticker/generate-synthetic-batch/{match_id}
- POST /ticker/generate-match-phases/{match_id}
"""

import json
import logging
import time
from json import JSONDecodeError
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.constants import resolve_phase, STANDARD_PHASES
from app.core.database import get_db
from app.utils.http_errors import require_or_404
from app.repositories.event_repository import EventRepository
from app.repositories.match_repository import MatchRepository
from app.repositories.synthetic_event_repository import SyntheticEventRepository
from app.repositories.ticker_entry_repository import TickerEntryRepository
from app.schemas.ticker_entry import (
    GenerateEventRequest,
    GenerateSyntheticBatchRequest,
    GenerateSyntheticRequest,
    TickerEntryResponse,
    TickerStatus,
)
from app.services import ticker_service as ts

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ticker", tags=["Ticker"])


async def _generate_synthetic_entry(
    *,
    match_id: int,
    event_type: str,
    minute: Optional[int],
    context_data: dict,
    match_context: dict,
    synthetic_event_id: int,
    phase: str,
    ticker_repo: TickerEntryRepository,
    data: GenerateSyntheticBatchRequest,
    db: Session,
    failed: list,
    failed_key: object,
) -> Optional[TickerEntryResponse]:
    """Gemeinsame LLM-Aufruf + Entry-Erstellungs-Logik für Batch- und Phasen-Generierung."""
    try:
        text, model_used = await ts.call_llm(
            event_type=event_type,
            event_detail="",
            minute=minute,
            style=data.style,
            language=data.language,
            context_data=context_data,
            match_context=match_context,
            db=db,
            instance=data.instance,
        )
    except Exception as exc:
        logger.exception("Synthetic generation failed for %s", failed_key)
        failed.append((failed_key, str(exc)))
        return None

    return ticker_repo.create(
        ts.make_ai_entry(
            match_id,
            text,
            model_used,
            data.style,
            synthetic_event_id=synthetic_event_id,
            phase=phase,
            minute=minute,
            instance=data.instance,
            status=TickerStatus.published if data.auto_publish else TickerStatus.draft,
        )
    )


async def _call_llm_or_502(context_info: str, **kwargs) -> tuple[str, str]:
    """Ruft ts.call_llm() auf und wandelt Fehler in HTTP 502 um.

    Args:
        context_info: Beschreibung des Kontexts für das Error-Logging (z.B. "event_id=42").
        **kwargs:      Werden direkt an ts.call_llm() weitergegeben.

    Returns:
        (text, model_used) aus ts.call_llm()

    Raises:
        HTTPException 502: Wenn ts.call_llm() eine Exception wirft.
    """
    try:
        return await ts.call_llm(**kwargs)
    except Exception as e:
        logger.exception("LLM generation failed for %s", context_info)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=f"LLM error: {e}"
        )


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
    t0 = time.monotonic()
    event = require_or_404(EventRepository(db).get_by_id(event_id), "Event not found")

    ticker_repo = TickerEntryRepository(db)
    existing = ticker_repo.get_by_event(event_id)
    if existing:
        # Style-Wechsel: alten Eintrag löschen und neu generieren
        if data.style and existing.style != data.style:
            ticker_repo.delete(existing.id)
        else:
            return existing

    match = MatchRepository(db).get_by_id(event.match_id)
    match_context = ts.build_match_context(match, event.time)

    try:
        desc = json.loads(event.description or "{}")
    except JSONDecodeError:
        logger.warning("Invalid JSON in event.description for event_id=%s", event_id)
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
        score_str = ts.score_at_event(EventRepository(db), event, match)

    text, model_used = await _call_llm_or_502(
        f"event_id={event_id}",
        event_type=event.event_type or "comment",
        event_detail=event_detail,
        minute=event.time,
        player_name=player_name,
        assist_name=assist_name,
        team_name=team_name,
        style=data.style,
        language=data.language,
        context_data=ts.build_context_data(match_context, data.instance, score_str),
        match_context=match_context,
        provider=data.provider,
        model=data.model,
        db=db,
        instance=data.instance,
    )

    return ticker_repo.create(
        ts.make_ai_entry(
            event.match_id,
            text,
            model_used,
            data.style,
            event_id=event_id,
            minute=event.time,
            instance=data.instance,
            status=TickerStatus.published if data.auto_publish else TickerStatus.draft,
            generation_ms=int((time.monotonic() - t0) * 1000),
        )
    )


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
    t0 = time.monotonic()
    synthetic = require_or_404(
        SyntheticEventRepository(db).get_by_id(data.synthetic_event_id),
        "SyntheticEvent not found",
    )

    match = MatchRepository(db).get_by_id(synthetic.match_id)
    match_context = ts.build_match_context(match, synthetic.minute)

    text, model_used = await _call_llm_or_502(
        f"synthetic_event_id={data.synthetic_event_id}",
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

    phase = resolve_phase(synthetic.type or "")

    event_minute: Optional[int] = None
    try:
        raw = synthetic.data
        d = raw if isinstance(raw, dict) else json.loads(raw or "{}")
        event_minute = d.get("minute")
    except (JSONDecodeError, ValueError):
        logger.debug("Could not parse minute from synthetic data id=%s", synthetic.id)

    return TickerEntryRepository(db).create(
        ts.make_ai_entry(
            synthetic.match_id,
            text,
            model_used,
            data.style,
            synthetic_event_id=synthetic.id,
            phase=phase,
            minute=event_minute,
            instance=data.instance,
            status=TickerStatus.published if data.auto_publish else TickerStatus.draft,
            generation_ms=int((time.monotonic() - t0) * 1000),
        )
    )


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
    match = MatchRepository(db).get_by_id(match_id)
    results = []
    failed: list[tuple[int, str]] = []

    for synthetic in synthetics:
        if synthetic.id in existing_ids:
            continue

        match_context = ts.build_match_context(match, synthetic.minute)
        phase = resolve_phase(synthetic.type or "")
        entry = await _generate_synthetic_entry(
            match_id=match_id,
            event_type=synthetic.type or "comment",
            minute=synthetic.minute,
            context_data=synthetic.data or {},
            match_context=match_context,
            synthetic_event_id=synthetic.id,
            phase=phase,
            ticker_repo=ticker_repo,
            data=data,
            db=db,
            failed=failed,
            failed_key=synthetic.id,
        )
        if entry:
            results.append(entry)

    if failed:
        logger.warning(
            "generate-synthetic-batch match_id=%s: %d/%d items failed: %s",
            match_id,
            len(failed),
            len(synthetics),
            failed,
        )

    return results


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
    match = require_or_404(MatchRepository(db).get_by_id(match_id), "Match not found")

    ticker_repo = TickerEntryRepository(db)
    synth_repo = SyntheticEventRepository(db)
    results = []
    failed: list[tuple[str, str]] = []

    for event_type, phase, default_minute in STANDARD_PHASES:
        if ticker_repo.get_by_phase(match_id, phase):
            continue

        synthetic = synth_repo.get_or_create_flush(
            match_id, event_type, {"minute": default_minute}
        )
        match_context = ts.build_match_context(match, default_minute)
        entry = await _generate_synthetic_entry(
            match_id=match_id,
            event_type=event_type,
            minute=default_minute,
            context_data={},
            match_context=match_context,
            synthetic_event_id=synthetic.id,
            phase=phase,
            ticker_repo=ticker_repo,
            data=data,
            db=db,
            failed=failed,
            failed_key=event_type,
        )
        if entry:
            results.append(entry)

    if failed:
        logger.warning(
            "generate-match-phases match_id=%s: %d/%d phases failed: %s",
            match_id,
            len(failed),
            len(STANDARD_PHASES),
            failed,
        )

    return results
