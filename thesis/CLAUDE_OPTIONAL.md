# Bachelorarbeit – Optionale Verbesserungen (Stand: Mai 2026)

Alle kritischen und wichtigen Findings sind behoben. Diese Datei listet was noch getan werden *kann* – nach Aufwand und Nutzen sortiert.

---

## 🟡 Mittlerer Aufwand, klarer Nutzen

### O1 – Abbildungen ohne \label{} ergänzen (Kap. 4)
Die vier Diagramme in Kap. 4 (Systemarchitektur, Kommunikationsfluss, Zustandsautomat, Prompt-Pipeline) haben kein `\label{}`. Für ein Abbildungsverzeichnis und Fließtextreferenzen nötig.

**Aktion:** Jedes `\begin{figure}` in Kap. 4 um `\label{fig:NAME}` ergänzen und im Text mit `(vgl. Abb.~\ref{fig:NAME})` referenzieren.

---

### O2 – Verwaiste Labels bereinigen (FORMAL-Befund)
6 Labels wurden definiert aber nie referenziert:
`fig:er-diagramm`, `fig:betriebsmodi`, `fig:latenzen-histogram`, `fig:qualitaet-stilprofil`, `fig:event-workflow`, `fig:ki-generierungspipeline`

**Aktion:** Entweder Fließtextreferenz ergänzen (`vgl. Abb.~\ref{...}`) oder Label entfernen. Labels ohne Referenz erzeugen ggf. LaTeX-Warnings.

---

### O3 – generation_ms als Messinstrument explizit nennen (Kap. 6.5)
Die Latenzwerte (859 ms Median, P95 2.047 ms) stammen aus `generation_ms`-Feldern in `ticker_entries`. Die Thesis nennt die Messmethodik nicht – ein Reviewer könnte fragen: „Wie wurde die Latenz gemessen?"

**Aktion:** In Kap. 6.5.1 einen Halbsatz ergänzen:
> „Die Latenz wird je LLM-Aufruf im Datenbankfeld \texttt{generation\_ms} persistiert und aus 40 Einträgen aggregiert."

---

### O4 – Polling-Null-Zweig vollständig beschreiben (Kap. 5)
`resolvePollingInterval()` hat drei Zweige: 15 s (Live/FullTime), 20 s (andere Zustände), 15 s (matchState == null). Die Thesis beschreibt nur zwei.

**Aktion:** In Kap. 5 Z. ~458 ergänzen: „sowie bei noch nicht geladenen Spielzustandsdaten (15 s als Standardwert)"

---

### O5 – useAutoPublisher Dual-Path architektonisch beschreiben (Kap. 4/5)
Im Auto-Modus gibt es zwei parallele Publikationspfade: n8n-Webhook (primär) und `useAutoPublisher`-Hook als Frontend-Fallback bei Webhook-Verzögerung. Die Deduplizierung per `event_id` ist das einzige Race-Condition-Sicherheitsnetz. Das ist ein architektonisch relevantes Detail das fehlt.

**Aktion:** In Kap. 4.3.3 (Betriebsmodi) und Kap. 5.3.x (Frontend-Hooks) je einen Satz ergänzen, der den Dual-Path und die Deduplizierungsgarantie erklärt.

---

### O6 – instance-Spalte als White-Label-Steuerungsprimitive nennen (Kap. 5)
Jeder `ticker_entries`-Eintrag ist mit `instance` (`ef_whitelabel`/`generic`) attributiert – das ermöglicht mandantenfähige Auswertung und Filterung. In Kap. 5.1.2 nicht explizit erwähnt.

**Aktion:** In der TickerEntry-Modellbeschreibung das `instance`-Feld als Steuerungsprimitive der White-Label-Architektur ergänzen.

---

## 🟢 Kleiner Aufwand, Feinschliff

### O7 – DSR im Abstract erwähnen
Die Forschungsmethode DSR (Design Science Research) wird im Abstract nicht genannt, obwohl sie die methodische Grundlage der gesamten Arbeit ist.

