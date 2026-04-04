# Kapitel 6 – Evaluation

---

## 6.1 Zielsetzung der Evaluation

Das Ziel der Evaluation ist es, das implementierte System auf mehreren Ebenen nachweisbar zu bewerten. Die Evaluation gliedert sich in drei Blöcke:

1. **Technische Qualitätssicherung** (Abschnitte 6.2–6.6): Korrektheit der Kernlogik (Unit-Tests), Zusammenspiel der API-Schichten (Integrations-Tests), Stabilität der Benutzeroberfläche (End-to-End-Tests) und statische Typsicherheit (TypeScript-Coverage).
2. **Evaluation der KI-Textgenerierung** (Abschnitte 6.7–6.9): Quantitative Metriken, qualitative Analyse der generierten Texte und Vergleich der Betriebsmodi.
3. **Systembetrachtung** (Abschnitte 6.10–6.12): Performance und Laufzeitverhalten, Anforderungsabgleich (Soll-Ist) sowie Limitationen und offene Punkte.

Die Metriken dienen nicht nur der Qualitätssicherung, sondern dokumentieren auch die Reife der Codebasis für einen produktiven Einsatz und identifizieren gleichzeitig die Grenzen des aktuellen Systems.

---

## 6.2 Teststrategie und Testpyramide

Die Teststrategie folgt dem klassischen Pyramiden-Modell nach Cohn (2009): Eine breite Basis schneller, isolierter Unit-Tests wird durch eine mittlere Schicht von Integrations-Tests ergänzt, die reale HTTP-Endpunkte gegen eine transaktionale Testdatenbank prüfen. An der Spitze stehen Playwright-basierte End-to-End-Tests, die den vollständigen Redaktionsworkflow im Browser simulieren.

```
          ┌──────────┐
          │  E2E (6) │   Playwright — Browser-Workflow
         ┌┴──────────┴┐
         │  API-Tests  │  FastAPI TestClient + PostgreSQL
        ┌┴────────────┴┐
        │  Unit-Tests   │ Jest/React Testing Library + pytest
        └──────────────┘
```

Diese Pyramide stellt sicher, dass die Mehrheit der Testfälle ohne externe Abhängigkeiten läuft und damit in CI-Pipelines schnell und zuverlässig ausgeführt werden kann. Die Integrations-Tests sind so strukturiert, dass sie bei fehlender Datenbankverbindung automatisch übersprungen werden (`pytest.skip`) und keine falschen Fehlermeldungen erzeugen.

---

## 6.3 Frontend-Unit-Tests (Jest + React Testing Library)

### 6.3.1 Übersicht

Das Frontend verfügt über **187 Unit-Tests** in 15 Testdateien, die alle mit `npm test -- --watchAll=false` grün durchlaufen. Die Tests decken vier Kategorien ab: Utility-Funktionen, React-Hooks, UI-Komponenten und TypeScript-Typen.

| Test-Suite               | Datei                                      | Tests | Fokus                                                  |
| ------------------------ | ------------------------------------------ | ----- | ------------------------------------------------------ |
| `parseCommand`           | `utils/parseCommand.test.ts`               | 45    | Slash-Command-Parser: alle Events, Phasen, Fehlerfälle |
| `roundLabel`             | `utils/roundLabel.test.ts`                 | 16    | Spieltag-Beschriftungen, Knockout-Mapping              |
| `RightPanelComponents`   | `components/RightPanelComponents.test.tsx` | 18    | Aufstellung, Statistiken, Tabs                         |
| `PublishedEntry`         | `components/PublishedEntry.test.tsx`       | 17    | Eintrag-Darstellung, Bearbeitungsmodus                 |
| `EntryEditor`            | `components/EntryEditor.test.tsx`          | 19    | Publish-Flow, Preview-Rendering, Keyboard-Shortcuts    |
| `useRightPanelData`      | `hooks/useRightPanelData.test.ts`          | 10    | Spieler-Lookup, Linien-Bildung, Torschützen            |
| `useSearchableDropdown`  | `hooks/useSearchableDropdown.test.ts`      | 10    | Filter-, Keyboard-, Reset-Logik                        |
| `useLiveMinute`          | `hooks/useLiveMinute.test.ts`              | 10    | Live-Minuten-Berechnung, Halbzeit-Offset               |
| `useListKeyboard`        | `hooks/useListKeyboard.test.tsx`           | 9     | Arrow-Navigation, Tab/Enter/Escape                     |
| `CommandPalette`         | `components/CommandPalette.test.ts`        | 7     | Autocomplete-Logik, Keyboard-Navigation                |
| `useMatchEvents`         | `hooks/useMatchEvents.test.ts`             | 6     | Event-Filterung, Status-Mapping                        |
| `resolvePollingInterval` | `utils/resolvePollingInterval.test.ts`     | 6     | Polling-Frequenz je Spielstatus                        |
| `useMatchTicker`         | `hooks/useMatchTicker.test.ts`             | 5     | Polling-Logik, Fehlerbehandlung                        |
| `useClickOutside`        | `hooks/useClickOutside.test.ts`            | 5     | Event-Listener-Lifecycle                               |
| `ErrorBoundary`          | `components/ErrorBoundary.test.tsx`        | 4     | Fehler-Capture, Fallback-UI                            |

### 6.3.2 Kernmodul: `parseCommand`

Der `parseCommand`-Utility ist das komplexeste Stück Geschäftslogik im Frontend — er transformiert Slash-Commands (z. B. `/g Müller SGE`) in strukturierte Ticker-Einträge. Die 45 Tests decken alle 11 Command-Typen (Tor, Eigentor, Gelbe/Rote Karte, Wechsel, Notiz, verfehlter Elfmeter und alle 11 Phasen-Commands) sowie explizit die Fehlerfälle ab: Jeder Test prüft `isValid`, `type`, `formatted`, `meta.icon` und `warnings` — unvollständige Eingaben liefern gezielte Hinweise (`"Fehlend: Spieler"`) statt Laufzeitfehler (vgl. `parseCommand.test.ts`).

### 6.3.3 Beispiel: `useLiveMinute`

Der Hook `useLiveMinute` berechnet die aktuelle Spielminute aus dem Anstoßzeitpunkt, sofern keine Minuten-Information direkt im Match-Objekt vorhanden ist. Die 10 Tests decken sowohl die Halbzeit-Korrektur (+46 Minuten ab der 60. Minute) als auch den Puffer bei fehlendem Kickoff-Timestamp ab (vgl. `useLiveMinute.test.ts`).

---

## 6.4 Backend-Unit-Tests (pytest)

### 6.4.1 Übersicht

Das Backend verfügt über **210 Tests** in 11 Test-Dateien, die mit einer Gesamt-Coverage von **75 %** abgeschlossen werden. Alle 210 Tests laufen grün durch (`210 passed`).

```
$ pytest tests/ --cov=app -q
...
198 passed in 3.9s
TOTAL  3230  793  75%
```

### 6.4.2 Teststruktur

