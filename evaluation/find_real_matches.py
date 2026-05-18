#!/usr/bin/env python3
"""
Echtdaten-Check: Verfügbare FullTime-Spiele anzeigen
=====================================================
Zeigt welche Spiele mit echten Events im Backend verfügbar sind,
inkl. Event-Typen, Anzahl vorhandener Ticker-Einträge und Provider-Info.

Nutzung:
  python3 find_real_matches.py
  python3 find_real_matches.py --base-url http://localhost:8000
  python3 find_real_matches.py --range 1 50     # Match-IDs 1–50 prüfen
"""

import urllib.request
import json
import argparse

DEFAULT_BASE_URL = "https://liveticker-backend.onrender.com/api/v1"


def http_get(url, timeout=15):
    try:
        with urllib.request.urlopen(url, timeout=timeout) as r:
            return json.loads(r.read())
    except Exception:
        return None


def main():
    parser = argparse.ArgumentParser(description="FullTime-Spiele im Backend anzeigen")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--range", nargs=2, type=int, default=[1, 35],
                        metavar=("VON", "BIS"), help="Match-ID-Bereich prüfen")
    args = parser.parse_args()

    start_id, end_id = args.range
    print(f"Prüfe Match-IDs {start_id}–{end_id} auf {args.base_url}...\n")

    fulltime_matches = []

    for mid in range(start_id, end_id + 1):
        match = http_get(f"{args.base_url}/matches/{mid}")
        if not match:
            continue
        state = match.get("matchState")
        if state not in ("FullTime", "HalfTime", "Live"):
            continue

        home = match.get("homeTeam", {}).get("name", "?")
        away = match.get("awayTeam", {}).get("name", "?")
        date = (match.get("startsAt") or "")[:10]

        # Events laden
        events_data = http_get(f"{args.base_url}/matches/{mid}/events")
        events = events_data.get("items", []) if events_data else []
        type_counts = {}
        for e in events:
            t = e["liveTickerEventType"]
            type_counts[t] = type_counts.get(t, 0) + 1

        # Vorhandene Ticker-Einträge
        ticker = http_get(f"{args.base_url}/ticker/match/{mid}") or []
        ai_entries = [e for e in ticker if e.get("source") == "ai"]
        providers = list({e.get("llm_model", "?") for e in ai_entries if e.get("llm_model")})

        fulltime_matches.append({
            "id": mid, "home": home, "away": away, "date": date,
            "state": state, "events": len(events), "type_counts": type_counts,
            "ticker_total": len(ticker), "ticker_ai": len(ai_entries),
            "providers": providers
        })

        types_str = "  ".join(f"{t}:{n}" for t, n in type_counts.items())
        print(f"M{mid:3}  [{state:8}]  {home:30} vs {away:30}  ({date})")
        print(f"       Events: {len(events):2} [{types_str}]")
        print(f"       Ticker: {len(ticker):2} gesamt, {len(ai_entries):2} KI  |  Provider: {', '.join(providers) or '—'}")
        print()

    print(f"{'='*70}")
    print(f"Gefunden: {len(fulltime_matches)} FullTime/Live-Spiele")
    total_events = sum(m["events"] for m in fulltime_matches)
    print(f"Events gesamt: {total_events}")
    print(f"\nFür Latenz-Messung empfohlen:")
    good = [m for m in fulltime_matches if m["events"] >= 5]
    print("  python3 measure_llm_latency.py --matches " + " ".join(str(m["id"]) for m in good[:10]))


if __name__ == "__main__":
    main()
