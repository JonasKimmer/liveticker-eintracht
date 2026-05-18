# Bachelorarbeit – Scope & Tiefe Orchestrator

## Kontext: Forschungsfrage und Zielsetzung

**Forschungsfrage:**
> Wie lässt sich ein hybrides KI-gestütztes Redaktionssystem für die Liveticker-Erstellung im Profifußball konzipieren und prototypisch implementieren, und inwiefern erfüllt das System die definierten journalistischen Qualitätsanforderungen hinsichtlich Korrektheit, Tonalität und Verständlichkeit?

**Zielsetzung:** Produktionsfähiges Redaktionssystem mit LLMs; drei Betriebsmodi (auto/coop/manual); White-Label-Instanz (Eintracht Frankfurt + generisch); Mehrsprachigkeit; Design-Science-Research-Methodik (Hevner et al. 2004).

**Was zum Kernthema gehört:**
- LLM-Pipeline, Prompt-Design, Few-Shot, Provider-Fallback
- Drei Betriebsmodi und deren Implikationen
- Journalistische Qualitätsevaluation (Korrektheit, Tonalität, Verständlichkeit)
- White-Label-Architektur und Mehrsprachigkeit
- n8n-Automatisierung als ETL-Schicht
- DSR-Methodik und Anforderungsherleitung

**Akademische Konventionen — was NICHT zu beanstanden ist:**
- Kap. 3 (Stand der Technik) ist von Konvention her breiter als der eigene Beitrag — generelle Technologiebeschreibungen sind dort erwartet, solange sie die spätere Systemwahl begründen
- Kap. 7 (Diskussion) und Kap. 8 (Fazit) greifen Ergebnisse aus Kap. 6 auf — das ist akademischer Rahmenschluss, keine Redundanz
- Quellenbelege für bekannte Technologien (FastAPI, React, PostgreSQL) können knapp sein — das ist in WI-Arbeiten üblich
- DSR-Phasen (Identifikation → Entwurf → Entwicklung → Demonstration → Evaluation) rechtfertigen breite Systemdokumentation in Kap. 4 und 5

**Alle Kapitel-Dateien:**
- `thesis/Bachelorarbeit_Kapitel1.tex`
- `thesis/Bachelorarbeit_Kapitel2.tex`
- `thesis/Bachelorarbeit_kapitel3_StandDerTechnik.tex`
- `thesis/Bachelorarbeit_kapitel4_systemkonzeption.tex`
- `thesis/Bachelorarbeit_kapitel5_implementierung.tex`
- `thesis/Bachelorarbeit_kapitel6_evaluation.tex`
- `thesis/Bachelorarbeit_kapitel7_diskussion.tex`
- `thesis/Bachelorarbeit_kapitel8_fazit.tex`

---

## Starte alle 4 Agenten parallel, synthetisiere danach.

---

## PROMPT: STREICHEN – Was kann komplett weg?

Du bist ein akademischer Gutachter für WI-Bachelorarbeiten. Lies den Kontext-Block oben sorgfältig — insbesondere was akademisch erwartet ist und was nicht beanstandet werden darf.

Lies **alle Kapitel** vollständig (Dateipfade siehe oben).

Identifiziere Passagen die **komplett gestrichen** werden können. Streichbar ist eine Passage nur wenn sie **alle drei Bedingungen** erfüllt:
1. Sie trägt nichts zur Forschungsfrage oder zur DSR-Argumentation bei
2. Sie ist nicht durch akademische Konvention des jeweiligen Kapitels gefordert
3. Die Arbeit verliert durch das Streichen keine Nachvollziehbarkeit

**Typisch streichbar:** Popularity-Argumente ohne Erkenntniswert (z.B. "X ist der beliebteste Framework laut Survey Y"), reine Aufzählungen von Features die im System nicht verwendet werden, Sätze die nur Allgemeinwissen wiederholen ohne Systembezug.

**Nicht streichbar:** Technologieentscheidungen in Kap3 die Kap4 begründen, DSR-Phasenübergänge, Evaluationsmethodik, Limitationen.

Format:
```
[STREICHEN] Datei Z.XX–YY: "<Zitat (max 15 Wörter)>"
Warum streichbar: <ein Satz>
Verlust: <was geht verloren — wenn nichts: "keiner">
```

Maximal 10 Funde. Lieber 5 sichere als 10 fragliche.

---

## PROMPT: KÜRZEN – Was braucht weniger Platz?

Du bist ein akademischer Lektor. Lies den Kontext-Block oben sorgfältig — insbesondere die akademischen Konventionen.

Lies **alle Kapitel** vollständig (Dateipfade siehe oben).

Identifiziere Passagen die auf **1–2 Sätze gekürzt** werden können. Kürzbar ist eine Passage wenn:
- Sie einen validen Punkt macht, aber mit mehr Worten als nötig
- Sie Technologiedetails erklärt, die für das Systemverständnis nicht gebraucht werden (z.B. interne Protokolldetails einer nicht gewählten Lösung)
- Sie etwas beschreibt, das über einen Querverweis auf eine andere Stelle abgedeckt werden kann

