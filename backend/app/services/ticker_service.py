"""
TickerService
=============
Business-Logik für KI-Ticker-Generierung.

Kapselt:
- Semaphore-gesicherte LLM-Aufrufe
- Match-Kontext-Aufbau
- Score-Berechnung zum Zeitpunkt eines Events
- TickerEntryCreate-Builder für KI-Einträge
"""

import asyncio
import json
import logging
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.repositories.event_repository import EventRepository
from app.schemas.ticker_entry import TickerEntryCreate, TickerStatus
from app.services.llm_service import generate_ticker_text

logger = logging.getLogger(__name__)

# Limit concurrent LLM calls (konfigurierbar via LLM_CONCURRENCY)
_llm_semaphore = asyncio.Semaphore(settings.LLM_CONCURRENCY)


def score_at_event(event_repo: EventRepository, event, match) -> Optional[str]:
    """Berechnet den Spielstand zum Zeitpunkt eines Tor-Events."""
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


def build_match_context(match, event_minute: Optional[int]) -> dict:
    """Erstellt das match_context-Dict für LLM-Prompts."""
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


def build_context_data(
    match_context: dict,
    instance: str,
    score_str: Optional[str] = None,
) -> dict:
    """Erstellt das context_data-Dict für generate_ticker_text.

    ef_whitelabel: enthält Teamnamen + optionalen Score.
    generic: enthält nur den Score (falls vorhanden).
    """
    score_part = {"score": score_str} if score_str else {}
    if instance == "ef_whitelabel":
        return {
            "home_team": match_context.get("home_team"),
            "away_team": match_context.get("away_team"),
            **score_part,
        }
    return score_part


async def call_llm(
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
    """Semaphore-gesicherter LLM-Aufruf inkl. Stilreferenz-Lookup.

    Stilreferenzen werden hier im Domain-Service geladen, damit llm_service.py
    keine Datenbankabhängigkeit hat (Separation of Concerns).
    """
    from app.repositories.style_reference_repository import StyleReferenceRepository
    from app.services.llm_service import llm_service as _llm_svc

    style_references: list[str] = []
    try:
        normalized = _llm_svc._normalize_event_type(event_type)
        league = match_context.get("league") if match_context else None
        refs = StyleReferenceRepository(db).get_samples(
            event_type=normalized, instance=instance, limit=3, league=league,
        )
        style_references = [r.text for r in refs]
        logger.debug(
            "Stilreferenzen geladen: %d für event_type=%s instance=%s league=%s",
            len(refs), normalized, instance, league,
        )
    except Exception:
        logger.warning("Stilreferenzen konnten nicht geladen werden", exc_info=True)
        db.rollback()

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
            style_references=style_references,
            provider=provider,
            model=model,
        )


def make_ai_entry(
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
    """Erstellt ein TickerEntryCreate-Schema für einen KI-generierten Eintrag."""
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
