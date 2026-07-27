#!/usr/bin/env python3
"""
Modellvergleich mit Few-Shot + echten EF-Spielen (2025/26)
===========================================================
1. Holt Eintracht Frankfurt Spiele via Football API (Bundesliga + Pokal)
2. Generiert Ticker-Einträge mit allen 3 Modellen + Few-Shot-Referenzen
3. Speichert als CSV zur manuellen Bewertung

Nutzung:
  cd evaluation
  python3 compare_models_eval.py
  python3 compare_models_eval.py --n-events 15 --delay 1
  python3 compare_models_eval.py --list-matches   # zeigt verfügbare Spiele
"""

import argparse
import csv
import json
import os
import sys
import time
from pathlib import Path

# ─── Keys aus backend/.env ────────────────────────────────────────────────────

def load_env() -> dict:
    env_path = Path(__file__).parent.parent / "backend" / ".env"
    keys = {}
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                keys[k.strip()] = v.strip().strip('"').strip("'")
    return keys

ENV = load_env()
FOOTBALL_API_KEY = ENV.get("API_FOOTBALL_KEY", ENV.get("FOOTBALL_API_KEY", os.environ.get("FOOTBALL_API_KEY", "")))
OPENROUTER_API_KEY = ENV.get("OPENROUTER_API_KEY", os.environ.get("OPENROUTER_API_KEY", ""))

# ─── Konfiguration ────────────────────────────────────────────────────────────

MODELS = [
    "google/gemini-2.5-flash",
    "openai/gpt-4.1-mini",
    "anthropic/claude-haiku-4-5",
]

EF_TEAM_ID = 169        # Eintracht Frankfurt
SEASON = 2025
LEAGUES = {
    78:  "Bundesliga",
    529: "DFB-Pokal",
    2:   "Champions League",
}

FOOTBALL_BASE = "https://v3.football.api-sports.io"
OPENROUTER_BASE = "https://openrouter.ai/api/v1"

# ─── Few-Shot-Referenzen pro Stil (echte EF-Ticker-Beispiele) ─────────────────

FEW_SHOT = {
    "neutral": [
        "Marmoush schließt den Konter ab. 1:0 für Frankfurt.",
        "Gelbe Karte für Koch. Der Verteidiger sieht Gelb nach einem Foul im Mittelfeld.",
        "Kolo Muani kommt für Götze. Frankfurt tauscht im Sturm.",
    ],
    "euphorisch": [
        "TOOOOR! Marmoush! Der Ball zappelt im Netz! Frankfurt führt — die Hütte explodiert!",
        "Was für ein Einstand! Doan dreht einfach durch — wir sind obenauf!",
        "Raus kommt Götze, rein kommt frische Energie! Auf geht's, Adler!",
    ],
    "kritisch": [
        "Marmoush mit dem Abschluss — aber das war kein Kunststück, die Bayern-Abwehr stand zu hoch.",
        "Gelbe Karte für Koch. Das Foul war überflüssig, der Zweikampf nicht gewinnbar.",
        "Dieser Wechsel kommt zehn Minuten zu spät. Götze hatte längst keinen Einfluss mehr.",
    ],
}

# ─── Stil-Beschreibungen (identisch zu backend/app/core/constants.py) ─────────

STYLE_DESC = {
    "neutral": (
        "Sachlicher, unparteiischer Reporter-Stil. "
        "Keine Vereinspräferenz, keine emotionalen Wertungen — nur Fakten und Spielfluss. "
        "Kurze, klare Sätze; das Ereignis steht im Mittelpunkt, nicht die Atmosphäre. "
        "WICHTIG: Variiere den Satzeinstieg. "
        "Tempo und Präzision sind wichtiger als Dramatik. "
        "Keine Superlative ohne Anlass."
    ),
    "euphorisch": (
        "Leidenschaftlicher Fan-Stil — laut, emotional, aber authentisch. "
        "Kurze Sätze, Ausrufe, Dramatik. "
        "WICHTIG: Passe die Emotion an die Spielsituation an! "
        "Bei Toren des Heimteams: euphorisch, mitreißend, feiernd. "
        "Bei Gegentoren: frustriert, fassungslos. "
        "WICHTIG: Variiere stark — keine Wiederholungen."
    ),
    "kritisch": (
        "Nüchtern-analytischer Kommentator mit hohem Qualitätsanspruch — "
        "kein Jubel, keine Verharmlosung. "
        "Benenne Fehler, Schwächen und Fehlentscheidungen direkt. "
        "Bei Toren: knappe Ursachenanalyse. "
        "Bei Karten: war es berechtigt? "
        "Kurze, harte Sätze. Urteilend, aber sachlich begründet."
    ),
}

