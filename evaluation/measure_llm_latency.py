#!/usr/bin/env python3
"""
Latenz-Messung für LLM-Generierung
====================================
Misst die End-to-End-Latenz (Client → Backend → OpenRouter/Gemini → Backend → Client)
für mehrere Spiele und Event-Typen.

Voraussetzungen:
  - Backend läuft (lokal oder auf Render)
  - Spiele im FullTime-Status mit Events vorhanden

Nutzung:
  python3 measure_llm_latency.py
  python3 measure_llm_latency.py --base-url http://localhost:8000  # lokales Backend
  python3 measure_llm_latency.py --matches 18 23 25 26 27          # spezifische Spiele
  python3 measure_llm_latency.py --no-delete                       # vorhandene Einträge nicht löschen
"""

import urllib.request
import json
import time
import statistics
import argparse

# ─── Standardkonfiguration ────────────────────────────────────────────────────
DEFAULT_BASE_URL = "https://liveticker-backend.onrender.com/api/v1"
DEFAULT_INSTANCE = "ef_whitelabel"
DEFAULT_LANGUAGE = "de"
DEFAULT_MATCH_IDS = [18, 19, 22, 23, 24, 25, 26, 27]
DEFAULT_STYLES = ["neutral", "euphorisch", "kritisch"]
EVENTS_PER_MATCH = 2   # Wie viele Events pro Spiel gemessen werden
DELAY_BETWEEN_CALLS = 2  # Sekunden Pause zwischen LLM-Calls (verhindert Rate-Limiting)

# ─── HTTP-Hilfsfunktionen ──────────────────────────────────────────────────────

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

# ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

def get_fulltime_matches(base_url, match_ids):
    """Filtert Spiele heraus, die FullTime sind und Events haben."""
    valid = []
    for mid in match_ids:
        try:
            match = http_get(f"{base_url}/matches/{mid}")
            if match.get("matchState") not in ("FullTime", "HalfTime"):
                print(f"  Überspringe Match {mid}: Status = {match.get('matchState')}")
                continue
            events = http_get(f"{base_url}/matches/{mid}/events").get("items", [])
            if not events:
                print(f"  Überspringe Match {mid}: keine Events")
                continue
            home = match.get("homeTeam", {}).get("name", "?")
            away = match.get("awayTeam", {}).get("name", "?")
            valid.append({"id": mid, "home": home, "away": away, "events": events})
            print(f"  Match {mid}: {home} vs {away} — {len(events)} Events")
        except Exception as e:
            print(f"  Match {mid}: Fehler beim Laden — {e}")
    return valid


def delete_existing_draft(base_url, match_id, event_id):
    """Löscht einen vorhandenen Ticker-Eintrag für ein Event."""
    try:
        ticker = http_get(f"{base_url}/ticker/match/{match_id}")
        for entry in ticker:
            if entry.get("event_id") == event_id:
                http_delete(f"{base_url}/ticker/{entry['id']}")
                return True
    except Exception:
        pass
    return False


def generate_and_measure(base_url, event_id, match_id, style, instance, language, delete=True):
    """Generiert einen Ticker-Eintrag und misst die Latenz."""
    if delete:
        delete_existing_draft(base_url, match_id, event_id)

    payload = {"style": style, "instance": instance, "language": language}
    start = time.time()
    try:
        result = http_post(f"{base_url}/ticker/generate/{event_id}", payload)
        latency_ms = round((time.time() - start) * 1000)
        return {
            "event_id": event_id,
            "style": style,
            "latency_ms": latency_ms,
            "model": result.get("llm_model", ""),
            "text": result.get("text", ""),
            "status": "ok"
        }
    except Exception as e:
        latency_ms = round((time.time() - start) * 1000)
        return {
            "event_id": event_id,
            "style": style,
            "latency_ms": latency_ms,
            "model": "error",
            "text": "",
            "status": f"error: {e}"
        }

