# Abstract

---

## Zusammenfassung (Deutsch)

Die manuelle Erstellung von Liveticker-Einträgen im Profifußball ist ein kognitiv anspruchsvoller, zeitkritischer Prozess: Redakteure müssen Spielereignisse in Echtzeit beobachten, einordnen und in kurze, stilistisch kohärente Texte überführen — typischerweise innerhalb von 30 bis 120 Sekunden pro Eintrag. Diese Arbeit untersucht, inwiefern ein hybrides KI-gestütztes Redaktionssystem die Time-to-Publish (TTP) bei der Liveticker-Erstellung im Profifußball reduziert, ohne die journalistische Qualität hinsichtlich Korrektheit, Tonalität und Verständlichkeit zu beeinträchtigen.

Das entwickelte System kombiniert eine FastAPI/PostgreSQL-Backend-Architektur mit einer mehrsprachigen LLM-Pipeline (Gemini 2.0 Flash Lite via OpenRouter) und einem React/TypeScript-Frontend. Drei Betriebsmodi — `auto` (vollautomatisch), `coop` (Human-in-the-Loop) und `manual` (klassisch) — ermöglichen einen graduellen Übergang zwischen autonomer KI-Generierung und redaktioneller Kontrolle. n8n-Workflows übernehmen die automatisierte Datenversorgung aus externen Sportdaten-APIs. Das System wurde als generische und als White-Label-Instanz (Eintracht Frankfurt) realisiert.

Die Evaluation umfasst 391 automatisierte Tests (187 Frontend, 198 Backend, 6 End-to-End), eine TypeScript-Typenabdeckung von 95,84 % sowie eine qualitative Bewertung von 16 KI-generierten Ticker-Einträgen aus 9 Bundesliga-Spielen. Die KI-generierten Texte erzielen einen Gesamtdurchschnitt von 4,3 / 5 Punkten (Korrektheit 4,6, Tonalität 4,1, Verständlichkeit 4,3). Die geschätzte TTP im `auto`-Modus beträgt 3,4–5,9 Sekunden gegenüber 30–120 Sekunden im manuellen Modus — ein geschätzter Reduktionsfaktor von 5× bis 35×. Alle 23 definierten funktionalen, nicht-funktionalen und architektonischen Anforderungen werden erfüllt.

Die Arbeit zeigt, dass eine produktionstaugliche KI-Assistenz bei der Liveticker-Erstellung mit einem kleinen Kompakt-Modell und Few-Shot-Prompting realisierbar ist. Der `coop`-Modus erweist sich als optimaler Kompromiss zwischen Publikationsgeschwindigkeit und journalistischer Qualitätssicherung.

**Schlüsselwörter:** Large Language Models, Liveticker, Natural Language Generation, Human-in-the-Loop, Few-Shot Prompting, Sportjournalismus, FastAPI, React, TypeScript
