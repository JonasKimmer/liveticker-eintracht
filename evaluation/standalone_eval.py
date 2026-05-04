#!/usr/bin/env python3
"""
Standalone LLM Evaluation – N >> 16
======================================
1. Echte Bundesliga-Events via Football API holen
2. Ticker-Texte via OpenRouter / Gemini 2.0 Flash Lite generieren  (= identisch zur Thesis)
3. LLM-as-Judge via Claude (OpenRouter) bewerten                    (= identisch zu Abschnitt 6.3.6)

Kein Backend, keine DB, keine Abhängigkeit vom Projektsystem.

Anforderungen:
  pip install openai requests

Nutzung:
  python3 standalone_eval.py
  python3 standalone_eval.py --n 60 --output my_eval
"""

import argparse
import csv
import json
import sys
import time
from datetime import datetime
from pathlib import Path

import requests
from openai import OpenAI

# ──────────────────────────────────────────────────────────────
# Konfiguration  (Keys aus backend/.env)
# ──────────────────────────────────────────────────────────────

FOOTBALL_API_KEY    = "427640c46b2df039fa02972c68d184c0"
OPENROUTER_API_KEY  = "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"

GEN_MODEL   = "google/gemini-2.0-flash-lite-001"   # Identisch zur Thesis
JUDGE_MODEL = "anthropic/claude-sonnet-4-5"         # Unabhängiger Bewerter via OpenRouter

FOOTBALL_BASE = "https://v3.football.api-sports.io"
OPENROUTER_BASE = "https://openrouter.ai/api/v1"

BUNDESLIGA_ID = 78
SEASON = 2025

# Targeting: Diese Event-Typen mit je ~gleichem Anteil
TARGET_TYPES = ["Goal", "Card", "subst"]
STYLES = ["neutral", "euphorisch", "kritisch"]

# ──────────────────────────────────────────────────────────────
# Prompts (aus backend/app/services/llm_service.py + constants.py)
# ──────────────────────────────────────────────────────────────

EVENT_TYPE_LABEL = {
    "goal":         "Tor",
    "own_goal":     "Eigentor",
    "yellow_card":  "Gelbe Karte",
    "red_card":     "Rote Karte",
    "substitution": "Spielerwechsel",
}

STYLE_DESC = {
    "neutral": (
        "Sachlicher, unparteiischer Reporter-Stil. "
        "Keine Vereinspräferenz, keine emotionalen Wertungen — nur Fakten und Spielfluss. "
        "Kurze, klare Sätze; das Ereignis steht im Mittelpunkt, nicht die Atmosphäre. "
        "WICHTIG: Variiere den Satzeinstieg. Beginne abwechselnd mit der Minute, dem Spielernamen, "
        "dem Ereignis selbst oder dem Vereinsnamen — nie zweimal hintereinander gleich. "
        "Tempo und Präzision sind wichtiger als Dramatik. "
        "Keine Superlative ohne Anlass, keine Klischees wie 'macht das Ding' oder 'brennt lichterloh'."
    ),
    "euphorisch": (
        "Leidenschaftlicher Fan-Stil — laut, emotional, aber authentisch. "
        "Kurze Sätze, Ausrufe, Dramatik. "
        "WICHTIG: Passe die Emotion an die Spielsituation an! "
        "Bei Toren des Heimteams: euphorisch, mitreißend, feiernd. "
        "Bei Gegentoren: frustriert, fassungslos, hadernder Fan. "
        "Bei Karten oder Wechseln: situationsgerecht — begeistert, skeptisch oder ärgerlich. "
        "WICHTIG: Variiere stark! Beginne Einträge unterschiedlich. "
        "Verbotene Wiederholungen: 'Unfassbar!', 'Die Kurve bebt!', 'Was ist denn hier los?!'. "
    ),
    "kritisch": (
        "Du bist ein nüchtern-analytischer Fußballkommentator mit hohem Qualitätsanspruch — "
        "kein Jubel, keine Verharmlosung, kein Marketingsprech. "
        "Benenne Fehler, Schwächen und Fehlentscheidungen direkt und konkret. "
        "Bei Toren: knappe Ursachenanalyse — Abwehrfehler? Zu spätes Pressing? "
        "Bei Karten: war es berechtigt, zu hart oder überfällig? "
        "Bei Wechseln: war der Zeitpunkt richtig? "
        "Kurze, harte Sätze. Urteilend, aber sachlich begründet."
    ),
}


