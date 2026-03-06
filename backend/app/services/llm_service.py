"""
LLM Service für Ticker-Text-Generierung.
Provider: Mock, OpenAI, Anthropic, Gemini, OpenRouter
Few-Shot: Stilreferenzen aus PostgreSQL (style_references)
"""

import logging
import random
from typing import Optional, Literal

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# Event-Type Mapping
# ──────────────────────────────────────────────

EVENT_TYPE_MAP: dict[str, str] = {
    # Partner-API
    "PartnerGoal": "goal",
    "PartnerPenaltyGoal": "goal",
    "PartnerOwnGoal": "own_goal",
    "PartnerMissedPenalty": "missed_penalty",
    "PartnerYellowCard": "yellow_card",
    "PartnerRedCard": "red_card",
    "PartnerYellowRedCard": "red_card",
    "PartnerSubstitution": "substitution",
    "PartnerKickOff": "kick_off",
    "PartnerHalfTime": "halftime",
    "PartnerFullTime": "fulltime",
    "PartnerExtraTimeStart": "extra_time_start",
    "PartnerExtraTimeHalfTime": "halftime",
    "PartnerExtraTimeEnd": "fulltime",
    "PartnerPenaltyShootoutStart": "penalty_shootout",
    "PartnerPenaltyShootoutEnd": "fulltime",
    # API-Football Legacy
    "Goal": "goal",
    "Card": "yellow_card",
    "subst": "substitution",
    # Intern (bereits normalisiert)
    "goal": "goal",
    "own_goal": "own_goal",
    "missed_penalty": "missed_penalty",
    "yellow_card": "yellow_card",
    "red_card": "red_card",
    "substitution": "substitution",
    "kick_off": "kick_off",
    "halftime": "halftime",
    "fulltime": "fulltime",
    "extra_time_start": "extra_time_start",
    "penalty_shootout": "penalty_shootout",
    "comment": "comment",
    "pre_match": "pre_match",
    "post_match": "post_match",
    "halftime_comment": "halftime_comment",
}

EVENT_TYPE_LABEL: dict[str, str] = {
    "goal": "Tor",
    "own_goal": "Eigentor",
    "missed_penalty": "Elfmeter verschossen",
    "yellow_card": "Gelbe Karte",
    "red_card": "Rote Karte",
    "substitution": "Spielerwechsel",
    "kick_off": "Anstoß",
    "halftime": "Halbzeit",
    "fulltime": "Abpfiff",
    "extra_time_start": "Verlängerung beginnt",
    "penalty_shootout": "Elfmeterschießen",
    "comment": "Spielszene",
    "pre_match": "Vorbericht",
    "post_match": "Nachbericht",
    "halftime_comment": "Halbzeitkommentar",
}

STYLE_DESC: dict[str, str] = {
    "neutral": "sachlich und neutral – keine Vereinspräferenz",
    "euphorisch": "begeistert und emotional – aus Sicht der Heimfans",
    "kritisch": "analytisch und kritisch",
}

# ──────────────────────────────────────────────
# LLM Service
# ──────────────────────────────────────────────


