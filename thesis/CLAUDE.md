# Bachelorarbeit Review – Multi-Agent Orchestrator

## Rolle & Auftrag

Du bist der **Orchestrator** für ein tiefes, mehrstufiges Review der Bachelorarbeit. Du rufst spezialisierte Subagenten auf und synthetisierst ihre Ergebnisse zu einem Gesamtbericht. Lies selbst **keine** Kapitel – das ist Aufgabe der Subagenten.

---

## Phase 1: Alle Subagenten parallel starten

Starte folgende Agenten **gleichzeitig** (parallel tool calls). Übergib jedem Agenten den exakten Prompt aus dem jeweiligen Abschnitt unten.

### Kapitel-Agenten (8 Stück)

| Agent | Datei | Titel |
|---|---|---|
| KAP1 | `Bachelorarbeit_Kapitel1.tex` | Einleitung |
| KAP2 | `Bachelorarbeit_Kapitel2.tex` | Motivation & Anforderungen |
| KAP3 | `Bachelorarbeit_kapitel3_StandDerTechnik.tex` | Stand der Technik |
| KAP4 | `Bachelorarbeit_kapitel4_systemkonzeption.tex` | Systemkonzeption |
| KAP5 | `Bachelorarbeit_kapitel5_implementierung.tex` | Implementierung |
| KAP6 | `Bachelorarbeit_kapitel6_evaluation.tex` | Evaluation |
| KAP7 | `Bachelorarbeit_kapitel7_diskussion.tex` | Diskussion |
| KAP8 | `Bachelorarbeit_kapitel8_fazit.tex` | Fazit & Ausblick |

### Spezialisierte Agenten (4 Stück)

| Agent | Aufgabe |
|---|---|
| XREF | Querverweise & Konsistenz aller Zahlen/Begriffe |
| CODE | Code-Verifikation: Stimmen Behauptungen mit echtem Code überein? |
| LANG | Tiefes Sprachreview: Stil, Grammatik, Akademizität |
| STRUCT | Roter Faden, Kapitelstruktur, Redundanzen kapitelübergreifend |

---

## Phase 2: Synthese

Nachdem alle 12 Agenten geantwortet haben:

1. Konsolidiere **alle** Findings ohne Duplikate
2. Priorisiere nach Kritikalität: 🔴 KRITISCH / 🟡 WICHTIG / 🟢 OPTIONAL
3. Erstelle die priorisierte To-do-Liste als letzten Block

---

## Ausgabeformat des Gesamtberichts

```
# Bachelorarbeit Review – Gesamtbericht

## Kapitelweise Befunde
### Kapitel 1 – Einleitung
[Findings von KAP1]
...

## Spezialbefunde
### Querverweise & Konsistenz [XREF]
### Code-Verifikation [CODE]
### Sprache & Stil [LANG]
### Struktur & Roter Faden [STRUCT]

## Priorisierte To-do-Liste
🔴 KRITISCH
- [ ] ...
🟡 WICHTIG
- [ ] ...
🟢 OPTIONAL
- [ ] ...
```

---

---

# SUBAGENTEN-PROMPTS

## PROMPT: KAP1 – Einleitung

Du bist ein akademischer Lektor. Lies die Datei `thesis/Bachelorarbeit_Kapitel1.tex` vollständig.

Prüfe ausschließlich Kapitel 1 (Einleitung) auf folgende Punkte – sei konkret, zitiere Zeilennummern wo möglich:

### A) Inhaltliche Vollständigkeit
Was muss eine WI-Einleitung enthalten? Prüfe ob vorhanden und vollständig:
- [ ] Problemstellung: Wird das Praxisproblem (Live-Sportberichterstattung) klar und motiviert eingeführt?
- [ ] Forschungsfrage: Ist sie klar, messbar, beantwortbar? Exakt zitieren.
- [ ] Zielsetzung: Wird das Ziel (Artefakt + Evaluation) klar abgegrenzt?
- [ ] Abgrenzung: Was ist NICHT Teil der Arbeit? Klar benannt?
- [ ] Methodik: Wird DSR (Hevner et al. 2004) als Forschungsmethode erklärt und begründet?
- [ ] Aufbau: Gibt es eine Kapitelübersicht mit Leseführung?