def build_prompt(event_type: str, minute: int, player: str, assist: str,
                 team: str, home: str, away: str, score_home: int, score_away: int,
                 style: str) -> str:
    style_desc = STYLE_DESC[style]
    if style == "euphorisch":
        style_desc = f"Du schreibst als leidenschaftlicher Fan von {home}.\n" + style_desc

    label = EVENT_TYPE_LABEL.get(event_type, event_type)
    minute_str = f"{minute}. Minute"

    facts = [f"Ereignistyp: {label}", f"Minute: {minute_str}"]
    if player:
        label_p = "Ausgewechselt (geht raus)" if event_type == "substitution" else "Spieler"
        facts.append(f"{label_p}: {player}")
    if assist:
        label_a = "Eingewechselt (kommt rein)" if event_type == "substitution" else "Vorlagengeber"
        facts.append(f"{label_a}: {assist}")
    if team:
        facts.append(f"Verursachendes Team: {team}")

    context = (
        f"\n### SPIELKONTEXT\n"
        f"Heimteam: {home}\n"
        f"Auswärtsteam: {away}\n"
        f"Stand nach diesem Ereignis: {score_home}:{score_away}\n"
    )

    return (
        f"Du bist ein Fußball-Liveticker-Redakteur. Schreibe einen Ticker-Eintrag auf Deutsch.\n\n"
        f"### STIL\n{style_desc}\n\n"
        f"### FAKTEN\n{chr(10).join(facts)}\n"
        f"{context}\n"
        f"### REGELN\n"
        f"- Nur der fertige Ticker-Text, keine Erklärungen\n"
        f"- Nenne KEINE Minute im Text — sie wird separat angezeigt\n"
        f"- Ellipsen und kurze Hauptsätze bevorzugen\n"
        f"- Präsens für laufende Szene, Perfekt für abgeschlossene Aktion\n"
        f"- Bei Tor: emotional, prägnant\n"
        f"- Spielstand nur nennen wenn er im SPIELKONTEXT angegeben ist\n"
        f"- Keine Hashtags, keine Emojis außer TOOOOR!\n"
        f"- Variiere Satzstruktur, Wortwahl und Einstieg\n"
    )


JUDGE_SYSTEM = """Du bist ein unabhängiger Qualitätsbewerter für KI-generierte Fußball-Liveticker-Texte.
Bewerte den folgenden Ticker-Eintrag auf drei Dimensionen (je 1–5):

- Korrektheit (1–5): Sind alle Fakten (Spieler, Team, Minute, Ergebnis) korrekt? Keine Halluzinationen?
- Tonalität (1–5): Entspricht der Stil dem angeforderten Profil (neutral/euphorisch/kritisch)?
- Verständlichkeit (1–5): Ist der Text sprachlich flüssig, grammatikalisch korrekt und genrekonform?

Antworte NUR mit validem JSON ohne weiteren Text:
{"korrektheit": <1-5>, "tonalitaet": <1-5>, "verstaendlichkeit": <1-5>, "begruendung": "<max 1 Satz>"}"""


def judge_prompt(event_type: str, minute: int, player: str, team: str,
                 home: str, away: str, score_h: int, score_a: int,
                 style: str, generated_text: str) -> str:
    return (
        f"Ereignis: {EVENT_TYPE_LABEL.get(event_type, event_type)}, "
        f"{minute}. Minute, {player} ({team}), "
        f"Spielstand: {home} {score_h}:{score_a} {away}\n"
        f"Angeforderter Stil: {style}\n"
        f"Generierter Text: \"{generated_text}\""
    )


# ──────────────────────────────────────────────────────────────
# Football API
# ──────────────────────────────────────────────────────────────