EVENT_TYPE_LABEL = {
    "goal":         "Tor",
    "own_goal":     "Eigentor",
    "yellow_card":  "Gelbe Karte",
    "red_card":     "Rote Karte",
    "substitution": "Spielerwechsel",
}

# ─── Prompt Builder ───────────────────────────────────────────────────────────

def build_prompt(event: dict, style: str) -> str:
    etype = event["event_type"]
    style_desc = STYLE_DESC[style]
    if style == "euphorisch":
        style_desc = f"Du schreibst als leidenschaftlicher Fan von Eintracht Frankfurt.\n" + style_desc

    label = EVENT_TYPE_LABEL.get(etype, etype)
    facts = [f"Ereignistyp: {label}", f"Minute: {event['minute']}. Minute"]
    if event.get("player"):
        lp = "Ausgewechselt (geht raus)" if etype == "substitution" else "Spieler"
        facts.append(f"{lp}: {event['player']}")
    if event.get("assist"):
        la = "Eingewechselt (kommt rein)" if etype == "substitution" else "Vorlagengeber"
        facts.append(f"{la}: {event['assist']}")
    if event.get("team"):
        facts.append(f"Verursachendes Team: {event['team']}")

    refs = "\n".join(f'- "{r}"' for r in FEW_SHOT[style])
    few_shot_block = (
        f"\n### STILREFERENZEN (WICHTIG)\n"
        f"Die folgenden Texte stammen von echten Eintracht-Redakteuren. "
        f"Übernimm exakt diesen Stil — Rhythmus, Wortwahl, Satzlänge, Emotionalität. "
        f"Verwende KEINE generischen Floskeln:\n{refs}\n"
    )

    context = (
        f"\n### SPIELKONTEXT\n"
        f"Heimteam: {event['home']}\n"
        f"Auswärtsteam: {event['away']}\n"
        f"Wettbewerb: {event['league']}\n"
        f"Stand nach diesem Ereignis: {event['score_home']}:{event['score_away']}\n"
    )

    return (
        f"Du bist ein Fußball-Liveticker-Redakteur. Schreibe einen Ticker-Eintrag auf Deutsch.\n\n"
        f"### STIL\n{style_desc}\n\n"
        f"### FAKTEN\n{chr(10).join(facts)}\n"
        f"{context}"
        f"{few_shot_block}\n"
        f"### REGELN\n"
        f"- Nur der fertige Ticker-Text, keine Erklärungen\n"
        f"- Nenne KEINE Minute im Text — sie wird separat angezeigt\n"
        f"- Ellipsen und kurze Hauptsätze bevorzugen\n"
        f"- Präsens für laufende Szene, Perfekt für abgeschlossene Aktion\n"
        f"- Bei Tor: emotional, prägnant\n"
        f"- Spielstand nur nennen wenn er im SPIELKONTEXT angegeben ist\n"
        f"- Keine Hashtags, keine Emojis außer TOOOOR!\n"
        f"- Variiere Satzstruktur, Wortwahl und Einstieg\n"
        f"- Kein Markdown, keine Fettschrift (**), kein Doppelpunkt nach der Minute\n"
    )

# ─── Football API ──────────────────────────────────────────────────────────────

def football_get(endpoint: str, params: dict) -> dict:
    import urllib.request
    url = f"{FOOTBALL_BASE}/{endpoint}?" + "&".join(f"{k}={v}" for k, v in params.items())
    req = urllib.request.Request(url, headers={"x-apisports-key": FOOTBALL_API_KEY})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


