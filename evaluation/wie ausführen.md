Alle 4 Skripte sind unter evaluation/ gespeichert und brauchen kein pip install.

Zur "Mock vs. Echte Daten"-Frage:

Die Spieldaten sind immer echt — echte Bundesliga-Spiele, echte Spielernamen, echte Events aus API-Football. Das Problem war nur der LLM-Fallback:

OpenRouter → Gemini → OpenAI → Anthropic → Mock (Template-Text)
Mock wird aktiv wenn der OpenRouter-Key sein Rate-Limit erreicht. Bei meinen schnellen Messungen ist das 2–3 Mal passiert (Matches 20, 21, 29).

Einfache Lösung: --delay 5 beim Aufrufen der Skripte → 5 Sekunden Pause zwischen Calls → kein Rate-Limit mehr.

Workflow für zukünftige Messungen:

cd evaluation/

# 1. Backend prüfen (zeigt ob Mock aktiv ist)

python3 check_api_health.py

# 2. Latenz messen (mit Pause gegen Rate-Limiting)

python3 measure_llm_latency.py --delay 5

# 3. CSV für manuelle Bewertung generieren

python3 generate_qualitative_samples.py --n 30 --delay 5

# → qualitative_samples.csv in Excel öffnen und Spalten ausfüllen

Welches Modell läuft: Ja, es ist Gemini. OpenRouter ist nur ein API-Gateway — das tatsächlich ausführende Modell ist google/gemini-2.0-flash-lite-001 von Google. Du kannst in deiner Arbeit beides nennen: Provider = OpenRouter (via API), Modell = Gemini 2.0 Flash Lite.

Reicht es so aus?

Für eine Bachelorarbeit: Ja, es reicht. Kurze Begründung:

Was wir haben Bewertung
N=16 qualitative Texte, 9 Spiele Ausreichend für explorativ-deskriptive Analyse — typisch für Designstudie
N=25 Latenz-Messungen, Median + P95 Solide für eine Tendenzaussage
3 Fehlerklassen mit konkreten Beispielen Gut dokumentiert
Limitation explizit in 6.12.2 dokumentiert Wissenschaftlich korrekt
Die Thesis hat die Limitation bereits sauber eingebaut: "9 Spiele und 16 Events bilden die Datenbasis... Für eine statistisch belastbare Aussage wäre eine größere Stichprobe erforderlich." Das ist genau die richtige Formulierung für eine Design-Science-Arbeit.

Wann sich eine Wiederholung lohnen würde:

Nur wenn du für das Experteninterview oder die finale Abgabe nochmal 30 Texte generieren willst, die du dem Redakteur zeigst. Dann:

cd evaluation/
python3 generate_qualitative_samples.py --n 30 --delay 5
Das erzeugt automatisch eine CSV, die du ausfüllen und als Anhang beifügen kannst. Die 3 Mock-Ausreißer von vorhin passieren mit --delay 5 nicht mehr, weil 5 Sekunden Pause das Rate-Limit nicht triggert.

Der evaluation/-Ordner liegt im Projekt-Root, nicht im backend/. Korrekte Befehle:

cd /Users/jonaskimmer/Desktop/liveticker-eintracht/evaluation
python3 generate_qualitative_samples.py --n 30 --delay 5
Oder von wo du gerade bist (backend/):

cd ../evaluation
python3 generate_qualitative_samples.py --n 30 --delay 5