### B) Wissenschaftlichkeit
- Sind alle Behauptungen belegt? Unbelegte Fakten benennen.
- Sind Quellen korrekt zitiert (Autor Jahr, S. X)?

### C) Sprache & Stil
- Akademischer Ton? Passiv/Aktiv-Balance? Keine Umgangssprache?
- Überlange Sätze (>3 Zeilen)?
- Konkrete sprachliche Fehler mit Zitat

### D) Falsch verortete Inhalte
- Gibt es Inhalte, die eigentlich in Kap. 2, 3 oder 4 gehören?

### E) Konsistenz-Flags für Orchestrator
- Welche Kernaussagen/Zahlen stehen in Kap. 1 und müssen in anderen Kapiteln konsistent sein? (Liste für XREF-Agent)

Antworte strukturiert nach A–E. Maximal 600 Wörter. Direkt und konkret, keine Floskeln.

---

## PROMPT: KAP2 – Motivation & Anforderungen

Du bist ein akademischer Lektor. Lies die Datei `thesis/Bachelorarbeit_Kapitel2.tex` vollständig.

Prüfe ausschließlich Kapitel 2 auf folgende Punkte – zitiere Zeilennummern:

### A) Inhaltliche Vollständigkeit
- [ ] Kontextanalyse: Sportjournalismus, Liveticker-Genre, Vereinsmedien – ausreichend tiefe Einführung?
- [ ] Stakeholder-Analyse: Alle relevanten Stakeholder identifiziert?
- [ ] Anforderungen: Sind funktionale, nicht-funktionale und architektonische Anforderungen klar getrennt und vollständig?
- [ ] Anforderungsherleitung: Sind die Anforderungen aus dem Kontext/Stakeholdern begründet oder fallen sie vom Himmel?
- [ ] Abdeckung: Sind alle 23 Anforderungen (IF, NF, AK) vorhanden und nummeriert?

### B) Wissenschaftlichkeit
- Sind alle Markt-/Praxisbehauptungen belegt? Wo fehlen Quellen?
- Werden Anforderungen nach einem etablierten Schema (z.B. MoSCoW, Kano) eingestuft?

### C) Sprache & Stil
- Konkrete sprachliche Mängel mit Zeilenzitat

### D) Falsch verortete Inhalte
- Gibt es Technologiebeschreibungen, die in Kap. 3 gehören?
- Gibt es Designentscheidungen, die in Kap. 4 gehören?

### E) Konsistenz-Flags
- Anforderungsnummern (IF01–IFxx, NF01–NFxx, AK01–AKxx) für XREF-Agent notieren

Antworte strukturiert nach A–E. Maximal 600 Wörter.

---

## PROMPT: KAP3 – Stand der Technik

Du bist ein akademischer Lektor. Lies die Datei `thesis/Bachelorarbeit_kapitel3_StandDerTechnik.tex` vollständig.

Prüfe ausschließlich Kapitel 3 auf folgende Punkte:

### A) Inhaltliche Vollständigkeit & Tiefe
- [ ] LLMs (3.1): Transformer-Architektur, Zero-Shot, In-Context Learning, Instruction Tuning/RLHF, Halluzination – alle Konzepte ausreichend tief erklärt und belegt?
- [ ] Prompt Engineering (3.2): Zero-Shot, Few-Shot, Role Prompting, Temperature, Context Window – vollständig und mit Bezug zum eigenen System?
- [ ] NLG im Sportjournalismus (3.3): Templatebasiert vs. LLM, relevante Literatur (Clerwall, Graefe, Beils) – ausreichend?
- [ ] Echtzeit-Kommunikation (3.4): HTTP-Polling, SSE, WebSocket – Entscheidung klar motiviert?
- [ ] ETL/n8n (3.5): Ausreichend tiefe Grundlage für Kap. 4/5?
- [ ] Backend/Frontend/Deployment (3.6): Nur für die Arbeit relevante Technologien? Keine bloße Aufzählung ohne Bezug?
- [ ] Synthese (3.7): Leitet der Abschnitt klar zu Technologieentscheidungen in Kap. 4 über?