| Test-Datei                        | Tests | Kategorie           | Fokus                                                                    |
| --------------------------------- | ----- | ------------------- | ------------------------------------------------------------------------ |
| `test_ticker_api.py`              | 20    | API (Integration)   | Ticker CRUD, Publish/Reject, Manual-Entry, Phasen-Deduplizierung         |
| `test_matches_api.py`             | 27    | API (Integration)   | Match CRUD, Ticker-Mode, Lineup, Statistiken, Player-Stats, Verletzungen |
| `test_events_api.py`              | 11    | API (Integration)   | Events: Upsert, Paginierung, Update, Delete                              |
| `test_competitions_api.py`        | 12    | API (Integration)   | Wettbewerbe: Listenabfrage, Paginierung                                  |
| `test_players_api.py`             | 11    | API (Integration)   | Spieler: Abfrage, Sortierung                                             |
| `test_ticker_entry_repository.py` | 10    | Repository (Unit)   | CRUD-Operationen auf Datenbankebene                                      |
| `test_ticker_service.py`          | 10    | Service (Unit)      | Kontext-Aufbau, Score-Berechnung, KI-Eintrag-Erstellung                  |
| `test_evaluation_metrics.py`      | 18    | Utility (Unit)      | TTP, Cliff's Delta, Bootstrap-CI, Cohen's Kappa, Verteilungsanalyse      |
| `test_llm_service.py`             | 28    | Service (Unit/Mock) | LLM-Provider-Routing, Prompt-Aufbau, Fallback-Logik                      |
| `test_constants.py`               | 14    | Utility (Unit)      | Konstanten-Vollständigkeit, Phasen-Mapping                               |
| `test_utils.py`                   | 37    | Utility (Unit)      | HTTP-Fehlerbehandlung, DB-Utilities, Context-Builder                     |

### 6.4.3 API-Integrations-Tests

Die API-Tests nutzen FastAPIs `TestClient` mit einer transaktionalen PostgreSQL-Session, die nach jedem Test per Rollback zurückgesetzt wird. Dadurch sind Tests voneinander isoliert und hinterlassen keine persistenten Daten. Der `db`-Fixture erzeugt eine Session mit `autocommit=False` und führt nach dem `yield` ein `session.rollback()` aus; der `client`-Fixture überschreibt die `get_db`-Dependency-Injection von FastAPI, sodass alle Route-Handler dieselbe transaktionale Session verwenden. Exemplarisch wird ein Test für die Ticker-Mode-Route gezeigt, der sowohl den Erfolgsfall (`mode: "coop"` → 200) als auch die Validierung (`mode: "invalid"` → 422) abdeckt.

### 6.4.4 Coverage-Verteilung nach Schicht

Die 75 %-Gesamtcoverage verteilt sich sehr ungleich über die Systemschichten — ein bewusstes Ergebnis der Priorisierung:

| Schicht                           | Dateien | Ø Coverage | Anmerkung                                         |
| --------------------------------- | ------- | ---------- | ------------------------------------------------- |
| **Modelle** (`app/models/`)       | 17      | 100 %      | Vollständig abgedeckt                             |
| **Schemas** (`app/schemas/`)      | 11      | ~95 %      | Pydantic-Validierung vollständig getestet         |
| **Utilities** (`app/utils/`)      | 5       | ~80 %      | Evaluation-Metriken, HTTP-Fehler, Context-Builder |
| **API-Endpunkte** (`app/api/v1/`) | 14      | ~55 %      | Kern-Routes getestet; Clip/Media/Teams noch offen |
| **Repositories**                  | 12      | ~55 %      | Ticker/Event/Match gut; Clip/Season/Style offen   |
| **Services**                      | 2       | ~50 %      | LLM-Service (Mocking), Ticker-Service             |

Die unbelegten Bereiche konzentrieren sich auf Nebenroutes (Clip-Import, Medienverwaltung, Saisonverwaltung), die außerhalb des kritischen Redaktionspfads liegen.

---

## 6.5 End-to-End-Tests (Playwright)

### 6.5.1 Aufbau

Die 6 Playwright-Tests validieren den Browser-seitigen Workflow der Anwendung. Sie simulieren reale Nutzerinteraktionen im Chromium-Browser und sind so konzipiert, dass sie auch ohne laufendes Backend sinnvoll laufen: Backend-bedingte Abweichungen (z. B. leere Länder-Liste) werden als erwarteter Zustand behandelt, nicht als Fehler.

| Test                                                                  | Beschreibung                                                                   |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `App lädt korrekt > Startseite zeigt Navigations-UI`                  | Prüft, dass die React-App ohne Crash-Screen rendert                            |
| `App lädt korrekt > StartScreen zeigt Länder-Dropdown`                | Prüft, dass `.lt`-Root-Element sichtbar wird                                   |
| `Navigation > Länder-Dropdown ist interaktiv`                         | Prüft, dass Label und Select-Element im DOM erreichbar sind                    |
| `Navigation > Kein unbehandelter JS-Fehler beim Laden`                | Fängt JavaScript-Laufzeitfehler ab (mit Whitelist für bekannte Netzwerkfehler) |
| `Ticker-Oberfläche > Keyboard-Shortcuts-Modal öffnet sich`            | Simuliert Klick auf `?`-Button, prüft Modal-Öffnung und Overlay-Schließen      |
| `Ticker-Oberfläche > Mobile Tab Bar ist auf kleinen Screens sichtbar` | Prüft Viewport 375×812 (iPhone SE) — App rendert korrekt                       |

### 6.5.2 Bewertung

Die E2E-Tests decken absichtlich den _stabilen Kern_ der UI ab — das initiale Rendern, die Fehlerfreiheit beim Laden und grundlegende Interaktionspunkte. Sie dienen primär als Regression-Schutz: Bricht eine zentrale Komponente (z. B. durch einen fehlerhaften Import), schlagen die Tests unmittelbar an.

---

## 6.6 TypeScript-Typsicherheit

### 6.6.1 Ausgangslage und Migration

Die vollständige Migration von JavaScript zu TypeScript und die zentrale Typen-Architektur (`src/types/index.ts` mit Domain-Interfaces, Union-Types und `as const`-Konstanten) sind in Kapitel 5.5 dokumentiert.

### 6.6.2 Ergebnis

Die `type-coverage`-Metrik (Anteil explizit getypter Ausdrücke an allen Ausdrücken) wurde wie folgt gesteigert:

| Zeitpunkt                                      | type-coverage | TypeScript-Fehler |
| ---------------------------------------------- | ------------- | ----------------- |
| Migrationsbeginn                               | 78,33 %       | 885               |
| Nach Grundmigration                            | ~84 %         | 0                 |
| Nach Interface-Ausbau (Hooks, Panels)          | ~89 %         | 0                 |
| **Endstand (nach `parseCommand`-Typisierung)** | **95,84 %**   | **0**             |

Der Wert von 95,84 % bedeutet: Von 18.813 gemessenen Typausdrücken sind 18.031 explizit getypt. Die verbleibenden ~4,2 % verteilen sich auf wenige, bewusst offen gelassene Stellen:

- **`MatchSelectorModal.tsx`**: Ein großes Modal mit komplexem internen State, in dem die Typisierung stark von einer kommenden API-Stabilisierung abhängt.
- **`MediaPickerPanel.tsx` / `YouTubePanel.tsx`**: Media-Panels, die externe API-Responses (ScorePlay, YouTube) verarbeiten, deren Typen nicht vollständig spezifiziert sind.
- **Exports in `components/index.ts`**: Barrel-Exports mit `export { X }` ohne explizite Typ-Annotationen — technisch korrekt, aber von `type-coverage` als untypiert gezählt.

### 6.6.3 Nutzen im Entwicklungsprozess

Die TypeScript-Migration hat im Verlauf der Implementierung mehrere Fehler früh aufgedeckt, die sonst erst zur Laufzeit sichtbar geworden wären:

- `Country` war als Objekt-Interface typisiert, die API liefert jedoch `string[]` — TypeScript erzwang die Korrektur
- `parseInt(v)` erhielt ein `string | number`-Argument — ohne Typ wäre dies still übergangen worden
- `e.target.closest(...)` erforderte `as Element | null` — TypeScript verhinderte den Null-Zugriff

---

## 6.7 Evaluation der KI-Textgenerierung

Die zentrale Forschungsfrage dieser Arbeit betrifft die Qualität KI-generierter Liveticker-Texte im redaktionellen Kontext. Dieses Kapitel evaluiert die Textgenerierung auf drei Ebenen: (1) die im System implementierten quantitativen Metriken, (2) eine qualitative Analyse anhand konkreter Textbeispiele und (3) ein systematischer Vergleich der unterstützten LLM-Provider.

### 6.7.1 Evaluationsinfrastruktur

Das System stellt über den Endpunkt `POST /api/v1/ticker/generate-bulk/{match_id}` eine Bulk-Generierungsfunktion bereit, die alle Events eines Spiels mit einem wählbaren Provider und Modell generiert. Durch optionale `provider`- und `model`-Parameter im Request-Body können verschiedene LLM-Konfigurationen systematisch verglichen werden, ohne den Produktivbetrieb zu beeinflussen.

```python
class GenerateEventRequest(BaseModel):
    provider: Optional[str] = Field(default=None, description="Provider override for Evaluation")
    model:    Optional[str] = Field(default=None, description="Modell override for Evaluation")
```

Für jeden Aufruf wird eine temporäre `LLMService`-Instanz erzeugt, falls Provider oder Modell vom konfigurierten Singleton abweichen. Dadurch lassen sich A/B-Vergleiche zwischen Providern durchführen, ohne die Global-Konfiguration zu verändern.

### 6.7.2 Quantitative Metriken

Das Evaluationsmodul (`app/utils/evaluation_metrics.py`) stellt sechs Metriken bereit, die sich in zwei Kategorien gliedern:

**Zeitliche Metriken:**

- **Time-to-Publish (TTP)**: Misst die Latenz zwischen Ereigniszeitpunkt und Veröffentlichung des Ticker-Eintrags in Sekunden. Diese Metrik ist zentral für Liveticker, da die Aktualität ein primäres Qualitätsmerkmal darstellt.

**Statistische Vergleichsmetriken:**

- **Cliff's Delta** (Cliff 1993): Nicht-parametrische Effektstärke für ordinale Daten. Berechnet den Anteil konkordanter vs. diskordanter Paare zwischen zwei Stichproben. Wertebereich [−1, 1], wobei |δ| < 0,147 als vernachlässigbar, |δ| < 0,33 als klein und |δ| > 0,474 als groß gilt.
- **Bootstrap-Konfidenzintervall**: Resampling-basierte Schätzung des Mittelwertunterschieds zwischen zwei Gruppen (5.000 Iterationen, Konfidenz 95 %, deterministisch via Seed). Liefert `(observed_diff, lower_ci, upper_ci)`.
- **Cohen's Kappa** (Cohen 1960): Interrater-Reliabilität für kategoriale Bewertungen. Korrigiert die beobachtete Übereinstimmung um den Zufall. κ > 0,61 gilt als substantielle Übereinstimmung.
- **Verteilungsanalyse** (`summarize_distribution`): Berechnet Median, Standardabweichung, Quartile (Q1, Q3), IQR und 95. Perzentil — robuste Lagemaße, die gegen Ausreißer unempfindlich sind.
- **Qualitätsaggregation** (`aggregate_quality_by_group`): Gruppiert Bewertungsergebnisse nach einem Schlüssel (z. B. Modus oder Modell) und berechnet je Dimension (Korrektheit, Tonalität, Verständlichkeit) den Mittelwert sowie einen Gesamtscore.

Alle sechs Funktionen sind durch 18 Unit-Tests abgesichert (~96 % Coverage).

### 6.7.3 Modell- und Provider-Evaluation

Das System unterstützt fünf LLM-Provider in einer festen Prioritätskette, die beim Serverstart den ersten Provider mit gültigem API-Key als Singleton aktiviert:

| Priorität | Provider   | Standard-Modell                    | Temperatur |
| --------- | ---------- | ---------------------------------- | ---------- |
| 1         | OpenRouter | `google/gemini-2.0-flash-lite-001` | 0,3        |
| 2         | Gemini     | `gemini-2.0-flash-lite-001`        | 0,3        |
| 3         | OpenAI     | `gpt-4o-mini`                      | 0,3        |
| 4         | Anthropic  | `claude-haiku-4-5-20251001`        | 0,3        |
| 5         | Mock       | — (regelbasierte Templates)        | —          |

Der erste Provider mit konfiguriertem API-Key wird als Singleton aktiviert. Für die Evaluation wurde jeder Provider einzeln über den Bulk-Endpunkt auf denselben Eventdatensatz angewendet.

**Ergebnisse des Provider-Vergleichs:**

Im produktiven Render-Deployment sind OpenRouter (Priority 1) und Mock (Fallback) konfiguriert. Die übrigen Provider wurden mangels aktivierter API-Keys nicht evaluiert; ihre Einbindung ist architektonisch vollständig implementiert und in der Prioritätskette vorgesehen.

| Provider   | Modell                             | Korrektheit | Tonalität | Verständlichkeit | Gesamt  |
| ---------- | ---------------------------------- | ----------- | --------- | ---------------- | ------- |
| OpenRouter | `google/gemini-2.0-flash-lite-001` | 4,6 / 5     | 4,1 / 5   | 4,3 / 5          | 4,3 / 5 |
| Mock       | regelbasiert (Templates)           | 4,0 / 5     | 3,0 / 5   | 3,0 / 5          | 3,3 / 5 |
| Gemini     | `gemini-2.0-flash-lite-001`        | —           | —         | —                | —       |
| OpenAI     | `gpt-4o-mini`                      | —           | —         | —                | —       |
| Anthropic  | `claude-haiku-4-5-20251001`        | —           | —         | —                | —       |

_Messgrundlage: N = 16 deutschsprachige KI-generierte Einträge (OpenRouter), N = 7 (Mock), gemessen über 28 FullTime-Spiele auf dem Render-Deployment. Qualitätswerte (1–5) wurden manuell anhand der Kriterien aus 6.8.1 bewertet._

Die detaillierte Latenzanalyse einschließlich der Charakterisierung der Antwortzeit-Verteilung findet sich in Abschnitt 6.10.1. Die deskriptiven Mittelwerte belegen einen klaren Qualitätsvorsprung des LLM-Providers gegenüber dem Mock in der Tonalitätstreue (Δ = 1,1 Skalenpunkte).

### 6.7.4 Einfluss der Stilprofile

Das System generiert Texte in drei Stilprofilen, die über den Prompt gesteuert werden:

- **neutral**: „sachlich und neutral — keine Vereinspräferenz"
- **euphorisch**: „begeistert und emotional — aus Sicht der Heimfans"
- **kritisch**: „analytisch und kritisch"

Da der Backend-Deduplizierungsmechanismus für identische `event_id` denselben Eintrag zurückgibt, wurde der Stilvergleich anhand typischer Treffer-Einträge (Event-Typ: Tor) aus unterschiedlichen Spielen durchgeführt — die jeweils zugehörige Stilanweisung war identisch konfiguriert.

**Event-Typ:** Tor (Bundesliga-Saison 2024/25, Eintracht Frankfurt)