def football_get(endpoint: str, params: dict) -> dict:
    headers = {"x-apisports-key": FOOTBALL_API_KEY}
    r = requests.get(f"{FOOTBALL_BASE}/{endpoint}", params=params, headers=headers, timeout=15)
    r.raise_for_status()
    return r.json()


def fetch_fixtures(n_fixtures: int) -> list[dict]:
    """Holt abgeschlossene Bundesliga-Spiele (neueste zuerst)."""
    print("Football API: Lade Spielliste...")
    data = football_get("fixtures", {
        "league": BUNDESLIGA_ID,
        "season": SEASON,
        "status": "FT",
        "timezone": "Europe/Berlin",
    })
    fixtures = data.get("response", [])
    # Neueste zuerst
    fixtures.sort(key=lambda f: f["fixture"]["date"], reverse=True)
    print(f"  {len(fixtures)} abgeschlossene Spiele verfügbar, nehme {n_fixtures}")
    return fixtures[:n_fixtures]


def fetch_events(fixture_id: int) -> list[dict]:
    data = football_get("fixtures/events", {"fixture": fixture_id})
    return data.get("response", [])


def map_event_type(api_type: str, detail: str) -> str | None:
    """Mappt Football-API Typen auf interne Typen. None = überspringen."""
    if api_type == "Goal":
        if "Own" in detail:
            return "own_goal"
        return "goal"
    if api_type == "Card":
        if "Yellow" in detail and "Red" not in detail:
            return "yellow_card"
        if "Red" in detail:
            return "red_card"
    if api_type == "subst":
        return "substitution"
    return None


def build_event_pool(fixtures: list[dict]) -> list[dict]:
    """Holt Events für alle Fixtures und berechnet laufenden Spielstand."""
    pool = []
    for fix in fixtures:
        fid     = fix["fixture"]["id"]
        home    = fix["teams"]["home"]["name"]
        away    = fix["teams"]["away"]["name"]
        league  = fix["league"]["name"]

        try:
            events = fetch_events(fid)
            time.sleep(0.4)  # API rate-limit schonen
        except Exception as e:
            print(f"  Fehler bei Fixture {fid}: {e}")
            continue

        score_h, score_a = 0, 0
        for ev in events:
            api_type = ev.get("type", "")
            detail   = ev.get("detail", "")
            minute   = ev.get("time", {}).get("elapsed") or 0
            extra    = ev.get("time", {}).get("extra") or 0
            player   = ev.get("player", {}).get("name") or ""
            assist   = ev.get("assist", {}).get("name") or ""
            team     = ev.get("team", {}).get("name") or ""

            etype = map_event_type(api_type, detail)
            if not etype:
                continue

            # Score vor diesem Event für den Kontext
            score_before_h, score_before_a = score_h, score_a

            if etype == "goal":
                if team == home:
                    score_h += 1
                else:
                    score_a += 1
            elif etype == "own_goal":
                if team == home:
                    score_a += 1
                else:
                    score_h += 1

            pool.append({
                "fixture_id":  fid,
                "match":       f"{home} vs. {away}",
                "home":        home,
                "away":        away,
                "league":      league,
                "event_type":  etype,
                "minute":      minute + extra,
                "player":      player,
                "assist":      assist,
                "team":        team,
                "score_home":  score_h,
                "score_away":  score_a,
            })

    print(f"  {len(pool)} verwertbare Events aus {len(fixtures)} Spielen gesammelt")
    return pool


def select_balanced(pool: list[dict], n: int) -> list[dict]:
    """Wählt n Events aus, ausgewogen über Event-Typ und Stil."""
    by_type: dict[str, list] = {}
    for ev in pool:
        by_type.setdefault(ev["event_type"], []).append(ev)

    available_types = [t for t in ["goal", "yellow_card", "red_card", "substitution", "own_goal"]
                       if t in by_type]
    print(f"  Verfügbare Typen: { {t: len(by_type[t]) for t in available_types} }")

    selection = []
    style_idx = 0
    ptrs = {t: 0 for t in available_types}

    while len(selection) < n:
        added = False
        for etype in available_types:
            if len(selection) >= n:
                break
            p = ptrs[etype]
            if p >= len(by_type[etype]):
                continue
            ev = dict(by_type[etype][p])
            ptrs[etype] += 1
            ev["style"] = STYLES[style_idx % len(STYLES)]
            style_idx += 1
            selection.append(ev)
            added = True
        if not added:
            break  # Alle Pools erschöpft

    print(f"  {len(selection)} Events für Evaluation ausgewählt")
    return selection