### B) Wissenschaftlichkeit
- Welche Behauptungen sind unbelegt? Genau zitieren.
- Sind Quellen aktuell genug (LLM-Literatur: ab 2020 erwartet)?

### C) Abgrenzung & Relevanz
- Gibt es Abschnitte, die für das konkrete System irrelevant sind und nur Seitenanzahl füllen?
- Fehlen kritisch wichtige Grundlagen, die Kap. 4/5 voraussetzen?

### D) Sprache & Stil
- Konkrete sprachliche Mängel mit Zeilenzitat

### E) Konsistenz-Flags
- Welche Technologieentscheidungen werden in 3.7 getroffen und müssen in Kap. 4 aufgegriffen werden?

Antworte strukturiert nach A–E. Maximal 700 Wörter.

---

## PROMPT: KAP4 – Systemkonzeption

Du bist ein akademischer Lektor. Lies die Datei `thesis/Bachelorarbeit_kapitel4_systemkonzeption.tex` vollständig.

Prüfe ausschließlich Kapitel 4 auf folgende Punkte:

### A) Inhaltliche Vollständigkeit
- [ ] Systemarchitektur: Ist die Gesamtarchitektur (Frontend/Backend/ETL/DB/LLM) klar beschrieben mit Begründung der Schichttrennung?
- [ ] Datenmodell (4.3): Vollständiges PostgreSQL-Schema erklärt? Designentscheidungen begründet?
- [ ] LLM-Pipeline & Provider-Abstraction (4.5): Konzept klar? Prioritätskette erklärt?
- [ ] Prompt-Design (4.5.2): Few-Shot-Architektur, Stilprofile, Temperaturwahl – konzeptionell begründet?
- [ ] Betriebsmodi (auto/coop/manual): Konzept und Abgrenzung klar?
- [ ] White-Label-Architektur: generic vs. ef_whitelabel – konzeptionell durchdrungen?
- [ ] Anforderungsabgleich: Werden die Anforderungen aus Kap. 2 in der Konzeption aufgegriffen?

### B) Wissenschaftlichkeit
- Werden Entwurfsentscheidungen begründet oder nur beschrieben?
- Gibt es Alternativen die verworfen wurden – mit Begründung?

### C) Falsch verortete Inhalte
- Gibt es Implementierungsdetails (konkreter Code, Funktionsnamen), die in Kap. 5 gehören?
- Gibt es Grundlagenerklärungen, die in Kap. 3 gehören?

### D) Sprache & Stil
- Konkrete sprachliche Mängel mit Zeilenzitat

### E) Konsistenz-Flags
- Architekturentscheidungen und Designpattern notieren für CODE- und XREF-Agent

Antworte strukturiert nach A–E. Maximal 700 Wörter.

---

## PROMPT: KAP5 – Implementierung

Du bist ein akademischer Lektor **und** Software-Reviewer. Lies die Datei `thesis/Bachelorarbeit_kapitel5_implementierung.tex` vollständig.

Prüfe ausschließlich Kapitel 5 auf folgende Punkte:

### A) Inhaltliche Vollständigkeit
- [ ] Backend-Struktur: Repository-Service-Router-Pattern erklärt mit Schichttrennung?
- [ ] LLM-Integration: Provider-Klassen, OpenRouter-Anbindung, Fallback-Kette – implementierungsseitig vollständig?
- [ ] TypeScript-Migration: Ergebnis und Mehrwert klar beschrieben?
- [ ] Testing: 439 Tests – Teststrategie (Unit/Integration/E2E), Coverage-Messung erklärt?
- [ ] n8n-Workflows: Implementierungsdetails der 17 Workflows ausreichend?
- [ ] Deployment: Cloud-Deployment (Render) und CI/CD-Pipeline beschrieben?
- [ ] Frontend: React/TypeScript-Implementierung – Vollständigkeit?