**Aktion:** Im Abstract einen Halbsatz ergänzen, z.B.:
> „Die Arbeit folgt dem Design-Science-Research-Ansatz nach Hevner et al. (2004)."

---

### O8 – LLM-Provider Prioritätsmechanismus erklären (Kap. 5)
Die Thesis stellt die Fallback-Kette als Designentscheidung dar, ohne den technischen Mechanismus zu nennen: Die Prioritätsreihenfolge hängt von der Python Dict-Insertion-Order in `_PROVIDER_KEY_MAP` ab.

**Aktion:** Einen Halbsatz ergänzen:
> „Die Prioritätsreihenfolge ergibt sich aus der Eintragungsreihenfolge in \texttt{\_PROVIDER\_KEY\_MAP}."

---

### O9 – Alembic-Migrationsanzahl nennen (Kap. 4/5)
Die Thesis erweckt den Eindruck einer einzigen nachgelagerten Migration. Tatsächlich existieren 8 Alembic-Skripte, die das Schema schrittweise aufgebaut haben. Das ist ein Zeichen iterativer Entwicklung und dokumentiert den DSR-Kreislauf.

**Aktion:** Formulierung anpassen: „acht Alembic-Migrationen bauten das Schema iterativ auf" statt Singular.

---

### O10 – Kap. 4.8 Fazit: Vorwegnahme von Evaluationsergebnissen entschärfen
Der in einer früheren Session ergänzte Anforderungsabgleich-Paragraf in Kap. 4.8 sagt „adressieren die Anforderungen gezielt" – das ist streng genommen eine Aussage, die erst Kap. 6 belegt.

**Aktion:** Formulierung von „adressieren" zu „sind konzipiert, um ... zu adressieren" oder „zielen auf ... ab" ändern, um den Konditional zu wahren.

---

## 🔵 Größere Erweiterungen (nur wenn Zeit vorhanden)

### E1 – Fallback-Kette als Sequenzdiagramm visualisieren
Die LLM-Provider-Fallback-Kette (openrouter → gemini → openai → anthropic → mock) ist ein zentrales Architekturmerkmal. Eine Abbildung würde das Konzept für Kap. 4.5 sofort verständlich machen.

---

### E2 – n8n-Workflow-Tabelle vervollständigen
Kap. 5 beschreibt die wichtigsten Workflows, listet aber nicht alle 17 mit Namen und Funktion. Eine kompakte Tabelle (Name | Trigger | Funktion | Besonderheit) wäre für Gutachter nachvollziehbar.

---

### E3 – Mehrsprachigkeits-Evaluation ergänzen
F7 (mehrsprachige Textgenerierung) ist implementiert, wurde aber nie evaluiert. Selbst 5–10 Beispielgenerierungen auf Englisch mit kurzem Qualitätskommentar würden die Anforderungserfüllung substantiell belegen.

---

### E4 – Abschnitt 8.3 mit \label{} für Unterabschnitte ausstatten
Die Unterabschnitte in Kap. 8.3 (Kurzfristig/Mittelfristig/Langfristig) haben keine Labels. Querverweise aus Kap. 6/7 zeigen auf `8.3.2` als Text, nicht als `\ref{}` – das ist LaTeX-technisch fragil.

**Konkret:** `\subsection{Mittelfristige Erweiterungen}\label{sec:ausblick-mittelfristig}` und entsprechende `\ref{}`-Aufrufe in Kap. 6 Z. 467 und Z. 704.

---

## Reihenfolge-Empfehlung

| Priorität | Items | Aufwand |
|---|---|---|
| Zuerst | O3, O4, O7, E4 | je 1–2 Sätze |
| Danach | O1, O2, O5, O6 | je 1 Absatz |
| Optional | O8, O9, O10 | Formulierungssache |
| Nur bei Zeit | E1, E2, E3 | größere Blöcke |