def fetch_ef_fixtures() -> list[dict]:
    fixtures = []
    for league_id, league_name in LEAGUES.items():
        print(f"  Lade {league_name}...", end=" ")
        try:
            data = football_get("fixtures", {
                "team": EF_TEAM_ID,
                "league": league_id,
                "season": SEASON,
                "status": "FT",
                "timezone": "Europe%2FBerlin",
            })
            items = data.get("response", [])
            for f in items:
                f["_league_name"] = league_name
            fixtures.extend(items)
            print(f"{len(items)} Spiele")
        except Exception as e:
            print(f"Fehler: {e}")

    fixtures.sort(key=lambda f: f["fixture"]["date"], reverse=True)
    return fixtures


def fetch_events(fixture_id: int) -> list[dict]:
    data = football_get("fixtures/events", {"fixture": fixture_id})
    return data.get("response", [])


def map_event_type(api_type: str, detail: str):
    if api_type == "Goal":
        return "own_goal" if "Own" in detail else "goal"
    if api_type == "Card":
        if "Yellow" in detail and "Red" not in detail:
            return "yellow_card"
        if "Red" in detail:
            return "red_card"
    if api_type == "subst":
        return "substitution"
    return None


def build_event_pool(fixtures: list[dict]) -> list[dict]:
    pool = []
    for fix in fixtures:
        fid   = fix["fixture"]["id"]
        home  = fix["teams"]["home"]["name"]
        away  = fix["teams"]["away"]["name"]
        date  = fix["fixture"]["date"][:10]
        league = fix.get("_league_name", fix["league"]["name"])

        try:
            events = fetch_events(fid)
            time.sleep(0.4)
        except Exception as e:
            print(f"  Fehler Fixture {fid}: {e}")
            continue

        score_h = score_a = 0
        for ev in events:
            etype = map_event_type(ev.get("type", ""), ev.get("detail", ""))
            if not etype:
                continue
            minute = (ev.get("time", {}).get("elapsed") or 0) + (ev.get("time", {}).get("extra") or 0)
            player = ev.get("player", {}).get("name") or ""
            assist = ev.get("assist", {}).get("name") or ""
            team   = ev.get("team", {}).get("name") or ""

            if etype == "goal":
                score_h += 1 if team == home else 0
                score_a += 1 if team != home else 0
            elif etype == "own_goal":
                score_h += 1 if team != home else 0
                score_a += 1 if team == home else 0

            pool.append({
                "fixture_id": fid, "match": f"{home} vs. {away}",
                "home": home, "away": away, "league": league, "date": date,
                "event_type": etype, "minute": minute,
                "player": player, "assist": assist, "team": team,
                "score_home": score_h, "score_away": score_a,
            })

    return pool


def select_events(pool: list[dict], n: int) -> list[dict]:
    """Wählt n Events aus — max 2 pro Spiel, balanciert über Event-Typ und Wettbewerb."""
    priority = ["goal", "yellow_card", "red_card", "substitution", "own_goal"]

    # Gruppiere nach Typ, shuffle innerhalb jedes Typs für Variety
    import random
    by_type = {}
    for ev in pool:
        by_type.setdefault(ev["event_type"], []).append(ev)
    for t in by_type:
        random.shuffle(by_type[t])

    selected = []
    used_fixtures: dict[int, int] = {}  # fixture_id -> Anzahl bereits gewählter Events

    i = 0
    while len(selected) < n:
        added = False
        for t in priority:
            if t not in by_type:
                continue
            # Suche erstes Event dieses Typs dessen Spiel noch < 2 Events hat
            for ev in by_type[t]:
                fid = ev["fixture_id"]
                if used_fixtures.get(fid, 0) < 2 and ev not in selected:
                    selected.append(ev)
                    used_fixtures[fid] = used_fixtures.get(fid, 0) + 1
                    added = True
                    break
            if len(selected) >= n:
                break
        i += 1
        if not added or i > 200:
            break

    return selected[:n]

# ─── OpenRouter Generierung ───────────────────────────────────────────────────

def generate(client, model: str, prompt: str) -> tuple[str, int]:
    import time
    start = time.perf_counter()
    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            temperature=0.5,
        )
        ms = round((time.perf_counter() - start) * 1000)
        return resp.choices[0].message.content.strip(), ms
    except Exception as e:
        ms = round((time.perf_counter() - start) * 1000)
        return f"[FEHLER: {e}]", ms

