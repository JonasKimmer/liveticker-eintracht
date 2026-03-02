"""
LLM Service für Ticker-Text-Generierung.
Provider: Mock, OpenAI, Anthropic, Gemini, OpenRouter
"""

from typing import Optional, Literal
import random

# Partner-API liveTickerEventType → interner Mock-Branch
EVENT_TYPE_MAP = {
    "PartnerGoal": "Goal",
    "PartnerPenaltyGoal": "Goal",
    "PartnerOwnGoal": "OwnGoal",
    "PartnerMissedPenalty": "MissedPenalty",
    "PartnerYellowCard": "YellowCard",
    "PartnerRedCard": "RedCard",
    "PartnerYellowRedCard": "RedCard",
    "PartnerSubstitution": "Substitution",
    "PartnerKickOff": "KickOff",
    "PartnerHalfTime": "HalfTime",
    "PartnerFullTime": "FullTime",
    "PartnerExtraTimeStart": "ExtraTimeStart",
    "PartnerExtraTimeHalfTime": "HalfTime",
    "PartnerExtraTimeEnd": "FullTime",
    "PartnerPenaltyShootoutStart": "PenaltyShootout",
    "PartnerPenaltyShootoutEnd": "FullTime",
    # Legacy api-sports Werte (Fallback)
    "Goal": "Goal",
    "Card": "YellowCard",
    "subst": "Substitution",
}