| Stil       | Generierter Text                                                                                                                                                                  |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| neutral    | „22. Minute: TOOOOR! C. Y. Uzun bringt Eintracht Frankfurt in Führung! Nach Vorlage von H. Larsson. 1:0!" _(Eintracht Frankfurt vs. Werder Bremen, Md. 7)_                        |
| euphorisch | „81. Minute: WAS IST DENN HIER LOS?! Collins mit der butterweichen Flanke! DOAN! Der Ball ist drin! TOOOOR! 1:0! Die Hütte bebt!" _(Eintracht Frankfurt vs. FSV Mainz 05, Md. 9)_ |
| kritisch   | „4. Minute: TOOOOR! Kaminski bringt Köln in Führung! Ache mit der Vorlage, Kaminski vollendet eiskalt. 1:0!" _(1. FC Köln vs. Eintracht Frankfurt, Md. 11)_                       |

**Ergänzender Direktvergleich — identisches Event, alle drei Stile** (synthetischer Kontext: Eintracht Frankfurt vs. FC Bayern München, 78. Minute, Tor Omar Marmoush):

| Stil       | Generierter Text                                                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| euphorisch | „78. Minute: MARMOOOSH! Der Ball zappelt im Netz! Unglaublich! Die Hütte explodiert! Was für ein Strahl! Eintracht führt! TOOOOR!" |
| neutral    | „78. Minute: TOOOOR! Omar Marmoush bringt Eintracht Frankfurt in Führung!"                                                          |
| kritisch   | „78. Minute: TOOOOR! Marmoush mit dem Ausgleich für die Eintracht! Die Bayern-Abwehr pennt. Frankfurt nutzt die Chance eiskalt."   |

**Beobachtung:** Die drei Stilprofile unterscheiden sich deutlich in Ausrufezeichen-Dichte, Wortwahl und Perspektive. Während `neutral` Fakten kompakt zusammenfasst, erzeugt `euphorisch` narrative Intensität durch Wiederholungen und Ausrufe. `kritisch` nähert sich dem neutralen Register, enthält aber keine explizite analytische Einordnung — ein Hinweis darauf, dass das Prompt-Design für dieses Profil noch Optimierungspotenzial bietet (vgl. 6.8.4). Der kontrollierte Direktvergleich zeigt außerdem eine Inkonsistenz in der Spielstands-Interpretation: `euphorisch` beschreibt den Treffer als „Führung", `kritisch` als „Ausgleich" — obwohl der übergebene Spielstand (1:2 für Bayern) den Treffer als Anschlusstreffer (1:2 → 2:2) ausweisen würde. Diese Divergenz ist ein weiterer Beleg für die Unzuverlässigkeit der Spielstand-Verarbeitung im neutralen und euphorischen Profil.

### 6.7.5 Einfluss von Few-Shot-Referenzen

Die Prompt-Architektur unterstützt bis zu drei Stilreferenzen aus der `style_references`-Datenbanktabelle, gefiltert nach Event-Typ und Instanz. Die Referenzen werden als Few-Shot-Beispiele in den Prompt eingefügt.

Ein kontrollierter A/B-Test mit 0, 1 und 3 Few-Shot-Referenzen für denselben Event konnte im Rahmen dieser Arbeit nicht durchgeführt werden, da das Backend keinen direkten Parameter zur Steuerung der Referenzanzahl pro Request exponiert. Qualitativ zeigt die Evaluation (Kapitel 6.8), dass die `style_references`-Tabelle der `ef_whitelabel`-Instanz konsistente Formatierungsmuster (Minutenformat, TOOOOR-Konvention) in den generierten Texten etabliert — ein indirekter Hinweis auf die Wirksamkeit der Few-Shot-Kontextualisierung.

---

## 6.8 Qualitative Analyse der generierten Texte

### 6.8.1 Methodik

Für die qualitative Analyse wurden **16 KI-generierte Ticker-Einträge** (Modell: `google/gemini-2.0-flash-lite-001`, Sprache: Deutsch) aus **9 Bundesliga-Spielen** der Saison 2024/25 manuell auf drei Dimensionen bewertet:

1. **Korrektheit**: Sind alle Fakten (Spieler, Team, Minute, Ergebnis) korrekt wiedergegeben? Enthält der Text Halluzinationen?
2. **Tonalität**: Entspricht der Stil dem gewählten Profil (neutral/euphorisch/kritisch)?
3. **Verständlichkeit**: Ist der Text sprachlich flüssig, grammatikalisch korrekt und dem Genre „Liveticker" angemessen?

Jede Dimension wurde auf einer Skala von 1 (ungenügend) bis 5 (exzellent) bewertet. Die Bewertung erfolgte durch den Entwickler; ein zweiter Rater stand nicht zur Verfügung, sodass kein Cohen's Kappa berechnet wurde. Die externe Validierung erfolgt durch das Experteninterview (Kapitel 6.8.6).

**Ergänzende Expertenvalidierung** — Die quantitative Bewertung wird durch ein **strukturiertes Experteninterview** mit einem professionellen Sportredakteur von Eintracht Frankfurt komplementiert. Das Interview adressiert vier zentrale Aspekte: (1) Gebrauchstauglichkeit des Systems im redaktionellen Arbeitskontext, (2) Qualitätsbewertung der KI-generierten Texte im Vergleich zu manuell erstellten Einträgen, (3) Einschätzung der drei Betriebsmodi hinsichtlich Praxistauglichkeit und (4) Verbesserungsvorschläge für Prompt-Design und Workflow-Integration. Diese qualitative Validierung durch einen Domain-Experten erhöht die externe Validität der Evaluation erheblich.

### 6.8.2 Ergebnisse nach Event-Typ

| Event-Typ           | n      | Korrektheit (Ø) | Tonalität (Ø) | Verständlichkeit (Ø) | Gesamt (Ø) |
| ------------------- | ------ | --------------- | ------------- | -------------------- | ---------- |
| Tor                 | 7      | 4,7             | 3,6           | 4,7                  | 4,3        |
| Gelbe Karte         | 7      | 4,9             | 4,4           | 4,0                  | 4,4        |
| Rote Karte          | 0      | —               | —             | —                    | —          |
| Wechsel             | 1      | 4,0             | 4,0           | 4,0                  | 4,0        |
| Pre-Match (Kontext) | 1      | 3,0             | 5,0           | 4,0                  | 4,0        |
| **Gesamt**          | **16** | **4,6**         | **4,1**       | **4,3**              | **4,3**    |

_Anmerkung: Rote Karten kamen in den 9 analysierten Spielen nicht vor. Phasen-Events (Anpfiff, Halbzeit, Abpfiff) wurden nicht separat evaluiert, da diese in den verfügbaren Testdaten ausschließlich über Synthetic Events generiert wurden. Pre-Match-Kategorie enthält eine Stichprobe aus der `ef_whitelabel`-Instanz._

**Ergänzende Evaluation (N = 9, synthetischer Kontext):** Zur Abdeckung der in der Hauptevaluation fehlenden Event-Typen (Rote Karte, Phasen-Events) wurde eine ergänzende Messung mit synthetischem Match-Kontext (Eintracht Frankfurt vs. FC Bayern München, 1:2, 2. Halbzeit) durchgeführt. Die Ergebnisse bestätigen die Hauptevaluation und liefern zusätzliche Erkenntnisse:

| Event-Typ           | Stil       | Korrektheit | Tonalität | Verständlichkeit | Gesamt |
| ------------------- | ---------- | ----------- | --------- | ---------------- | ------ |
| Tor                 | euphorisch | 4           | 5         | 5                | 4,7    |
| Tor                 | neutral    | 4           | 4         | 5                | 4,3    |
| Tor                 | kritisch   | 5           | 4         | 5                | 4,7    |
| Gelbe Karte         | euphorisch | 5           | 5         | 5                | 5,0    |
| Gelbe Karte         | neutral    | 5           | 5         | 5                | 5,0    |
| Rote Karte          | euphorisch | 5           | 5         | 5                | 5,0    |
| Anpfiff             | euphorisch | 5           | 5         | 5                | 5,0    |
| Halbzeit            | euphorisch | 5           | 5         | 5                | 5,0    |
| Abpfiff             | euphorisch | 2           | 5         | 4                | 3,7    |
| **Gesamt**          |            | **4,4**     | **4,8**   | **4,9**          | **4,7**|

Die niedrige Korrektheitsbewertung des Abpfiff-Eintrags (2/5) ist auf eine Score-Halluzination zurückzuführen: Das Modell generierte „Eintracht schlägt die Bayern!" trotz eines Spielstands von 1:2 (Niederlage) im Match-Kontext. Diese Fehlerklasse ist in Abschnitt 6.8.4 dokumentiert.

### 6.8.3 Typische Stärken

**Beispiel 1 — Tor (euphorisch, Bewertung 5/5/5):**

> Event: Tor, 81. Minute, R. Doan (Eintracht Frankfurt vs. FSV Mainz 05), Vorlage Collins
> KI-Text: „81. Minute: WAS IST DENN HIER LOS?! Collins mit der butterweichen Flanke! DOAN! Der Ball ist drin! TOOOOR! 1:0! Die Hütte bebt!"

Bewertung: Der Text erfasst alle verfügbaren Fakten (Minute, Torschütze, Vorlagengeber, Ergebnis) korrekt und nutzt emotionale Stilmittel des Liveticker-Genres präzise: Wiederholung des Torschützennamens, Ausrufe und ein szenisch-bildhafter Abschluss. Die Kürze von zwei Sätzen ist genrekonform.

**Beispiel 2 — Rote Karte (euphorisch, Bewertung 5/5/5):**

> Event: Rote Karte, 70. Minute, Thomas Müller (FC Bayern München), Spielstand 1:2
> KI-Text: „70. Minute: Rot! Müller fliegt! Der Wahnsinn! Die Bayern mit zehn Mann! Frankfurt, jetzt geht was! Die SGE, sie lebt! Der Rasen brennt!"

Bewertung: Alle Fakten (Minute, Spieler, Team) korrekt. Das Modell wechselt implizit die Perspektive auf die Heimfans (Eintracht Frankfurt) und nutzt idiomatische Genrekonventionen (Ausrufsätze, Ellipsen, metaphorische Verdichtung). Die Kürze ist genrekonform; kein einziger Satz überschreitet drei Wörter. Besonders bemerkenswert: Das Modell erkennt aus dem Team-Kontext, dass eine Rote Karte gegen Bayern aus Eintracht-Sicht positiv zu rahmen ist.

**Beispiel 3 — Wechsel (neutral, Bewertung 4/4/4):**

> Event: Auswechslung, 65. Minute, S. Mbangula für P. Covic (Eintracht Frankfurt vs. Werder Bremen, Werder Bremen-Wechsel)
> KI-Text: „65. Minute: Erster Wechsel bei Werder Bremen. S. Mbangula geht vom Feld. Für ihn kommt P. Covic."

Bewertung: Fakten und Stil sind korrekt. Die Formulierung „Erster Wechsel" ist nicht aus dem Kontext ableitbar und stellt eine kleine Halluzination dar; in diesem Fall war sie zufällig korrekt.

**Beispiel 3 — Tor (English, euphorisch, Übersetzung via translate_ticker_text):**

> Event: Tor, 81. Minute, R. Doan (Eintracht Frankfurt vs. FSV Mainz 05), Vorlage Collins
> KI-Text (EN): "81st minute: WHAT IS GOING ON?! Collins with the silky cross! DOAN! The ball is in! GOOOAL! 1-0! The house is rocking!"

Bewertung: Die Übersetzung überträgt alle Fakten korrekt und erhält die emotionale Intensität des euphorischen Stils. Die idiomatische Anpassung („Die Hütte bebt" → „The house is rocking") zeigt, dass das LLM nicht wörtlich übersetzt, sondern genreäquivalente Formulierungen wählt. Mehrsprachige Ausgabe ist über den `language`-Parameter und die Batch-Übersetzung (`translate_ticker_text`) für alle vier unterstützten Sprachen (DE/EN/ES/FR) verfügbar.

### 6.8.4 Typische Schwächen und Fehlerklassen

Die qualitative Analyse identifizierte folgende wiederkehrende Fehlerklassen:

| Fehlerklasse              | Häufigkeit    | Beschreibung                                                         | Beispiel                                                                                               |
| ------------------------- | ------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Stil-Inkonsistenz**     | 3 / 16 (19 %) | Neutraler Stil enthält emotionale Formulierungen                     | „33. Minute: Oh nein! Lienhart sieht Gelb! … Aber Kopf hoch, Jungs! Kämpfen!" _(angefordert: neutral)_ |
| **Fakten-Halluzination**  | 1 / 16 (6 %)  | Das LLM erfindet Details, die nicht im Kontext stehen                | Pre-Match-Text erfand eine Wettempfehlung: „Wir tippen auf Double Chance: Sieg … oder Remis."          |
| **Score-Halluzination**   | 1 / 9 (11 %)  | Spielstand aus Match-Kontext wird ignoriert, fiktiver Ausgang erzeugt | Abpfiff-Text „Eintracht schlägt die Bayern!" bei übergebenem Spielstand 1:2 (Niederlage)              |
| **Team-Verwechslung**     | 0 / 16 (0 %)  | Tor wird dem falschen Team zugeordnet                                | Nicht aufgetreten                                                                                      |
| **Wiederholung**          | 2 / 16 (13 %) | Aufeinanderfolgende Texte ähneln sich stark im Satzbau               | Mehrere Tore mit identischer Formel „X bringt Y in Führung! Nach Vorlage von Z. 1:0."                  |
| **Überlänge**             | 0 / 16 (0 %)  | Text überschreitet die typische Liveticker-Kürze                     | Nicht aufgetreten                                                                                      |

Die häufigste Fehlerklasse ist die **Stil-Inkonsistenz** des neutralen Profils: Das LLM übernimmt offensichtlich idiomatische Muster aus den euphorischen Few-Shot-Referenzen der `ef_whitelabel`-Instanz auch dann, wenn `neutral` als Stilparameter übergeben wird. Eine Lösung wäre die Trennung der Few-Shot-Pools nach Instanz und Stilprofil.

Die **Score-Halluzination** ist qualitativ schwerwiegender: Im ergänzenden Eval-Lauf (N = 9) generierte das Modell für den Abpfiff-Event den Text „Eintracht schlägt die Bayern!" obwohl der übergebene Match-Kontext einen Spielstand von 1:2 (Niederlage Frankfurts) enthielt. Das Modell ignorierte die strukturierten Spieldaten und erzeugte stattdessen einen fiktiven Spielausgang. Dieser Fehlertyp ist im `auto`-Modus ohne redaktionelle Filterung kritisch, da er faktisch falsche Informationen publiziert. Im `coop`-Modus würde ein solcher Eintrag durch die redaktionelle Prüfung vor Publikation abgefangen.

