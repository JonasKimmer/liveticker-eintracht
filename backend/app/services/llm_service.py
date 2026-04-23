"""
LLM Service für Ticker-Text-Generierung.
Provider: Mock, OpenAI, Anthropic, Gemini, OpenRouter
Few-Shot: Stilreferenzen aus PostgreSQL (style_references)
"""

import asyncio
import logging
import random
from typing import Optional, Literal

from app.core.constants import (
    EVENT_TYPE_LABEL,
    STYLE_DESC,
    LLM_MAX_TOKENS,
    LLM_TEMPERATURE,
    LLM_TRANSLATION_TEMPERATURE,
    LLM_RETRY_ATTEMPTS,
    LLM_RATE_LIMIT_WAIT_BASE_S,
)
from app.utils.llm_context_builders import build_context_str


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
    "match_kickoff": "kick_off",
    "match_halftime": "halftime",
    "match_second_half": "kick_off",
    "match_fulltime": "fulltime",
    "match_extra_kickoff": "extra_time_start",
    "match_extra_halftime": "extra_halftime",
    "match_penalties": "penalty_shootout",
    "match_fulltime_aet": "fulltime_aet",
    "match_fulltime_pen": "fulltime_pen",
    "pre_match": "pre_match",
    "pre_match_prediction": "pre_match_prediction",
    "pre_match_injuries": "pre_match_injuries",
    "pre_match_h2h": "pre_match_h2h",
    "pre_match_team_stats": "pre_match_team_stats",
    "pre_match_team_stats_home": "pre_match_team_stats",
    "pre_match_team_stats_away": "pre_match_team_stats",
    "pre_match_standings": "pre_match_standings",
    "post_match": "post_match",
    "halftime_comment": "halftime_comment",
    "live_stats_update": "live_stats_update",
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
        fan_team: Optional[str] = None,
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
            fan_team=fan_team,
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
        if event_type.startswith("pre_match_injuries_"):
            return "pre_match_injuries"
        return EVENT_TYPE_MAP.get(event_type, "comment")

    # ──────────────────────────────────────────
    # Prompt Builder (aufgeteilt in Teilmethoden)
    # ──────────────────────────────────────────

    def _build_event_lines(
        self,
        event_type: str,
        event_detail: str,
        minute: Optional[int],
        player_name: Optional[str],
        assist_name: Optional[str],
        team_name: Optional[str],
    ) -> list[str]:
        """Baut die FAKTEN-Sektion des Prompts auf."""
        event_label = EVENT_TYPE_LABEL.get(event_type, event_type)
        minute_str = f"{minute}. Minute" if minute else "Vor/Nach dem Spiel"

        lines = [f"Ereignistyp: {event_label}"]
        if event_detail:
            lines.append(f"Detail: {event_detail}")
        if minute:
            lines.append(f"Minute: {minute_str}")
        if player_name:
            label = (
                "Ausgewechselt (geht raus)"
                if event_type == "substitution"
                else "Spieler"
            )
            lines.append(f"{label}: {player_name}")
        if assist_name:
            label = (
                "Eingewechselt (kommt rein)"
                if event_type == "substitution"
                else "Vorlagengeber"
            )
            lines.append(f"{label}: {assist_name}")
        if team_name:
            lines.append(
                f"Verursachendes Team (Spieler gehört zu diesem Verein): {team_name}"
            )
        return lines

    def _build_few_shot_block(self, style_references: Optional[list[str]]) -> str:
        """Baut den Stilreferenzen-Block für Few-Shot-Prompting auf."""
        if not style_references:
            return ""
        examples = "\n".join(f'- "{r}"' for r in style_references)
        return (
            f"\n### STILREFERENZEN (WICHTIG)\n"
            f"Die folgenden Texte stammen von echten Eintracht-Redakteuren. "
            f"Übernimm exakt diesen Stil — Rhythmus, Wortwahl, Satzlänge, Emotionalität. "
            f"Verwende KEINE generischen Floskeln, sondern schreibe so wie diese Beispiele:\n"
            f"{examples}\n"
        )

    def _build_prematch_parts(self, event_type: str) -> tuple[str, str]:
        """Gibt (prematch_instruction, prematch_rule) zurück – leer wenn kein Vorbericht."""
        if not event_type.startswith("pre_match"):
            return "", ""
        instruction = (
            "=== VOR-BERICHT – KEIN SPIEL LÄUFT ===\n"
            "Du schreibst einen VORSCHAU-Text. Das Spiel hat NOCH NICHT begonnen.\n"
            "ABSOLUT VERBOTEN: Spielszenen, Angriffe, Abschlüsse, Tore, Pässe, Zweikämpfe, "
            "Schüsse, Elfmeter, Einwürfe, Ecken – jede Art von Live-Kommentar.\n"
            "Schreibe NUR sachliche Fakten aus dem KONTEXT unten (2–3 Sätze). Nichts erfinden!\n"
            "=======================================\n\n"
        )
        rule = "- VOR-BERICHT: Nur Vorschau/Analyse – KEINE Spielszenen, KEINE Aktionen, KEINE Live-Beschreibungen\n"
        return instruction, rule

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
        fan_team: Optional[str] = None,
    ) -> str:
        lang = self._LANG_NAMES.get(language, language)
        style_desc = STYLE_DESC.get(style, STYLE_DESC["neutral"])
        if style == "euphorisch":
            resolved_fan_team = fan_team or (context_data or {}).get("home_team") or team_name
            if resolved_fan_team:
                style_desc = f"Du schreibst als leidenschaftlicher Fan von {resolved_fan_team}.\n" + style_desc

        event_lines = self._build_event_lines(
            event_type, event_detail, minute, player_name, assist_name, team_name
        )
        context_block = self._build_context_str(event_type, context_data)
        few_shot_block = self._build_few_shot_block(style_references)
        prematch_instruction, prematch_rule = self._build_prematch_parts(event_type)

        return (
            f"{prematch_instruction}"
            f"Du bist ein Fußball-Liveticker-Redakteur. "
            f"Schreibe einen Ticker-Eintrag auf {lang}.\n\n"
            f"### STIL\n{style_desc}\n\n"
            f"### FAKTEN\n{chr(10).join(event_lines)}\n"
            f"{context_block}"
            f"{few_shot_block}\n"
            f"### REGELN\n"
            f"{prematch_rule}"
            f"- Nur der fertige Ticker-Text, keine Erklärungen\n"
            f"- Nenne KEINE Minute im Text – sie wird separat links angezeigt\n"
            f"- Ellipsen und kurze Hauptsätze bevorzugen\n"
            f"- Präsens für laufende Szene, Perfekt für abgeschlossene Aktion\n"
            f"- Bei Vorbericht/Spielvorschau/Direktvergleich/Verletzungsbericht/Teamstatistik: kompakten Analyse-Text schreiben (2–3 Sätze), KEIN Live-Kommentar\n"
            f"- Bei Tor: emotional, prägnant\n"
            f"- Das 'Verursachende Team' ist der Verein des handelnden Spielers – nicht zwingend das Heimteam\n"
            f"- Spielstand nur nennen wenn er im SPIELKONTEXT unter 'Stand nach diesem Tor' angegeben ist\n"
            f"- Keine Hashtags, keine Emojis außer TOOOOR!\n"
            f"- Variiere Satzstruktur, Wortwahl und Einstieg — jeder Eintrag soll sich frisch lesen, "
            f"auch wenn ähnliche Ereignisse sich wiederholen\n"
        )

    def _build_context_str(self, event_type: str, context_data: Optional[dict]) -> str:
        return build_context_str(event_type, context_data)

    # ──────────────────────────────────────────
    # Provider Implementierungen
    # ──────────────────────────────────────────

    def _generate_mock_text(
        self,
        event_type: str,
        event_detail: str,
        minute: Optional[int],
        player_name: Optional[str],
        assist_name: Optional[str],
        team_name: Optional[str],
        style: str,
        **_kwargs,  # language, context_data, style_references unused in mock
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
                "neutral": [f"{m}. Minute: Wechsel bei {t}. {a} kommt für {p}."],
                "euphorisch": [f"Frische Kräfte! {a} kommt für {p} ({m}')."],
                "kritisch": [f"Wechsel ({m}'): {a} für {p} – fragwürdig."],
            },
            "kick_off": {"neutral": ["Anstoß! Das Spiel läuft."]},
            "halftime": {"neutral": ["Halbzeit! Pause nach 45 Minuten."]},
            "fulltime": {"neutral": ["Abpfiff! Das Spiel ist beendet."]},
            "extra_time_start": {"neutral": ["Die Verlängerung beginnt!"]},
            "extra_halftime": {"neutral": ["Halbzeitpause in der Verlängerung."]},
            "penalty_shootout": {
                "neutral": ["Elfmeterschießen! Es geht in die Entscheidung."]
            },
            "fulltime_aet": {"neutral": ["Abpfiff nach Verlängerung!"]},
            "fulltime_pen": {
                "neutral": ["Abpfiff! Die Entscheidung fällt im Elfmeterschießen."]
            },
        }

        pool = templates.get(event_type, {})
        choices = (
            pool.get(style)
            or pool.get("neutral")
            or [f"{m}. Minute: {event_detail or event_type}"]
        )
        return random.choice(choices)

    def _call_openai_compatible_raw(self, prompt: str, temperature: float) -> str:
        """Low-level call to an OpenAI-compatible endpoint (openai / openrouter)."""
        response = self._client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=LLM_MAX_TOKENS,
            temperature=temperature,
        )
        return response.choices[0].message.content.strip()

    def _generate_openai_compatible_text(
        self,
        event_type: str,
        event_detail: str,
        minute: Optional[int],
        player_name: Optional[str],
        assist_name: Optional[str],
        team_name: Optional[str],
        style: str,
        language: str,
        context_data: Optional[dict],
        style_references: Optional[list[str]],
        fan_team: Optional[str] = None,
    ) -> str:
        """Shared implementation for OpenAI-compatible APIs (openai, openrouter)."""
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
            fan_team,
        )
        return self._call_openai_compatible_raw(prompt, LLM_TEMPERATURE)

    def _generate_openrouter_text(self, **kwargs: object) -> str:
        return self._generate_openai_compatible_text(**kwargs)

    def _generate_openai_text(self, **kwargs: object) -> str:
        return self._generate_openai_compatible_text(**kwargs)

    def _generate_gemini_text(self, **kwargs: object) -> str:
        prompt = self._build_prompt(**kwargs)
        response = self._client.models.generate_content(
            model=self.model, contents=prompt
        )
        return response.text.strip()

    def _generate_anthropic_text(self, **kwargs: object) -> str:
        prompt = self._build_prompt(**kwargs)
        response = self._client.messages.create(
            model=self.model,
            max_tokens=LLM_MAX_TOKENS,
            temperature=LLM_TEMPERATURE,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text.strip()

    # ──────────────────────────────────────────
    # Übersetzung
    # ──────────────────────────────────────────

    _LANG_NAMES = {"de": "German", "en": "English", "es": "Spanish", "fr": "French"}

    def translate_text(self, text: str, language: str) -> str:
        """Übersetzt einen fertigen Ticker-Text in eine andere Sprache."""
        if self.provider == "mock":
            return f"[{language.upper()}] {text}"

        lang_name = self._LANG_NAMES.get(language, language)
        prompt = (
            f"Translate the following football live ticker entry to {lang_name}. "
            f"Keep the same style, tone, emotion, and approximate length. "
            f"Only output the translated text, nothing else.\n\n"
            f"Text: {text}"
        )

        if self.provider in ("openai", "openrouter"):
            return self._call_openai_compatible_raw(prompt, LLM_TRANSLATION_TEMPERATURE)
        elif self.provider == "gemini":
            response = self._client.models.generate_content(
                model=self.model, contents=prompt
            )
            return response.text.strip()
        elif self.provider == "anthropic":
            response = self._client.messages.create(
                model=self.model,
                max_tokens=LLM_MAX_TOKENS,
                temperature=LLM_TRANSLATION_TEMPERATURE,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.content[0].text.strip()
        return text


# ──────────────────────────────────────────────
# Singleton
# ──────────────────────────────────────────────

from app.core.config import settings

# Provider → API-Key-Mapping (einzige Quelle; wird in _build_singleton + generate_ticker_text genutzt)
_PROVIDER_KEY_MAP: dict[str, str | None] = {
    "openrouter": settings.OPENROUTER_API_KEY,
    "gemini": settings.GEMINI_API_KEY,
    "openai": settings.OPENAI_API_KEY,
    "anthropic": settings.ANTHROPIC_API_KEY,
}

_PROVIDER_DEFAULT_MODEL: dict[str, str] = {
    "openrouter": settings.OPENROUTER_MODEL,
    "gemini": "gemini-2.0-flash-lite-001",
    "openai": "gpt-4o-mini",
    "anthropic": "claude-haiku-4-5-20251001",
}


def _build_singleton() -> LLMService:
    for provider, key in _PROVIDER_KEY_MAP.items():
        if key:
            model = _PROVIDER_DEFAULT_MODEL[provider]
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
    style_references: list[str] | None = None,
    provider: Optional[str] = None,
    model: Optional[str] = None,
    fan_team: Optional[str] = None,
) -> tuple[str, str]:
    """Async LLM-Aufruf. Stilreferenzen werden vom Aufrufer übergeben (kein DB-Zugriff hier)."""
    if style_references is None:
        style_references = []

    resolved_minute = (match_context.get("minute") if match_context else None) or minute
    resolved_team = team_name or (
        match_context.get("home_team") if match_context else None
    )

    # Provider/Model Override (Evaluation)
    if provider and provider != _provider:
        active_service = LLMService(
            provider=provider, api_key=_PROVIDER_KEY_MAP.get(provider), model=model
        )
    else:
        active_service = llm_service

    def _is_rate_limit(exc: Exception) -> bool:
        """Erkennt 429-RateLimit-Fehler aller unterstützten Provider."""
        msg = str(exc).lower()
        return (
            "429" in msg
            or "rate limit" in msg
            or "rate_limit" in msg
            or "too many requests" in msg
        )

    last_exc: Exception | None = None
    for attempt in range(LLM_RETRY_ATTEMPTS):
        try:
            text = await asyncio.to_thread(
                active_service.generate_ticker_text,
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
                fan_team=fan_team,
            )
            model_used = model or _model or _provider
            return text, model_used
        except Exception as exc:
            last_exc = exc
            if attempt < LLM_RETRY_ATTEMPTS - 1:
                # RateLimit: deutlich länger warten; andere Fehler: kurzes Backoff
                wait = (
                    LLM_RATE_LIMIT_WAIT_BASE_S * (attempt + 1)
                    if _is_rate_limit(exc)
                    else 2**attempt
                )
                logger.warning(
                    "LLM attempt %d/%d failed (%s), retrying in %ds…",
                    attempt + 1,
                    LLM_RETRY_ATTEMPTS,
                    exc,
                    wait,
                )
                await asyncio.sleep(wait)

    raise last_exc


async def translate_ticker_text(text: str, language: str) -> str:
    """Async Wrapper: Übersetzt einen Ticker-Text via LLM."""
    return await asyncio.to_thread(llm_service.translate_text, text, language)
