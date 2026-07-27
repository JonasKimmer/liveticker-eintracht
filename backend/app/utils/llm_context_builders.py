"""
LLM Context Builders
====================
Hilfsfunktionen zur Formatierung von Spieldaten als Kontextabschnitte
für LLM-Prompts. Jede Funktion nimmt ein Daten-Dict und gibt einen
formatierten Kontext-String zurück.
"""

import json


def _format_context_section(lines: list[str]) -> str:
    return "\n### KONTEXT\n" + "\n".join(lines) + "\n"


def ctx_injuries(d: dict) -> str:
    team = d.get("team_name", "Unbekannt")
    players = d.get("players", [])
    if not players:
        return _format_context_section([f"Team: {team}", "Keine Ausfälle gemeldet."])
    lines = [f"Team: {team}", "Ausfälle/Fraglich:"]
    for p in players:
        lines.append(
            f"  - {p.get('player_name')} ({p.get('reason')}) [{p.get('type')}]"
        )
    return _format_context_section(lines)


def ctx_prediction(d: dict) -> str:
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


def ctx_h2h(d: dict) -> str:
    matches = d.get("matches", [])
    if not matches:
        return _format_context_section(
            ["Direktvergleich: Keine historischen Begegnungen."]
        )
    lines = ["Direktvergleich (letzte Spiele):"] + [f"  - {m}" for m in matches[:5]]
    return _format_context_section(lines)


def ctx_team_stats(d: dict) -> str:
    return (
        f"\n### KONTEXT\n"
        f"Team: {d.get('team_name')}\n"
        f"Form: {d.get('form')}\n"
        f"S/U/N: {d.get('wins_total')}/{d.get('draws_total')}/{d.get('loses_total')}\n"
        f"Tore/Spiel: {d.get('goals_for_avg')} | Gegentore: {d.get('goals_against_avg')}\n"
        f"Formation: {d.get('most_used_formation')}\n"
        f"Clean Sheets: {d.get('clean_sheets')}\n"
    )


def ctx_standings(d: dict) -> str:
    league = d.get("league_name", "Liga")
    lines = [f"Tabelle {league} — BEIDE Vereine erwähnen:"]
    for t in d.get("standings", []):
        lines.append(
            f"  - {t.get('team_name')}: Platz {t.get('rank')}, "
            f"{t.get('points')} Pkt, "
            f"{t.get('wins')}S/{t.get('draws')}U/{t.get('losses')}N, "
            f"Tore: {t.get('goals_for')}:{t.get('goals_against')}"
        )
    return _format_context_section(lines)


def ctx_live_stats(d: dict) -> str:
    return (
        f"\n### KONTEXT\n"
        f"Heim: {d.get('home_team')} vs Auswärts: {d.get('away_team')}\n"
        f"Auslöser: {', '.join(d.get('triggers', []))}\n"
        f"Stats: {d.get('curr_stats', {})}\n"
    )


def ctx_match_info(d: dict) -> str:
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


def build_context_str(event_type: str, context_data: dict | None) -> str:
    """Wählt den passenden Context-Builder für den event_type aus."""
    if not context_data:
        return ""

    if "home_team" in context_data:
        return ctx_match_info(context_data)

    normalized_type = event_type
    if event_type.startswith("pre_match_injuries"):
        normalized_type = "pre_match_injuries"

    builders: dict[str, object] = {
        "pre_match_injuries": ctx_injuries,
        "pre_match_prediction": ctx_prediction,
        "pre_match_h2h": ctx_h2h,
        "pre_match_team_stats": ctx_team_stats,
        "pre_match_standings": ctx_standings,
        "live_stats_update": ctx_live_stats,
    }
    builder = builders.get(normalized_type)
    if builder:
        return builder(context_data)  # type: ignore[operator]

    return f"\n### KONTEXT\n{json.dumps(context_data, ensure_ascii=False, indent=2)}\n"
