# 1. Einleitung

## 1.1 Problemstellung und Zielsetzung

„Ein vernünftiger Live-Ticker ist fast unmöglich zu schreiben. Denn sein Konzept ist die komplette Überforderung. Des Autors. Des Schreibens. Und der Wirklichkeit." Mit diesen Worten beschreibt der Journalist Constantin Seibt das Grundproblem der Liveticker-Berichterstattung — eine Einschätzung, die im modernen digitalen Sportjournalismus bis heute nichts an Aktualität verloren hat (zitiert nach Beils 2023, S. 56). Der Liveticker hat sich zur dominanten Darstellungsform der Echtzeit-Berichterstattung im Profifußball entwickelt und steht dabei exemplarisch für einen Zielkonflikt zwischen **Geschwindigkeit und Qualität**, der mit rein manuellen Mitteln nicht auflösbar ist.

Die vorliegende Arbeit identifiziert drei Problemdimensionen, die den Einsatz neuer technologischer Lösungen notwendig machen:

- Der **operative Zeitdruck** bei der manuellen Texterstellung.
- Die Herausforderungen der **Internationalisierung** durch Mehrsprachigkeit.
- Der **strukturelle Wandel** der Vereine zu eigenständigen Medienproduzenten mit White-Label-Anforderungen.

Diese Dimensionen werden in Kapitel 2 wissenschaftlich fundiert und in konkrete Systemanforderungen überführt.

Das übergeordnete Ziel der vorliegenden Arbeit ist daher die Konzeption und Implementierung eines produktionsfähigen Redaktionssystems, das diesen Konflikt durch den gezielten Einsatz von **Large Language Models** auflöst, während die finale Entscheidungshoheit und publizistische Verantwortung beim Menschen verbleiben. Das System wird dabei in zwei Ausprägungen realisiert: einer generischen Instanz für beliebige Vereine sowie einer vereinsspezifischen White-Label-Instanz am Beispiel **Eintracht Frankfurt**.

Um dieses Ziel zu operationalisieren, definiert und evaluiert die Arbeit drei Betriebsmodi:

1.  **Status quo:** Vollmanuelle Erstellung als Vergleichsbasis.
2.  **Vollautonom:** KI-basierte Texterstellung und Publikation ohne menschliches Korrektiv.
3.  **Hybrid:** Kombination aus KI-generierten Textvorschlägen mit redaktioneller Prüfung und Freigabe.

---

## 1.2 Forschungsfrage

Aus der in Kapitel 1.1 entwickelten Zielsetzung ergibt sich folgende Forschungsfrage, die der vorliegenden Arbeit zugrunde liegt:

> Inwiefern reduziert ein hybrides KI-gestütztes Redaktionssystem die Time-to-Publish bei der Liveticker-Erstellung im Profifußball im Vergleich zur rein manuellen Erstellung, ohne die journalistische Qualität hinsichtlich Korrektheit, Tonalität und Verständlichkeit zu beeinträchtigen?

Die Frage ist bewusst zweiteilig formuliert: Sie erfasst einerseits eine **zeitliche Dimension** — die Reduktion der Publikationslatenz — und andererseits eine **qualitative Dimension**, die sicherstellt, dass Geschwindigkeit nicht auf Kosten journalistischer Standards erzielt wird. Beide Dimensionen sind für die Praxis gleichermaßen relevant, da Schnelligkeit zwar als oberstes Qualitätskriterium gilt (Beils 2023, S. 57), sprachliche und inhaltliche Korrektheit jedoch selbst unter hohem Zeitdruck nicht verhandelbar sind (Bluhm & Schäfer 2023, S. 35). Die Operationalisierung erfolgt entlang dieser beiden Dimensionen, deren Messmethodik in Kapitel 6 beschrieben wird.

---

## 1.3 Methodisches Vorgehen

Die Arbeit folgt einem konstruktiven Forschungsansatz im Sinne des **Design Science Research** (Hevner et al. 2004): Ein softwarebasiertes Artefakt wird als Antwort auf ein identifiziertes Praxisproblem entworfen, implementiert und evaluiert. Der Erkenntnisgewinn entsteht dabei nicht nur aus der Evaluation, sondern auch aus dem Entwurfs- und Implementierungsprozess selbst.

Das methodische Vorgehen gliedert sich in fünf Phasen:

1. **Problemanalyse und Anforderungserhebung** (Kapitel 2): Die drei Problemdimensionen werden literaturgestützt vertieft und in funktionale sowie nicht-funktionale Anforderungen überführt. Die linguistischen Merkmale der Textgattung Liveticker werden als Zielformat für die KI-Generierung herausgearbeitet.

2. **Technologierecherche** (Kapitel 3): Der Stand der Technik in den Bereichen Large Language Models, Prompt Engineering, Natural Language Generation im Sport sowie Echtzeit-Architekturen wird aufgearbeitet und hinsichtlich seiner Eignung für das identifizierte Problem bewertet.

3. **Systemkonzeption** (Kapitel 4): Aus den Anforderungen und der Technologierecherche wird eine dreischichtige Systemarchitektur (Datenbeschaffung, Anwendungslogik, Präsentation) mit Datenmodell, LLM-Pipeline und Prompt-Design abgeleitet.