# ──────────────────────────────────────────────────────────────
# Generation + Evaluation
# ──────────────────────────────────────────────────────────────

client = OpenAI(api_key=OPENROUTER_API_KEY, base_url=OPENROUTER_BASE)


def generate(ev: dict) -> tuple[str, float]:
    prompt = build_prompt(
        event_type=ev["event_type"],
        minute=ev["minute"],
        player=ev["player"],
        assist=ev["assist"],
        team=ev["team"],
        home=ev["home"],
        away=ev["away"],
        score_home=ev["score_home"],
        score_away=ev["score_away"],
        style=ev["style"],
    )
    t0 = time.time()
    resp = client.chat.completions.create(
        model=GEN_MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=200,
        temperature=0.3,
    )
    latency = (time.time() - t0) * 1000
    return resp.choices[0].message.content.strip(), round(latency)


def evaluate(ev: dict, text: str) -> dict:
    user_msg = judge_prompt(
        event_type=ev["event_type"],
        minute=ev["minute"],
        player=ev["player"],
        team=ev["team"],
        home=ev["home"],
        away=ev["away"],
        score_h=ev["score_home"],
        score_a=ev["score_away"],
        style=ev["style"],
        generated_text=text,
    )
    resp = client.chat.completions.create(
        model=JUDGE_MODEL,
        messages=[
            {"role": "system", "content": JUDGE_SYSTEM},
            {"role": "user",   "content": user_msg},
        ],
        max_tokens=200,
        temperature=0.0,
    )
    raw = resp.choices[0].message.content.strip()
    # JSON aus Antwort extrahieren
    try:
        start = raw.index("{")
        end   = raw.rindex("}") + 1
        return json.loads(raw[start:end])
    except Exception:
        return {"korrektheit": 0, "tonalitaet": 0, "verstaendlichkeit": 0, "begruendung": f"PARSE_ERROR: {raw[:80]}"}


