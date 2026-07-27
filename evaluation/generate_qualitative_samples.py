#!/usr/bin/env python3
"""
Qualitative Stichproben generieren
=====================================
Generiert KI-Texte für alle drei Stilprofile über mehrere Spiele und Event-Typen,
damit sie manuell auf Korrektheit, Tonalität und Verständlichkeit bewertet werden können.

Ausgabe:
  - qualitative_samples.json: Alle generierten Texte mit Metadaten
  - qualitative_samples.csv: Tabelle für manuelle Bewertung (in Excel öffnen)

Nutzung:
  python3 generate_qualitative_samples.py
  python3 generate_qualitative_samples.py --base-url http://localhost:8000
  python3 generate_qualitative_samples.py --n 30   # 30 Texte generieren
"""

import urllib.request
import json
import time
import csv
import argparse
from datetime import datetime

DEFAULT_BASE_URL = "https://liveticker-backend.onrender.com/api/v1"
DEFAULT_INSTANCE = "ef_whitelabel"
DEFAULT_LANGUAGE = "de"
DEFAULT_N = 16           # Anzahl zu generierender Texte
DELAY = 3                # Sekunden zwischen Calls

STYLES = ["neutral", "euphorisch", "kritisch"]
TARGET_TYPES = ["goal", "yellow_card", "substitution", "red_card"]
MATCH_IDS = list(range(1, 30))  # Alle verfügbaren Spiele durchsuchen


def http_get(url, timeout=30):
    with urllib.request.urlopen(url, timeout=timeout) as r:
        return json.loads(r.read())

def http_post(url, data, timeout=60):
    body = json.dumps(data).encode()
    req = urllib.request.Request(
        url, data=body,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())

def http_delete(url, timeout=10):
    req = urllib.request.Request(url, method="DELETE")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status
    except Exception:
        return None


def collect_event_pool(base_url, match_ids):
    """Sammelt Events aus allen FullTime-Spielen."""
    pool = []
    for mid in match_ids:
        try:
            match = http_get(f"{base_url}/matches/{mid}")
            if match.get("matchState") not in ("FullTime",):
                continue
            events = http_get(f"{base_url}/matches/{mid}/events").get("items", [])
            home = match.get("homeTeam", {}).get("name", "?")
            away = match.get("awayTeam", {}).get("name", "?")
            for e in events:
                pool.append({
                    "match_id": mid,
                    "match": f"{home} vs {away}",
                    "event_id": e["id"],
                    "event_type": e["liveTickerEventType"],
                    "minute": e["time"],
                })
        except Exception:
            pass
    return pool


def main():
    parser = argparse.ArgumentParser(description="Qualitative Stichproben generieren")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--instance", default=DEFAULT_INSTANCE)
    parser.add_argument("--language", default=DEFAULT_LANGUAGE)
    parser.add_argument("--n", type=int, default=DEFAULT_N, help="Anzahl zu generierender Texte")
    parser.add_argument("--delay", type=float, default=DELAY)
    parser.add_argument("--output", default="qualitative_samples")
    args = parser.parse_args()

    print(f"Sammle Events aus allen FullTime-Spielen...")
    pool = collect_event_pool(args.base_url, MATCH_IDS)
    print(f"{len(pool)} Events gefunden")

    # Wähle gleichmäßig aus Event-Typen
    by_type = {}
    for e in pool:
        t = e["event_type"]
        if t not in by_type:
            by_type[t] = []
        by_type[t].append(e)

    print(f"Verfügbare Typen: {list(by_type.keys())}")

    # Erstelle Auswahl: möglichst gleichmäßig über Typen und Stile
    selection = []
    style_idx = 0
    type_cycle = [t for t in TARGET_TYPES if t in by_type]
    type_ptrs = {t: 0 for t in type_cycle}

    while len(selection) < args.n:
        for etype in type_cycle:
            if len(selection) >= args.n:
                break
            events_of_type = by_type[etype]
            ptr = type_ptrs[etype]
            if ptr >= len(events_of_type):
                continue
            event = events_of_type[ptr]
            type_ptrs[etype] += 1
            style = STYLES[style_idx % len(STYLES)]
            style_idx += 1
            selection.append({**event, "style": style})

    print(f"\n{len(selection)} Samples ausgewählt. Starte Generierung...\n")

    results = []
    for i, item in enumerate(selection):
        eid = item["event_id"]
        mid = item["match_id"]
        style = item["style"]
        etype = item["event_type"]

        # Bestehenden Eintrag löschen
        try:
            ticker = http_get(f"{args.base_url}/ticker/match/{mid}")
            for entry in ticker:
                if entry.get("event_id") == eid:
                    http_delete(f"{args.base_url}/ticker/{entry['id']}")
        except Exception:
            pass

        print(f"[{i+1:2}/{len(selection)}] {item['match']:40} {etype:12} min={item['minute']:3} {style:10}  ", end="", flush=True)

        payload = {"style": style, "instance": args.instance, "language": args.language}
        start = time.time()
        try:
            result = http_post(f"{args.base_url}/ticker/generate/{eid}", payload)
            latency = round((time.time() - start) * 1000)
            model = result.get("llm_model", "")
            text = result.get("text", "")
            model_short = model.split("/")[-1] if "/" in model else model
            print(f"{latency:5}ms [{model_short}]")
            print(f"       → {text[:80]}")
            results.append({
                **item,
                "latency_ms": latency,
                "model": model,
                "text": text,
                "status": "ok",
                # Bewertungsfelder (leer lassen für manuelle Ausfüllung)
                "bewertung_korrektheit": "",
                "bewertung_tonalitaet": "",
                "bewertung_verstaendlichkeit": "",
                "anmerkung": ""
            })
        except Exception as e:
            latency = round((time.time() - start) * 1000)
            print(f"FEHLER: {e}")
            results.append({**item, "latency_ms": latency, "model": "error", "text": "",
                            "status": str(e),
                            "bewertung_korrektheit": "", "bewertung_tonalitaet": "",
                            "bewertung_verstaendlichkeit": "", "anmerkung": ""})

        if args.delay > 0:
            time.sleep(args.delay)

    # JSON speichern
    json_path = f"{args.output}.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\nJSON gespeichert: {json_path}")

    # CSV für manuelle Bewertung
    csv_path = f"{args.output}.csv"
    fieldnames = [
        "match_id", "match", "event_type", "minute", "style",
        "latency_ms", "model", "text",
        "bewertung_korrektheit", "bewertung_tonalitaet", "bewertung_verstaendlichkeit",
        "anmerkung", "status"
    ]
    with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(results)
    print(f"CSV gespeichert:  {csv_path}  (in Excel öffnen und Bewertungsspalten ausfüllen)")

    # Schnelle Statistik
    ok = [r for r in results if r["status"] == "ok"]
    real = [r for r in ok if r.get("model", "") not in ("mock", "error", "")]
    mock = [r for r in ok if r.get("model", "") == "mock"]
    print(f"\nStatus: {len(ok)}/{len(results)} generiert, {len(real)} echte LLM-Calls, {len(mock)} Mock-Fallbacks")
    if mock:
        print("Hinweis: Mock-Fallbacks aufgetreten → Delay erhöhen (--delay 5) oder API-Key prüfen")


if __name__ == "__main__":
    main()