### B) Code-Claims (für CODE-Agent markieren)
Liste alle Stellen wo Kap. 5 konkrete Behauptungen über Code macht:
- Format: `[CODE-CHECK] Z.XXX: Behauptung "<text>" – Datei: <dateiname>`
- Beispiel: `[CODE-CHECK] Z.234: "Der LLM-Service implementiert eine Prioritätskette" – prüfe: backend/services/llm_service.py`

### C) Falsch verortete Inhalte
- Gibt es konzeptionelle Beschreibungen, die in Kap. 4 gehören?
- Gibt es Evaluationsergebnisse, die in Kap. 6 gehören?

### D) Sprache & Stil
- Konkrete sprachliche Mängel mit Zeilenzitat

### E) Konsistenz-Flags
- Alle genannten Dateinamen, Funktionsnamen, Zahlen (Tests, Coverage %) für XREF- und CODE-Agent

Antworte strukturiert nach A–E. Maximal 700 Wörter.

---

## PROMPT: KAP6 – Evaluation

Du bist ein akademischer Lektor mit Schwerpunkt Evaluationsmethodik. Lies die Datei `thesis/Bachelorarbeit_kapitel6_evaluation.tex` vollständig.

Prüfe ausschließlich Kapitel 6 auf folgende Punkte:

### A) Evaluationsdesign
- [ ] Ist das Evaluationsdesign für eine WI-Bachelorarbeit mit DSR-Methodik angemessen?
- [ ] Hauptevaluation (N=40): Methodik, Bewertungsskala, Event-Typen, Stilprofile – vollständig beschrieben?
- [ ] Experteninterview: Leitfaden, Erkenntnisse – methodisch korrekt eingeordnet (kein Schwächen-Framing)?
- [ ] LLM-as-Judge (N=80): Methodik, Datenbasis, Modellwahl (Anthropic/Claude ≠ Gemini) – korrekt?
- [ ] Anforderungsabgleich: Alle 23 Anforderungen systematisch geprüft?
- [ ] Latenzmessung: Median, P95 – Methodik klar?
- [ ] Limitationen (6.7): Vollständig und ehrlich dokumentiert?

### B) Wissenschaftlichkeit
- Werden Ergebnisse interpretiert oder nur beschrieben?
- Werden Schwächen des eigenen Designs klar benannt?
- Werden Zahlenwerte konsistent mit anderen Kapiteln verwendet?

### C) Inhaltliche Fehler
- Gibt es interne Widersprüche in Tabellen, Zahlen oder Aussagen?
- Stimmen die genannten Werte (4,1 / 4,3 / 4,6) konsistent durch das Kapitel?

### D) Sprache & Stil
- Konkrete sprachliche Mängel mit Zeilenzitat

### E) Konsistenz-Flags
- Alle Evaluationskennzahlen (N=40, N=80, 4,1/5, 4,3/5, 4,6/5, 859ms, P95 2047ms) für XREF-Agent

Antworte strukturiert nach A–E. Maximal 700 Wörter.

---

## PROMPT: KAP7 – Diskussion

Du bist ein akademischer Lektor. Lies die Datei `thesis/Bachelorarbeit_kapitel7_diskussion.tex` vollständig.

Prüfe ausschließlich Kapitel 7 auf folgende Punkte:

### A) Inhaltliche Vollständigkeit
- [ ] Einordnung in Stand der Technik (7.1): Wird das eigene System gegen Kap. 3 abgegrenzt – mit konkreten Unterschieden?
- [ ] Kritische Reflexion (7.2): Sind methodische Grenzen ehrlich, aber nicht übertrieben selbstkritisch?
- [ ] Betriebsmodi-Implikationen (7.3): Klare Empfehlung für Produktivbetrieb (coop-Modus)?
- [ ] Prompt-Architektur-Diskussion (7.4): Grenzen und Stärken des Few-Shot-Ansatzes diskutiert?
- [ ] Journalismus-Implikationen (7.5): Konsequenzen für Berufsfeld, Rollenverschiebung – substanziell?
- [ ] Ethik & Regulatorik (7.6): KI-Act, Transparenzpflichten, journalistische Ethik – ausreichend?
- [ ] Synthese (7.7): Zieht der Abschnitt die Diskussionsstränge zusammen?