# Prompt-Label für LLM (Klartext statt interner Key)
EVENT_TYPE_LABEL = {
    "Goal": "Tor",
    "OwnGoal": "Eigentor",
    "MissedPenalty": "Elfmeter verschossen",
    "YellowCard": "Gelbe Karte",
    "RedCard": "Rote Karte",
    "Substitution": "Spielerwechsel",
    "KickOff": "Anstoß",
    "HalfTime": "Halbzeit",
    "FullTime": "Abpfiff",
    "ExtraTimeStart": "Verlängerung beginnt",
    "PenaltyShootout": "Elfmeterschießen",
}


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

        if provider == "mock":
            print("⚠️  LLM Service läuft im MOCK-Modus")
        elif provider == "gemini":
            if not api_key:
                raise ValueError("Gemini API Key erforderlich")
            from google import genai

            self.gemini_client = genai.Client(api_key=api_key)
        elif provider == "openrouter":
            if not api_key:
                raise ValueError("OpenRouter API Key erforderlich")
            from openai import OpenAI

            self.openrouter_client = OpenAI(
                api_key=api_key, base_url="https://openrouter.ai/api/v1"
            )
            self.openrouter_model = model or "google/gemini-2.0-flash-lite-001"
        elif provider == "openai" and not api_key:
            raise ValueError("OpenAI API Key erforderlich")
        elif provider == "anthropic" and not api_key:
            raise ValueError("Anthropic API Key erforderlich")

    def _normalize_event_type(self, event_type: str) -> str:
        """Partner-API / Legacy EventType → internen Key normalisieren."""
        return EVENT_TYPE_MAP.get(event_type, "update")

    def generate_ticker_text(
        self,
        event_type: str,
        event_detail: str,
        minute: int,
        player_name: Optional[str] = None,
        assist_name: Optional[str] = None,
        team_name: Optional[str] = None,
        style: Literal["neutral", "euphorisch", "kritisch"] = "neutral",
        language: str = "de",
        context_data: Optional[dict] = None,
    ) -> str:
        normalized = self._normalize_event_type(event_type)

        if self.provider == "mock":
            return self._generate_mock_text(
                normalized,
                event_detail,
                minute,
                player_name,
                assist_name,
                team_name,
                style,
                context_data=context_data,
            )
        elif self.provider == "gemini":
            return self._generate_gemini_text(
                normalized,
                event_detail,
                minute,
                player_name,
                assist_name,
                team_name,
                style,
                language,
                context_data=context_data,
            )
        elif self.provider == "openrouter":
            return self._generate_openrouter_text(
                normalized,
                event_detail,
                minute,
                player_name,
                assist_name,
                team_name,
                style,
                language,
                context_data=context_data,
            )
        elif self.provider == "openai":
            return self._generate_openai_text(
                normalized,
                event_detail,
                minute,
                player_name,
                assist_name,
                team_name,
                style,
                language,
                context_data=context_data,
            )
        elif self.provider == "anthropic":
            return self._generate_claude_text(
                normalized,
                event_detail,
                minute,
                player_name,
                assist_name,
                team_name,
                style,
                language,
                context_data=context_data,
            )

    def _build_prompt(
        self,
        event_type,
        event_detail,
        minute,
        player_name,
        assist_name,
        team_name,
        style,
        language,
        context_data=None,
    ):
        lang = "Deutsch" if language == "de" else "English"
        style_desc = {
            "neutral": "sachlich und neutral",
            "euphorisch": "begeistert und emotional",
            "kritisch": "analytisch und kritisch",
        }.get(style, "neutral")

        minute_str = f"{minute}. Minute" if minute else "Vor dem Spiel"
        event_label = EVENT_TYPE_LABEL.get(event_type, event_type)

        event_lines = [
            f"Ereignistyp: {event_label}",
            f"Detail: {event_detail}",
        ]
        if player_name:
            event_lines.append(f"Spieler: {player_name}")
        if assist_name:
            label = (
                "Eingewechselt für" if event_type == "Substitution" else "Vorlagengeber"
            )
            event_lines.append(f"{label}: {assist_name}")
        if team_name:
            event_lines.append(f"Team: {team_name}")

        event_info = "\n".join(event_lines)
        context_str = self._build_context_str(event_type, context_data)

        style_hint = ""
        if not minute and event_type.startswith("pre_match"):
            style_hint = (
                "Schreibe lebendig, abwechslungsreich und journalistisch – "
                "nutze die Fakten aber formuliere wie ein erfahrener Sportreporter, "
                "nicht wie eine trockene Auflistung. Variiere Satzbau und Einstieg.\n"
            )

        return f"""Du bist ein Fußball-Liveticker-Redakteur. Schreibe einen kurzen Ticker-Eintrag (1-2 Sätze) auf {lang}.

Stil: {style_desc}
Minute: {minute_str}
{style_hint}
{event_info}
{context_str}
Schreibe nur den Ticker-Text, keine Erklärungen."""

    def _build_context_str(self, event_type: str, context_data: Optional[dict]) -> str:
        if not context_data:
            return ""

        if event_type == "pre_match_injuries":
            team = context_data.get("team_name", "Unbekannt")
            players = context_data.get("players", [])
            if not players:
                return f"Team: {team}\nKeine Ausfälle gemeldet."
            lines = [f"Team: {team}", "Ausfälle/Fraglich:"]
            for p in players:
                lines.append(
                    f"  - {p.get('player_name')} ({p.get('reason')}) [{p.get('type')}]"
                )
            return "\n".join(lines)

        elif event_type == "pre_match_prediction":
            home = context_data.get("home", {})
            away = context_data.get("away", {})
            return (
                f"Heimteam: {home.get('name')} (Form: {home.get('form')}, Siege: {home.get('wins_total')})\n"
                f"Auswärtsteam: {away.get('name')} (Form: {away.get('form')}, Siege: {away.get('wins_total')})\n"
                f"Tipp: {context_data.get('advice')}\n"
                f"Gewinnchancen – Heim: {context_data.get('percent_home')}, "
                f"Unentschieden: {context_data.get('percent_draw')}, "
                f"Auswärts: {context_data.get('percent_away')}"
            )

        elif event_type == "pre_match_h2h":
            matches = context_data.get("matches", [])
            if not matches:
                return "Direktvergleich: Keine historischen Begegnungen vorhanden."
            lines = ["Direktvergleich (letzte Spiele):"]
            for m in matches[:5]:
                lines.append(f"  - {m}")
            return "\n".join(lines)

        elif event_type == "pre_match_team_stats":
            return (
                f"Team: {context_data.get('team_name')}\n"
                f"Form: {context_data.get('form')}\n"
                f"Siege/Unentschieden/Niederlagen: {context_data.get('wins_total')}/{context_data.get('draws_total')}/{context_data.get('loses_total')}\n"
                f"Tore pro Spiel: {context_data.get('goals_for_avg')} | Gegentore: {context_data.get('goals_against_avg')}\n"
                f"Häufigste Formation: {context_data.get('most_used_formation')}\n"
                f"Clean Sheets: {context_data.get('clean_sheets')}"
            )

        elif event_type == "live_stats_update":
            return (
                f"Team: {context_data.get('team_name', 'unbekannt')}\n"
                f"Heim: {context_data.get('home_team')} vs Auswärts: {context_data.get('away_team')}\n"
                f"Auslöser: {', '.join(context_data.get('triggers', []))}\n"
                f"Aktuelle Stats: {context_data.get('curr_stats', {})}"
            )

        import json

        return (
            f"Kontextdaten:\n{json.dumps(context_data, ensure_ascii=False, indent=2)}"
        )

    def _generate_mock_text(
        self,
        event_type,
        event_detail,
        minute,
        player_name,
        assist_name,
        team_name,
        style,
        context_data=None,
    ) -> str:
        if event_type == "Goal":
            if style == "neutral":
                templates = [
                    f"Tor für {team_name}! {player_name} trifft in der {minute}. Minute.",
                    f"{minute}. Minute: {player_name} erzielt das Tor für {team_name}.",
                ]
            elif style == "euphorisch":
                templates = [
                    f"TOOOOOOR! {player_name} mit einem Traumtor in der {minute}. Minute!",
                    f"WAHNSINN! {player_name} macht das Ding! {minute}. Minute - {team_name} jubelt!",
                ]
            else:
                templates = [
                    f"{minute}. Minute: {player_name} trifft. Die Abwehr hatte geschlafen.",
                    f"Tor durch {player_name} - das hätte verhindert werden müssen.",
                ]
            text = random.choice(templates)
            if assist_name:
                text += f" Vorlage: {assist_name}."
            return text

        elif event_type == "OwnGoal":
            return f"{minute}. Minute: Eigentor! {player_name} befördert den Ball ins eigene Netz."

        elif event_type == "MissedPenalty":
            return f"{minute}. Minute: Elfmeter verschossen! {player_name} scheitert vom Punkt."

        elif event_type == "YellowCard":
            if style == "neutral":
                return f"{minute}. Minute: Gelbe Karte für {player_name}."
            elif style == "euphorisch":
                return f"{minute}. Minute: {player_name} sieht Gelb - das war unnötig!"
            else:
                return f"Gelb für {player_name} ({minute}') - vollkommen berechtigt."

        elif event_type == "RedCard":
            return f"🔴 ROTE KARTE! {player_name} muss vom Platz! {minute}. Minute."

        elif event_type == "Substitution":
            if style == "neutral":
                return f"{minute}. Minute: Wechsel bei {team_name}. {player_name} kommt für {assist_name}."
            elif style == "euphorisch":
                return f"Frische Kräfte! {player_name} kommt für {assist_name}."
            else:
                return f"Wechsel ({minute}'): {player_name} für {assist_name} - fragwürdig."

        elif event_type == "HalfTime":
            return f"Halbzeit! Stand nach 45 Minuten."

        elif event_type == "FullTime":
            return f"Abpfiff! Das Spiel ist beendet."

        elif event_type == "KickOff":
            return f"Anstoß! Das Spiel läuft."

        elif event_type == "ExtraTimeStart":
            return f"Die Verlängerung beginnt!"

        elif event_type == "PenaltyShootout":
            return f"Elfmeterschießen! Es geht in die entscheidende Phase."

        return f"{minute}. Minute: {event_detail or event_type}"

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
        context_data=None,
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
            context_data=context_data,
        )
        response = self.gemini_client.models.generate_content(
            model="gemini-2.0-flash-lite-001", contents=prompt
        )
        return response.text.strip()

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
        context_data=None,
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
            context_data=context_data,
        )
        response = self.openrouter_client.chat.completions.create(
            model=self.openrouter_model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
        )
        return response.choices[0].message.content.strip()

    def _generate_openai_text(self, *args, context_data=None, **kwargs) -> str:
        raise NotImplementedError("OpenAI Integration noch nicht implementiert")

    def _generate_claude_text(self, *args, context_data=None, **kwargs) -> str:
        raise NotImplementedError("Anthropic Integration noch nicht implementiert")


