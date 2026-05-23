# Bachelorarbeit Deep-Review – Multi-Agent Orchestrator (v8)

## Kontext

Jonas Kimmer, Wirtschaftsinformatik, Hochschule RheinMain Wiesbaden.
Thema: Hybrides KI-gestütztes Liveticker-Redaktionssystem (Eintracht Frankfurt / Stackwork GmbH).
Methodik: Design Science Research (DSR) nach Hevner et al. 2004.
8 Kapitel: Einleitung → Motivation/Anforderungen → Stand der Technik → Systemkonzeption →
Implementierung → Evaluation → Diskussion → Fazit.

### Wichtige Fakten (nicht ändern, nicht hinterfragen)
- Datenbank: **Supabase** (Free Tier, dauerhaft verfügbar, 500 MB Storage) — NICHT Render-Managed-PostgreSQL
- Fallback-Kette: `openrouter → gemini → openai → anthropic → mock` (in dieser Reihenfolge)
- Standardmodell: `google/gemini-2.0-flash-lite-001` via OpenRouter
- LLM_TEMPERATURE = 0,5 (Generierung), LLM_TRANSLATION_TEMPERATURE = 0,1 (Übersetzung)
- Unterstützte Sprachen: Deutsch, Englisch, Spanisch, Französisch (NICHT Japanisch)
- 24 Anforderungen (F1–F13, N1–N6, A1–A5); 23 vollständig erfüllt, F7 funktional implementiert
- 17 n8n-Workflows in 6 Gruppen (A–F), ausschließlich manuell verifiziert
- Evaluationswerte: Korrektheit Ø 4,6/5 · Verständlichkeit Ø 4,3/5 · Tonalität Ø 4,1/5
- LLM-as-Judge (claude-sonnet-4-5 via OpenRouter): neutral 4,81 · kritisch 4,32 · euphorisch 3,27
- LLM-as-Judge Tonalität euphorisch bei Wechsel/Karten: 2,93/5
- Systemlatenz: Median 3.338 ms, P95 3.698 ms
- 21 spanischsprachige Einträge verifiziert
- EU AI Act Art. 50 Abs. 4: Kennzeichnungspflicht ab August 2026
- Begriffe: **Anforderungsdimensionen** (NICHT „Problemdimensionen")

### Aktivdateien (nur diese bearbeiten)
- `thesis/Bachelorarbeit_Kapitel1.tex`
- `thesis/Bachelorarbeit_Kapitel2.tex`
- `thesis/Bachelorarbeit_kapitel3_StandDerTechnik.tex`
- `thesis/Bachelorarbeit_kapitel4_systemkonzeption.tex`
- `thesis/Bachelorarbeit_kapitel5_implementierung.tex`
- `thesis/Bachelorarbeit_kapitel6_evaluation.tex`
- `thesis/Bachelorarbeit_kapitel7_diskussion.tex`
- `thesis/Bachelorarbeit_kapitel8_fazit.tex`
- `thesis/Bachelorarbeit_Main.tex`

**NICHT bearbeiten:** `Bachelorarbeit_Kapitel3.tex`, `Bachelorarbeit_Kapitel7.tex`,
`Bachelorarbeit_Kapitel8.tex`, `Bachelorarbeit_kapitel1_einleitung.tex` — diese werden nicht kompiliert.

---

## Bereits erledigt (nicht nochmal prüfen)

**Stilistik & Typografie (alle Kapitel):**
- Abschnittsintros mit \ref-Struktur (Kap1–8)
- Genuskongruenz (Er/Sie) in Abschnittsintros
- 8 redundante Querverweise entfernt
- Abb. → Abbildung, deutsche Anführungszeichen Kap8
- Em-Dashes (—) → LaTeX-En-Dash (--)
- Prozent-Abstände (\,\%) in Kap6
- \texttt{} für auto/coop/manual in Kap2, Kap4, Kap8
- FastAPI-Redundanz Kap4 → Rückverweis

**Kap2 (Motivation/Anforderungen):**
- „Problemdimensionen" → „Anforderungsdimensionen"
- F7: „Deutsch, Englisch; erweiterbar" → „Deutsch, Englisch, Spanisch und Französisch"
- F3: \ref{prompt-engineering-strategie} aus Herleitung-Spalte entfernt

**Kap3 (Stand der Technik):**
- Absatz zu kompakten Modellen vor LLM-API-Aggregatoren eingefügt
- LLM-API-Aggregatoren: Querverweis \ref{multi-provider-architektur} ergänzt
- Synthese-Tabelle: \ref{backend-frontend-und-deployment-technologien} → \ref{backend-framework-und-persistenzschicht}

**Kap4 (Systemkonzeption):**
- §4.5.1: Provider-Reihenfolge korrigiert (openrouter → gemini → openai → anthropic)
- §4.5.1: Explizite Fallback-Kette als \rightarrow-Kette eingefügt
- §4.7: Tautologischen Einleitungssatz entfernt
- §4.5.3: Doppelten Querverweis auf API-Router und LLM-Service ergänzt

**Kap5 (Implementierung):**
- Deployment-Abschnitt: Render-Managed-PostgreSQL → Supabase (Free Tier, 500 MB)

**Kap7 (Diskussion):**
- §7.3.1: „neutral Ø 4,82" → „neutral Ø 4,81"
- §7.3.1 + §7.6: \ref{mittelfristige-erweiterungen} → \ref{ausblick} (2× gebrochen)

**Kap8 (Fazit):**
- \ref{mittelfristige-erweiterungen} → \ref{ausblick} (gebrochen)
- §8.1: Tonalität Ø 4,1/5 und euphorisches Profil 2,93/5 ergänzt
- §8.2: n8n-Workflow-Tests Bullet ergänzt
- F7-Formulierung „23 der 24 Anforderungen"

---

## Rolle & Auftrag

Du bist der **Orchestrator**. Starte alle 8 Agenten **gleichzeitig** (parallele Tool Calls).
Warte auf alle Ergebnisse. Synthetisiere zu einem priorisierten Abschlussbericht mit
konkreten Vorher/Nachher-Beispielen — **kein Lob, nur echte Probleme**.

---

## Phase 1: Alle 9 Agenten parallel starten

| Agent | Prüfbereich |
|---|---|
| ZAHLEN | Zahlenformatierung, Ausschreibpflicht, Dezimal-/Tausendertrennzeichen |
| ABKÜRZUNGEN | Erstbelegpflicht, einmalige Abkürzungen, Konsistenz |
| ANFÜHRUNGSZEICHEN | „..." korrekt überall, \emph{}/\textit{} konsistent |
| SATZLÄNGE | Überlange Sätze, Schachtelsätze, Gedankenstriche, Semikolons |
| PASSIV | Passivlastigkeit, Nominalstil, Stellen die durch Aktiv gewinnen |
| ABBILDUNGEN | Jede Figure/Tabelle im Text referenziert und davor erwähnt? |
| GRAMMATIK | Kommasetzung, Genus, Kasus, Subjekt-Verb-Kongruenz |
| REGISTER | Kolloquialismen, Superlative ohne Beleg, Registerbrüche zwischen Kapiteln |
| STRUKTUR | Fehlplatzierte Inhalte, Redundanzen, fehlende Inhalte, Gliederungslogik |
| QUERVERWEISE | Alle \ref{} auf existierende Labels? Alle \label{} irgendwo referenziert? |
| ZAHLENKONSISTENZ | Gleiche Kennzahlen in Kap6/Kap7/Kap8 identisch? Widersprüche zwischen Kapiteln? |

---

## Phase 2: Synthese

1. Alle Findings zusammenführen, Duplikate entfernen
2. Priorisieren: 🔴 KRITISCH / 🟡 WICHTIG / 🟢 OPTIONAL
3. Je Finding: Datei + Zeilennummer + Vorher → Nachher

---

## Ausgabeformat

```
# Deep-Review Gesamtbericht (v8)

## Struktur & Gliederung
## Querverweise & Labels
## Zahlenkonsistenz über Kapitel
## Zahlenformatierung
## Abkürzungen
## Anführungszeichen & Kursiv
## Satzlänge & Lesbarkeit
## Passiv & Nominalstil
## Abbildungs- und Tabellenreferenzen
## Grammatik
## Sprachregister

## Priorisierte To-do-Liste
🔴 KRITISCH — muss vor Abgabe
🟡 WICHTIG — sollte vor Abgabe
🟢 OPTIONAL — nice to have
```

---

# SUBAGENTEN-PROMPTS

---

## PROMPT: ZAHLEN – Formatierung und Ausschreibpflicht

Du bist ein LaTeX-Typograf für deutsche Akademiker.

Lies alle 8 Kapitel vollständig:
- thesis/Bachelorarbeit_Kapitel1.tex
- thesis/Bachelorarbeit_Kapitel2.tex
- thesis/Bachelorarbeit_kapitel3_StandDerTechnik.tex
- thesis/Bachelorarbeit_kapitel4_systemkonzeption.tex
- thesis/Bachelorarbeit_kapitel5_implementierung.tex
- thesis/Bachelorarbeit_kapitel6_evaluation.tex
- thesis/Bachelorarbeit_kapitel7_diskussion.tex
- thesis/Bachelorarbeit_kapitel8_fazit.tex

### A) Ausschreibpflicht
In deutschem akademischem Text werden Zahlen von 0 bis 12 ausgeschrieben
(null, eins, zwei, …, zwölf), außer bei:
- Maßangaben mit Einheit (5 ms, 7 Workflows)
- Zahlen in Tabellen
- Formeln und Code
- Prozentzahlen

Suche Stellen wo eine Zahl ≤ 12 im Fließtext als Ziffer steht, obwohl
die Ausschreibregel greifen würde. Maximal 10 Instanzen mit Datei + Zeile + Vorher/Nachher.

### B) Tausendertrennzeichen
In deutschen LaTeX-Dokumenten wird `1\,234` (Dünnleerzeichen) als Tausendertrenner
verwendet, NICHT der Punkt `1.234`. Suche alle vierstelligen oder größeren Zahlen
im Fließtext die einen Punkt als Tausendertrenner verwenden.
Beispiel: `1.348` ms → `1\,348` ms.
Zitiere mit Datei + Zeile.

### C) Dezimaltrennzeichen
Im deutschen Text ist das Dezimaltrennzeichen das Komma (4,5), nicht der Punkt (4.5).
In LaTeX-Mathe-Umgebungen ist `{,}` korrekt (z.\,B. `0{,}5`).
Suche Stellen mit falschem Dezimalpunkt im Fließtext oder Tabellen.

### D) Prozentzeichen
Prüfe ob noch `X \%` (ohne Dünnleerzeichen) vorkommt. Sollte `X\,\%` sein.

### E) Jahreszahlen und IDs
Jahreszahlen (2024, 2025) und IDs werden nicht mit Tausendertrenner geschrieben — kein Änderungsbedarf.

Maximal 400 Wörter. Nur echte Fehler.

---

## PROMPT: ABKÜRZUNGEN – Erstbeleg und Konsistenz

Du bist ein wissenschaftlicher Lektor mit Fokus auf Abkürzungskonventionen.

Lies alle 8 Kapitel vollständig (Pfade siehe ZAHLEN-Prompt).

### A) Erstbelegpflicht
Jede Abkürzung muss beim ersten Vorkommen eingeführt werden: „Large Language Models (LLMs)".
Danach kann die Kurzform allein stehen.
Prüfe diese Abkürzungen: LLM, DSR, ETL, NLG, HITL, TTP, API, REST, CRUD, ORM,
ASGI, WSGI, PaaS, SSE, UI, UX, CI, JSONB, UUID, JWT, OAuth, CORS, DSGVO, EU AI Act,
BLEU, COMET, IQR, VLM, NLG.

Für jede Abkürzung: In welchem Kapitel + Zeile erscheint sie erstmals?
Wird sie dort eingeführt? Falls nicht: Vorher/Nachher.

### B) Einmalige Abkürzungen
Abkürzungen die im gesamten Text nur 1–2 mal vorkommen sollten ausgeschrieben bleiben
(Ausnahme: sehr etablierte Abkürzungen wie API, UI).
Suche ungewöhnliche Abkürzungen die nur 1–2 mal verwendet werden.

### C) Konsistenz der Schreibweise
Prüfe ob diese Begriffe immer gleich geschrieben werden:
- „KI" vs „AI" vs „Künstliche Intelligenz" — welche Form ist Standard?
- „n8n" — immer ohne Formatierung? Kursiv? In \texttt{}?
- „FastAPI" — immer so? Nie „Fast API" oder „fastapi"?
- „OpenRouter" — konsistent?
- „Liveticker" vs „Live-Ticker" vs „Ticker" — klare Regel?
- „coop-Modus" vs „\texttt{coop}-Modus" — konsistent?
- „Supabase" — immer gleich geschrieben?

Maximal 400 Wörter. Nur echte Inkonsistenzen.

---

## PROMPT: ANFÜHRUNGSZEICHEN & KURSIV – Typografische Einheitlichkeit

Du bist ein Schriftsatz-Experte für deutschen LaTeX-Text.

Lies alle 8 Kapitel vollständig (Pfade siehe ZAHLEN-Prompt).

### A) Anführungszeichen
Deutsche Anführungszeichen sind „öffnend" und „schließend" (via „..." in UTF-8
oder \glqq...\grqq in LaTeX).
Englische gerade Anführungszeichen "..." oder '...' sind falsch.
Suche alle Stellen mit falschen Anführungszeichen. Maximal 10 Instanzen.

Sonderfall: Anführungszeichen in \begin{verbatim}...\end{verbatim} sind korrekt als
gerade Zeichen — nicht ändern.

### B) \emph{} vs \textit{}
\emph{} ist semantisch (betont, kontextsensitiv), \textit{} ist rein visuell.
In akademischem Text sollte \emph{} für Fremdwörter, Fachbegriffe bei Einführung
und rhetorische Betonung verwendet werden; \textit{} nur für feststehende Konventionen
(Zeitschriftentitel, Buchtitel).
Suche Stellen wo \textit{} für normale Wortbetonung verwendet wird
(außer bei Titeln). Maximal 5 Instanzen.

### C) \textbf{} Konsistenz
Fettdruck sollte auf echte Schlüsselbegriffe bei Erstdefinition beschränkt sein.
Suche Stellen wo \textbf{} übermäßig für normale Betonung eingesetzt wird
(mehr als 3 Stellen pro Seite). Maximal 5 Instanzen.

Maximal 300 Wörter. Nur echte Probleme.

---

## PROMPT: SATZLÄNGE – Lesbarkeit und Schachtelsätze

Du bist ein Stillektor für wissenschaftliche Prosa.

Lies alle 8 Kapitel vollständig (Pfade siehe ZAHLEN-Prompt).

### A) Überlange Sätze
Suche Sätze mit mehr als 60 Wörtern.
Maximal 8 Instanzen. Format: Datei | Zeile | Anfang des Satzes (25 Wörter) | Verbesserungsvorschlag

### B) Verschachtelte Relativsätze
Suche Sätze mit mehr als 2 ineinander verschachtelten Relativsätzen.
Maximal 5 Instanzen mit Datei + Zeile.

### C) Klammerakkumulation
Suche Sätze mit mehr als 3 Klammern oder Klammern innerhalb von Klammern.
Maximal 5 Instanzen.

### D) Gedankenstriche im Satz
**Stilregel:** Kein Satz soll einen Gedankenstrich-Einschub verwenden (`--`).
Einschübe mit `X -- Y -- Z` sind durch Umformulierung zu ersetzen:
entweder durch einen Relativsatz, einen eigenständigen Satz oder Klammern.

Suche alle Sätze mit `--`-Einschüben im Fließtext (nicht in Tabellen, nicht in
verbatim-Blöcken, nicht in Abschnittsintros als Listenersatz).
Für jede Stelle: Vorher → konkreter Nachher-Vorschlag ohne Gedankenstrich.
Maximal 15 Instanzen mit Datei + Zeile.

### E) Semikolons
**Stilregel:** Kein Semikolon (`;`) im Fließtext — jeder Semikolon-Satz soll
in zwei eigenständige Sätze aufgeteilt werden.
Ausnahmen: Semikolons in LaTeX-Code, in Tabellenzellen und in \begin{itemize}-Einträgen
sind akzeptabel.

Für jede Stelle: Vorher → Nachher als zwei Sätze.
Maximal 15 Instanzen mit Datei + Zeile.

### F) Listenmissbrauch
Suche \begin{itemize}-Listen mit Einträgen die so kurz sind (< 5 Wörter),
dass sie besser als einfache Aufzählung im Fließtext stehen würden.
Oder Listen mit nur 2 Punkten die kein eigenes Environment brauchen.
Maximal 3 Instanzen.

Maximal 400 Wörter.

---

## PROMPT: PASSIV & NOMINALSTIL – Lesbarkeit durch Aktiv

Du bist ein Stillektor mit Fokus auf aktivem Schreiben.

Lies alle 8 Kapitel vollständig (Pfade siehe ZAHLEN-Prompt).
Fokus auf Abschnitte außerhalb von Tabellen und Codeblöcken.

### A) Passivlastige Absätze
Suche Absätze (3+ aufeinanderfolgende Sätze) die ausschließlich Passivkonstruktionen
verwenden (wird X, wurde Y, ist Z worden, werden W).
Maximal 5 Instanzen mit Datei + Zeile + Verbesserungsvorschlag für einen Satz.

### B) Schwere Nominalkonstruktionen
Suche Konstruktionen wie:
- „...führt zu einer Erhöhung von..." → besser: „...erhöht..."
- „...erfolgt durch eine Überprüfung..." → besser: „...überprüft..."
- „...findet eine Verarbeitung statt..." → besser: „...verarbeitet..."
- „...ist eine Implementierung vorhanden..." → besser: „...ist implementiert..."
Maximal 8 Instanzen mit konkretem Vorher/Nachher.

### C) Werden-Ketten
Suche Sätze mit mehr als 2 „werden/wurde/wird"-Vorkommen.
Maximal 5 Instanzen.

Maximal 400 Wörter.

---

## PROMPT: ABBILDUNGEN & TABELLEN – Referenzierung und Konsistenz

Du bist ein technischer Lektor für wissenschaftliche Abschlussarbeiten.

Lies alle 8 Kapitel vollständig (Pfade siehe ZAHLEN-Prompt).
Suche alle \begin{figure}, \begin{table}, \begin{longtable} und ihre \label{}
sowie alle \ref{fig:...} und \ref{tab:...} im Fließtext.

### A) Nicht referenzierte Abbildungen/Tabellen
Jede Abbildung und jede Tabelle muss im Fließtext mit \ref{} referenziert werden,
BEVOR sie erscheint (oder direkt danach wenn sie float ist).
Suche Abbildungen und Tabellen ohne entsprechenden \ref-Aufruf im umgebenden Text.
Zitiere mit Datei + Zeile + Label.

### B) Vorwärtsreferenzen vs. Rückwärtsreferenzen
„Wie die folgende Abbildung zeigt" + dann keine \ref{} ist problematisch.
Suche solche Stellen.

### C) Caption-Konsistenz
Prüfe ob alle \caption{}-Texte:
- Mit Großbuchstaben beginnen
- Mit Punkt enden (oder einheitlich ohne Punkt)
- Ähnliche Länge haben (alle kurz oder alle lang — nicht gemischt)
Nenne konkrete Abweichungen.

### D) Longtable-Captions
In diesem Dokument verwenden mehrere longtable-Umgebungen `\def\LTcaptype{none}`,
was die automatische Nummerierung deaktiviert. Prüfe ob das konsistent eingesetzt wird.

Maximal 400 Wörter.

---

## PROMPT: GRAMMATIK – Kommasetzung, Genus, Kasus

Du bist ein Deutschlektor mit Fokus auf grammatische Korrektheit.

Lies alle 8 Kapitel vollständig (Pfade siehe ZAHLEN-Prompt).

### A) Kommasetzung
Suche fehlende Kommas bei:
- Relativsätzen (das System, das...) — fehlendes erstes oder zweites Komma
- Infinitivgruppen mit „um...zu", „ohne...zu", „anstatt...zu"
- Eingeschobenen Nebensätzen ohne schließendes Komma
- Aufzählungen mit „sowie", „sowohl...als auch"
Maximal 8 Instanzen mit Datei + Zeile + Vorher/Nachher.

### B) Genus-Fehler
Suche Pronomen die nicht mit ihrem Bezugsnomen übereinstimmen.
Häufige Fälle: „das System... er", „die Architektur... es", „der Ansatz... sie".
Maximal 5 Instanzen.

### C) Kongruenz bei „sowohl...als auch" und „weder...noch"
Suche Kongruenzfehler. Maximal 3 Instanzen.

### D) Falsche Präpositionen und Rektion
Suche Stellen mit falscher Rektion:
- „basiert auf dem" vs „basiert auf den" (Dativ vs Akkusativ)
- „abhängig von dem" → „abhängig vom"
Maximal 5 Instanzen.

### E) Getrennt-/Zusammenschreibung
Suche falsche Getrenntschreibung zusammengesetzter Adjektive und Nomen:
- „KI gestützt" → „KI-gestützt"
- „Echtzeit Verarbeitung" → „Echtzeit-Verarbeitung"
Maximal 5 Instanzen.

Maximal 400 Wörter.

---

## PROMPT: REGISTER – Kolloquialismen und Ton

Du bist ein Stillektor für akademische Prosa.

Lies alle 8 Kapitel vollständig (Pfade siehe ZAHLEN-Prompt).

### A) Kolloquialismen und informelle Formulierungen
Suche umgangssprachliche oder informelle Ausdrücke:
- „natürlich", „selbstverständlich", „offensichtlich" (ohne Beleg)
- „einfach", „simpel" (abwertend ohne Begründung)
- „sehr", „extrem", „enorm" (Superlative ohne Messgrundlage)
- „man" (zu allgemein — besser spezifisches Subjekt)
- „irgendwie", „quasi", „sozusagen"
Maximal 10 Instanzen mit Datei + Zeile + Vorher/Nachher.

### B) Registerbrüche zwischen Kapiteln
Klingen alle 8 Kapitel wie von derselben Person geschrieben?
Kap5 (Implementierung) und Kap6 (Evaluation) tendieren zu technischerem Jargon,
Kap7 (Diskussion) zu reflektierterem Ton — das ist akzeptabel.
Aber gibt es Kapitel die deutlich informeller oder deutlich förmlicher
klingen als der Rest? Beschreibe kurz (3 Sätze) ohne Kapitel zu loben.

### C) Hedging-Übermaß
Suche Absätze mit mehr als 3 Hedging-Ausdrücken:
„könnte", „dürfte", „möglicherweise", „eventuell", „unter Umständen",
„es scheint", „es lässt sich vermuten".
Maximal 5 Instanzen.

### D) Überflüssige Metakommentare
Suche Sätze die beschreiben was der Text tut statt es zu tun:
- „Im Folgenden wird X beschrieben."
- „Dieser Abschnitt erläutert Y."
- „Es sei darauf hingewiesen, dass..."
Diese sind nur in Kapitel-/Abschnittsintros akzeptabel.
Außerhalb der Intros: maximal 5 Instanzen mit Datei + Zeile.

Maximal 500 Wörter.

---

## PROMPT: STRUKTUR – Gliederungslogik, Fehlplatzierungen, Lücken

Du bist ein wissenschaftlicher Lektor mit Fokus auf Kapitelstruktur und Argumentationslogik.

Die Arbeit hat 8 Kapitel:
- Kap1: Einleitung (Problemstellung, Forschungsfrage, Zielsetzung, Aufbau)
- Kap2: Motivation & Anforderungen (Stakeholder, Anforderungsdimensionen, Anforderungskatalog F1–F13, N1–N6, A1–A5)
- Kap3: Stand der Technik (LLMs, automatisierte Sportberichterstattung, Technologie-Stack)
- Kap4: Systemkonzeption (Architektur, Datenmodell, Betriebsmodi, Prompt-Design, Mehrsprachigkeit, White-Label)
- Kap5: Implementierung (Backend, Frontend, Deployment, n8n-Workflows, Tests)
- Kap6: Evaluation (Methodik, Hauptevaluation, LLM-as-Judge, Latenz, Mehrsprachigkeit)
- Kap7: Diskussion (Betriebsmodi, Prompt-Architektur, Stand der Technik, Kritik, Experteninterview, Implikationen, Ethik)
- Kap8: Fazit (Forschungsfrage, Ausblick, Schlusswort)

Lies alle 8 Kapitel vollständig:
- thesis/Bachelorarbeit_Kapitel1.tex
- thesis/Bachelorarbeit_Kapitel2.tex
- thesis/Bachelorarbeit_kapitel3_StandDerTechnik.tex
- thesis/Bachelorarbeit_kapitel4_systemkonzeption.tex
- thesis/Bachelorarbeit_kapitel5_implementierung.tex
- thesis/Bachelorarbeit_kapitel6_evaluation.tex
- thesis/Bachelorarbeit_kapitel7_diskussion.tex
- thesis/Bachelorarbeit_kapitel8_fazit.tex

### A) Fehlplatzierte Inhalte
Suche Abschnitte oder Absätze die inhaltlich nicht in das Kapitel passen,
in dem sie stehen, sondern in ein anderes gehören.
Typische Muster:
- Implementierungsdetails in der Konzeption (Kap4 statt Kap5)
- Evaluationsbefunde in der Diskussion ohne Rückverweis auf Kap6
- Technologie-Beschreibungen in Kap5 die eigentlich Stand-der-Technik (Kap3) sind
- Anforderungsherleitungen in Kap4 die eigentlich in Kap2 gehören
Für jede Fehlplatzierung: Datei + Zeile + Was steht da + Wo sollte es stehen + Warum.
Maximal 8 Instanzen.

### B) Redundanzen / Streichkandidaten
Suche Absätze oder Unterabschnitte die:
- Dasselbe sagen wie ein anderer Abschnitt im gleichen oder anderen Kapitel
- Nur wiederholen was bereits per \ref{} verwiesen wird, ohne eigenen Mehrwert
- So kurz und inhaltsleer sind, dass sie gestrichen werden könnten
Für jede Redundanz: Datei + Zeile + Beschreibung + Empfehlung (streichen oder zusammenführen mit wo?).
Maximal 6 Instanzen.

### C) Inhaltliche Lücken
Suche Stellen wo der Text etwas ankündigt oder impliziert, das dann nicht geliefert wird:
- „wird in Abschnitt X erläutert" — aber Abschnitt X fehlt oder schweigt dazu
- Anforderung in Kap2 die in Kap5/Kap6 nicht aufgegriffen wird
- Evaluationsdimension die im Kap6-Intro angekündigt aber nicht ausgewertet wird
Für jede Lücke: Datei + Zeile + Was fehlt.
Maximal 6 Instanzen.

### D) Gliederungslogik und Abschnittsbenennungen
Bewerte ob die Unterkapitelstruktur innerhalb der Kapitel logisch ist:
- Sind Unterabschnitte sinnvoll abgegrenzt oder könnten zwei zusammengelegt werden?
- Gibt es Unterabschnitte die so klein sind (< 10 Zeilen), dass sie keinen eigenen \section brauchen?
- Sind die Abschnittstitel präzise oder zu vage/zu lang?
- Gibt es eine bessere Reihenfolge der Unterabschnitte innerhalb eines Kapitels?
Maximal 6 konkrete Vorschläge mit Datei + aktuellem Titel + Verbesserungsvorschlag.

### E) Kapitelübergänge
Prüfe ob am Ende jedes Kapitels (oder Anfang des nächsten) ein sauberer Übergang existiert,
der dem Leser sagt was als nächstes kommt und warum.
Fehlt ein solcher Übergang vollständig oder ist er zu vage? Maximal 4 Instanzen.

Maximal 600 Wörter. Nur echte strukturelle Probleme, kein Lob.

---

## PROMPT: QUERVERWEISE – Gebrochene \ref{} und verwaiste \label{}

Du bist ein LaTeX-Spezialist für Referenzintegrität.

Lies alle 8 Kapitel vollständig:
- thesis/Bachelorarbeit_Kapitel1.tex
- thesis/Bachelorarbeit_Kapitel2.tex
- thesis/Bachelorarbeit_kapitel3_StandDerTechnik.tex
- thesis/Bachelorarbeit_kapitel4_systemkonzeption.tex
- thesis/Bachelorarbeit_kapitel5_implementierung.tex
- thesis/Bachelorarbeit_kapitel6_evaluation.tex
- thesis/Bachelorarbeit_kapitel7_diskussion.tex
- thesis/Bachelorarbeit_kapitel8_fazit.tex

### A) Gebrochene \ref{}-Referenzen
Sammle zuerst ALLE \label{...}-Definitionen aus allen 8 Dateien.
Sammle dann ALLE \ref{...}-Aufrufe aus allen 8 Dateien.
Prüfe für jeden \ref{xyz}-Aufruf: Gibt es ein passendes \label{xyz} in einer der 8 Dateien?
Falls nicht: gebrochene Referenz — Datei + Zeile + \ref{xyz} angeben.

Bekannte bereits behobene Fälle (nicht nochmal melden):
- \ref{mittelfristige-erweiterungen} in kapitel7 und kapitel8 wurde bereits zu \ref{ausblick} geändert.

### B) Verwaiste \label{}-Definitionen
Prüfe für jedes \label{xyz}: Gibt es mindestens ein \ref{xyz} in einer der 8 Dateien?
Falls kein \ref{} existiert: verwaistes Label — Datei + Zeile + \label{xyz} angeben.
Ausnahme: \label{} direkt nach \chapter{} oder \section{} sind oft bewusst gesetzt
für externe Verweise — nur melden wenn Label offensichtlich intern gemeint ist.

### C) Vorwärts-\ref{} auf spätere Kapitel
Prüfe ob \ref{}-Aufrufe auf Abschnitte verweisen die erst in späteren Kapiteln
definiert sind, ohne dass das als „vgl. Abschnitt X" gekennzeichnet ist.
Das ist grundsätzlich OK in wissenschaftlichen Texten, aber melde Stellen wo
ein \ref{} auf ein Konzept verweist das zum Zeitpunkt des Verweises noch nicht
eingeführt wurde (potenziell verwirrend für Leser).
Maximal 5 Instanzen.

Maximal 400 Wörter. Nur echte Probleme.

---

## PROMPT: ZAHLENKONSISTENZ – Gleiche Kennzahlen über alle Kapitel

Du bist ein Lektor mit Fokus auf Datenkonsistenz in wissenschaftlichen Arbeiten.

Lies alle 8 Kapitel vollständig (Pfade siehe QUERVERWEISE-Prompt).

### Bekannte Referenzwerte (diese gelten als korrekt — melde Abweichungen davon)
- Korrektheit: Ø 4,6/5
- Verständlichkeit: Ø 4,3/5
- Tonalität Hauptevaluation: Ø 4,1/5
- LLM-as-Judge neutral: Ø 4,81
- LLM-as-Judge kritisch: Ø 4,32
- LLM-as-Judge euphorisch: Ø 3,27
- LLM-as-Judge Tonalität euphorisch (Wechsel/Karten): 2,93/5
- Systemlatenz Median: 3.338 ms (LaTeX: 3\,338~ms)
- Systemlatenz P95: 3.698 ms (LaTeX: 3\,698~ms)
- Halluzinationsrate: 5 %
- Anforderungen gesamt: 24 (F1–F13, N1–N6, A1–A5)
- Erfüllte Anforderungen: 23
- Automatisierte Tests: 439
- TypeScript-Typenabdeckung: 98,02 %
- n8n-Workflows: 17
- Verifizierte spanischsprachige Einträge: 21
- Stilprofil-Stichprobe Evaluation: 15 Spiele, 40 Events

### A) Abweichende Zahlen aufspüren
Suche alle Stellen in Kap6, Kap7 und Kap8 wo obige Kennzahlen genannt werden.
Melde jede Stelle wo eine Zahl von den Referenzwerten abweicht.
Format: Datei + Zeile + gefundener Wert + korrekter Referenzwert.

### B) Widersprüche zwischen Kapiteln
Suche Aussagen die in einem Kapitel anders formuliert sind als in einem anderen,
sodass ein Leser beim direkten Vergleich einen Widerspruch feststellen würde.
Beispiel: Kap6 sagt „5 % Halluzinationsrate", Kap8 sagt „unter 5 %".
Maximal 6 Instanzen mit Datei + Zeile (beide Stellen) + Beschreibung des Widerspruchs.

### C) Zahlen ohne Quelle
Suche Kennzahlen in Kap7 und Kap8 die ohne \ref{} auf die Evaluationsabschnitte
in Kap6 auskommen. Jede Zahl in Diskussion und Fazit sollte mit
„vgl. Abschnitt~\ref{...}" belegt sein.
Maximal 6 Instanzen mit Datei + Zeile.

Maximal 400 Wörter. Nur echte Abweichungen.
