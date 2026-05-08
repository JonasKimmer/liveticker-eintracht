# Bachelorarbeit Deep-Check – Erweiterter Orchestrator

## Zweck

Dieser Orchestrator ergänzt `CLAUDE.md` um vier spezialisierte Prüfagenten:

| Agent | Aufgabe |
|---|---|
| CODE-DEEP | Code → Text: Was ist implementiert, aber nicht oder falsch beschrieben? |
| MISSING | Text → Code: Was behauptet der Text, was im Code nicht existiert? |
| FORMAL | Formalia: Labels, Referenzen, Abbildungen, Tabellen, Listings |
| ABSTRACT-SYNC | Abstract + Kap8 vs. Kap6: Sind alle Kernergebnisse konsistent? |

## Starte alle 4 Agenten parallel, synthetisiere danach.

---

## PROMPT: CODE-DEEP – Code liest Thesis, nicht umgekehrt

Du bist ein Software-Reviewer. Deine Aufgabe ist ungewöhnlich: **Lies zuerst den Code, dann die Thesis** – und prüfe, was der Code enthält, das die Thesis verschweigt, falsch beschreibt oder unterschätzt.

### Schritt 1: Lies den Code

Durchsuche diese Verzeichnisse vollständig:
- `backend/` (Struktur, Services, Router, Models, Tests)
- `frontend/src/` (Komponenten, Hooks, Utils)
- `n8n-workflows/` (Workflow-Dateien)

Extrahiere:
- Alle Service-Klassen und ihre öffentlichen Methoden
- Alle API-Endpunkte (Router-Dateien)
- Alle ORM-Modelle (Tabellennamen, wichtige Felder)
- Anzahl der tatsächlichen Test-Dateien und Tests
- Tatsächliche Anzahl n8n-Workflows
- Alle LLM-Provider-Klassen und deren Methoden
- Alle Context-Builder-Funktionen (Name + Zweck)
- Besondere Implementierungsdetails, die architektonisch relevant sind

### Schritt 2: Lies die Thesis

Lies:
- `thesis/Bachelorarbeit_kapitel4_systemkonzeption.tex`
- `thesis/Bachelorarbeit_kapitel5_implementierung.tex`

### Schritt 3: Finde die Lücken

Prüfe für jedes relevante Code-Element:

**A) Falsch beschrieben** – Was der Text über den Code sagt, stimmt nicht:
- Format: `[FALSCH] Thesis Kap.X Z.YY: "<Behauptung>" → tatsächlich: <Befund aus Code>`

**B) Fehlend aber wichtig** – Was der Code enthält, das die Thesis hätte erwähnen sollen:
- Nur wenn es architektonisch oder wissenschaftlich relevant ist (kein "trivia")
- Format: `[FEHLT] <Was> in <Datei/Funktion> – relevant weil: <Begründung> – Vorschlag: ergänze in Kap.X Abschnitt Y`

**C) Übertrieben/Unterschätzt** – Quantitative Angaben die nicht stimmen:
- Testzahl, Workflow-Anzahl, Coverage, Modell-Anzahl etc.
- Format: `[ZAHL] Thesis sagt: X – Code hat: Y – Datei: Z`

Mindestens 8 konkrete Befunde. Maximal 900 Wörter.

---

## PROMPT: MISSING – Thesis-Behauptungen gegen Code verifizieren

Du bist ein skeptischer Gutachter. Deine Aufgabe: Lies die Thesis und prüfe jede konkrete technische Behauptung gegen den tatsächlichen Code.

### Zu prüfende Behauptungen (aus der Thesis):

Lies `thesis/Bachelorarbeit_kapitel5_implementierung.tex` vollständig und extrahiere alle Stellen, an denen:
- Dateinamen genannt werden
- Funktions- oder Klassennahmen genannt werden
- Architekturmuster beschrieben werden (z.B. "Repository-Service-Router-Trennung")
- Zahlen genannt werden (Testanzahl, Coverage, Workflows)
- Spezifische Verhalten beschrieben werden ("Pre-Match-Schutzregel", "Warm-up-Aufruf", "Backoff")

### Prüfung:

Suche für jede Behauptung im Code (`backend/`, `frontend/src/`, `n8n-workflows/`):

- Existiert die genannte Datei/Klasse/Funktion?
- Verhält sie sich wie beschrieben?
- Stimmen die Zahlen?

### Format:

```
[KORREKT]    Z.XXX: "<Behauptung>" ✓
[ABWEICHUNG] Z.XXX: "<Behauptung>" – tatsächlich: <Befund>
[NICHT VERIFIZIERBAR] Z.XXX: "<Behauptung>" – Grund: <warum nicht prüfbar>
```

Mindestens 12 Prüfungen. Priorisiere ABWEICHUNGEN und NICHT VERIFIZIERBAREs in der Ausgabe. Maximal 800 Wörter.

---

## PROMPT: FORMAL – Formalia, Labels, Querverweise

Du bist ein LaTeX-Formalia-Prüfer. Lies alle Thesis-Dateien im Verzeichnis `thesis/`:

```
Bachelorarbeit_Kapitel1.tex
Bachelorarbeit_Kapitel2.tex
Bachelorarbeit_kapitel3_StandDerTechnik.tex
Bachelorarbeit_kapitel4_systemkonzeption.tex
Bachelorarbeit_kapitel5_implementierung.tex
Bachelorarbeit_kapitel6_evaluation.tex
Bachelorarbeit_kapitel7_diskussion.tex
Bachelorarbeit_kapitel8_fazit.tex
Bachelorarbeit_Main.tex
```

Prüfe ausschließlich:

### A) Label-Konsistenz
- Alle `\label{...}` sammeln
- Alle `\ref{...}` und `\vgl. Abschnitt~X.Y` sammeln
- Gibt es `\ref{}`-Aufrufe auf nicht-existente Labels? (Liste sie)
- Gibt es Labels die nie referenziert werden? (Liste sie – könnten verwaist sein)

### B) Abbildungen & Tabellen
- Alle `\begin{figure}` / `\begin{table}` / `\begin{longtable}` sammeln
- Haben alle ein `\caption{}` und ein `\label{}`?
- Werden alle im Fließtext referenziert (vgl. Abbildung X / Tabelle X)?
- Gibt es Abbildungen/Tabellen ohne Textbezug?

### C) Listings / Code-Blöcke
- Alle `\begin{lstlisting}` oder `\begin{verbatim}` sammeln
- Sind alle mit einem Kontext-Satz im Fließtext eingeführt?
- Gibt es Listings ohne Caption?

### D) Literaturverweise
- Alle `\cite{...}` sammeln
- Gibt es Zitate mit ungewöhnlichem Format (z.B. fehlende Jahreszahl im Text)?
- Werden dieselben Quellen mit unterschiedlichen Zitierschlüsseln referenziert?

### E) Nummerierung & Konsistenz
- Werden Anforderungen (F1–F12, N1–N6, A1–A5) konsistent nummeriert?
- Gibt es doppelte Abschnittsnummern oder fehlende Zwischenüberschriften?

Nur tatsächliche Probleme melden. Maximal 600 Wörter.

---

## PROMPT: ABSTRACT-SYNC – Abstract, Kap8 und Kap6 abgleichen

Du bist ein Konsistenz-Prüfer. Deine einzige Aufgabe: Stelle sicher, dass Abstract, Kapitel 8 und die Kernergebnisse aus Kapitel 6 übereinstimmen.

### Lies diese drei Dateien:
- `thesis/Bachelorarbeit_Main.tex` (Abstract-Abschnitt)
- `thesis/Bachelorarbeit_kapitel6_evaluation.tex` (Kernergebnisse)
- `thesis/Bachelorarbeit_kapitel8_fazit.tex` (Fazit)

### Prüfe diese konkreten Werte auf Konsistenz überall:

| Wert | Quelle |
|---|---|
| N=40 Hauptevaluation | Kap6 → Abstract → Kap8 |
| N=80 LLM-as-Judge | Kap6 → Abstract → Kap8 |
| 4,6/5 Korrektheit | Kap6 → Abstract → Kap8 |
| 4,1/5 Tonalität | Kap6 → Abstract → Kap8 |
| 4,3/5 Verständlichkeit | Kap6 → Abstract → Kap8 |
| 859 ms Median-Latenz | Kap6 → Abstract → Kap8 |
| P95 2047 ms | Kap6 → Abstract → Kap8 |
| 23 Anforderungen | Kap6 → Abstract → Kap8 |
| 439 Tests | Kap6 → Abstract → Kap8 |
| 98,02 % TypeScript-Coverage | Kap6 → Abstract → Kap8 |
| Stil-Inkonsistenz 20 % | Kap6 → Kap8 |
| Halluzinationsrate 5 % | Kap6 → Kap8 |

### Prüfe außerdem:
- Nennt der Abstract die Forschungsfrage korrekt?
- Nennt der Abstract die Evaluationsmethodik (DSR, N=40, LLM-as-Judge)?
- Stimmt die Schlussfolgerung im Abstract mit Kap8.2 überein?
- Gibt es Kernergebnisse in Kap8, die im Abstract nicht erwähnt sind (oder umgekehrt)?

Nur Abweichungen melden. Format: `[ABWEICHUNG] Abstract Z.X vs. Kap6 Z.Y: "<Wert A>" vs. "<Wert B>"`. Maximal 400 Wörter.

---

## Synthese nach Agentenabschluss

Konsolidiere alle Findings nach Kritikalität:

```
🔴 KRITISCH – Falsche Faktenangaben, interne Widersprüche, fehlende Pflichtinhalte
🟡 WICHTIG  – Fehlende relevante Inhalte, schwache Formalia, unverifizierbare Behauptungen  
🟢 OPTIONAL – Ergänzungen die die Arbeit stärken würden, aber nicht zwingend sind
```

Für jeden 🔴 und 🟡 Punkt: Konkreter Korrekturvorschlag mit Zeilennummer.