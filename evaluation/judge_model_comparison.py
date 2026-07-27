#!/usr/bin/env python3
"""
LLM-as-Judge für model_comparison_eval.csv
Bewertet alle 3 Modell-Outputs (K/T/V je 1-5) mit claude-sonnet-4-5.
Resume-fähig: überspringt Zeilen wo K bereits ausgefüllt.

Usage:
  python3 judge_model_comparison.py
"""

import csv
import json
import time
from pathlib import Path
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

OPENROUTER_API_KEY = _load_env_key("OPENROUTER_API_KEY")
JUDGE_MODEL = "anthropic/claude-sonnet-4-5"
CSV_PATH = Path(__file__).parent / "model_comparison_eval.csv"
MODELS = ["gemini-2.5-flash", "gpt-4.1-mini", "claude-haiku-4-5"]
DELAY = 1.2  # Sekunden zwischen Judge-Aufrufen

EVENT_TYPE_LABEL = {
    "goal": "Tor", "own_goal": "Eigentor",
    "yellow_card": "Gelbe Karte", "red_card": "Rote Karte",
    "substitution": "Spielerwechsel",
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

# ── Judge-Aufruf ───────────────────────────────────────────────────────────────

client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=OPENROUTER_API_KEY)

def judge(row: dict, model_key: str) -> dict | None:
    text = row.get(f"text_{model_key}", "").strip()
    if not text:
        return None

    spiel = row["spiel"]  # "Atletico Madrid vs. Eintracht Frankfurt"
    parts = spiel.split(" vs. ")
    home = parts[0].strip() if len(parts) == 2 else spiel
    away = parts[1].strip() if len(parts) == 2 else ""

    stand = row.get("stand", "0:0")
    try:
        score_h, score_a = stand.split(":")
    except ValueError:
        score_h, score_a = "?", "?"

    event_label = EVENT_TYPE_LABEL.get(row["event_typ"], row["event_typ"])
    user_msg = (
        f"Ereignis: {event_label}, {row['minute']}. Minute, "
        f"{row['spieler']} ({row['team']}), "
        f"Spielstand: {home} {score_h}:{score_a} {away}\n"
        f"Angeforderter Stil: {row['stil']}\n"
        f"Generierter Text: \"{text}\""
    )

    try:
        resp = client.chat.completions.create(
            model=JUDGE_MODEL,
            messages=[
                {"role": "system", "content": JUDGE_SYSTEM},
                {"role": "user",   "content": user_msg},
            ],
            temperature=0.0,
            max_tokens=120,
        )
        raw = resp.choices[0].message.content or ""
        raw = raw.strip()
        # JSON aus Markdown-Block extrahieren falls nötig
        if "```" in raw:
            raw = raw.split("```")[-2].replace("json", "").strip()
        return json.loads(raw)
    except Exception as e:
        print(f"    FEHLER: {e} | raw={repr(resp.choices[0].message.content[:100] if resp else '')}")
        return None

# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    rows = list(csv.DictReader(CSV_PATH.open(encoding="utf-8")))
    fieldnames = list(rows[0].keys())
    total = len(rows) * len(MODELS)
    done = 0
    skipped = 0

    print(f"CSV: {len(rows)} Zeilen × {len(MODELS)} Modelle = {total} mögliche Judge-Aufrufe")

    for i, row in enumerate(rows):
        for model_key in MODELS:
            k_col = f"K_{model_key}"
            if row.get(k_col, "").strip():
                skipped += 1
                continue

            done += 1
            spiel_short = row["spiel"][:35]
            print(f"[{done:3d}/{total}] {spiel_short:<35} {model_key:<20} {row['stil']:<12} ", end="", flush=True)

            scores = judge(row, model_key)
            if scores:
                row[f"K_{model_key}"] = scores.get("korrektheit", "")
                row[f"T_{model_key}"] = scores.get("tonalitaet", "")
                row[f"V_{model_key}"] = scores.get("vollstaendigkeit", "")
                print(f"K={scores.get('korrektheit')} T={scores.get('tonalitaet')} V={scores.get('vollstaendigkeit')}")
            else:
                print("FEHLER")

            # Zwischenspeichern nach jeder Bewertung
            with CSV_PATH.open("w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(rows)

            time.sleep(DELAY)

    print(f"\nFertig. {done} bewertet, {skipped} übersprungen (bereits vorhanden).")

    # Statistiken
    print("\n── Ergebnisse nach Modell ──────────────────────────────")
    for model_key in MODELS:
        ks = [float(r[f"K_{model_key}"]) for r in rows if r.get(f"K_{model_key}", "").strip()]
        ts = [float(r[f"T_{model_key}"]) for r in rows if r.get(f"T_{model_key}", "").strip()]
        vs = [float(r[f"V_{model_key}"]) for r in rows if r.get(f"V_{model_key}", "").strip()]
        if ks:
            print(f"{model_key:<22}  K={sum(ks)/len(ks):.2f}  T={sum(ts)/len(ts):.2f}  V={sum(vs)/len(vs):.2f}  Gesamt={sum(ks+ts+vs)/len(ks+ts+vs):.2f}")

    print("\n── Ergebnisse nach Stil ────────────────────────────────")
    for stil in ["neutral", "euphorisch", "kritisch"]:
        stil_rows = [r for r in rows if r["stil"] == stil]
        print(f"\n{stil} (n={len(stil_rows)}):")
        for model_key in MODELS:
            ks = [float(r[f"K_{model_key}"]) for r in stil_rows if r.get(f"K_{model_key}", "").strip()]
            ts = [float(r[f"T_{model_key}"]) for r in stil_rows if r.get(f"T_{model_key}", "").strip()]
            vs = [float(r[f"V_{model_key}"]) for r in stil_rows if r.get(f"V_{model_key}", "").strip()]
            if ks:
                print(f"  {model_key:<22}  K={sum(ks)/len(ks):.2f}  T={sum(ts)/len(ts):.2f}  V={sum(vs)/len(vs):.2f}")

if __name__ == "__main__":
    main()