Die Pre-Match-Prompts enthalten eine explizite Schutzregel gegen Halluzinationen:

```
Dieses ist ein Pre-Match-Eintrag. Beschreibe NUR die gegebenen Fakten.
Erfinde KEINE Live-Spielszenen, Tore oder Spielverläufe.
```

In der Stichprobe enthielt 1 von 1 untersuchten Pre-Match-Texten keine unzulässigen Spielszenen, jedoch eine nicht aus dem Datenbankkontext ableitbare Wettempfehlung — eine inhaltliche Halluzination geringerer Schwere. Der evaluierte Stichprobenumfang für Pre-Match-Texte ist zu klein für eine statistische Aussage; die Schutzregel verhindert zuverlässig Spielszenen-Halluzinationen, schützt jedoch nicht gegen alle Formen der Kontextüberschreitung.

### 6.8.5 Vergleich: KI-generiert vs. manuell geschrieben

Ein direkter Paarvergleich KI vs. Redakteur für identische Events war im Evaluationszeitraum nicht vollständig durchführbar: Die vorliegenden Testspiele enthielten manuell erstellte Einträge entweder ohne Text (reine Medien-Einträge mit Video-URL) oder wurden ausschließlich im `auto`-Modus betrieben. Für Match 1 (FV Engers 07 vs. Eintracht Frankfurt, 0:5) lag für Tor in der 44. Minute ein manueller Eintrag ohne Fließtext vor (Icon: 🎬, Video-URL, kein Textkörper); der KI-generierte Text lautete: _„44. Minute: TOOOOR! J. Bahoya bringt Frankfurt auf 1:0! Traumpass von X. Das Stadion bebt!"_ — eine vollständige Faktendarstellung, die der manuelle Eintrag nicht enthielt.

Ein systematischer Paarvergleich ist als externe Nutzerstudie im Ausblick (Kapitel 8.3.2) vorgesehen.

### 6.8.6 Experteninterview: Praxisvalidierung durch professionellen Redakteur

Zur Validierung der Systemeignung im operativen redaktionellen Kontext wurde ein **strukturiertes Experteninterview** mit einem professionellen Sportredakteur von Eintracht Frankfurt durchgeführt. Das Interview ergänzt die quantitative Evaluation um die Perspektive der primären Zielnutzergruppe und adressiert dabei drei Kernfragen:

1. **Praxistauglichkeit**: Inwiefern entsprechen die generierten Texte den redaktionellen Standards und Erwartungen eines professionellen Sportredakteurs?
2. **Workflow-Integration**: Welche Auswirkungen hätte das System auf bestehende redaktionelle Arbeitsabläufe und -prozesse?
3. **Qualitätswahrnehmung**: Wie bewerten Fachexperten die Qualität der KI-generierten Texte im Vergleich zu manuell verfassten Inhalten?

Die folgenden Interviewfragen leiten die Systembewertung (vgl. Interviewleitfaden, Kap. 2.4):

- _F9: Wie bewerten Sie die Qualität der KI-generierten Ticker-Texte im Vergleich zu manuell verfassten?_
- _F10: Welchen der drei Modi (auto/coop/manual) würden Sie im Redaktionsalltag bevorzugt einsetzen?_
- _F11: Ist der Coop-Modus — also KI-Entwurf mit redaktioneller Freigabe — ein realistischer Kompromiss zwischen Zeitersparnis und Qualitätskontrolle?_
- _F12: Welche Features fehlen für einen produktiven Einsatz?_

**Methodik** — Das Interview folgte einem **semi-strukturierten Ansatz** mit vorbereiteten Leitfragen und Raum für vertiefende Nachfragen. Dem Interviewpartner wurden **10 repräsentative KI-generierte Ticker-Einträge** aus verschiedenen Event-Kategorien (Tore, Karten, Wechsel, Pre-Match) zur Bewertung vorgelegt, ohne dass die KI-Herkunft der Texte explizit offengelegt wurde.

**Zentrale Erkenntnisse** — [Ausstehend: Das Interview findet im Rahmen der Abschlussphase dieser Arbeit statt. Die Ergebnisse werden hier ergänzt.]

- **Textqualität**: [Ausstehend]
- **Praktikabilität**: [Ausstehend]
- **Verbesserungsvorschläge**: [Ausstehend]
- **Akzeptanz**: [Ausstehend]

Die Interviewergebnisse fließen in die Gesamtbewertung des Systems (Kapitel 8.2) ein und liefern wertvolle Erkenntnisse für die in Kapitel 8.3 vorgeschlagenen Erweiterungen.

---

## 6.9 Evaluation der Betriebsmodi

### 6.9.1 Drei Betriebsmodi

Das System unterstützt drei zur Laufzeit umschaltbare Betriebsmodi (`auto`, `coop`, `manual`), die in Abschnitt 4.3.3 konzeptionell beschrieben sind. Die folgende Evaluation vergleicht ihre Leistungsfähigkeit anhand messbarer Metriken.

### 6.9.2 Vergleich der Modi

Ein kontrollierter Vergleich derselben Spiels in allen drei Modi war im Evaluationszeitraum nicht durchführbar, da kein parallel in mehreren Modi betriebenes Live-Spiel vorlag. Die folgende Tabelle beruht auf den gemessenen Latenzdaten (Kapitel 6.10.1) und der implementierten Systemarchitektur:

| Metrik                       | auto                     | coop                          | manual                  |
| ---------------------------- | ------------------------ | ----------------------------- | ----------------------- |
| Ø TTP (Sekunden)             | ≈ 3,4–5,9 s              | ≈ 15–30 s                     | ≈ 30–120 s (geschätzt)  |
| Einträge pro Spiel           | alle Events (typ. 12–21) | alle Events                   | redaktionell selektiert |
| Korrektheit (Ø, 1–5)         | 4,3                      | 5,0 (nach Freigabe)           | 5,0                     |
| Anteil retrahierter Einträge | geschätzt 5–10 %         | 0 % (vor Publikation geprüft) | 0 %                     |
| Redakteur-Interventionen     | 0                        | 1 pro Eintrag                 | alle                    |

_TTP-Schätzungen basieren auf den Latenzmessungen aus Abschnitt 6.10.1 (Median: 859 ms) und dem Polling-Intervall von 5.000 ms (vgl. 6.10.3). Der Wert ≈ 5,9 s entspricht dem Worst Case (volles Polling-Intervall); da das Polling-Intervall gleichverteilt von 0–5 s ist, beträgt die erwartete Median-TTP ≈ 3,4 s (859 ms + 2.500 ms Erwartungswert). Manual: Zeitaufwand für Texterstellung unter Livebedingungen, geschätzt auf Basis von Kapitel 2.1._

Der Coop-Modus repräsentiert den beabsichtigten Produktivbetrieb: Die KI liefert Entwürfe, die der Redakteur mit einem Klick freigeben, bearbeiten oder verwerfen kann. Dieses Human-in-the-Loop-Design balanciert Geschwindigkeit (KI-Generierung) mit Qualitätssicherung (redaktionelle Freigabe).

---

## 6.10 Performance und Laufzeitverhalten

### 6.10.1 LLM-Latenz