# Singleton – Provider aus ENV
from app.core.config import settings

_provider = "mock"
_api_key = None
_model = None

if settings.OPENROUTER_API_KEY:
    _provider = "openrouter"
    _api_key = settings.OPENROUTER_API_KEY
    _model = getattr(settings, "OPENROUTER_MODEL", "google/gemini-2.0-flash-lite")
elif settings.GEMINI_API_KEY:
    _provider = "gemini"
    _api_key = settings.GEMINI_API_KEY
elif settings.OPENAI_API_KEY:
    _provider = "openai"
    _api_key = settings.OPENAI_API_KEY

llm_service = LLMService(provider=_provider, api_key=_api_key, model=_model)


async def generate_ticker_text(
    event_type: str,
    event_detail: str = "",
    minute: int = 0,
    player_name=None,
    assist_name=None,
    team_name=None,
    style="neutral",
    language="de",
    context_data: dict = None,
    match_context: dict = None,
    provider: str = None,
    model: str = None,
) -> tuple[str, str]:
    resolved_minute = (match_context.get("minute") if match_context else None) or minute

    text = llm_service.generate_ticker_text(
        event_type=event_type,
        event_detail=event_detail,
        minute=resolved_minute,
        player_name=player_name,
        assist_name=assist_name,
        team_name=team_name
        or (match_context.get("home_team") if match_context else None),
        style=style,
        language=language,
        context_data=context_data,
    )
    model_used = model or _model or _provider
    return text, model_used
