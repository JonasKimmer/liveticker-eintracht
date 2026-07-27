#!/usr/bin/env python3
"""
Modellvergleich: LLM-Latenz direkt via OpenRouter
===================================================
Misst die Generierungslatenz für drei Modelle mit identischem Prompt.
Kein Backend nötig — ruft OpenRouter direkt auf.

Nutzung:
  cd evaluation
  pip install openai python-dotenv
  python3 measure_model_comparison.py
  python3 measure_model_comparison.py --n 20 --delay 2
"""

import argparse
import json
import os
import statistics
import sys
import time

# ─── Konfiguration ────────────────────────────────────────────────────────────

MODELS = [
    "google/gemini-2.5-flash",
    "openai/gpt-4.1-mini",
    "anthropic/claude-haiku-4-5",  # Claude Haiku 4.5
]

# Realistischer Liveticker-Prompt (Tor-Event, neutraler Stil, identisch für alle Modelle)
SYSTEM_PROMPT = (
    "Du bist ein professioneller Sportjournalist für einen Fußball-Liveticker. "
    "Schreibe kurze, prägnante Ticker-Einträge auf Deutsch. "
    "Stil: neutral — sachlich, faktenbasiert, keine Ausrufezeichen, keine Emotionen. "
    "Maximal 2 Sätze, maximal 30 Wörter."
)

USER_PROMPT = (
    "Schreibe einen Ticker-Eintrag für folgendes Ereignis:\n"
    "Event: Tor\n"
    "Minute: 67\n"
    "Spieler: Omar Marmoush\n"
    "Vorlage: Hugo Larsson\n"
    "Team: Eintracht Frankfurt\n"
    "Spielstand: 1:0\n"
    "Spiel: Eintracht Frankfurt vs. Borussia Dortmund"
)

# ─── Messung ──────────────────────────────────────────────────────────────────

def load_api_key() -> str:
    key = os.environ.get("OPENROUTER_API_KEY")
    if key:
        return key
    env_path = os.path.join(os.path.dirname(__file__), "..", "backend", ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line.startswith("OPENROUTER_API_KEY="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    print("Kein OPENROUTER_API_KEY gefunden. Setze die Umgebungsvariable oder lege backend/.env an.")
    sys.exit(1)


def measure_once(client, model: str) -> dict:
    start = time.perf_counter()
    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": USER_PROMPT},
            ],
            max_tokens=120,
            temperature=0.5,
        )
        latency_ms = round((time.perf_counter() - start) * 1000)
        text = resp.choices[0].message.content.strip()
        return {"latency_ms": latency_ms, "text": text, "status": "ok"}
    except Exception as e:
        latency_ms = round((time.perf_counter() - start) * 1000)
        return {"latency_ms": latency_ms, "text": "", "status": f"error: {e}"}


def run_model(client, model: str, n: int, delay: float) -> list[dict]:
    results = []
    short = model.split("/")[-1]
    print(f"\nModell: {model}")
    for i in range(n):
        r = measure_once(client, model)
        results.append(r)
        if r["status"] == "ok":
            print(f"  [{i+1:2}/{n}] {r['latency_ms']:5} ms  {r['text'][:70]}")
        else:
            print(f"  [{i+1:2}/{n}] FEHLER: {r['status']}")
        if i < n - 1 and delay > 0:
            time.sleep(delay)
    return results


def print_stats(model: str, results: list[dict]) -> dict:
    ok = [r["latency_ms"] for r in results if r["status"] == "ok"]
    errors = len(results) - len(ok)
    if not ok:
        print(f"  {model}: keine erfolgreichen Messungen")
        return {}
    ok_sorted = sorted(ok)
    n = len(ok)
    p95 = ok_sorted[min(int(0.95 * n), n - 1)]
    stats = {
        "model": model,
        "n": n,
        "errors": errors,
        "mean_ms": round(statistics.mean(ok)),
        "median_ms": round(statistics.median(ok)),
        "stdev_ms": round(statistics.stdev(ok)) if n > 1 else 0,
        "p95_ms": p95,
        "min_ms": min(ok),
        "max_ms": max(ok),
    }
    short = model.split("/")[-1]
    print(f"\n  {short}")
    print(f"    n={n}  Fehler={errors}")
    print(f"    Median:     {stats['median_ms']} ms")
    print(f"    Mittelwert: {stats['mean_ms']} ms")
    print(f"    Std.abw.:   {stats['stdev_ms']} ms")
    print(f"    P95:        {stats['p95_ms']} ms")
    print(f"    Min / Max:  {stats['min_ms']} ms / {stats['max_ms']} ms")
    return stats


def print_table(all_stats: list[dict]) -> None:
    print("\n" + "=" * 65)
    print("VERGLEICHSTABELLE (direkte OpenRouter-Messung)")
    print("=" * 65)
    print(f"{'Modell':<38} {'n':>4}  {'Median':>8}  {'P95':>8}  {'Std':>6}")
    print("-" * 65)
    for s in all_stats:
        short = s["model"].split("/")[-1]
        print(f"{short:<38} {s['n']:>4}  {s['median_ms']:>6} ms  {s['p95_ms']:>6} ms  {s['stdev_ms']:>4} ms")
    print("=" * 65)
    print("Prompt: identisch für alle Modelle (Tor-Event, neutral, de)")


# ─── Hauptlogik ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="LLM-Modellvergleich via OpenRouter")
    parser.add_argument("--n", type=int, default=20, help="Messungen pro Modell (default: 20)")
    parser.add_argument("--delay", type=float, default=2.0, help="Pause zwischen Calls in Sekunden (default: 2)")
    parser.add_argument("--models", nargs="+", default=MODELS, help="Modelle zum Testen")
    parser.add_argument("--output", default="model_comparison_results.json")
    args = parser.parse_args()

    try:
        from openai import OpenAI
    except ImportError:
        print("openai-Paket fehlt: pip install openai")
        sys.exit(1)

    api_key = load_api_key()
    client = OpenAI(api_key=api_key, base_url="https://openrouter.ai/api/v1")

    print(f"Modelle: {', '.join(m.split('/')[-1] for m in args.models)}")
    print(f"Messungen pro Modell: {args.n}")
    print(f"Pause zwischen Calls: {args.delay}s")
    print(f"Geschätzte Dauer: ~{len(args.models) * args.n * (args.delay + 3) / 60:.0f} min")

    all_raw = {}
    all_stats = []

    for model in args.models:
        results = run_model(client, model, args.n, args.delay)
        all_raw[model] = results
        s = print_stats(model, results)
        if s:
            all_stats.append(s)

    if all_stats:
        print_table(all_stats)

    output = {"stats": all_stats, "raw": all_raw}
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"\nRohdaten gespeichert: {args.output}")


if __name__ == "__main__":
    main()