**Nicht kürzen:** Abschnitte die direkt die Systemarchitektur, LLM-Pipeline, Evaluation oder DSR-Methodik tragen. Knappheit auf Kosten der Nachvollziehbarkeit ist kein Gewinn.

Format:
```
[KÜRZEN] Datei Z.XX–YY: "<Zitat (max 15 Wörter)>"
Problem: <warum zu lang>
Vorschlag: "<gekürzter Ersatztext in 1–2 Sätzen>"
Gewinn: ~X Zeilen
```

Maximal 10 Funde.

---

## PROMPT: VERTIEFEN – Wo fehlt wissenschaftliche Tiefe?

Du bist ein WI-Gutachter mit Fokus auf DSR-Arbeiten. Lies den Kontext-Block oben sorgfältig.

Lies **alle Kapitel** vollständig (Dateipfade siehe oben).

Identifiziere Stellen wo die Argumentation für eine DSR-Bachelorarbeit **zu dünn** ist. Tiefe fehlt konkret wenn:

**A) Designentscheidungen unbegründet:** Eine Architektur- oder Technologiewahl wird genannt aber nicht gegen Alternativen abgewogen (z.B. "Wir verwenden X" ohne "statt Y, weil Z").

**B) Evaluationsergebnisse uninterpretiert:** Ein Zahlenwert wird berichtet aber nicht eingeordnet — weder im Vergleich zu Benchmarks noch zur Forschungsfrage ("4,1/5 ist gut" reicht nicht; warum ist das ausreichend für journalistische Qualität?).

**C) Limitationen zu kurz:** Eine Einschränkung wird in einem Satz erwähnt aber nicht in ihrer Tragweite eingeschätzt — was bedeutet sie für die Generalisierbarkeit?

**D) Forschungsbezug fehlt:** Ein Ergebnis oder eine Beobachtung wird nicht explizit auf die Forschungsfrage zurückbezogen.

**E) Quellen fehlen wo sie erwartet werden:** Empirische Behauptungen über Journalismus, LLM-Qualität oder Nutzerverhalten ohne Beleg.

Format:
```
[VERTIEFEN] Datei Z.XX: "<Zitat (max 15 Wörter)>"
Kategorie: A / B / C / D / E
Problem: <was genau fehlt>
Aufwand: 1 Satz / 2–3 Sätze / 1 Absatz
```

Maximal 10 Funde. Priorisiert nach Relevanz für die Forschungsfrage — Evaluations- und Diskussionskapitel zuerst.

---

## PROMPT: REDUNDANZ – Was steht doppelt?

Du bist ein Struktur-Reviewer. Lies den Kontext-Block oben sorgfältig — insbesondere: Kap7/8 greifen Kap6-Ergebnisse für den Rahmenschluss auf, das ist keine Redundanz.

Lies **alle Kapitel** vollständig (Dateipfade siehe oben).

Identifiziere Inhalte die **ohne akademischen Grund** an zwei oder mehr Stellen vollständig erklärt werden. Echte Redundanz liegt vor wenn:
- Derselbe Sachverhalt in zwei Kapiteln in gleicher Tiefe erklärt wird, obwohl ein Querverweis reichen würde
- Derselbe Inhalt im Fließtext UND in einer Tabelle/Abbildung gleich ausführlich steht (eines von beidem reicht)
- Eine Technologie in Kap3 und nochmals in Kap4/5 vollständig eingeführt wird

**Keine Redundanz:** Kurze Wiederholung einer Kernaussage als Überleitung, Zusammenfassung am Kapitelende, Fazit das Ergebnisse aus Kap6 zitiert.

Format:
```
[REDUNDANZ] "<Inhalt (Kurzbezeichnung)>"
  Stelle 1: Datei A Z.XX — "<Zitat>"
  Stelle 2: Datei B Z.YY — "<Zitat>"
Empfehlung: Stelle 1 behalten, Stelle 2 → "vgl. Abschnitt X.Y"
Gewinn: ~X Zeilen
```

Maximal 8 Funde. Nur echte Redundanzen mit klarer Empfehlung.

---

## Synthese

Nach Abschluss aller 4 Agenten:

1. Konsolidiere alle Funde, entferne Überschneidungen zwischen Agenten
2. Priorisiere: 🔴 Sicher umsetzen — 🟡 Abwägen — 🟢 Optional
3. Für jeden 🔴 und 🟡: Datei + Zeilennummer + konkreter Vorschlag
4. Schätze Gewinn pro Maßnahme in Zeilen
5. Gesamtbilanz: Wieviel Platz wird durch Streichen/Kürzen frei, und reicht das für die priorisierten Vertiefungen?