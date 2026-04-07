# Einleitung

## Problemstellung und Zielsetzung

„Ein vernünftiger Live-Ticker ist fast unmöglich zu schreiben. Denn sein Konzept ist die komplette Überforderung. Des Autors. Des Schreibens. Und der Wirklichkeit." Mit diesen Worten beschreibt der Journalist Constantin Seibt das Grundproblem der Liveticker-Berichterstattung — eine Einschätzung, die im modernen digitalen Sportjournalismus bis heute nichts an Aktualität verloren hat (zitiert nach Beils 2023, S. 56). Der Liveticker hat sich zur dominanten Darstellungsform der Echtzeit-Berichterstattung im Profifußball entwickelt und steht dabei exemplarisch für einen Zielkonflikt zwischen **Geschwindigkeit und Qualität**, der mit rein manuellen Mitteln nicht auflösbar ist.

Die vorliegende Arbeit identifiziert drei Problemdimensionen, die den Einsatz neuer technologischer Lösungen notwendig machen:

- Der **operative Zeitdruck** bei der manuellen Texterstellung: Redakteure müssen Spielereignisse in Echtzeit beobachten, einordnen und in stilistisch kohärente Kurztexte überführen — typischerweise innerhalb von 30 bis 120 Sekunden pro Eintrag.
- Die Herausforderungen der **Internationalisierung** durch Mehrsprachigkeit: Profifußballvereine bedienen zunehmend internationale Fanbases; deutschsprachige Redaktionen stehen vor der Anforderung, Inhalte parallel auf Englisch oder weiteren Sprachen bereitzustellen, ohne ausreichend mehrsprachiges Redaktionspersonal vorzuhalten.
- Der **strukturelle Wandel** der Vereine zu eigenständigen Medienproduzenten mit White-Label-Anforderungen: Vereine betreiben eigene digitale Kanäle und Medienmarken, die Redaktionswerkzeuge mit konfigurierbarem vereinsspezifischem Ton und CI-konformer Gestaltung erfordern.

Diese Dimensionen werden in Kapitel 2 wissenschaftlich fundiert und in konkrete Systemanforderungen überführt.

Das übergeordnete Ziel der vorliegenden Arbeit ist daher die Konzeption und Implementierung eines produktionsfähigen Redaktionssystems, das diesen Konflikt durch den gezielten Einsatz von **Large Language Models** auflöst, während die finale Entscheidungshoheit und publizistische Verantwortung beim Menschen verbleiben. Das System wird dabei in zwei Ausprägungen realisiert: einer generischen Instanz für beliebige Vereine sowie einer vereinsspezifischen White-Label-Instanz am Beispiel **Eintracht Frankfurt**.

Um dieses Ziel zu operationalisieren, definiert und evaluiert die Arbeit drei Betriebsmodi:

1.  **Status quo (`manual`):** Vollmanuelle Erstellung als Vergleichsbasis.
2.  **Vollautonom (`auto`):** KI-basierte Texterstellung und Publikation ohne menschliches Korrektiv.
3.  **Hybrid (`coop`):** Kombination aus KI-generierten Textvorschlägen mit redaktioneller Prüfung und Freigabe.

---

## Forschungsfrage

Aus der in Kapitel 1.1 entwickelten Zielsetzung ergibt sich folgende Forschungsfrage, die der vorliegenden Arbeit zugrunde liegt:

> Inwiefern reduziert ein hybrides KI-gestütztes Redaktionssystem die Time-to-Publish bei der Liveticker-Erstellung im Profifußball im Vergleich zur rein manuellen Erstellung, ohne die journalistische Qualität hinsichtlich Korrektheit, Tonalität und Verständlichkeit zu beeinträchtigen?

Die Frage ist bewusst zweiteilig formuliert: Sie erfasst einerseits eine **zeitliche Dimension** — die Reduktion der Publikationslatenz — und andererseits eine **qualitative Dimension**, die sicherstellt, dass Geschwindigkeit nicht auf Kosten journalistischer Standards erzielt wird. Beide Dimensionen sind für die Praxis gleichermaßen relevant, da Schnelligkeit zwar als oberstes Qualitätskriterium gilt (Beils 2023, S. 57), sprachliche und inhaltliche Korrektheit jedoch selbst unter hohem Zeitdruck nicht verhandelbar sind (Bluhm & Schäfer 2023, S. 35). Die Operationalisierung beider Dimensionen wird in Kapitel 1.3 methodisch vorbereitet und in Kapitel 6 vollständig durchgeführt.

---

## Methodisches Vorgehen

Die Arbeit folgt einem konstruktiven Forschungsansatz im Sinne des **Design Science Research** (Hevner et al. 2004): Ein softwarebasiertes Artefakt wird als Antwort auf ein identifiziertes Praxisproblem entworfen, implementiert und evaluiert. Der Erkenntnisgewinn entsteht dabei nicht nur aus der Evaluation, sondern auch aus dem Entwurfs- und Implementierungsprozess selbst.