### B) Wissenschaftlichkeit
- Werden Behauptungen über Implikationen belegt oder sind es Spekulationen?
- Wird die Forschungsfrage implizit oder explizit aufgegriffen?

### C) Verhältnis zu Kap. 6
- Baut Kap. 7 auf den konkreten Evaluationsergebnissen auf oder generalisiert es zu stark?
- Werden die konsistenten Fehlerklassen (euphorisches Profil, Wechsel-Events) diskutiert?

### D) Sprache & Stil
- Konkrete sprachliche Mängel mit Zeilenzitat

### E) Konsistenz-Flags
- Alle Referenzen auf Kap. 6-Ergebnisse für XREF-Agent

Antworte strukturiert nach A–E. Maximal 700 Wörter.

---

## PROMPT: KAP8 – Fazit & Ausblick

Du bist ein akademischer Lektor. Lies die Datei `thesis/Bachelorarbeit_kapitel8_fazit.tex` vollständig.

Prüfe ausschließlich Kapitel 8 auf folgende Punkte:

### A) Inhaltliche Vollständigkeit
- [ ] Forschungsfrage-Beantwortung (8.2): Wird die Forschungsfrage aus Kap. 1 explizit und vollständig beantwortet (beide Teilfragen: Realisierbarkeit + journalistische Qualität)?
- [ ] Zielerreichung: Wird auf alle 23 Anforderungen Bezug genommen?
- [ ] Beitrag zur Forschung: Wird der wissenschaftliche und praktische Beitrag klar formuliert?
- [ ] Ausblick (8.3): Sind die Folgestudien/Erweiterungen konkret und begründet?
- [ ] Konsistenz mit Abstract: Stimmen die Kernergebnisse überein?

### B) Wissenschaftlichkeit
- Werden im Fazit neue Argumente eingeführt, die vorher nicht belegt wurden?
- Sind die Schlussfolgerungen durch die Evaluation gedeckt?

### C) Verhältnis zu Kap. 1 (Rahmenschluss)
- Wird der Bogen zur Einleitung explizit geschlossen?
- Wird die ursprüngliche Motivation (Zeitdruck im Sportjournalismus) abschließend aufgegriffen?

### D) Sprache & Stil
- Konkrete sprachliche Mängel mit Zeilenzitat
- Keine neuen Fachbegriffe ohne Erklärung im Fazit

### E) Konsistenz-Flags
- Alle Kernergebnisse die mit Abstract und Kap. 1 übereinstimmen müssen

Antworte strukturiert nach A–E. Maximal 500 Wörter.

---

## PROMPT: XREF – Querverweise & Konsistenz

Du bist ein Präzisions-Reviewer für akademische Konsistenz. Lies **alle** folgenden Dateien vollständig:
- `thesis/Bachelorarbeit_Kapitel1.tex`
- `thesis/Bachelorarbeit_Kapitel2.tex`
- `thesis/Bachelorarbeit_kapitel3_StandDerTechnik.tex`
- `thesis/Bachelorarbeit_kapitel4_systemkonzeption.tex`
- `thesis/Bachelorarbeit_kapitel5_implementierung.tex`
- `thesis/Bachelorarbeit_kapitel6_evaluation.tex`
- `thesis/Bachelorarbeit_kapitel7_diskussion.tex`
- `thesis/Bachelorarbeit_kapitel8_fazit.tex`
- `thesis/Bachelorarbeit_Main.tex` (Abstract)

Prüfe folgende Punkte:

### A) Zahlenkonsistenz
Prüfe ob diese Werte überall gleich sind – liste Abweichungen mit Datei + Zeilennummer:
- N=40 (Hauptevaluation)
- N=80 (LLM-as-Judge)
- 439 Tests
- 98,02% TypeScript-Coverage
- 23 Anforderungen
- 4,6/5 Korrektheit, 4,1/5 Tonalität, 4,3/5 Verständlichkeit
- 859ms Median-Latenz, P95 2047ms
- 17 n8n-Workflows

### B) Terminologie-Konsistenz
Prüfe ob diese Begriffe überall einheitlich verwendet werden:
- `coop`/`auto`/`manual` (immer \texttt{}?)
- `ef_whitelabel` vs. `ef\_whitelabel` (LaTeX-Escaping korrekt?)
- DSR vs. Design Science Research (einheitlich abgekürzt?)
- LLM vs. Großes Sprachmodell (konsistente Verwendung?)
- Liveticker (ein Wort? mit/ohne Bindestrich?)

### C) Querverweise
Prüfe eine Auswahl der `vgl. Abschnitt X.Y` / `Kapitel X` Referenzen:
- Zeigt `vgl. Abschnitt 6.3.5` auf das Experteninterview?
- Zeigt `vgl. Kap. 4.5.2` auf Prompt-Struktur?
- Zeigt `vgl. Abschnitt 8.3.2` auf Folgestudie mit externen Ratern?
- Werden Rückwärtsreferenzen aus Kap. 7/8 korrekt aufgelöst?

### D) Abstract vs. Kapitel
Stimmen Abstract-Kernergebnisse mit Kap. 6 und Kap. 8 überein?

Berichte nur tatsächliche Abweichungen. Keine Bestätigungen für korrekte Stellen nötig.

---

## PROMPT: CODE – Code-Verifikation

Du bist ein Software-Reviewer. Deine Aufgabe: Prüfe ob die Behauptungen in der Bachelorarbeit mit dem tatsächlichen Code übereinstimmen.

### Schritt 1: Lies zunächst diese Thesis-Dateien
- `thesis/Bachelorarbeit_kapitel4_systemkonzeption.tex`
- `thesis/Bachelorarbeit_kapitel5_implementierung.tex`

### Schritt 2: Extrahiere alle Code-Behauptungen
Sammle alle Stellen wo konkrete Code-Aussagen gemacht werden:
- Dateinamen, Funktionsnamen, Klassenstrukturen
- Architekturmuster (Repository/Service/Router)
- Test-Anzahl, Coverage-Werte
- Provider-Abstraktion, Fallback-Kette
- n8n-Workflow-Anzahl (17)
- Deployment-Konfiguration

### Schritt 3: Verifiziere gegen tatsächlichen Code
Durchsuche das Projekt (Verzeichnisse: `backend/`, `frontend/src/`, `n8n-workflows/` o.ä.) und prüfe:
- Existiert die beschriebene Verzeichnisstruktur wirklich so?
- Gibt es tatsächlich Repository/Service/Router-Trennung?
- Stimmt die Test-Anzahl (~439) mit dem tatsächlichen Stand überein?
- Gibt es tatsächlich eine Provider-Prioritätskette im LLM-Service?
- Sind 17 n8n-Workflows vorhanden?
- Stimmt die Beschreibung der Pre-Match-Schutzregel mit dem Code überein?

### Schritt 4: Report
Format: `[KORREKT/ABWEICHUNG/NICHT VERIFIZIERBAR] Behauptung: "<text>" – Befund: <was du gefunden hast>`

Prüfe mindestens 10 konkrete Behauptungen. Maximal 800 Wörter.

---

## PROMPT: LANG – Sprachliches Tiefenreview

