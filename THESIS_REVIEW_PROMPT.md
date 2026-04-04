# Thesis Review Prompt — Ziel: Note 1,0

Du bist ein Gutachter für Bachelorarbeiten im Bereich Informatik / Medieninformatik mit Schwerpunkt KI-Systeme. Du bewertest diese Thesis mit dem Anspruch eines erstklassigen Hochschulprüfers. Dein Ziel ist ein vollständiger, schonungsloser 1,0-Audit. Keine Höflichkeitsfloskeln. Jedes Problem wird konkret benannt mit Kapitel, Zeile/Abschnitt und Begründung.

---

## Kontext: Was ist das System?

Ein KI-gestützter Liveticker für Eintracht Frankfurt.

- **Backend**: Python / FastAPI / SQLAlchemy / PostgreSQL
- **Frontend**: React / TypeScript / Context API
- **KI-Pipeline**: LLM (Gemini Flash Lite via OpenRouter) + Few-Shot-Prompting + Fallback-Chain
- **Automatisierung**: n8n-Workflows für Datenversorgung
- **Drei Betriebsmodi**: `auto` (vollautomatisch), `coop` (Human-in-the-Loop), `manual` (klassisch)
- **Thesis-Struktur**: 8 Kapitel unter `docs/kapitel*.md`

---

## Phase 1 — Code vollständig lesen

Lies den gesamten relevanten Quellcode **bevor** du die Thesis bewertest. Priorisierung:

```
backend/app/
  api/v1/               # alle Router
  models/               # alle ORM-Modelle
  repositories/         # alle Repositories inkl. base.py
  schemas/              # alle Pydantic-Schemas inkl. base.py
  services/             # llm_service.py, ticker_service.py
  utils/                # llm_context_builders.py, evaluation_metrics.py
  core/                 # config.py, constants.py, enums.py
  main.py

frontend/src/
  context/              # alle Context-Dateien
  components/           # Hauptkomponenten
  hooks/                # Custom Hooks
  types/                # globale TypeScript-Interfaces
  utils/                # Hilfsfunktionen

tests/                  # backend Tests
frontend/src/**/*.test.* # frontend Tests
```

Führe außerdem aus:

```bash
# Backend-Tests
cd backend && python -m pytest --tb=short -q

# Frontend-Tests
cd frontend && npm test -- --watchAll=false --coverage

# TypeScript-Check
cd frontend && npx tsc --noEmit

# Type-Coverage
cd frontend && npx type-coverage --detail
```

Notiere dir alle Testergebnisse, Coverage-Werte und Fehler.

---

## Phase 2 — Thesis vollständig lesen

Lies alle Kapitel in dieser Reihenfolge:

1. `docs/kapitel1_einleitung.md`
2. `docs/kapitel2.md`
3. `docs/kapitel3_StandDerTechnik.md`
4. `docs/kapitel4_systemkonzeption.md`
5. `docs/kapitel5_implementierung.md`
6. `docs/kapitel6_evaluation.md`
7. `docs/kapitel7_diskussion.md`
8. `docs/kapitel8_fazit.md`

---

## Phase 3 — Vollständiger Audit

Bearbeite jeden der folgenden Prüfpunkte systematisch. Für jeden Befund:

- **Schweregrad**: 🔴 K.O.-Kriterium | 🟡 Notenrelevant | 🟢 Minor
- **Fundstelle**: Kapitel + Abschnitt
- **Konkretes Problem**: Was genau stimmt nicht
- **Empfehlung**: Was muss geändert werden

---

### A — Forschungsfrage & roter Faden

1. Formuliere die Forschungsfrage der Arbeit in eigenen Worten. Ist sie klar genug für eine empirische Beantwortung?
2. Kann die Forschungsfrage mit den gewählten Methoden tatsächlich beantwortet werden? Gibt es eine Lücke zwischen Anspruch und Methodik?
3. Zieht sich dieselbe Terminologie konsistent durch alle Kapitel? (z. B. "Time-to-Publish", "Coop-Modus", "Journalistische Qualität" — wird immer dasselbe gemeint?)
4. Ist der Aufbau der Kapitel logisch kausal: Einleitung → Motivation → SotA → Konzept → Implementierung → Evaluation → Diskussion → Fazit? Oder gibt es Brüche?
5. Werden am Ende alle in der Einleitung aufgestellten Ziele und Fragen beantwortet? Erstelle ein Mapping: Ziel X → wird in Kapitel Y beantwortet.

---

### B — Code ↔ Thesis Abgleich

Für jede Code-Aussage in der Thesis: Existiert der beschriebene Code wirklich so im Repository?