# ──────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--n",        type=int, default=60,    help="Ziel-Stichprobengröße")
    parser.add_argument("--fixtures", type=int, default=20,    help="Anzahl zu ladender Spiele")
    parser.add_argument("--delay",    type=float, default=1.5, help="Pause zwischen LLM-Calls (s)")
    parser.add_argument("--output",   default="eval_extended", help="Ausgabe-Dateiname (ohne Endung)")
    args = parser.parse_args()

    out_json = Path(args.output + ".json")
    out_csv  = Path(args.output + ".csv")

    # Resume: bereits verarbeitete IDs laden
    done_ids: set = set()
    results: list[dict] = []
    if out_json.exists():
        with open(out_json, encoding="utf-8") as f:
            results = json.load(f)
        done_ids = {r["_id"] for r in results}
        print(f"Resume: {len(done_ids)} bereits verarbeitete Einträge geladen")

    # Daten holen
    fixtures = fetch_fixtures(args.fixtures)
    pool     = build_event_pool(fixtures)
    selected = select_balanced(pool, args.n)

    print(f"\nStarte Evaluation ({len(selected)} Events, Gen={GEN_MODEL}, Judge={JUDGE_MODEL})\n")

    for i, ev in enumerate(selected):
        uid = f"{ev['fixture_id']}_{ev['event_type']}_{ev['minute']}_{ev['player'][:5]}"
        if uid in done_ids:
            print(f"[{i+1:3}/{len(selected)}] SKIP (bereits done)")
            continue

        match_short = ev["match"][:35]
        print(f"[{i+1:3}/{len(selected)}] {match_short:35} {ev['event_type']:12} {ev['minute']:3}' {ev['style']:10} ", end="", flush=True)

        try:
            text, latency_ms = generate(ev)
            time.sleep(args.delay)
            scores = evaluate(ev, text)
            time.sleep(args.delay)

            k = scores.get("korrektheit", 0)
            t = scores.get("tonalitaet", 0)
            v = scores.get("verstaendlichkeit", 0)
            avg = round((k + t + v) / 3, 2) if all([k, t, v]) else 0

            print(f"{latency_ms:5}ms  K={k} T={t} V={v} Ø={avg}")
            print(f"       → {text[:90]}")

            row = {
                "_id":           uid,
                "nr":            len(results) + 1,
                "match":         ev["match"],
                "event_type":    ev["event_type"],
                "minute":        ev["minute"],
                "player":        ev["player"],
                "team":          ev["team"],
                "score":         f"{ev['score_home']}:{ev['score_away']}",
                "style":         ev["style"],
                "generated_text": text,
                "latency_ms":    latency_ms,
                "gen_model":     GEN_MODEL,
                "judge_model":   JUDGE_MODEL,
                "korrektheit":   k,
                "tonalitaet":    t,
                "verstaendlichkeit": v,
                "gesamt":        avg,
                "begruendung":   scores.get("begruendung", ""),
                "timestamp":     datetime.now().isoformat(),
            }
            results.append(row)
            done_ids.add(uid)

            # Zwischenspeichern nach jedem Eintrag
            with open(out_json, "w", encoding="utf-8") as f:
                json.dump(results, f, ensure_ascii=False, indent=2)

        except Exception as e:
            print(f"FEHLER: {e}")
            time.sleep(3)

    # CSV speichern
    if results:
        fieldnames = ["nr", "match", "event_type", "minute", "player", "team", "score",
                      "style", "generated_text", "latency_ms", "gen_model", "judge_model",
                      "korrektheit", "tonalitaet", "verstaendlichkeit", "gesamt", "begruendung"]
        with open(out_csv, "w", newline="", encoding="utf-8-sig") as f:
            w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
            w.writeheader()
            w.writerows(results)

    # Zusammenfassung
    valid = [r for r in results if r.get("korrektheit", 0) > 0]
    if valid:
        k_avg = round(sum(r["korrektheit"] for r in valid) / len(valid), 2)
        t_avg = round(sum(r["tonalitaet"]  for r in valid) / len(valid), 2)
        v_avg = round(sum(r["verstaendlichkeit"] for r in valid) / len(valid), 2)
        g_avg = round(sum(r["gesamt"] for r in valid) / len(valid), 2)

        by_style: dict[str, list] = {}
        for r in valid:
            by_style.setdefault(r["style"], []).append(r)

        by_type: dict[str, list] = {}
        for r in valid:
            by_type.setdefault(r["event_type"], []).append(r)

        print(f"\n{'='*60}")
        print(f"ERGEBNISSE (N={len(valid)})")
        print(f"{'='*60}")
        print(f"Gesamt:       K={k_avg}  T={t_avg}  V={v_avg}  Ø={g_avg}")
        print(f"\nNach Stil:")
        for style, rows in sorted(by_style.items()):
            sk = round(sum(r["korrektheit"] for r in rows) / len(rows), 2)
            st = round(sum(r["tonalitaet"]  for r in rows) / len(rows), 2)
            sv = round(sum(r["verstaendlichkeit"] for r in rows) / len(rows), 2)
            sg = round(sum(r["gesamt"]      for r in rows) / len(rows), 2)
            print(f"  {style:12} n={len(rows):3}  K={sk} T={st} V={sv} Ø={sg}")
        print(f"\nNach Event-Typ:")
        for etype, rows in sorted(by_type.items()):
            sk = round(sum(r["korrektheit"] for r in rows) / len(rows), 2)
            st = round(sum(r["tonalitaet"]  for r in rows) / len(rows), 2)
            sv = round(sum(r["verstaendlichkeit"] for r in rows) / len(rows), 2)
            sg = round(sum(r["gesamt"]      for r in rows) / len(rows), 2)
            print(f"  {etype:14} n={len(rows):3}  K={sk} T={st} V={sv} Ø={sg}")
        print(f"\nJSON: {out_json}")
        print(f"CSV:  {out_csv}")


if __name__ == "__main__":
    main()
