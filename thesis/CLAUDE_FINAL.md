# Bachelorarbeit – Final-Check Orchestrator

## Was dieser Orchestrator prüft

Alle kritischen und wichtigen Findings aus dem ersten Review + Deep-Check sind behoben.
Dieser Orchestrator deckt gezielt ab, was bisher **nicht** geprüft wurde:

| Agent | Fokus |
|---|---|
| BIBO | Literaturverzeichnis: Zitierte Quellen vorhanden? Ungenutzte Einträge? |
| LANG-PATCH | Sprachqualität der neu eingefügten Absätze (alle Patches dieser Session) |
| CONTENT-GAP | Was ist noch nicht beschrieben, aber architektonisch/wissenschaftlich relevant? |
| FINAL-KONSISTENZ | Letzte Zahlenkonsistenz nach allen Änderungen — speziell die geänderten Werte |

## Starte alle 4 Agenten parallel, synthetisiere danach.

---

## PROMPT: BIBO – Bibliographie-Konsistenz

Du bist ein Literatur-Reviewer. Deine Aufgabe: Prüfe die Konsistenz zwischen Literaturstellen im Text und dem Literaturverzeichnis.

### Schritt 1: Lies das Literaturverzeichnis
Lies `thesis/Bachelorarbeit_Main.tex` vollständig. Extrahiere alle Einträge aus der Bibliographie (`\bibitem` oder BibTeX-Einträge) mit Schlüssel und Autor/Jahr.

### Schritt 2: Lies alle Kapitel
Lies alle Kapitel (`Bachelorarbeit_Kapitel1.tex` bis `Bachelorarbeit_kapitel8_fazit.tex`) und extrahiere alle Zitate im Text (Format: `Autor Jahr`, `(Autor Jahr, S. X)`, `\cite{}`).

### Schritt 3: Prüfe

**A) Zitiert aber nicht im Literaturverzeichnis:**
Alle Quellen die im Text referenziert werden, aber keinen Eintrag im Literaturverzeichnis haben.
Format: `[FEHLT IM LV] Kap.X Z.YY: "Autor Jahr" – kein Eintrag vorhanden`

**B) Im Literaturverzeichnis aber nie zitiert:**
Alle Einträge im Literaturverzeichnis die im Text nirgends auftauchen.
Format: `[UNGENUTZT] Eintrag: "Schlüssel / Autor" – nirgends zitiert`

**C) Inkonsistentes Zitierformat:**
Stellen wo dasselbe Werk unterschiedlich zitiert wird (z.B. einmal mit S. X, einmal ohne; einmal mit vgl., einmal ohne).
Format: `[FORMAT] Kap.X Z.YY vs. Kap.A Z.BB: "<Variante 1>" vs. "<Variante 2>"`

**D) Jahreszahlen-Prüfung:**
Stimmen die im Text genannten Jahreszahlen mit den Einträgen im Literaturverzeichnis überein?
Nur tatsächliche Abweichungen melden.

Maximal 600 Wörter. Nur Probleme, keine Bestätigungen.

---

## PROMPT: LANG-PATCH – Sprachqualität neu eingefügter Passagen

Du bist ein akademischer Lektor. Im Laufe einer Überarbeitungs-Session wurden in der Bachelorarbeit viele neue Sätze und Absätze eingefügt. Deine Aufgabe: Prüfe **nur** die neu eingefügten Passagen auf sprachliche Qualität.

### Die relevanten Passagen (lies diese Stellen gezielt):

**Kap. 4** (`Bachelorarbeit_kapitel4_systemkonzeption.tex`):
- Betriebsmodi-Abschnitt (4.3.3): Passage über dual-path im auto-Modus und Deduplizierungsgarantie
- TickerEntry-Beschreibung: Satz über instance-Feld als White-Label-Steuerungsprimitive
- Fazit der Systemkonzeption (Kap. 4.8): Anforderungs-Traceability-Absatz (F1/F2/F3/F4/F8/F9/F11/N1/N2/A5)
- Kap. 4.8: Konditionaler Wortlaut „sind darauf ausgelegt, die Anforderungen zu adressieren"

**Kap. 5** (`Bachelorarbeit_kapitel5_implementierung.tex`):
- Z. ~38: Router-Formulierung „12 Registrierungen (11 unter /api/v1, 1 WebSocket) aus 13 Router-Dateien"
- Z. ~458: Polling-Null-Zweig „sowie bei noch nicht geladenen Spielzustandsdaten"
- Z. ~653: Testpyramide mit Vorwärtsverweis auf Abschnitt 6.2
- LLM-Service: Passage über `_build_singleton()` und `_PROVIDER_KEY_MAP`-Mechanismus

**Kap. 7** (`Bachelorarbeit_kapitel7_diskussion.tex`):
- Letzter Satz der Synthese (Kap. 7.7): Überleitung zu Kap. 8