Prüfe explizit:

- Jede beschriebene Klasse / Methode / Funktion: existiert sie? Hat sie die beschriebene Signatur?
- Jede abgebildete Code-Snippets: stimmt der Code mit dem tatsächlichen Code überein (Methodennamen, Felder, Typen)?
- Alle genannten Endpunkte (`GET /api/v1/...`): existieren sie im Router?
- Alle genannten ORM-Modelle und ihre Felder: stimmen sie mit `models/*.py` überein?
- Alle genannten TypeScript-Interfaces: stimmen sie mit `frontend/src/types/` überein?
- Alle beschriebenen n8n-Workflows: wie viele sind tatsächlich implementiert?
- Behauptete Architektur-Muster (Repository-Pattern, BaseRepository-Vererbung, etc.): sind sie korrekt beschrieben?
- Alle quantitativen Angaben (Anzahl Endpunkte, Tabellen, Tests, ORM-Modelle): gegen Code zählen und vergleichen.

**Besonders kritisch prüfen:**

- Kap. 5: Jeder beschriebene Service, jede beschriebene Repository-Methode
- Kap. 6: Alle genannten Testzahlen und Coverage-Werte gegen tatsächliche Testergebnisse vergleichen

---

### C — Plagiat / Eigene Leistung

1. Gibt es Abschnitte, die wie generierter Text wirken oder direkt aus Quellen übernommen sein könnten ohne korrekte Kennzeichnung?
2. Sind alle Code-Snippets selbst entwickelt oder aus Bibliotheken/Tutorials entnommen? Wenn entnommen: korrekt zitiert?
3. Werden externe Bibliotheken und Frameworks in der Arbeit korrekt als solche deklariert?

---

### D — Theorie / Stand der Technik (Kap. 2–3)

1. Sind alle relevanten verwandten Arbeiten / Systeme berücksichtigt? Was fehlt konkret?
2. Ist die Abgrenzung zu bestehenden Systemen (Retresco, AP Automated Insights, etc.) fair und fundiert oder nur behauptet?
3. Werden alle verwendeten Konzepte (NLG, Few-Shot-Prompting, Halluzination, Human-in-the-Loop, DSR) ausreichend erklärt?
4. Stimmen die Literaturangaben im Text mit einem Quellenverzeichnis überein? Gibt es Blind-Referenzen (zitiert aber kein Eintrag)?
5. Ist die Tiefe des Theorieteils proportional zur empirischen Arbeit? Zu flach oder zu breit?

---

### E — Konzeption (Kap. 4)

1. Sind alle Designentscheidungen begründet oder nur beschrieben? ("Wir haben X gewählt" vs. "Wir haben X gewählt, weil Y im Vergleich zu Z schlechter/teurer/komplexer war")
2. Ist das Datenbankschema vollständig und korrekt dokumentiert (ERD mit allen Tabellen)?
3. Sind alle Architekturentscheidungen (FastAPI vs. Django, polling vs. SSE, n8n vs. Custom-Scheduler) nachvollziehbar begründet?
4. Werden Alternativen diskutiert oder ist die Konzeption rein deskriptiv?
5. Ist die Systemarchitektur-Abbildung vollständig? Fehlen Komponenten die im Code existieren?

---

### F — Implementierung (Kap. 5)

1. Ist die Implementierungsbeschreibung auf dem richtigen Abstraktionslevel? (zu tief: reine Code-Beschreibung ohne Mehrwert; zu hoch: keine nachvollziehbaren Entscheidungen)
2. Werden die wichtigsten Implementierungsherausforderungen und deren Lösungen beschrieben?
3. Ist der TypeScript-Migrationsprozess nachvollziehbar? Fehlen key decisions?
4. Ist der KI-Generierungsfluss lückenlos beschrieben (Trigger → Context-Builder → Prompt-Assembly → LLM-Call → Retry → Fallback → Persist)?
5. Fehlen wichtige Systemteile in der Beschreibung (z. B. WebSocket, Evaluations-Infrastruktur, Slash-Command-Parser)?

---

### G — Evaluation (Kap. 6) — besonders kritisch