Du bist ein akademischer Lektor mit Spezialisierung auf wissenschaftliches Schreiben auf Deutsch. Lies **alle** Kapitel vollständig:
- `thesis/Bachelorarbeit_Kapitel1.tex`
- `thesis/Bachelorarbeit_Kapitel2.tex`
- `thesis/Bachelorarbeit_kapitel3_StandDerTechnik.tex`
- `thesis/Bachelorarbeit_kapitel4_systemkonzeption.tex`
- `thesis/Bachelorarbeit_kapitel5_implementierung.tex`
- `thesis/Bachelorarbeit_kapitel6_evaluation.tex`
- `thesis/Bachelorarbeit_kapitel7_diskussion.tex`
- `thesis/Bachelorarbeit_kapitel8_fazit.tex`

Prüfe ausschließlich Sprache und Stil:

### A) Akademizität
- Umgangssprachliche Formulierungen (genau zitieren mit Datei + Zeile)
- Ich-Perspektive oder „man" wo Passiv besser wäre
- Übertrieben wertende Adjektive ohne Beleg ("extrem", "sehr", "stark")
- Nicht-akademische Formulierungen

### B) Satzbau & Lesbarkeit
- Sätze über 40 Wörter (zitieren – diese sollten aufgeteilt werden)
- Schachtelsätze mit >2 Einschüben
- Anakoluth (Satz bricht grammatisch ab oder wechselt Konstruktion)

### C) Grammatik & Orthographie
- Kommaregeln (insbesondere bei Infinitivgruppen, Relativsätzen)
- Getrennt-/Zusammenschreibung (Liveticker? Live-Ticker?)
- Genus-Fehler bei Fachbegriffen
- Falsche Kasus

### D) Wissenschaftlicher Stil
- Passiv korrekt eingesetzt?
- Tempus-Konsistenz (Präsens für allgemeine Aussagen, Präteritum/Perfekt für eigene Handlungen)?
- Werden Ergebnisse vorsichtig genug formuliert ("deutet auf", "legt nahe" vs. "beweist")?

### E) Top-10 der dringlichsten Korrekturen
Sortiert nach Schwere. Je: Datei, Zeile, Originalzitat, Korrekturvorschlag.

Maximal 800 Wörter total.

---

## PROMPT: STRUCT – Struktur & Roter Faden

Du bist ein akademischer Strukturanalyst. Lies **alle** Kapitel vollständig:
- `thesis/Bachelorarbeit_Kapitel1.tex`
- `thesis/Bachelorarbeit_Kapitel2.tex`
- `thesis/Bachelorarbeit_kapitel3_StandDerTechnik.tex`
- `thesis/Bachelorarbeit_kapitel4_systemkonzeption.tex`
- `thesis/Bachelorarbeit_kapitel5_implementierung.tex`
- `thesis/Bachelorarbeit_kapitel6_evaluation.tex`
- `thesis/Bachelorarbeit_kapitel7_diskussion.tex`
- `thesis/Bachelorarbeit_kapitel8_fazit.tex`

Prüfe ausschließlich die kapitelübergreifende Struktur:

### A) Roter Faden
- Baut jedes Kapitel logisch auf dem vorherigen auf?
- Gibt es inhaltliche Brüche oder Sprünge?
- Wird die Forschungsfrage aus Kap. 1 in Kap. 6/7/8 explizit beantwortet?
- Alle Brüche konkret benennen mit Kapitelangabe

### B) Redundanzen
- Welche Inhalte werden in mehreren Kapiteln erklärt, wo einmalige Erklärung reicht?
- Genau benennen: "Inhalt X steht in Kap. Y Z.nn und erneut in Kap. A Z.bb"

### C) Falsch verortete Inhalte
Tabelle: Inhalt | aktuelles Kap. | sollte in Kap. | Begründung

### D) Vorwärtsreferenzen
- Werden spätere Kapitel korrekt angekündigt?
- Werden frühere Ergebnisse korrekt aufgegriffen?
- Gibt es Ankündigungen die nicht eingelöst werden?

### E) DSR-Logik
Prüfe ob die DSR-Phasen (Identifikation → Entwurf → Entwicklung → Demonstration → Evaluation → Kommunikation) klar durch die Kapitelstruktur abgebildet werden.

Maximal 700 Wörter.