#!/usr/bin/env python3
"""
Few-Shot Ablation – Mit vs. Ohne Stilreferenzen (2025/26)
==========================================================
Gleiche Events, T=0.5, alle 3 Stile.
Jedes Event wird ZWEIMAL generiert: mit und ohne Few-Shot-Referenzen.
Gepaartes Design → direkte Δ-Analyse pro Event.

Nutzung:
  cd evaluation
  python3 eval_fewshot_ablation.py
  python3 eval_fewshot_ablation.py --n-per-type 6 --fixtures 5
"""

import argparse
import csv
import json
import time
from datetime import datetime
from pathlib import Path

import requests
from openai import OpenAI


# ── Keys ──────────────────────────────────────────────────────────────────────

def _load_env_key(name: str) -> str:
    import os
    val = os.environ.get(name, "")
    if val:
        return val
    env_path = Path(__file__).parent.parent / "backend" / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line.startswith(f"{name}="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


FOOTBALL_API_KEY   = _load_env_key("API_FOOTBALL_KEY") or _load_env_key("FOOTBALL_API_KEY")
OPENROUTER_API_KEY = _load_env_key("OPENROUTER_API_KEY")

GEN_MODEL   = "google/gemini-2.0-flash-lite-001"
JUDGE_MODEL = "anthropic/claude-sonnet-4-5"
TEMPERATURE = 0.5

FOOTBALL_BASE   = "https://v3.football.api-sports.io"
OPENROUTER_BASE = "https://openrouter.ai/api/v1"

EF_TEAM_ID = 169
SEASON     = 2025
LEAGUES    = {78: "Bundesliga", 529: "DFB-Pokal", 2: "Champions League"}
STYLES     = ["neutral", "euphorisch", "kritisch"]

EVENT_TYPE_LABEL = {
    "goal": "Tor", "own_goal": "Eigentor",
    "yellow_card": "Gelbe Karte", "red_card": "Rote Karte",
    "substitution": "Spielerwechsel",
}

# Echte EF-Redakteurs-Beispiele (identisch zu compare_models_eval.py)
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

STYLE_DESC = {
    "neutral": (
        "Sachlicher, unparteiischer Reporter-Stil. Keine Vereinspräferenz, keine emotionalen Wertungen. "
        "Kurze, klare Sätze. WICHTIG: Variiere den Satzeinstieg."
    ),
    "euphorisch": (
        "Du schreibst als leidenschaftlicher Fan von Eintracht Frankfurt. "
        "Laut, emotional, authentisch. Kurze Sätze, Ausrufe, Dramatik. "
        "Passe die Emotion der Spielsituation an."
    ),
    "kritisch": (
        "Nüchtern-analytischer Kommentator — kein Jubel, keine Verharmlosung. "
        "Benenne Fehler und Schwächen direkt. Kurze, harte Sätze. Urteilend, aber sachlich."
    ),
}

JUDGE_SYSTEM = """Du bist ein strenger, unabhängiger Qualitätsbewerter für KI-generierte Fußball-Liveticker-Texte.
Du erhältst: den faktischen Ereigniskontext (Spieler, Team, Minute, Spielstand, Ereignistyp), den angeforderten Stilnamen und den generierten Text.

Bewerte auf drei Dimensionen (je 1–5). Nutze die gesamte Skala — vergib 5 nur, wenn kein Mangel erkennbar ist.

KORREKTHEIT (1–5): Stimmen alle faktischen Angaben mit dem Ereigniskontext überein?
  5 = alle Fakten korrekt (Spieler, Team, Minute, Spielstand), keine Erfindungen
  4 = marginale Ungenauigkeit (z. B. Minutenabweichung ±1 oder stilistische Umschreibung eines Fakts)
  3 = ein klarer Faktenfehler (falscher Spieler, falscher Spielstand)
  2 = mehrere Fehler oder ein schwerwiegender Fehler
  1 = grundlegend falsche Fakten oder Halluzination wesentlicher Inhalte

TONALITÄT (1–5): Entspricht Wortwahl, Rhythmus und Ausdrucksstärke dem angeforderten Stilprofil?
  Stilprofile:
    neutral     → sachlich, Reporter-Ton, keine Vereinspräferenz, keine Emotionen, kurze klare Sätze
    euphorisch  → leidenschaftlich, Ausrufe, Großschreibung, Fan-Perspektive (pro Heimteam), Jubel
    kritisch    → analytisch-bewertend, nüchtern, keine Ausrufe, taktische Einordnung, distanzierter Ton
  5 = Stil vollständig und konsistent umgesetzt, kein stilfremdes Element
  4 = überwiegend korrekt, eine leichte Stilabweichung
  3 = gemischter Stil, mehrere erkennbare Abweichungen
  2 = Stil kaum erkennbar oder überwiegend falsch
  1 = gegenteiliger Stil oder keine Stilmerkmale vorhanden

VOLLSTÄNDIGKEIT (1–5): Sind alle Schlüsselfakten (Spieler, Team, Ereignistyp, Spielstand) im Text enthalten?
  5 = alle relevanten Fakten vorhanden, nichts Wesentliches fehlt
  4 = ein Fakt fehlt oder ist nur impliziert (z. B. Spielstand nicht explizit genannt)
  3 = zwei Fakten fehlen oder werden nur vage angedeutet
  2 = wichtige Fakten fehlen, Text enthält kaum Sachinformation
  1 = kaum informativ, wesentliche Inhalte nicht vorhanden

Bewertungshinweise: Längere Texte sind NICHT automatisch vollständiger. Kreativität und Originalität sind KEIN Bewertungskriterium. Bewerte ausschließlich Korrektheit, Stilkonsistenz und Sachvollständigkeit.

Antworte NUR mit validem JSON ohne weiteren Text:
{"korrektheit": <1-5>, "tonalitaet": <1-5>, "vollstaendigkeit": <1-5>, "begruendung": "<max 1 Satz>"}"""


# ── Football API ──────────────────────────────────────────────────────────────

def football_get(endpoint: str, params: dict) -> dict:
    headers = {"x-apisports-key": FOOTBALL_API_KEY}
    r = requests.get(f"{FOOTBALL_BASE}/{endpoint}", params=params, headers=headers, timeout=15)
    r.raise_for_status()
    return r.json()


def fetch_ef_events(n_fixtures: int) -> list[dict]:
    pool = []
    for league_id, league_name in LEAGUES.items():
        print(f"  Lade {league_name}...", end=" ", flush=True)
        try:
            data = football_get("fixtures", {
                "team": EF_TEAM_ID, "league": league_id, "season": SEASON,
                "status": "FT", "timezone": "Europe/Berlin",
            })
            fixtures = sorted(data.get("response", []),
                              key=lambda f: f["fixture"]["date"], reverse=True)[:n_fixtures]
            print(f"{len(fixtures)} Spiele")

            for fix in fixtures:
                fid  = fix["fixture"]["id"]
                home = fix["teams"]["home"]["name"]
                away = fix["teams"]["away"]["name"]
                try:
                    ev_data = football_get("fixtures/events", {"fixture": fid})
                    time.sleep(0.4)
                except Exception as e:
                    print(f"    Fehler Fixture {fid}: {e}")
                    continue

                score_h = score_a = 0
                for ev in ev_data.get("response", []):
                    api_type = ev.get("type", "")
                    detail   = ev.get("detail", "")
                    minute   = (ev.get("time", {}).get("elapsed") or 0) + (ev.get("time", {}).get("extra") or 0)
                    player   = ev.get("player", {}).get("name") or ""
                    assist   = ev.get("assist", {}).get("name") or ""
                    team     = ev.get("team", {}).get("name") or ""

                    if api_type == "Goal":
                        etype = "own_goal" if "Own" in detail else "goal"
                        if etype == "goal":
                            if team == home: score_h += 1
                            else: score_a += 1
                        else:
                            if team == home: score_a += 1
                            else: score_h += 1
                    elif api_type == "Card":
                        if "Yellow" in detail and "Red" not in detail:
                            etype = "yellow_card"
                        elif "Red" in detail:
                            etype = "red_card"
                        else:
                            continue
                    elif api_type == "subst":
                        etype = "substitution"
                    else:
                        continue

                    pool.append({
                        "fixture_id": fid, "match": f"{home} vs. {away}",
                        "home": home, "away": away, "league": league_name,
                        "event_type": etype, "minute": minute,
                        "player": player, "assist": assist, "team": team,
                        "score_home": score_h, "score_away": score_a,
                    })
        except Exception as e:
            print(f"FEHLER: {e}")

    print(f"  {len(pool)} verwertbare Events gesamt")
    return pool


def select_balanced(pool: list[dict], n_per_type: int) -> list[dict]:
    by_type: dict[str, list] = {}
    for ev in pool:
        by_type.setdefault(ev["event_type"], []).append(ev)

    selected = []
    for etype in ["goal", "yellow_card", "substitution", "red_card", "own_goal"]:
        items = by_type.get(etype, [])
        selected.extend(items[:n_per_type])

    print(f"  Auswahl: { {t: len([e for e in selected if e['event_type']==t]) for t in set(e['event_type'] for e in selected)} }")
    return selected


# ── Prompt Builder ────────────────────────────────────────────────────────────

def build_prompt(ev: dict, style: str, use_fewshot: bool) -> str:
    etype = ev["event_type"]
    label = EVENT_TYPE_LABEL.get(etype, etype)
    facts = [f"Ereignistyp: {label}", f"Minute: {ev['minute']}. Minute"]
    if ev.get("player"):
        lp = "Ausgewechselt (geht raus)" if etype == "substitution" else "Spieler"
        facts.append(f"{lp}: {ev['player']}")
    if ev.get("assist"):
        la = "Eingewechselt (kommt rein)" if etype == "substitution" else "Vorlagengeber"
        facts.append(f"{la}: {ev['assist']}")
    if ev.get("team"):
        facts.append(f"Verursachendes Team: {ev['team']}")

    few_shot_block = ""
    if use_fewshot:
        refs = "\n".join(f'- "{r}"' for r in FEW_SHOT[style])
        few_shot_block = (
            f"\n### STILREFERENZEN (WICHTIG)\n"
            f"Die folgenden Texte stammen von echten Eintracht-Redakteuren. "
            f"Übernimm exakt diesen Stil — Rhythmus, Wortwahl, Satzlänge, Emotionalität. "
            f"Verwende KEINE generischen Floskeln:\n{refs}\n"
        )

    return (
        f"Du bist ein Fußball-Liveticker-Redakteur. Schreibe einen Ticker-Eintrag auf Deutsch.\n\n"
        f"### STIL\n{STYLE_DESC[style]}\n\n"
        f"### FAKTEN\n{chr(10).join(facts)}\n"
        f"\n### SPIELKONTEXT\n"
        f"Heimteam: {ev['home']}\nAuswärtsteam: {ev['away']}\n"
        f"Wettbewerb: {ev['league']}\n"
        f"Stand nach diesem Ereignis: {ev['score_home']}:{ev['score_away']}\n"
        f"{few_shot_block}\n"
        f"### REGELN\n"
        f"- Nur der fertige Ticker-Text, keine Erklärungen\n"
        f"- Nenne KEINE Minute im Text\n"
        f"- Ellipsen und kurze Hauptsätze bevorzugen\n"
        f"- Spielstand nur nennen wenn im SPIELKONTEXT angegeben\n"
        f"- Keine Hashtags, keine Emojis außer TOOOOR!\n"
        f"- Variiere Satzstruktur, Wortwahl und Einstieg\n"
    )


# ── Generation + Evaluation ──────────────────────────────────────────────────

client = OpenAI(api_key=OPENROUTER_API_KEY, base_url=OPENROUTER_BASE)


def generate(ev: dict, style: str, use_fewshot: bool) -> tuple[str, int]:
    prompt = build_prompt(ev, style, use_fewshot)
    t0 = time.time()
    resp = client.chat.completions.create(
        model=GEN_MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=200,
        temperature=TEMPERATURE,
    )
    return resp.choices[0].message.content.strip(), round((time.time() - t0) * 1000)


def evaluate(ev: dict, style: str, text: str) -> dict:
    user_msg = (
        f"Ereignis: {EVENT_TYPE_LABEL.get(ev['event_type'], ev['event_type'])}, "
        f"{ev['minute']}. Minute, {ev.get('player', '')} ({ev.get('team', '')}), "
        f"Spielstand: {ev['home']} {ev['score_home']}:{ev['score_away']} {ev['away']}\n"
        f"Angeforderter Stil: {style}\n"
        f"Generierter Text: \"{text}\""
    )
    resp = client.chat.completions.create(
        model=JUDGE_MODEL,
        messages=[{"role": "system", "content": JUDGE_SYSTEM}, {"role": "user", "content": user_msg}],
        max_tokens=150,
        temperature=0.0,
    )
    raw = resp.choices[0].message.content.strip()
    try:
        return json.loads(raw[raw.index("{"):raw.rindex("}") + 1])
    except Exception:
        return {"korrektheit": 0, "tonalitaet": 0, "vollstaendigkeit": 0, "begruendung": f"PARSE_ERROR: {raw[:60]}"}


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--n-per-type", type=int, default=5, help="Events pro Ereignistyp")
    parser.add_argument("--fixtures",   type=int, default=5, help="Spiele pro Liga")
    parser.add_argument("--delay",      type=float, default=1.2, help="Pause zwischen LLM-Calls (s)")
    parser.add_argument("--output",     default="eval_fewshot_ablation")
    args = parser.parse_args()

    out_json = Path(args.output + ".json")
    out_csv  = Path(args.output + ".csv")

    results: list[dict] = []
    done_ids: set = set()
    if out_json.exists():
        with open(out_json, encoding="utf-8") as f:
            results = json.load(f)
        done_ids = {r["_id"] for r in results}
        print(f"Resume: {len(done_ids)} bereits verarbeitet\n")

    print("Lade Eintracht Frankfurt Spiele 2025/26...")
    pool     = fetch_ef_events(n_fixtures=args.fixtures)
    selected = select_balanced(pool, n_per_type=args.n_per_type)
    total    = len(selected) * len(STYLES)
    print(f"\n{len(selected)} Events × 3 Stile × 2 Bedingungen = {total * 2} Generierungen + {total * 2} Judge-Calls\n")

    for ev in selected:
        for style in STYLES:
            uid = f"{ev['fixture_id']}_{ev['event_type']}_{ev['minute']}_{ev.get('player','')[:5]}_{style}"
            if uid in done_ids:
                print(f"  SKIP {uid[:60]}")
                continue

            label_short = f"{ev['match'][:28]:28} {ev['event_type']:12} {ev['minute']:3}' {style:10}"
            print(f"  {label_short}", end="  ", flush=True)

            try:
                text_fs,   lat_fs   = generate(ev, style, use_fewshot=True)
                time.sleep(args.delay)
                scores_fs = evaluate(ev, style, text_fs)
                time.sleep(args.delay)

                text_nofs, lat_nofs = generate(ev, style, use_fewshot=False)
                time.sleep(args.delay)
                scores_nofs = evaluate(ev, style, text_nofs)
                time.sleep(args.delay)

                k_fs  = scores_fs.get("korrektheit", 0)
                t_fs  = scores_fs.get("tonalitaet", 0)
                v_fs  = scores_fs.get("vollstaendigkeit", 0)
                k_no  = scores_nofs.get("korrektheit", 0)
                t_no  = scores_nofs.get("tonalitaet", 0)
                v_no  = scores_nofs.get("vollstaendigkeit", 0)
                avg_fs   = round((k_fs + t_fs + v_fs) / 3, 2) if all([k_fs, t_fs, v_fs]) else 0
                avg_nofs = round((k_no + t_no + v_no) / 3, 2) if all([k_no, t_no, v_no]) else 0
                delta    = round(avg_fs - avg_nofs, 2)

                print(f"FS={avg_fs}  noFS={avg_nofs}  Δ={delta:+.2f}")

                row = {
                    "_id": uid,
                    "match": ev["match"], "league": ev["league"],
                    "event_type": ev["event_type"], "minute": ev["minute"],
                    "player": ev.get("player", ""), "team": ev.get("team", ""),
                    "score": f"{ev['score_home']}:{ev['score_away']}",
                    "style": style,
                    "text_fewshot":    text_fs,    "lat_fewshot":    lat_fs,
                    "text_no_fewshot": text_nofs,  "lat_no_fewshot": lat_nofs,
                    "K_fs": k_fs,  "T_fs": t_fs,  "V_fs": v_fs,  "avg_fs":   avg_fs,
                    "K_no": k_no,  "T_no": t_no,  "V_no": v_no,  "avg_no":   avg_nofs,
                    "delta_avg":   delta,
                    "begr_fs":     scores_fs.get("begruendung", ""),
                    "begr_no":     scores_nofs.get("begruendung", ""),
                    "timestamp":   datetime.now().isoformat(),
                }
                results.append(row)
                done_ids.add(uid)

                with open(out_json, "w", encoding="utf-8") as f:
                    json.dump(results, f, ensure_ascii=False, indent=2)

            except Exception as e:
                print(f"FEHLER: {e}")
                time.sleep(3)

    # CSV
    if results:
        fnames = ["match", "league", "event_type", "minute", "player", "team", "score", "style",
                  "text_fewshot", "lat_fewshot", "text_no_fewshot", "lat_no_fewshot",
                  "K_fs", "T_fs", "V_fs", "avg_fs",
                  "K_no", "T_no", "V_no", "avg_no",
                  "delta_avg", "begr_fs", "begr_no"]
        with open(out_csv, "w", newline="", encoding="utf-8-sig") as f:
            w = csv.DictWriter(f, fieldnames=fnames, extrasaction="ignore")
            w.writeheader()
            w.writerows(results)

    # Zusammenfassung
    valid = [r for r in results if r.get("avg_fs") and r.get("avg_no")]
    if valid:
        print(f"\n{'='*65}")
        print(f"ERGEBNISSE FEW-SHOT ABLATION (N={len(valid)} Paare)")
        print(f"{'='*65}")
        avg_fs  = round(sum(r["avg_fs"]    for r in valid) / len(valid), 2)
        avg_no  = round(sum(r["avg_no"]    for r in valid) / len(valid), 2)
        avg_d   = round(sum(r["delta_avg"] for r in valid) / len(valid), 2)
        print(f"Gesamt:  Mit Few-Shot={avg_fs}  Ohne Few-Shot={avg_no}  Δ={avg_d:+.2f}")
        print(f"\nNach Stil:")
        for style in STYLES:
            rows = [r for r in valid if r["style"] == style]
            if rows:
                fs = round(sum(r["avg_fs"]    for r in rows) / len(rows), 2)
                no = round(sum(r["avg_no"]    for r in rows) / len(rows), 2)
                d  = round(sum(r["delta_avg"] for r in rows) / len(rows), 2)
                print(f"  {style:12}  FS={fs}  noFS={no}  Δ={d:+.2f}  (n={len(rows)})")
        print(f"\nJSON: {out_json}\nCSV:  {out_csv}")


if __name__ == "__main__":
    main()