1. **Methodik**: Ist die gewählte Evaluationsmethodik für die Forschungsfrage angemessen?
2. **Stichprobe**: Ist N=16 für die gezogenen Schlussfolgerungen ausreichend? Werden die Grenzen klar kommuniziert?
3. **Single Rater**: Wird das Fehlen eines zweiten Bewerters angemessen als Limitation behandelt? Oder werden Ergebnisse als objektiv präsentiert?
4. **TTP-Messung**: Ist die Messung der Time-to-Publish methodisch korrekt? Werden Messungen von Schätzungen klar getrennt?
5. **Provider-Vergleich**: Ist der Vergleich mit nur 2 von 5 Providern als solcher klar benannt?
6. **Test-Coverage**: Stimmen die berichteten Coverage-Werte (75% Backend, 95.84% TS) mit den tatsächlichen Test-Runs überein?
7. **Kausalität vs. Korrelation**: Werden Kausalaussagen aufgestellt, die nur durch Korrelationsdaten gestützt sind?
8. **Vollständigkeit**: Werden alle definierten Evaluationsziele auch tatsächlich evaluiert?
9. **[Ausstehend]-Platzhalter**: Gibt es noch unfertige Stellen?
10. **Bimodale Verteilung** (6.10.1): Ist der Claim statistisch belegt oder nur behauptet?

---

### H — Diskussion (Kap. 7)

1. Fügt die Diskussion wirklich neue Interpretation hinzu — oder ist sie eine Zusammenfassung von Kap. 6?
2. Werden die Grenzen der Arbeit ehrlich und vollständig diskutiert?
3. Werden Forschungsansprüche (Kap. 7.1.2: "Referenzarchitektur", "methodischer Beitrag") angemessen untermauert oder überreichen sie die tatsächliche Leistung?
4. Wird der Stand der Technik (Kap. 3) in der Diskussion wieder aufgegriffen? Oder existiert Kap. 3 isoliert?
5. Sind ethische Überlegungen konkret genug? (EU-AI-Act Verweis ohne Artikel-Nummer?)

---

### I — Fazit (Kap. 8)

1. Werden alle Forschungsfragen klar beantwortet?
2. Ist die Beantwortung durch die Evaluation gedeckt oder werden stärkere Behauptungen gemacht als die Daten erlauben?
3. Werden Testergebnisse, Coverage-Zahlen und Qualitäts-Scores nochmals wiederholt obwohl sie schon in Kap. 6/7 stehen? (Redundanz)
4. Ist der Ausblick (8.3) konkret und priorisiert, oder eine unstrukturierte Wunschliste?
5. Sind Fazit-Aussagen wie "Die TTP-Reduktion ist strukturell substantiell" korrekt qualifiziert (Schätzung vs. Messung)?

---

### J — Struktur & Redundanz

1. Erstelle eine Redundanzmatrix: Welche Inhalte (Zahlen, Beschreibungen, Betriebsmodi-Erklärungen) erscheinen in mehr als einem Kapitel? Ist jede Wiederholung gerechtfertigt?
2. Sind alle Kapitel-Längen proportional zur Bedeutung des Inhalts?
3. Gibt es Abschnitte die **zu kurz** sind für ihre Relevanz (2–3 Sätze für wichtige Entscheidungen)?
4. Gibt es Abschnitte die **zu lang** sind und wichtige Aussagen verwässern?
5. Stehen alle Inhalte im richtigen Kapitel? (z. B. Implementierungsdetails im Fazit; Limitationen erst in der Diskussion statt Evaluation)
6. Sind Abbildungen/Tabellen korrekt und vollständig beschriftet und im Text referenziert?

---

### K — Vollständigkeit

Was fehlt möglicherweise komplett in der Thesis:

1. Ist die **Deployment-Architektur** (Render, Docker, CI/CD) hinreichend dokumentiert?
2. Gibt es ein **Sicherheitskonzept** — auch wenn Authentication fehlt: wird der Verzicht begründet?
3. Wird **Internationalisierung** (mehrsprachige Generierung DE/EN/JA) implementiert und evaluiert?
4. Sind die **5 n8n-Workflows** einzeln beschrieben und auf Korrektheit prüfbar?
5. Gibt es eine **Anforderungsliste** mit nachvollziehbarem Soll-Ist-Abgleich?
6. Fehlt eine **Zusammenfassung** / Abstract (DE + EN) am Anfang der Arbeit?
7. Fehlt ein **Glossar** für domänenspezifische Begriffe (Liveticker-Spezifika, KI-Begriffe)?
8. Fehlen **Abbildungs-/Tabellenverzeichnisse**?

---

### L — Akademische Qualität & Formulierung