# ─── Hauptlogik ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--n-events", type=int, default=15, help="Events pro Stil (default: 15)")
    parser.add_argument("--delay", type=float, default=1.5, help="Pause zwischen Calls (default: 1.5s)")
    parser.add_argument("--styles", nargs="+", default=["neutral", "euphorisch", "kritisch"])
    parser.add_argument("--list-matches", action="store_true", help="Nur verfügbare Spiele anzeigen")
    parser.add_argument("--output", default="model_comparison_eval.csv")
    args = parser.parse_args()

    if not FOOTBALL_API_KEY:
        print("FOOTBALL_API_KEY fehlt in backend/.env")
        sys.exit(1)
    if not OPENROUTER_API_KEY:
        print("OPENROUTER_API_KEY fehlt in backend/.env")
        sys.exit(1)

    try:
        from openai import OpenAI
    except ImportError:
        print("pip install openai")
        sys.exit(1)

    print("Lade Eintracht Frankfurt Spiele 2025/26...")
    fixtures = fetch_ef_fixtures()
    print(f"  {len(fixtures)} Spiele insgesamt\n")

    if args.list_matches:
        for f in fixtures:
            print(f"  {f['fixture']['date'][:10]}  {f['teams']['home']['name']} vs. {f['teams']['away']['name']}  [{f.get('_league_name', '')}]")
        return

    print("Lade Events...")
    pool = build_event_pool(fixtures)
    print(f"  {len(pool)} Events verfügbar\n")

    events = select_events(pool, args.n_events)
    print(f"Ausgewählte Events: {len(events)}")
    for e in events:
        print(f"  {e['date']}  {e['match']}  [{e['league']}]  {e['event_type']} min={e['minute']} {e['player']}")

    client = OpenAI(api_key=OPENROUTER_API_KEY, base_url=OPENROUTER_BASE)

    rows = []
    total = len(events) * len(args.styles) * len(MODELS)
    done = 0

    print(f"\nGeneriere {total} Einträge ({len(events)} Events × {len(args.styles)} Stile × {len(MODELS)} Modelle)...\n")

    for ev in events:
        for style in args.styles:
            prompt = build_prompt(ev, style)
            texts = {}
            lats = {}

            for model in MODELS:
                short = model.split("/")[-1]
                text, ms = generate(client, model, prompt)
                texts[model] = text
                lats[model] = ms
                done += 1
                status = "OK" if not text.startswith("[FEHLER") else "ERR"
                print(f"  [{done:3}/{total}] {status} {short:28} {ms:5}ms | {ev['event_type']:12} {style:10} | {text[:60]}")
                if args.delay > 0:
                    time.sleep(args.delay)

            # Eine Zeile pro Event+Stil, alle Modelle nebeneinander
            row = {
                "datum":      ev["date"],
                "spiel":      ev["match"],
                "wettbewerb": ev["league"],
                "event_typ":  ev["event_type"],
                "minute":     ev["minute"],
                "spieler":    ev["player"],
                "team":       ev["team"],
                "stand":      f"{ev['score_home']}:{ev['score_away']}",
                "stil":       style,
            }
            for model in MODELS:
                short = model.split("/")[-1]
                row[f"text_{short}"] = texts[model]
                row[f"ms_{short}"]   = lats[model]
                # Leere Bewertungsspalten für manuelle Eingabe
                row[f"K_{short}"]  = ""  # Korrektheit 1-5
                row[f"T_{short}"]  = ""  # Tonalität 1-5
                row[f"V_{short}"]  = ""  # Vollständigkeit 1-5

            rows.append(row)

    # CSV speichern
    if rows:
        fieldnames = list(rows[0].keys())
        with open(args.output, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        print(f"\nCSV gespeichert: {args.output}")
        print(f"  {len(rows)} Zeilen (je eine pro Event+Stil, alle 3 Modelle nebeneinander)")
        print(f"\nBewertung: Fülle die Spalten K_*, T_*, V_* mit Werten 1-5 aus.")
        print(f"  K = Korrektheit, T = Tonalität, V = Vollständigkeit")

        # JSON für spätere Auswertung
        json_out = args.output.replace(".csv", ".json")
        with open(json_out, "w", encoding="utf-8") as f:
            json.dump(rows, f, ensure_ascii=False, indent=2)
        print(f"JSON gespeichert:  {json_out}")


if __name__ == "__main__":
    main()