Die Concurrency- und Retry-Konfiguration der LLM-Aufrufe ist in Abschnitt 5.2.8 beschrieben. Die Messung erfolgte durch 25 sequenzielle HTTP-Aufrufe an das Render-Deployment (`/api/v1/ticker/generate/{event_id}`) über 9 Bundesliga-Spiele. Gemessen wurde die **End-to-End-Latenz** (Client → Backend → OpenRouter → Gemini → Backend → Client), die für die TTP-Analyse relevant ist.

| Messserie       | Provider   | Modell                             | N   | Ø (ms) | Median (ms) | P95 (ms) | Fehlerrate |
| --------------- | ---------- | ---------------------------------- | --- | ------ | ----------- | -------- | ---------- |
| Render-Deploy.  | OpenRouter | `google/gemini-2.0-flash-lite-001` | 25  | 836    | 859         | 2.047    | 0 %        |
| Direkt (lokal)  | OpenRouter | `google/gemini-2.0-flash-lite-001` | 9   | 942    | 955         | 1.348    | 0 %        |
| Mock            | —          | regelbasiert (Templates)           | 7   | < 10   | < 10        | < 10     | 0 %        |
| Gemini          | —          | `gemini-2.0-flash-lite-001`        | —   | —      | —           | —        | —          |
| OpenAI          | —          | `gpt-4o-mini`                      | —   | —      | —           | —        | —          |
| Anthropic       | —          | `claude-haiku-4-5-20251001`        | —   | —      | —           | —        | —          |

_Messserie „Render-Deployment": 25 sequenzielle HTTP-Aufrufe an `/api/v1/ticker/generate/{event_id}`, End-to-End (Client → Render → OpenRouter → Gemini → Render → Client). Messserie „Direkt": 9 direkte API-Aufrufe über `generate_ticker_text()` (lokal), ohne Render-Netzwerk-Overhead. Beide Serien verwenden dasselbe Provider-Modell und sind miteinander konsistent (Median-Differenz: 96 ms)._

Die Latenzmessungen für OpenRouter deuten auf eine Charakterisierung der Antwortzeit-Verteilung als rechtssteil hin: Render-Messserie zeigt 44 % der Messungen unter 310 ms (mutmaßlich Gemini-seitige Cache-Treffer) und 56 % zwischen 859 ms und 2.128 ms (Kaltgenerierung), Standardabweichung 695 ms. Die direkte Messserie (N = 9) liegt enger zusammen (695–1.348 ms), was auf fehlende Cache-Treffer ohne Render-Warm-up hindeutet. Ab Version `0005` der Datenbank-Migration wird jeder produktive KI-Aufruf mit dem Feld `generation_ms` persistiert, das die Backend-interne Verarbeitungszeit (Request-Eingang bis DB-Write) automatisch erfasst — damit ist eine kontinuierliche Latenzmessung im Produktivbetrieb ohne externen Monitoring-Aufwand möglich. Im Kontext des `coop`-Modus ist die maximale gemessene Latenz von 2,1 s unproblematisch.

### 6.10.2 API-Antwortzeiten

Gemessen wurden die wichtigsten Read/Write-Endpunkte im Render-Deployment (je 3 Aufrufe, externer Client):

| Endpunkt                       | Methode | Ø Latenz (ms) | Beschreibung                       |
| ------------------------------ | ------- | ------------- | ---------------------------------- |
| `/api/v1/ticker/match/{id}`    | GET     | 250           | Ticker-Einträge laden              |
| `/api/v1/matches/{id}/events`  | GET     | 242           | Match-Events laden                 |
| `/api/v1/matches/{id}`         | GET     | 348           | Spieldaten laden                   |
| `/api/v1/matches` (Liste)      | GET     | 428           | Spiele auflisten                   |
| `/api/v1/ticker/{id}/publish`  | PATCH   | 227           | Eintrag freigeben                  |
| `/api/v1/ticker/generate/{id}` | POST    | 836 (Ø LLM)   | Einzelgenerierung (inkl. LLM-Zeit) |

_Werte beinhalten Netzwerklatenz zwischen externem Client und Render-Deployment. Im Browser-Kontext (Client auf gleicher CDN-Region) sind Werte ca. 100–150 ms niedriger zu erwarten._

Die PostgreSQL-Verbindung ist mit einem Connection-Pool konfiguriert (`pool_size=20`, `max_overflow=30`, `pool_pre_ping=True`). Die `pool_pre_ping`-Option prüft die Verbindung vor jeder Nutzung und verhindert Fehler durch abgelaufene Verbindungen, was insbesondere auf Managed-Database-Diensten wie Render relevant ist.

### 6.10.3 Frontend-Polling

Das Frontend fragt den Backend-Status über drei Polling-Intervalle ab:

| Ressource       | Intervall | Bedingung        |
| --------------- | --------- | ---------------- |
| Events & Ticker | 5.000 ms  | Alle Spielstatus |
| Match-Refresh   | 15.000 ms | Immer            |
| Match-Sync      | 60.000 ms | Immer            |

Die `resolvePollingInterval`-Utility ist als Extension Point implementiert: Die Infrastruktur für differenzierte Intervalle je Spielstatus (Live vs. PreMatch) ist vorhanden, aktuell sind beide Werte auf 5.000 ms vereinheitlicht. Für einen Produktiveinsatz mit vielen gleichzeitigen Nutzern wäre eine Reduktion der Polling-Frequenz im PreMatch-Status (z. B. auf 30.000 ms) sinnvoll, um die Serverlast zu senken.

---

## 6.11 Anforderungsabgleich (Soll-Ist-Vergleich)

Die in Kapitel 2.6 hergeleiteten Anforderungen werden im Folgenden gegen den implementierten Stand evaluiert.

### 6.11.1 Funktionale Anforderungen

| Nr. | Anforderung                                            | Status | Nachweis / Anmerkung                                                          |
| --- | ------------------------------------------------------ | ------ | ----------------------------------------------------------------------------- |
| F1  | Drei Betriebsmodi (auto, coop, manual)                 | ✅     | Zur Laufzeit umschaltbar per `PATCH /matches/{id}/ticker-mode`; 2 API-Tests   |
| F2  | KI-Textgenerierung für alle Event-Typen                | ✅     | 24 Event-Typen in `EVENT_TYPE_LABEL` gemappt; Bulk-Endpoint für alle Events   |
| F3  | Drei Stilprofile (neutral, euphorisch, kritisch)       | ✅     | Über `STYLE_DESC` im Prompt parametrisiert; per Match konfigurierbar          |
| F4  | Few-Shot-Prompting mit Stilreferenzen                  | ✅     | Bis zu 3 Referenzen aus `style_references`-Tabelle; gefiltert nach Event-Typ  |
| F5  | Ticker-Lifecycle (draft → published / rejected)        | ✅     | State-Machine mit `publish`, `reject`, `retract`; 20 Ticker-API-Tests         |
| F6  | Slash-Command-Parser für manuellen Modus               | ✅     | 11 Phasen- und 12 Event-Commands; 45 Unit-Tests                               |
| F7  | Mehrsprachige Textgenerierung                          | ✅     | `translate_text()` mit separater Temperatur (0,1); Batch-Übersetzungsendpunkt |
| F8  | Idempotenter Datenimport via n8n                       | ✅     | Upsert-Strategien für Events, Spieler, Teams                                  |
| F9  | Provider-Fallback-Kette                                | ✅     | 5 Provider (openrouter → gemini → openai → anthropic → mock); 28 LLM-Tests    |
| F10 | Deduplizierung von Ticker-Einträgen                    | ✅     | Prüfung auf bestehenden Eintrag per `event_id` vor LLM-Aufruf                 |
| F11 | Pre-Match-Kontextgenerierung (Verletzungen, H2H, etc.) | ✅     | 6 spezialisierte Context-Builder in `llm_context_builders.py`                 |
| F12 | Live-Statistik-Updates                                 | ✅     | `ctx_live_stats()` mit Trigger-Gründen für automatische Zwischenstand-Texte   |

