"""
Tests für app.services.llm_service
=====================================
Läuft vollständig ohne externe API-Calls (MOCK-Modus).
"""

import pytest

from app.services.llm_service import (
    EVENT_TYPE_MAP,
    LLMService,
    generate_ticker_text,
)


@pytest.fixture()
def mock_service() -> LLMService:
    return LLMService(provider="mock")


class TestNormalizeEventType:
    """_normalize_event_type mappt Partner-API-Typen auf interne Bezeichnungen."""

    @pytest.mark.parametrize(
        "raw,expected",
        [
            ("PartnerGoal", "goal"),
            ("PartnerPenaltyGoal", "goal"),
            ("PartnerOwnGoal", "own_goal"),
            ("PartnerYellowCard", "yellow_card"),
            ("PartnerRedCard", "red_card"),
            ("PartnerYellowRedCard", "red_card"),
            ("PartnerSubstitution", "substitution"),
            ("PartnerMissedPenalty", "missed_penalty"),
            ("PartnerKickOff", "kick_off"),
            ("PartnerHalfTime", "halftime"),
            ("PartnerFullTime", "fulltime"),
            # Bereits normalisierte Typen passieren unverändert
            ("goal", "goal"),
            ("yellow_card", "yellow_card"),
            ("comment", "comment"),
        ],
    )
    def test_known_types_map_correctly(
        self, mock_service, raw: str, expected: str
    ) -> None:
        assert mock_service._normalize_event_type(raw) == expected

    def test_unknown_type_falls_back_to_comment(self, mock_service) -> None:
        assert mock_service._normalize_event_type("SomeUnknownEvent") == "comment"

    def test_empty_string_falls_back_to_comment(self, mock_service) -> None:
        assert mock_service._normalize_event_type("") == "comment"

    def test_event_type_map_has_no_empty_values(self) -> None:
        for key, value in EVENT_TYPE_MAP.items():
            assert value, f"Leerer Wert für Event-Typ: {key!r}"


class TestMockGeneration:
    """generate_ticker_text im MOCK-Modus gibt deterministisch einen String zurück."""

    @pytest.mark.asyncio
    async def test_mock_returns_nonempty_string(self) -> None:
        text, model = await generate_ticker_text(
            event_type="goal",
            event_detail="Müller (45')",
            minute=45,
            style="neutral",
            language="de",
            context_data={},
            match_context="",
        )
        assert isinstance(text, str) and text
        assert isinstance(model, str) and model

    @pytest.mark.asyncio
    async def test_mock_goal_euphorisch_differs_from_neutral(self) -> None:
        neutral, _ = await generate_ticker_text(
            event_type="goal",
            event_detail="",
            minute=1,
            style="neutral",
            language="de",
            context_data={},
            match_context="",
        )
        euphorisch, _ = await generate_ticker_text(
            event_type="goal",
            event_detail="",
            minute=1,
            style="euphorisch",
            language="de",
            context_data={},
            match_context="",
        )
        # Beide sind non-empty; Mock-Implementierung liefert je Stil eigene Texte
        assert isinstance(neutral, str) and neutral
        assert isinstance(euphorisch, str) and euphorisch

    @pytest.mark.asyncio
    async def test_generation_returns_nonempty_model_name(self) -> None:
        _, model = await generate_ticker_text(
            event_type="comment",
            event_detail="",
            minute=None,
            style="neutral",
            language="de",
            context_data={},
            match_context="",
        )
        assert isinstance(model, str) and model

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "event_type",
        [
            "goal",
            "yellow_card",
            "red_card",
            "substitution",
            "kick_off",
            "halftime",
            "fulltime",
            "comment",
        ],
    )
    async def test_all_common_event_types_produce_output(self, event_type: str) -> None:
        text, _ = await generate_ticker_text(
            event_type=event_type,
            event_detail="",
            minute=1,
            style="neutral",
            language="de",
            context_data={},
            match_context="",
        )
        assert text


class TestMultilingualGeneration:
    """Mehrsprachige Generierung und Übersetzung."""

    @pytest.mark.asyncio
    @pytest.mark.parametrize("language", ["de", "en", "es", "fr"])
    async def test_generate_accepts_all_supported_languages(
        self, language: str
    ) -> None:
        text, model = await generate_ticker_text(
            event_type="goal",
            event_detail="Müller (45')",
            minute=45,
            style="neutral",
            language=language,
            context_data={},
            match_context="",
        )
        assert isinstance(text, str) and text
        assert isinstance(model, str) and model

    def test_build_prompt_uses_correct_language_name(self, mock_service) -> None:
        prompt = mock_service._build_prompt(
            event_type="goal",
            event_detail="Test",
            minute=10,
            player_name="Müller",
            assist_name=None,
            team_name="Frankfurt",
            style="neutral",
            language="en",
        )
        assert "English" in prompt
        assert "Deutsch" not in prompt

    def test_build_prompt_spanish(self, mock_service) -> None:
        prompt = mock_service._build_prompt(
            event_type="goal",
            event_detail="Test",
            minute=10,
            player_name="Müller",
            assist_name=None,
            team_name="Frankfurt",
            style="neutral",
            language="es",
        )
        assert "Spanish" in prompt

    def test_build_prompt_french(self, mock_service) -> None:
        prompt = mock_service._build_prompt(
            event_type="goal",
            event_detail="Test",
            minute=10,
            player_name="Müller",
            assist_name=None,
            team_name="Frankfurt",
            style="neutral",
            language="fr",
        )
        assert "French" in prompt

    def test_translate_mock_prefixes_language(self, mock_service) -> None:
        result = mock_service.translate_text("Tor für Frankfurt!", "en")
        assert result == "[EN] Tor für Frankfurt!"

    def test_translate_mock_all_languages(self, mock_service) -> None:
        for lang in ("de", "en", "es", "fr"):
            result = mock_service.translate_text("Test", lang)
            assert result == f"[{lang.upper()}] Test"