Das methodische Vorgehen gliedert sich in fünf Phasen:

1. **Problemanalyse und Anforderungserhebung:** Literaturgestützte Vertiefung der Problemdimensionen und Ableitung funktionaler sowie nicht-funktionaler Anforderungen.
2. **Technologierecherche:** Aufarbeitung des Stands der Technik in den relevanten Bereichen und Bewertung hinsichtlich der Eignung für das identifizierte Problem.
3. **Systemkonzeption:** Entwurf einer dreischichtigen Systemarchitektur mit Datenmodell, LLM-Pipeline und Prompt-Design.
4. **Implementierung:** Umsetzung als produktionsfähige Webanwendung mit vollständiger API, browserbasiertem Frontend, automatisiertem ETL-System und Cloud-Deployment.
5. **Evaluation:** Technische Qualitätssicherung, Evaluation der KI-Textgenerierung sowie systematischer Anforderungsabgleich.

Die Evaluationsmethodik operationalisiert die Forschungsfrage entlang zweier Dimensionen: Die **zeitliche Dimension** wird über die Time-to-Publish-Metrik (TTP) gemessen, die den Zeitraum zwischen Spielereignis und Veröffentlichung des Ticker-Eintrags erfasst. Die **qualitative Dimension** wird über eine manuelle Bewertung auf den Skalen Korrektheit, Tonalität und Verständlichkeit operationalisiert, ergänzt durch ein **strukturiertes Experteninterview** mit einem professionellen Sportredakteur zur Validierung der Systemeignung im redaktionellen Arbeitskontext. Für den statistischen Vergleich stehen nicht-parametrische Verfahren (Cliff's Delta, Bootstrap-Konfidenzintervalle) bereit; aufgrund der Stichprobengröße (n = 16) kommen diese im vorliegenden Evaluationsdesign nicht zur Anwendung, stehen jedoch für eine Folgestudie mit größerer Datenbasis zur Verfügung.

### Abgrenzung

Das System geht bewusst über den Umfang eines typischen akademischen Projekts hinaus und zielt auf Produktionsfähigkeit: Eine umfassende automatisierte Testsuite, ein Cloud-Deployment und die Integration realer Datenquellen dokumentieren diesen Anspruch. Diese Praxisorientierung ist durch den beruflichen Kontext des Autors motiviert: Als Mitarbeiter der **Stackwork GmbH** im IT-Bereich von Eintracht Frankfurt entstand das System in direkter Kooperation mit den fachlichen Anforderungen einer professionellen Redaktion. Das Ergebnis ist ein vollständiges, eigenständig lauffähiges Redaktionssystem, das als Cloud-Service alle Spiele der konfigurierten Wettbewerbe verarbeitet. Zusätzlich werden publizierte Inhalte über Export-Workflows an die bestehende **Stackwork Demo App** übertragen, wodurch das Projekt zwei unabhängige Zielsysteme über nahezu identische Workflows bedient. Die technischen Details der Architektur und Implementierung werden in Kapitel 4 und 5 beschrieben.

Dennoch bestehen Einschränkungen hinsichtlich Authentifizierung, Evaluationsunabhängigkeit und thematischer Reichweite, die in Kapitel 7 kritisch reflektiert werden.

---

## Aufbau der Arbeit

Die vorliegende Arbeit gliedert sich in acht Kapitel:

- **Kapitel 1 – Einleitung** *(vorliegendes Kapitel)*: Problemstellung, Forschungsfrage, methodisches Vorgehen und Aufbau der Arbeit.
- **Kapitel 2 – Motivation und Anforderungen:** Vertiefung der drei Problemdimensionen (redaktioneller Aufwand, Mehrsprachigkeit, White-Label-Bedarf), Ableitung der Systemanforderungen am Beispiel Eintracht Frankfurt, Experteninterview-Leitfaden und formale Anforderungsdefinition.
- **Kapitel 3 – Stand der Technik:** Large Language Models, Prompt Engineering, Natural Language Generation im Sport sowie Echtzeit-Technologien und ETL-Prozesse.
- **Kapitel 4 – Systemkonzeption:** Dreischichtige Architektur, Datenmodell, LLM-Pipeline und Prompt-Design.
- **Kapitel 5 – Implementierung:** Umsetzung als produktionsfähige Webanwendung mit über 70 API-Endpunkten, TypeScript-Frontend und n8n-ETL-System; ergänzt durch vollständige TypeScript-Typisierung, automatisierte Testsuite und Cloud-Deployment.
- **Kapitel 6 – Evaluation:** Technische Qualitätssicherung (Tests, Coverage, Typsicherheit), Evaluation der KI-Textgenerierung und systematischer Anforderungsabgleich.
- **Kapitel 7 – Diskussion:** Einordnung in den Stand der Technik, kritische Reflexion der Limitationen und Implikationen für den Sportjournalismus.
- **Kapitel 8 – Fazit und Ausblick:** Zusammenfassung der Erkenntnisse, Beantwortung der Forschungsfrage und Ausblick.
