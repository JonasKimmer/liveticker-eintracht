# Abstract

---

## Zusammenfassung (Deutsch)

Die manuelle Erstellung von Liveticker-Einträgen im Profifußball ist ein kognitiv anspruchsvoller, zeitkritischer Prozess: Redakteure müssen Spielereignisse in Echtzeit beobachten, einordnen und in kurze, stilistisch kohärente Texte überführen — typischerweise innerhalb von 30 bis 120 Sekunden pro Eintrag. Diese Arbeit untersucht, inwiefern ein hybrides KI-gestütztes Redaktionssystem die Time-to-Publish (TTP) bei der Liveticker-Erstellung im Profifußball reduziert, ohne die journalistische Qualität hinsichtlich Korrektheit, Tonalität und Verständlichkeit zu beeinträchtigen.

Das entwickelte System kombiniert eine FastAPI/PostgreSQL-Backend-Architektur mit einer mehrsprachigen LLM-Pipeline (Gemini 2.0 Flash Lite via OpenRouter) und einem React/TypeScript-Frontend. Drei Betriebsmodi — `auto` (vollautomatisch), `coop` (Human-in-the-Loop) und `manual` (klassisch) — ermöglichen einen graduellen Übergang zwischen autonomer KI-Generierung und redaktioneller Kontrolle. n8n-Workflows übernehmen die automatisierte Datenversorgung aus externen Sportdaten-APIs. Das System wurde als generische und als White-Label-Instanz (Eintracht Frankfurt) realisiert.

Die Evaluation umfasst 391 automatisierte Tests (198 Backend, 187 Frontend, 6 End-to-End), eine TypeScript-Typenabdeckung von 95,84 % sowie eine qualitative Bewertung von 16 KI-generierten Ticker-Einträgen aus 9 Bundesliga-Spielen. Die KI-generierten Texte erzielen einen Gesamtdurchschnitt von 4,3 / 5 Punkten (Korrektheit 4,6, Tonalität 4,1, Verständlichkeit 4,3). Die geschätzte TTP im `auto`-Modus beträgt 3,4–5,9 Sekunden gegenüber 30–120 Sekunden im manuellen Modus — ein geschätzter Reduktionsfaktor von 5× bis 35×. Alle 23 definierten funktionalen, nicht-funktionalen und architektonischen Anforderungen werden erfüllt.

Die Arbeit zeigt, dass eine produktionstaugliche KI-Assistenz bei der Liveticker-Erstellung mit einem kleinen Kompakt-Modell und Few-Shot-Prompting realisierbar ist. Der `coop`-Modus erweist sich als optimaler Kompromiss zwischen Publikationsgeschwindigkeit und journalistischer Qualitätssicherung.

**Schlüsselwörter:** Large Language Models, Liveticker, Natural Language Generation, Human-in-the-Loop, Few-Shot Prompting, Sportjournalismus, FastAPI, React, TypeScript

---

## Abstract (English)

Manual creation of live ticker entries in professional football is a cognitively demanding, time-critical process: editors must observe match events in real time, contextualise them, and convert them into short, stylistically coherent texts — typically within 30 to 120 seconds per entry. This thesis investigates to what extent a hybrid AI-assisted editorial system reduces the Time-to-Publish (TTP) for live ticker production in professional football without compromising journalistic quality in terms of correctness, tone, and comprehensibility.

The developed system combines a FastAPI/PostgreSQL backend architecture with a multilingual LLM pipeline (Gemini 2.0 Flash Lite via OpenRouter) and a React/TypeScript frontend. Three operational modes — `auto` (fully automatic), `coop` (human-in-the-loop), and `manual` (traditional) — enable a gradual transition between autonomous AI generation and editorial control. n8n workflows handle automated data supply from external sports data APIs. The system is realised both as a generic instance and as a white-label instance for Eintracht Frankfurt.

The evaluation comprises 391 automated tests (198 backend, 187 frontend, 6 end-to-end), a TypeScript type coverage of 95.84 %, and a qualitative assessment of 16 AI-generated ticker entries from 9 Bundesliga matches. The AI-generated texts achieve an overall average score of 4.3 / 5 (correctness 4.6, tone 4.1, comprehensibility 4.3). The estimated TTP in `auto` mode is 3.4–5.9 seconds compared to 30–120 seconds in manual mode — an estimated reduction factor of 5× to 35×. All 23 defined functional, non-functional, and architectural requirements are fulfilled.

The thesis demonstrates that production-ready AI assistance for live ticker creation is achievable using a compact language model with few-shot prompting. The `coop` mode proves to be the optimal compromise between publication speed and journalistic quality assurance.

**Keywords:** Large Language Models, Live Ticker, Natural Language Generation, Human-in-the-Loop, Few-Shot Prompting, Sports Journalism, FastAPI, React, TypeScript
