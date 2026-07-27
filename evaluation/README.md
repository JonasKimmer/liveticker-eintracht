# Evaluations-Skripte

Messungen und Stichproben-Generierung für die Bachelorarbeit-Evaluation (Kapitel 6).

Alle Skripte verwenden nur die Python-Standardbibliothek — **kein `pip install`** nötig.

---

## Voraussetzungen

**Backend muss laufen** — entweder lokal oder Render-Deployment:

```bash
# Render-Deployment (Standard):
https://liveticker-backend.onrender.com

# Lokales Backend:
cd ../backend && uvicorn app.main:app --reload
```

---

## Skripte im Überblick

| Skript | Zweck |
|--------|-------|
| `check_api_health.py` | Backend-Erreichbarkeit, aktiver LLM-Provider, Endpunkt-Latenzen |
| `find_real_matches.py` | Zeigt alle FullTime-Spiele mit Events und vorhandenen Ticker-Einträgen |
| `measure_llm_latency.py` | Misst End-to-End-LLM-Latenz (N Messungen, Statistik) |
| `generate_qualitative_samples.py` | Generiert Texte + CSV für manuelle Qualitätsbewertung |

---

## Schnellstart

### 1. Backend prüfen
```bash
python3 check_api_health.py
```
Wichtig: Wenn der Output `WARNUNG: Mock-Provider aktiv!` zeigt, ist der OpenRouter-API-Key-Quota erschöpft. Dann `--delay 10` bei den anderen Skripten verwenden oder kurz warten.

### 2. Verfügbare Spiele anzeigen
```bash
python3 find_real_matches.py
```
Gibt dir die Match-IDs für die anderen Skripte.

### 3. Latenz messen
```bash
# Standard (alle 8 Bundesliga-Spiele, 2s Pause):
python3 measure_llm_latency.py

# Langsamer (verhindert Rate-Limiting):
python3 measure_llm_latency.py --delay 5

# Nur bestimmte Spiele:
python3 measure_llm_latency.py --matches 18 23 25

# Lokales Backend:
python3 measure_llm_latency.py --base-url http://localhost:8000

# Ausgabedatei benennen:
python3 measure_llm_latency.py --output meine_messung.json
```

### 4. Qualitative Stichproben generieren
```bash
# 16 Texte generieren (Standard):
python3 generate_qualitative_samples.py

# 30 Texte für größere Stichprobe:
python3 generate_qualitative_samples.py --n 30

# Mit 5s Pause (gegen Rate-Limiting):
python3 generate_qualitative_samples.py --n 30 --delay 5
```
Öffne danach `qualitative_samples.csv` in Excel und fülle die Bewertungsspalten aus:
- `bewertung_korrektheit` (1–5)
- `bewertung_tonalitaet` (1–5)
- `bewertung_verstaendlichkeit` (1–5)
- `anmerkung` (optionaler Freitext)

---

## Warum kommen manchmal "Mock"-Texte?

Das Backend hat eine Fallback-Kette:
```
OpenRouter → Gemini → OpenAI → Anthropic → Mock (Template)
```

Mock wird aktiv wenn **alle konfigurierten API-Keys** ihr Rate-Limit erreicht haben.
Erkennbar an: `"model": "mock"` im JSON-Output.

**Lösung:**
- Mehr Pause zwischen den Calls: `--delay 5` oder `--delay 10`
- Oder kurz warten (OpenRouter Rate-Limit läuft nach Minuten ab)
- Oder einen zweiten Provider-Key in die `.env` eintragen (z.B. direkter Gemini-Key)

---

## Was ist "echte" Daten?

- **Spieldaten** (Teams, Spieler, Events) sind **immer echt** — aus API-Football über n8n gezogen
- **Ticker-Texte** sind entweder:
  - `google/gemini-2.0-flash-lite-001` → echte LLM-Generierung ✓
  - `mock` → Template-Text (Fallback, kein echtes LLM) ✗

Für die Evaluation nur Einträge mit echtem LLM-Modell verwenden.

---

## Für Live-Spiele (echter Spielbetrieb)

Um Texte während eines echten Bundesliga-Spiels zu messen:
1. n8n-Webhook muss aktiv sein (zieht Events automatisch aus API-Football)
2. Das Spiel muss in der DB sein und im richtigen Ticker-Modus (`auto` oder `coop`)
3. `measure_llm_latency.py` danach auf das entsprechende Match ausführen

Die TTP-Metrik (implementiert in `backend/app/utils/ttp_calculator.py`) misst dann
den echten Abstand zwischen Event-Zeitstempel und Publikationszeitstempel.