4. **Implementierung** (Kapitel 5): Das konzipierte System wird als produktionsfähige Webanwendung umgesetzt. Im Unterschied zu einem reinen Proof-of-Concept umfasst die Implementierung eine vollständige API mit über 70 Endpunkten, eine TypeScript-basierte Benutzeroberfläche, ein automatisiertes ETL-System sowie ein Deployment auf einer Cloud-Plattform (Render). Das System ist für den realen Einsatz im Spielbetrieb ausgelegt.

5. **Evaluation** (Kapitel 6): Die Evaluation umfasst drei Ebenen: (a) technische Qualitätssicherung durch automatisierte Tests und statische Analyse, (b) Evaluation der KI-Textgenerierung anhand quantitativer Metriken und qualitativer Textanalyse sowie (c) einen systematischen Anforderungsabgleich.

Die Evaluationsmethodik operationalisiert die Forschungsfrage entlang zweier Dimensionen: Die **zeitliche Dimension** wird über die Time-to-Publish-Metrik (TTP) gemessen, die den Zeitraum zwischen Spielereignis und Veröffentlichung des Ticker-Eintrags erfasst. Die **qualitative Dimension** wird über eine manuelle Bewertung auf den Skalen Korrektheit, Tonalität und Verständlichkeit operationalisiert, ergänzt durch ein **strukturiertes Experteninterview** mit einem professionellen Sportredakteur zur Validierung der Systemeignung im redaktionellen Arbeitskontext. Für den statistischen Vergleich stehen nicht-parametrische Verfahren (Cliff's Delta, Bootstrap-Konfidenzintervalle) bereit.

### 1.3.1 Abgrenzung

Das System geht bewusst über den Umfang eines typischen akademischen Projekts hinaus und zielt auf Produktionsfähigkeit: 391 automatisierte Tests, ein Cloud-Deployment und die Integration realer Datenquellen dokumentieren diesen Anspruch. Diese Praxisorientierung ist durch den beruflichen Kontext des Autors motiviert: Als Mitarbeiter der **Stackwork GmbH** im IT-Bereich von Eintracht Frankfurt entstand das System in direkter Kooperation mit den fachlichen Anforderungen einer professionellen Redaktion.

Das Ergebnis ist ein **vollständiges, eigenständig lauffähiges Redaktionssystem**, bestehend aus einem FastAPI-Backend mit PostgreSQL-Datenbank, einem React/TypeScript-Frontend und einer automatisierten Daten-Pipeline über n8n-Workflows. Das System wird als Cloud-Service auf Render betrieben und verarbeitet alle Spiele der konfigurierten Wettbewerbe — von der automatischen Ereigniserfassung über die KI-gestützte Textgenerierung mit Few-Shot-Stilreferenzen bis zur Publikation im browserbasierten Liveticker. Über spezialisierte n8n-Export-Workflows werden publizierte Inhalte zusätzlich an die bereits existierende **Stackwork Demo App** übertragen — eine produktionsnahe Referenzimplementierung der offiziellen Eintracht Frankfurt Mainaquila-Anwendung mit den Bereichen "Spiele" und "Team/Kader". Damit umfasst das Projekt zwei voneinander unabhängige Zielsysteme — das eigene Redaktionssystem und die Demo App —, die über nahezu identische n8n-Workflows bedient werden. Diese Architektur demonstriert, dass dieselbe automatisierte Content-Pipeline mit minimalem Anpassungsaufwand mehrere Ausspielkanäle parallel befüllen kann.

Gleichwohl bestehen Einschränkungen, die in Kapitel 7 kritisch reflektiert werden:

- Das System verzichtet im aktuellen Stand auf eine Authentifizierungsschicht.
- Die qualitative Evaluation erfolgt durch den Entwickler selbst; ergänzt wird sie durch ein **Experteninterview mit einem professionellen Sportredakteur** von Eintracht Frankfurt.
- Der Fokus liegt auf Fußball; eine Generalisierung auf andere Sportarten ist architektonisch vorbereitet, aber nicht evaluiert.
- Social-Media-Integrationen (YouTube, Twitter) sind konzeptionell vorgesehen, aber im aktuellen Stand nicht implementiert.

---

## 1.4 Aufbau der Arbeit

Die vorliegende Arbeit gliedert sich in acht Kapitel:

- **Kapitel 1:** Einleitung, Problemstellung und Forschungsfrage.
- **Kapitel 2:** Vertiefung der Motivation (redaktioneller Aufwand, Mehrsprachigkeit, White-Label-Bedarf), Ableitung der Systemanforderungen am Beispiel Eintracht Frankfurt und formale Anforderungsdefinition.
- **Kapitel 3:** Stand der Technik (LLMs, Prompt Engineering, Natural Language Generation im Sport, Echtzeit-Technologien und ETL-Prozesse).
- **Kapitel 4:** Systemkonzept (Architektur, Datenmodell, Pipeline und Prompt-Design).
- **Kapitel 5:** Dokumentation der Implementierung.
- **Kapitel 6:** Evaluation — technische Qualitätssicherung (Tests, Coverage, Typsicherheit), Evaluation der KI-Textgenerierung und Anforderungsabgleich.
- **Kapitel 7:** Diskussion — Einordnung in den Stand der Technik, kritische Reflexion und Implikationen für den Sportjournalismus.
- **Kapitel 8:** Fazit — Zusammenfassung der Erkenntnisse, Beantwortung der Forschungsfrage und Ausblick.