# ─── Hauptlogik ────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="LLM-Latenz-Messung für Liveticker-Backend")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="Backend-URL")
    parser.add_argument("--matches", nargs="+", type=int, default=DEFAULT_MATCH_IDS)
    parser.add_argument("--instance", default=DEFAULT_INSTANCE)
    parser.add_argument("--language", default=DEFAULT_LANGUAGE)
    parser.add_argument("--delay", type=float, default=DELAY_BETWEEN_CALLS,
                        help="Pause zwischen Calls in Sekunden (verhindert Rate-Limiting)")
    parser.add_argument("--no-delete", action="store_true",
                        help="Bestehende Einträge nicht löschen (schneller, aber misst ggf. Cache)")
    parser.add_argument("--output", default="latency_results.json",
                        help="JSON-Ausgabedatei")
    args = parser.parse_args()

    print(f"Backend: {args.base_url}")
    print(f"Instanz: {args.instance}, Sprache: {args.language}")
    print(f"Pause zwischen Calls: {args.delay}s")
    print()

    # Spiele laden
    print("Lade FullTime-Spiele...")
    matches = get_fulltime_matches(args.base_url, args.matches)
    if not matches:
        print("Keine gültigen Spiele gefunden. Abbruch.")
        return

    print(f"\n{len(matches)} Spiele geladen. Starte Messung...\n")

    all_results = []
    styles_cycle = DEFAULT_STYLES
    style_idx = 0

    for match in matches:
        mid = match["id"]
        print(f"Spiel {mid}: {match['home']} vs {match['away']}")

        events = match["events"]
        # Wähle je einen Event pro Typ (goal > yellow_card > substitution)
        by_type = {}
        for e in events:
            t = e["liveTickerEventType"]
            if t not in by_type:
                by_type[t] = e

        preferred = ["goal", "yellow_card", "substitution", "red_card"]
        selected = [by_type[t] for t in preferred if t in by_type][:EVENTS_PER_MATCH]

        for event in selected:
            eid = event["id"]
            etype = event["liveTickerEventType"]
            emin = event["time"]
            style = styles_cycle[style_idx % len(styles_cycle)]
            style_idx += 1

            print(f"  [{etype:12}] min={emin:3} style={style:10}  ", end="", flush=True)

            result = generate_and_measure(
                args.base_url, eid, mid, style, args.instance, args.language,
                delete=not args.no_delete
            )

            result.update({"match_id": mid, "event_type": etype, "minute": emin,
                            "match": f"{match['home']} vs {match['away']}"})
            all_results.append(result)

            if result["status"] == "ok":
                model_short = result["model"].split("/")[-1] if "/" in result["model"] else result["model"]
                print(f"{result['latency_ms']:5}ms [{model_short}]  {result['text'][:60]}")
            else:
                print(f"FEHLER: {result['status']}")

            if args.delay > 0:
                time.sleep(args.delay)

    # Statistik
    ok = [r for r in all_results if r["status"] == "ok"]
    real = [r for r in ok if r["model"] not in ("mock", "error", "")]

    print("\n" + "=" * 60)
    print("ERGEBNISSE")
    print("=" * 60)
    print(f"Gesamt: {len(all_results)} Messungen, davon {len(ok)} erfolgreich, {len(real)} echte LLM-Calls")

    if real:
        lats = [r["latency_ms"] for r in real]
        lats_sorted = sorted(lats)
        n = len(lats)
        print(f"\nLatenz (nur echte LLM-Calls, n={n}):")
        print(f"  Mittelwert: {statistics.mean(lats):.0f} ms")
        print(f"  Median:     {statistics.median(lats):.0f} ms")
        if n > 1:
            print(f"  Std.abw.:   {statistics.stdev(lats):.0f} ms")
        p95_idx = min(int(0.95 * n), n - 1)
        print(f"  P95:        {lats_sorted[p95_idx]} ms")
        print(f"  Min / Max:  {min(lats)} ms / {max(lats)} ms")

        print(f"\nNach Event-Typ:")
        for etype in ["goal", "yellow_card", "substitution"]:
            group = [r["latency_ms"] for r in real if r["event_type"] == etype]
            if group:
                print(f"  {etype:15}: n={len(group):2}  Ø={statistics.mean(group):.0f}ms  Med={statistics.median(group):.0f}ms")

        mock_count = len([r for r in ok if r["model"] == "mock"])
        if mock_count:
            print(f"\nHinweis: {mock_count} Antworten vom Mock-Provider (Rate-Limit erreicht).")
            print("  → Delay erhöhen (--delay 5) oder API-Key-Quota prüfen.")

    # JSON-Ausgabe
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)
    print(f"\nRohdaten gespeichert: {args.output}")


if __name__ == "__main__":
    main()
