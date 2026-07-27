#!/usr/bin/env python3
"""
API-Health-Check & Endpoint-Latenz
=====================================
Prüft ob das Backend erreichbar ist, welcher LLM-Provider aktiv ist,
und misst die Antwortzeiten der wichtigsten Endpunkte.

Nutzung:
  python3 check_api_health.py
  python3 check_api_health.py --base-url http://localhost:8000
"""

import urllib.request
import json
import time
import argparse

DEFAULT_BASE_URL = "https://liveticker-backend.onrender.com/api/v1"
TEST_MATCH_ID = 18  # Muss ein FullTime-Spiel mit Events sein


def http_call(url, method="GET", data=None, timeout=30):
    try:
        if data:
            body = json.dumps(data).encode()
            req = urllib.request.Request(
                url, data=body,
                headers={"Content-Type": "application/json"},
                method=method
            )
        else:
            req = urllib.request.Request(url, method=method)
        start = time.time()
        with urllib.request.urlopen(req, timeout=timeout) as r:
            content = r.read()
            latency = round((time.time() - start) * 1000)
            return json.loads(content), latency, None
    except Exception as e:
        latency = round((time.time() - start) * 1000)
        return None, latency, str(e)


def measure_n(url, method="GET", data=None, n=3, timeout=15):
    times = []
    errors = 0
    for _ in range(n):
        _, lat, err = http_call(url, method, data, timeout)
        times.append(lat)
        if err:
            errors += 1
    return {
        "mean": round(sum(times) / len(times)),
        "min": min(times),
        "max": max(times),
        "errors": errors,
        "samples": times
    }


def main():
    parser = argparse.ArgumentParser(description="API-Health-Check")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--match-id", type=int, default=TEST_MATCH_ID)
    parser.add_argument("--n", type=int, default=3, help="Wiederholungen pro Endpunkt")
    args = parser.parse_args()
    base = args.base_url
    mid = args.match_id

    print(f"Backend: {base}")
    print(f"Test-Match-ID: {mid}\n")

    # 1. Erreichbarkeit
    print("=== ERREICHBARKEIT ===")
    data, lat, err = http_call(f"{base}/matches/{mid}")
    if err:
        print(f"FEHLER: Backend nicht erreichbar — {err}")
        return
    state = data.get("matchState", "?")
    home = data.get("homeTeam", {}).get("name", "?")
    away = data.get("awayTeam", {}).get("name", "?")
    print(f"OK ({lat}ms) — Match {mid}: {home} vs {away} [{state}]")

    # 2. LLM-Provider
    print("\n=== AKTIVER LLM-PROVIDER ===")
    ticker, _, _ = http_call(f"{base}/ticker/match/{mid}")
    if ticker:
        providers = list({e.get("llm_model", "") for e in ticker if e.get("llm_model")})
        print(f"Provider in vorhandenen Einträgen: {providers or '—'}")
    print("(Für echten Provider-Check: einen neuen Text generieren und llm_model prüfen)")

    # 3. Endpunkt-Latenzen
    print("\n=== ENDPUNKT-LATENZEN ===")
    endpoints = [
        (f"GET  /ticker/match/{mid}",       f"{base}/ticker/match/{mid}", "GET",   None),
        (f"GET  /matches/{mid}/events",      f"{base}/matches/{mid}/events", "GET", None),
        (f"GET  /matches/{mid}",             f"{base}/matches/{mid}", "GET",        None),
        ("GET  /matches (Liste, 10)",        f"{base}/matches?limit=10", "GET",     None),
        (f"PATCH /ticker/9424/publish",      f"{base}/ticker/9424/publish", "PATCH", {}),
    ]

    print(f"{'Endpunkt':45} {'Ø(ms)':7} {'Min':6} {'Max':6} {'Fehler'}")
    print("-" * 75)
    for label, url, method, data in endpoints:
        stats = measure_n(url, method, data, args.n)
        err_str = f"{stats['errors']}/{args.n}" if stats["errors"] else "0"
        print(f"{label:45} {stats['mean']:5}ms  {stats['min']:5}  {stats['max']:5}  {err_str}")

    # 4. Schnelle LLM-Generierung (1 Call)
    print("\n=== LLM-GENERIERUNG (1 Test-Call) ===")
    events_data, _, _ = http_call(f"{base}/matches/{mid}/events")
    events = events_data.get("items", []) if events_data else []
    goals = [e for e in events if e["liveTickerEventType"] == "goal"]
    if goals:
        eid = goals[0]["id"]
        print(f"Generiere Event {eid} (Tor, min={goals[0]['time']})...")
        result, lat, err = http_call(
            f"{base}/ticker/generate/{eid}",
            "POST",
            {"style": "neutral", "instance": "ef_whitelabel", "language": "de"},
            timeout=60
        )
        if result:
            model = result.get("llm_model", "?")
            text = result.get("text", "")[:80]
            print(f"OK ({lat}ms) — Provider: {model}")
            print(f"Text: {text}")
            if model == "mock":
                print("WARNUNG: Mock-Provider aktiv! API-Key-Quota erschöpft oder Key fehlt.")
        else:
            print(f"FEHLER: {err}")
    else:
        print("Keine Tor-Events in diesem Spiel gefunden.")

    print("\nHealth-Check abgeschlossen.")


if __name__ == "__main__":
    main()