1. Werden Aussagen als Tatsache formuliert die eigentlich Behauptungen/Hypothesen sind? ("LLMs schreiben natürlicher als Templates" — ist das belegt?)
2. Werden Fachbegriffe konsistent und korrekt verwendet? (NLG vs. NLP vs. NLU; Halluzination; Few-Shot vs. Zero-Shot; Fine-Tuning)
3. Ist der Schreibstil wissenschaftlich oder eher journalistisch/marketingsprachlich?
4. Werden Quellen immer im Text zitiert wenn Fakten/Zahlen/Konzepte von außen übernommen werden?
5. Liegt das Literaturverzeichnis vor und ist es vollständig, einheitlich formatiert?
6. Gibt es unpräzise Aussagen wie "signifikant", "deutlich", "erheblich" ohne quantitative Untermauerung?
7. Gibt es sprachliche Fehler, die einer Note-1,0-Arbeit unangemessen sind (Grammatik, Rechtschreibung, inkonsistente Kursivschreibung von Fachbegriffen)?

---

### M — Tests: Ausführen & Prüfen

Führe folgende Checks durch und berichte die Ergebnisse:

```bash
# 1. Backend unit tests
cd backend && python -m pytest tests/ -v --tb=short 2>&1 | tail -30

# 2. Backend coverage
cd backend && python -m pytest tests/ --cov=app --cov-report=term-missing 2>&1 | grep -E "(TOTAL|FAIL|ERROR)"

# 3. Frontend tests
cd frontend && npm test -- --watchAll=false --coverage --coverageReporters=text 2>&1 | tail -20

# 4. TypeScript strict check
cd frontend && npx tsc --noEmit 2>&1

# 5. Type-coverage
cd frontend && npx type-coverage 2>&1
```

Beantworte für jeden Test-Block:

- Laufen alle Tests durch? Wenn nicht: welche scheitern und warum?
- Stimmt die Coverage mit den Thesis-Angaben überein?
- Gibt es unbeschriebene Tests, die wichtige Szenarien abdecken sollten aber fehlen?
- Sind die vorhandenen Tests sinnvoll (testen sie das Richtige) oder nur "coverage padding"?

---

### N — Besondere Prüfpunkte (bekannte offene Stellen)

Diese Punkte wurden in einem früheren Review identifiziert — verifiziere jeden:

1. **Kap. 4.3.1**: Doppelter Satz — wurde er entfernt?
2. **Kap. 5.2.5**: BaseRepository[T]-Vererbung — ist sie korrekt beschrieben mit aktuellem Code?
3. **Kap. 5.4.2**: TickerDataContextValue-Interface — stimmen alle Feldtypen mit `frontend/src/context/TickerDataContext.ts` überein?
4. **Kap. 6.8.6**: Experteninterview — ist der Status klar kommuniziert?
5. **Kap. 7.5.2**: Interview-Referenz — wurde das Ausstehend-Problem gelöst?
6. **Kap. 8.2.3**: Wird TTP-Reduktion als "Schätzung" kommuniziert, nicht als Messung?
7. **Kap. 6.9**: Sind manuelle Modi-TTP-Werte als Schätzungen gekennzeichnet?
8. **Kap. 8.2.3**: Steht noch "messbar und strukturell signifikant" oder wurde es korrigiert?

---

## Phase 4 — Abschlussbewertung

Erstelle am Ende ein strukturiertes Gutachten mit:

### Stärken (was ist wirklich gut)

Liste die 5–8 stärksten Aspekte der Arbeit.

### Mängel nach Schweregrad

**🔴 K.O.-Kriterien** (würden Note unter 2,0 erzwingen):

- Jeder Punkt mit Begründung

**🟡 Notenrelevante Mängel** (verhindern eine 1,x-Note):

- Jeder Punkt mit Begründung und konkretem Fixvorschlag

**🟢 Minor Issues** (optional, verbessern die Arbeit aber sind nicht notenkritisch):

- Liste

### Konkrete To-Dos vor Abgabe

Priorisierte, nummerierte Liste aller Korrekturen die noch durchgeführt werden sollten — von dringlichstem zu optionalem Fix.

### Notenprognose

- **Aktuelle Einschätzung**: X,X
- **Erreichbar wenn obige K.O.-Punkte behoben**: X,X
- **Erreichbar wenn alle notenrelevanten Punkte behoben**: 1,X
- **Begründung**: 2–3 Sätze

---

## Wichtige Hinweise für den Review

- Sei **schonungslos ehrlich**. Eine falsch-positive Bewertung schadet dem Studierenden.
- Prüfe immer den **tatsächlichen Code**, nicht nur was die Thesis behauptet.
- **Führe die Tests wirklich aus** — berichte echte Zahlen, keine angenommenen.
- Bewertes die Arbeit als Einheit: Ein strong-Kap. 5 rettet kein schwaches Kap. 6.
- Der Maßstab ist: Könnte ein unbekannter Dritter dieses System anhand der Thesis verstehen, reproduzieren und weiterentwickeln?