class LLMService:
    def __init__(
        self,
        api_key: Optional[str] = None,
        provider: Literal[
            "openai", "anthropic", "gemini", "openrouter", "mock"
        ] = "mock",
        model: Optional[str] = None,
    ):
        self.provider = provider
        self.api_key = api_key
        self.model = model
        self._client = None  # lazy init

        if provider == "mock":
            logger.warning("LLM Service läuft im MOCK-Modus")
        elif provider == "gemini":
            self._require_key()
            from google import genai

            self._client = genai.Client(api_key=api_key)
            self.model = model or "gemini-2.0-flash-lite-001"
        elif provider == "openrouter":
            self._require_key()
            from openai import OpenAI

            self._client = OpenAI(
                api_key=api_key, base_url="https://openrouter.ai/api/v1"
            )
            self.model = model or "google/gemini-2.0-flash-lite-001"
        elif provider == "openai":
            self._require_key()
            from openai import OpenAI

            self._client = OpenAI(api_key=api_key)
            self.model = model or "gpt-4o-mini"
        elif provider == "anthropic":
            self._require_key()
            import anthropic

            self._client = anthropic.Anthropic(api_key=api_key)
            self.model = model or "claude-haiku-4-5-20251001"
        else:
            raise ValueError(f"Unbekannter Provider: {provider}")

    def _require_key(self) -> None:
        if not self.api_key:
            raise ValueError(f"{self.provider} API Key erforderlich")

    # ──────────────────────────────────────────
    # Public Entry Point
    # ──────────────────────────────────────────

    def generate_ticker_text(
        self,
        event_type: str,
        event_detail: str = "",
        minute: Optional[int] = None,
        player_name: Optional[str] = None,
        assist_name: Optional[str] = None,
        team_name: Optional[str] = None,
        style: Literal["neutral", "euphorisch", "kritisch"] = "neutral",
        language: str = "de",
        context_data: Optional[dict] = None,
        style_references: Optional[list[str]] = None,
    ) -> str:
        normalized = self._normalize_event_type(event_type)
        kwargs = dict(
            event_type=normalized,
            event_detail=event_detail,
            minute=minute,
            player_name=player_name,
            assist_name=assist_name,
            team_name=team_name,
            style=style,
            language=language,
            context_data=context_data,
            style_references=style_references,
        )
        dispatch = {
            "mock": self._generate_mock_text,
            "gemini": self._generate_gemini_text,
            "openrouter": self._generate_openrouter_text,
            "openai": self._generate_openai_text,
            "anthropic": self._generate_anthropic_text,
        }
        return dispatch[self.provider](**kwargs)

    def _normalize_event_type(self, event_type: str) -> str:
        return EVENT_TYPE_MAP.get(event_type, "comment")

    # ──────────────────────────────────────────
    # Prompt Builder
    # ──────────────────────────────────────────

    def _build_prompt(
        self,
        event_type: str,
        event_detail: str,
        minute: Optional[int],
        player_name: Optional[str],
        assist_name: Optional[str],
        team_name: Optional[str],
        style: str,
        language: str,
        context_data: Optional[dict] = None,
        style_references: Optional[list[str]] = None,
    ) -> str:
        lang = "Deutsch" if language == "de" else "English"
        style_desc = STYLE_DESC.get(style, STYLE_DESC["neutral"])
        minute_str = f"{minute}. Minute" if minute else "Vor/Nach dem Spiel"
        event_label = EVENT_TYPE_LABEL.get(event_type, event_type)

        event_lines = [f"Ereignistyp: {event_label}"]
        if event_detail:
            event_lines.append(f"Detail: {event_detail}")
        if minute:
            event_lines.append(f"Minute: {minute_str}")
        if player_name:
            event_lines.append(f"Spieler: {player_name}")
        if assist_name:
            label = (
                "Eingewechselt für" if event_type == "substitution" else "Vorlagengeber"
            )
            event_lines.append(f"{label}: {assist_name}")
        if team_name:
            event_lines.append(f"Verursachendes Team (Spieler gehört zu diesem Verein): {team_name}")

        context_block = self._build_context_str(event_type, context_data)

        few_shot_block = ""
        if style_references:
            examples = "\n".join(f'- "{r}"' for r in style_references)
            few_shot_block = (
                f"\n### STILREFERENZEN\n"
                f"Schreibe in exakt diesem Stil (Rhythmus, Wortwahl, Emotionalität):\n"
                f"{examples}\n"
            )

        return (
            f"Du bist ein Fußball-Liveticker-Redakteur. "
            f"Schreibe einen Ticker-Eintrag (1–2 Sätze) auf {lang}.\n\n"
            f"### STIL\n{style_desc}\n\n"
            f"### FAKTEN\n{chr(10).join(event_lines)}\n"
            f"{context_block}"
            f"{few_shot_block}\n"
            f"### REGELN\n"
            f"- Nur der fertige Ticker-Text, keine Erklärungen\n"
            f"- Ellipsen und kurze Hauptsätze bevorzugen\n"
            f"- Präsens für laufende Szene, Perfekt für abgeschlossene Aktion\n"
            f"- Bei Tor: emotional, prägnant\n"
            f"- Das 'Verursachende Team' ist der Verein des handelnden Spielers – nicht zwingend das Heimteam\n"
            f"- Spielstand nur nennen wenn er im SPIELKONTEXT unter 'Stand nach diesem Tor' angegeben ist\n"
            f"- Keine Hashtags, keine Emojis außer TOOOOR!\n"
        )

    def _build_context_str(self, event_type: str, context_data: Optional[dict]) -> str:
        if not context_data:
            return ""

        if "home_team" in context_data:
            return self._ctx_match_info(context_data)

        builders = {
            "pre_match_injuries": self._ctx_injuries,
            "pre_match_prediction": self._ctx_prediction,
            "pre_match_h2h": self._ctx_h2h,
            "pre_match_team_stats": self._ctx_team_stats,
            "live_stats_update": self._ctx_live_stats,
        }
        builder = builders.get(event_type)
        if builder:
            return builder(context_data)

        import json

        return (
            f"\n### KONTEXT\n{json.dumps(context_data, ensure_ascii=False, indent=2)}\n"
        )

    def _ctx_injuries(self, d: dict) -> str:
        team = d.get("team_name", "Unbekannt")
        players = d.get("players", [])
        if not players:
            return f"\n### KONTEXT\nTeam: {team}\nKeine Ausfälle gemeldet.\n"
        lines = [f"Team: {team}", "Ausfälle/Fraglich:"]
        for p in players:
            lines.append(
                f"  - {p.get('player_name')} ({p.get('reason')}) [{p.get('type')}]"
            )
        return "\n### KONTEXT\n" + "\n".join(lines) + "\n"

    def _ctx_prediction(self, d: dict) -> str:
        home, away = d.get("home", {}), d.get("away", {})
        return (
            f"\n### KONTEXT\n"
            f"Heimteam: {home.get('name')} (Form: {home.get('form')}, Siege: {home.get('wins_total')})\n"
            f"Auswärtsteam: {away.get('name')} (Form: {away.get('form')}, Siege: {away.get('wins_total')})\n"
            f"Tipp: {d.get('advice')}\n"
            f"Chancen – Heim: {d.get('percent_home')}, "
            f"Unentschieden: {d.get('percent_draw')}, "
            f"Auswärts: {d.get('percent_away')}\n"
        )

    def _ctx_h2h(self, d: dict) -> str:
        matches = d.get("matches", [])
        if not matches:
            return "\n### KONTEXT\nDirektvergleich: Keine historischen Begegnungen.\n"
        lines = ["Direktvergleich (letzte Spiele):"] + [f"  - {m}" for m in matches[:5]]
        return "\n### KONTEXT\n" + "\n".join(lines) + "\n"

    def _ctx_team_stats(self, d: dict) -> str:
        return (
            f"\n### KONTEXT\n"
            f"Team: {d.get('team_name')}\n"
            f"Form: {d.get('form')}\n"
            f"S/U/N: {d.get('wins_total')}/{d.get('draws_total')}/{d.get('loses_total')}\n"
            f"Tore/Spiel: {d.get('goals_for_avg')} | Gegentore: {d.get('goals_against_avg')}\n"
            f"Formation: {d.get('most_used_formation')}\n"
            f"Clean Sheets: {d.get('clean_sheets')}\n"
        )

    def _ctx_live_stats(self, d: dict) -> str:
        return (
            f"\n### KONTEXT\n"
            f"Heim: {d.get('home_team')} vs Auswärts: {d.get('away_team')}\n"
            f"Auslöser: {', '.join(d.get('triggers', []))}\n"
            f"Stats: {d.get('curr_stats', {})}\n"
        )

    def _ctx_match_info(self, d: dict) -> str:
        lines = [
            "\n### SPIELKONTEXT",
            f"Heimteam: {d.get('home_team')}",
            f"Auswärtsteam: {d.get('away_team')}",
        ]
        if d.get("score"):
            lines.append(f"Stand nach diesem Tor: {d.get('score')}")
        lines.append(
            "(Das 'Verursachende Team' im FAKTEN-Block gehört zu einem dieser Teams)"
        )
        return "\n".join(lines) + "\n"

    # ──────────────────────────────────────────
    # Provider Implementierungen
    # ──────────────────────────────────────────

    def _generate_mock_text(
        self,
        event_type,
        event_detail,
        minute,
        player_name,
        assist_name,
        team_name,
        style,
        language,
        context_data,
        style_references,
    ) -> str:
        m = minute or "?"
        p = player_name or "Unbekannt"
        t = team_name or "Das Team"
        a = assist_name or ""

        templates: dict[str, dict[str, list[str]]] = {
            "goal": {
                "neutral": [
                    f"{m}. Minute: {p} trifft für {t}.{f' Vorlage: {a}.' if a else ''}",
                    f"Tor! {p} erzielt das {m}.-Minuten-Tor für {t}.",
                ],
                "euphorisch": [
                    f"TOOOOR! {p} macht das Ding! {m}. Minute – {t} jubelt!{f' Starke Vorlage von {a}!' if a else ''}",
                    f"WAHNSINN! {p} in der {m}. Minute!",
                ],
                "kritisch": [f"{m}': {p} trifft – die Abwehr hatte geschlafen."],
            },
            "own_goal": {
                "neutral": [
                    f"{m}. Minute: Eigentor! {p} befördert den Ball ins eigene Netz."
                ]
            },
            "missed_penalty": {
                "neutral": [
                    f"{m}. Minute: Elfmeter verschossen! {p} scheitert vom Punkt."
                ]
            },
            "yellow_card": {
                "neutral": [f"{m}. Minute: Gelbe Karte für {p}."],
                "euphorisch": [f"{m}': {p} sieht Gelb – das war unnötig!"],
                "kritisch": [f"Gelb für {p} ({m}') – vollkommen berechtigt."],
            },
            "red_card": {
                "neutral": [f"ROTE KARTE! {p} muss in der {m}. Minute vom Platz!"]
            },
            "substitution": {
                "neutral": [f"{m}. Minute: Wechsel bei {t}. {p} kommt für {a}."],
                "euphorisch": [f"Frische Kräfte! {p} kommt für {a} ({m}')."],
                "kritisch": [f"Wechsel ({m}'): {p} für {a} – fragwürdig."],
            },
            "kick_off": {"neutral": ["Anstoß! Das Spiel läuft."]},
            "halftime": {"neutral": ["Halbzeit! Pause nach 45 Minuten."]},
            "fulltime": {"neutral": ["Abpfiff! Das Spiel ist beendet."]},
            "extra_time_start": {"neutral": ["Die Verlängerung beginnt!"]},
            "penalty_shootout": {
                "neutral": ["Elfmeterschießen! Es geht in die Entscheidung."]
            },
        }

        pool = templates.get(event_type, {})
        choices = (
            pool.get(style)
            or pool.get("neutral")
            or [f"{m}. Minute: {event_detail or event_type}"]
        )
        return random.choice(choices)

    def _generate_openrouter_text(
        self,
        event_type,
        event_detail,
        minute,
        player_name,
        assist_name,
        team_name,
        style,
        language,
        context_data,
        style_references,
    ) -> str:
        prompt = self._build_prompt(
            event_type,
            event_detail,
            minute,
            player_name,
            assist_name,
            team_name,
            style,
            language,
            context_data,
            style_references,
        )
        response = self._client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.3,
        )
        return response.choices[0].message.content.strip()

    def _generate_openai_text(
        self,
        event_type,
        event_detail,
        minute,
        player_name,
        assist_name,
        team_name,
        style,
        language,
        context_data,
        style_references,
    ) -> str:
        prompt = self._build_prompt(
            event_type,
            event_detail,
            minute,
            player_name,
            assist_name,
            team_name,
            style,
            language,
            context_data,
            style_references,
        )
        response = self._client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.3,
        )
        return response.choices[0].message.content.strip()

    def _generate_gemini_text(
        self,
        event_type,
        event_detail,
        minute,
        player_name,
        assist_name,
        team_name,
        style,
        language,
        context_data,
        style_references,
    ) -> str:
        prompt = self._build_prompt(
            event_type,
            event_detail,
            minute,
            player_name,
            assist_name,
            team_name,
            style,
            language,
            context_data,
            style_references,
        )
        response = self._client.models.generate_content(
            model=self.model, contents=prompt
        )
        return response.text.strip()

    def _generate_anthropic_text(
        self,
        event_type,
        event_detail,
        minute,
        player_name,
        assist_name,
        team_name,
        style,
        language,
        context_data,
        style_references,
    ) -> str:
        prompt = self._build_prompt(
            event_type,
            event_detail,
            minute,
            player_name,
            assist_name,
            team_name,
            style,
            language,
            context_data,
            style_references,
        )
        response = self._client.messages.create(
            model=self.model,
            max_tokens=200,
            temperature=0.3,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text.strip()


# ──────────────────────────────────────────────
# Singleton
# ──────────────────────────────────────────────

from app.core.config import settings


def _build_singleton() -> LLMService:
    candidates = [
        (
            "openrouter",
            getattr(settings, "OPENROUTER_API_KEY", None),
            getattr(settings, "OPENROUTER_MODEL", "google/gemini-2.0-flash-lite-001"),
        ),
        (
            "gemini",
            getattr(settings, "GEMINI_API_KEY", None),
            getattr(settings, "GEMINI_MODEL", "gemini-2.0-flash-lite-001"),
        ),
        (
            "openai",
            getattr(settings, "OPENAI_API_KEY", None),
            getattr(settings, "OPENAI_MODEL", "gpt-4o-mini"),
        ),
        (
            "anthropic",
            getattr(settings, "ANTHROPIC_API_KEY", None),
            getattr(settings, "ANTHROPIC_MODEL", "claude-haiku-4-5-20251001"),
        ),
    ]
    for provider, key, model in candidates:
        if key:
            logger.info("LLM Provider: %s / %s", provider, model)
            return LLMService(provider=provider, api_key=key, model=model)
    logger.warning("Kein API Key gefunden – LLM läuft im MOCK-Modus")
    return LLMService(provider="mock")


llm_service = _build_singleton()
_provider = llm_service.provider
_model = llm_service.model


# ──────────────────────────────────────────────
# Async Wrapper (für Router)
# ──────────────────────────────────────────────


async def generate_ticker_text(
    event_type: str,
    event_detail: str = "",
    minute: Optional[int] = None,
    player_name: Optional[str] = None,
    assist_name: Optional[str] = None,
    team_name: Optional[str] = None,
    style: str = "neutral",
    language: str = "de",
    context_data: Optional[dict] = None,
    match_context: Optional[dict] = None,
    provider: Optional[str] = None,
    model: Optional[str] = None,
    db=None,
    instance: str = "ef_whitelabel",
) -> tuple[str, str]:
    # Few-Shot Stilreferenzen aus DB holen
    style_references: list[str] = []
    if db:
        try:
            from app.repositories.style_reference_repository import (
                StyleReferenceRepository,
            )

            normalized = llm_service._normalize_event_type(event_type)
            league = match_context.get("league") if match_context else None
            refs = StyleReferenceRepository(db).get_samples(
                event_type=normalized,
                instance=instance,
                limit=3,
                league=league,
            )
            style_references = [r.text for r in refs]
            logger.debug(
                "Stilreferenzen geladen: %d für event_type=%s instance=%s league=%s",
                len(refs),
                normalized,
                instance,
                league,
            )
        except Exception:
            logger.warning("Stilreferenzen konnten nicht geladen werden", exc_info=True)

    resolved_minute = (match_context.get("minute") if match_context else None) or minute
    resolved_team = team_name or (
        match_context.get("home_team") if match_context else None
    )

    # Provider/Model Override (Evaluation)
    if provider and provider != _provider:
        key_map = {
            "openrouter": getattr(settings, "OPENROUTER_API_KEY", None),
            "gemini": getattr(settings, "GEMINI_API_KEY", None),
            "openai": getattr(settings, "OPENAI_API_KEY", None),
            "anthropic": getattr(settings, "ANTHROPIC_API_KEY", None),
        }
        active_service = LLMService(
            provider=provider, api_key=key_map.get(provider), model=model
        )
    else:
        active_service = llm_service

    text = active_service.generate_ticker_text(
        event_type=event_type,
        event_detail=event_detail,
        minute=resolved_minute,
        player_name=player_name,
        assist_name=assist_name,
        team_name=resolved_team,
        style=style,
        language=language,
        context_data=context_data,
        style_references=style_references,
    )

    model_used = model or _model or _provider
    return text, model_used