**Kap. 3** (`Bachelorarbeit_kapitel3_StandDerTechnik.tex`):
- SSE-Erweiterung (4 neue Sätze über Push-Modell, Polling-Vergleich, Unidirektionalität, Reconnect)

### Prüfkriterien:
- Akademischer Ton (kein umgangssprachliches Deutsch)
- Grammatikalische Korrektheit (Kasus, Genus, Kongruenz)
- Einbettung in den Kontext (fügt sich der neue Satz flüssig ein oder wirkt er aufgesetzt?)
- Überlange Sätze (>40 Wörter)
- Widersprüche zum direkt umgebenden Text

Format: `[PROBLEM] Datei Z.XX: "<Originalzitat>" → Vorschlag: "<Korrektur>" — Grund: <kurze Erklärung>`

Maximal 500 Wörter. Nur echte Probleme.

---

## PROMPT: CONTENT-GAP – Was fehlt noch?

Du bist ein akademischer Gutachter für Wirtschaftsinformatik-Bachelorarbeiten. Lies folgende Dateien vollständig:

- `thesis/Bachelorarbeit_kapitel4_systemkonzeption.tex`
- `thesis/Bachelorarbeit_kapitel5_implementierung.tex`
- `thesis/Bachelorarbeit_kapitel6_evaluation.tex`

Deine Aufgabe: Identifiziere Lücken, die ein WI-Gutachter bei der Bewertung bemängeln könnte.

### A) Evaluation-Gaps
- Gibt es implementierte Features (F1–F12) die evaluiert werden sollten, aber nicht sind?
- F7 (Mehrsprachigkeit): Ist die Mehrsprachigkeit evaluiert oder nur implementiert? Wenn nur implementiert: fehlt eine Qualitätseinschätzung?
- Gibt es Anforderungen im Soll-Ist-Abgleich (Kap. 6.6), die nur mit „implementiert" abgehakt sind, ohne Beleg?

### B) Implementierungs-Gaps
- Welche der 17 n8n-Workflows sind in Kap. 5 namentlich nicht beschrieben? Eine vollständige Tabelle (Name | Trigger | Zweck) aller 17 Workflows wäre Prüfungsstandard – fehlt sie?
- Gibt es Systemkomponenten (Klassen, Endpunkte, Hooks) die in der Thesis komplett fehlen, aber für das Verständnis der Architektur wichtig wären?

### C) Konzeptionelle Gaps
- Fehlt eine explizite Erklärung wie das System mit gleichzeitig laufenden Spielen umgeht (Multi-Match-Betrieb)?
- Ist die White-Label-Konfiguration (wie wird eine neue Instanz konfiguriert?) irgendwo beschrieben?

### D) Visualisierungen
- Welche Konzepte wären durch eine Abbildung deutlich verständlicher, haben aber keine?
- Priorität: LLM-Fallback-Kette als Diagramm? n8n-Workflow-Übersicht?

Format pro Befund: `[GAP] Bereich: <was fehlt> — Relevanz: hoch/mittel — Aufwand: 1 Satz / 1 Absatz / neue Abbildung`

Maximal 600 Wörter.

---

## PROMPT: FINAL-KONSISTENZ – Letzter Zahlenabgleich

Du bist ein Präzisions-Reviewer. Lies alle Kapitel und den Abstract vollständig.
Prüfe **ausschließlich** die folgenden Werte, die in dieser Überarbeitungsrunde geändert wurden:

| Wert | Erwartet überall |
|---|---|
| Stil-Inkonsistenz | **20 %** (nicht 19 %) |
| Halluzinationsrate | **5 %** (nicht 6 %) |
| parseCommand-Tests | **48** (nicht 45) |
| DB-Tabellen | **18** (nicht 17) |
| ORM-Modelle | **17** |
| Alembic-Migrationen | **8** (nicht 1 oder „eine") |
| Router-Registrierungen | **12** |
| Router-Dateien | **13** |
| Hauptevaluation | **N = 40** |
| LLM-as-Judge | **N = 80** |
| Analysierten Spielen | **15** (nicht 9) |
| Gesamttestanzahl | **439** |

Für jeden Wert: Durchsuche alle `.tex`-Dateien in `thesis/` nach dem alten Wert (z.B. „19 %", „6 %", „45 Testfälle", „9 Spielen").

Format:
```
[OK]        "20 %" — konsistent in Kap. X, Y, Z
[ABWEICHUNG] "19 %" noch in Kap. X Z.YY: "<Zitat>"
```

Nur Abweichungen ausführlich beschreiben. Maximal 400 Wörter.

---

## Synthese

Nach Abschluss aller 4 Agenten:

1. Konsolidiere ohne Duplikate
2. Priorisiere: 🔴 KRITISCH / 🟡 WICHTIG / 🟢 OPTIONAL
3. Für jeden 🔴 und 🟡: konkreter Korrekturvorschlag mit Datei + Zeilennummer