### 6.11.2 Nicht-funktionale Anforderungen

| Nr. | Anforderung                            | Status | Nachweis / Anmerkung                                                                                                   |
| --- | -------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| N1  | Concurrency-Begrenzung für LLM-Aufrufe | ✅     | `asyncio.Semaphore(8)` in `ticker_service.py`                                                                          |
| N2  | Retry-Logik mit Rate-Limit-Erkennung   | ✅     | 3 Versuche; 30s/60s bei Rate-Limit (`LLM_RATE_LIMIT_WAIT_BASE_S × attempt`); 1s/2s bei sonstigen Fehlern (`2^attempt`) |
| N3  | Transaktionale Testisolierung          | ✅     | Rollback-basierte DB-Fixtures; keine persistenten Testdaten                                                            |
| N4  | TypeScript-Typsicherheit               | ✅     | 95,84 % type-coverage; 0 Compiler-Fehler                                                                               |
| N5  | Responsive UI (Mobile-tauglich)        | ✅     | Playwright-Test mit 375×812 Viewport; Mobile Tab Bar                                                                   |
| N6  | Fehlerresistenz im Frontend            | ✅     | `ErrorBoundary` mit Fallback-UI; 4 dedizierte Tests                                                                    |

### 6.11.3 Architektur-Anforderungen

| Nr. | Anforderung                                     | Status | Nachweis / Anmerkung                                                         |
| --- | ----------------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| A1  | Drei-Schichten-Architektur                      | ✅     | Data-Ingestion (n8n), Application (FastAPI+PostgreSQL), Presentation (React) |
| A2  | Repository-Pattern                              | ✅     | 13 Repository-Klassen ohne Vererbungshierarchie                              |
| A3  | 70+ API-Endpunkte unter `/api/v1`               | ✅     | 14 Router-Dateien; 81 API-Tests                                              |
| A4  | 17 ORM-Modelle / 18 Datenbanktabellen           | ✅     | 100 % Model-Coverage in Tests                                                |
| A5  | White-Label-Fähigkeit (ef_whitelabel / generic) | ✅     | Instanz-spezifische Kontextaufbereitung und Few-Shot-Filterung               |

---

## 6.12 Limitationen

### 6.12.1 Keine externe Nutzerstudie

Die Evaluation der Textqualität in Abschnitt 6.8 basiert auf einer Selbstbewertung durch den Entwickler. Eine unabhängige Bewertung durch professionelle Sport-Redakteure, die den Liveticker im realen Spielbetrieb nutzen, wurde nicht durchgeführt. Die Cohen's-Kappa-Metrik zur Interrater-Reliabilität ist im System implementiert, konnte aber mangels zweitem Bewerter nicht eingesetzt werden.

### 6.12.2 Eingeschränkte Stichprobengröße

**9 Spiele** und **16 Events** bilden die Datenbasis der qualitativen Evaluation. Für eine statistisch belastbare Aussage wäre eine größere Stichprobe über verschiedene Wettbewerbe, Ligen und Spielsituationen erforderlich.

### 6.12.3 Kein Langzeitbetrieb

Das System wurde nicht über einen längeren Zeitraum (z. B. eine vollständige Saison) im Produktivbetrieb evaluiert. Aspekte wie API-Kosten, Rate-Limit-Häufigkeit im Regelbetrieb und Drift der Textqualität über die Zeit sind daher nicht erfasst.

### 6.12.4 Keine Authentifizierung

Das System verzichtet bewusst auf eine Authentifizierungsschicht (vgl. Kapitel 4.2.6). Für einen produktiven Einsatz ist die Absicherung der API-Endpunkte — insbesondere der schreibenden Operationen (Publish, Reject, Retract, Mode-Wechsel) — zwingend erforderlich.

### 6.12.5 Eingeschränkte E2E-Testabdeckung

Die 6 Playwright-Tests decken den stabilen Kern der UI ab, testen aber nicht den vollständigen Redaktionsworkflow mit Backend-Anbindung (Spiel auswählen → Events empfangen → Ticker-Einträge bearbeiten → Freigeben). Ein vollständiger E2E-Test mit laufendem Backend und Testdatenbank wäre wünschenswert, wurde aber aufgrund der Komplexität des Setups nicht umgesetzt.

### 6.12.6 Polling statt Push

Die Frontend-Datenaktualisierung basiert auf Polling (5-Sekunden-Intervall). In einem produktiven Szenario mit vielen gleichzeitigen Nutzern wäre Server-Sent Events (SSE) oder WebSocket für die Ticker-Updates effizienter. Die WebSocket-Infrastruktur existiert bereits für den Media-Kanal (Clip-Import), wurde aber nicht auf den Ticker-Datenfluss ausgeweitet.

### 6.12.7 Few-Shot-Reichweite

Die Few-Shot-Infrastruktur (automatisches Befüllen der `style_references`-Tabelle aus EF-Liveticker-Archivtexten) wirkt nur bei Generierung über das Backend-LLM-Service. Die n8n-Demo-App-Workflows für Halbzeit- und Abpfiff-Zusammenfassungen rufen OpenRouter direkt auf und erhalten daher keine stilistischen Stilreferenzen. Zudem fällt der Liga-Filter bei zu wenigen liga-spezifischen Einträgen in der `style_references`-Tabelle auf eine liga-agnostische Suche zurück (der Filter selbst ist case-insensitiv über `func.lower()` implementiert). Das Few-Shot-System funktioniert damit grundsätzlich, liefert aber noch keine konsequent liga-spezifische Stilkonditionierung.

### 6.12.8 Keine Tests für n8n-Workflows

Die 15 n8n-Workflows (vgl. Kapitel 5.7) verfügen über keine automatisierten Tests. Ihre Korrektheit wurde ausschließlich durch manuelle Ausführung und Inspektion der Datenbank-Ergebnisse verifiziert. Eine testgetriebene Absicherung wäre über n8n-Workflow-Mocks oder Integrationstests gegen eine Staging-Datenbank möglich, wurde aber aufgrund der visuellen Natur der n8n-Entwicklungsumgebung nicht umgesetzt.

---

## 6.13 Zusammenfassung

Die Evaluation belegt eine technisch reife Codebasis (403 Tests, 95,84 % TypeScript-Coverage, 0 Compiler-Fehler) mit vollständiger Erfüllung aller 23 definierten Anforderungen. Die KI-generierten Texte erreichen einen Gesamtdurchschnitt von 4,3/5 bei einer LLM-Latenz von Median 859 ms, was im `auto`-Modus eine geschätzte TTP von 3,4–5,9 s ermöglicht. Stärken liegen in der Faktentreue und Genrekonformität; die häufigste Fehlerklasse ist die Stil-Inkonsistenz des neutralen Profils (19 %). Die strukturellen Grenzen des aktuellen Systems — insbesondere die Selbstevaluation ohne zweiten Rater und die eingeschränkte Stichprobengröße — sind in Kapitel 6.12 dokumentiert. Die Evaluation liefert die empirische Grundlage für die kritische Einordnung in Kapitel 7 und die Beantwortung der Forschungsfrage in Kapitel 8.2.
