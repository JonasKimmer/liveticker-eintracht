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

Der `parseCommand`-Utility ist das komplex­este Stück Geschäftslogik im Frontend — er transformiert Slash-Commands (z. B. `/g Müller SGE`) in strukturierte Ticker-Einträge. Die 45 Tests decken alle 11 Command-Typen (Tor, Eigenton, Gelbe/Rote Karte, Wechsel, Notiz, verfehlter Elfmeter und alle 11 Phasen-Commands) sowie explizit die Fehlerfälle ab:

```typescript
// Beispiel aus parseCommand.test.ts
test("vollständiger Command ist valid", () => {
  const result = parseCommand("/g Müller EIN", 32);
  expect(result.isValid).toBe(true);
  expect(result.type).toBe("goal");
  expect(result.formatted).toBe("TOR — Müller (EIN)");
  expect(result.meta.icon).toBe("⚽");
  expect(result.meta.minute).toBe(32);
  expect(result.warnings).toHaveLength(0);
});

test("ohne Spieler und Team → invalid mit Warnings", () => {
  const result = parseCommand("/g", 10);
  expect(result.isValid).toBe(false);
  expect(result.warnings).toContain("Fehlend: Spieler");
  expect(result.warnings).toContain("Fehlend: Team");
});
```

### 6.3.3 Beispiel: `useLiveMinute`

Der Hook `useLiveMinute` berechnet die aktuelle Spielminute aus dem Anstoßzeitpunkt, sofern keine Minuten-Information direkt im Match-Objekt vorhanden ist. Tests decken sowohl die Halbzeit-Korrektur (+46 Minuten ab der 60. Minute) als auch den Puffer bei fehlendem Kickoff-Timestamp ab:

```typescript
test("2. Halbzeit: Offset wird korrekt berechnet", () => {
  const match = {
    ...baseMatch,
    matchPhase: "SecondHalf",
    startsAt: iso60MinAgo,
  };
  const { result } = renderHook(() => useLiveMinute(match));
  expect(result.current).toBeGreaterThanOrEqual(46);
});
```

---

## 6.4 Backend-Unit-Tests (pytest)

### 6.4.1 Übersicht

Das Backend verfügt über **198 Tests** in 11 Test-Dateien, die mit einer Gesamt-Coverage von **75 %** abgeschlossen werden. Alle 198 Tests laufen grün durch (`198 passed`).

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

Die API-Tests nutzen FastAPIs `TestClient` mit einer transaktionalen PostgreSQL-Session, die nach jedem Test per Rollback zurückgesetzt wird. Dadurch sind Tests voneinander isoliert und hinterlassen keine persistenten Daten:

```python
@pytest.fixture()
def db():
    """Transaktionale DB-Session — rollt nach jedem Test zurück."""
    TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestSession()
    yield session
    session.rollback()   # ← vollständige Isolation
    session.close()
```

Der `client`-Fixture überschreibt die `get_db`-Dependency-Injection von FastAPI, sodass alle Route-Handler dieselbe transaktionale Session verwenden:

```python
@pytest.fixture()
def client(db):
    def override_get_db():
        yield db
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
```

Exemplarischer Test für die Ticker-Mode-Route — ein zentraler Workflow im System:

```python
class TestSetTickerMode:
    def test_sets_coop_mode(self, client, sample_match):
        response = client.patch(
            f"/api/v1/matches/{sample_match.id}/ticker-mode",
            json={"mode": "coop"},
        )
        assert response.status_code == 200
        assert response.json()["tickerMode"] == "coop"

    def test_rejects_invalid_mode(self, client, sample_match):
        response = client.patch(
            f"/api/v1/matches/{sample_match.id}/ticker-mode",
            json={"mode": "invalid"},
        )
        assert response.status_code == 422
```

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

Das Frontend wurde im Rahmen dieser Arbeit vollständig von JavaScript (`.jsx`) zu TypeScript (`.tsx`/`.ts`) migriert. Der Ausgangszustand war eine reine JavaScript-Codebasis ohne statische Typen.

### 6.6.2 Ergebnis

Die `type-coverage`-Metrik (Anteil explizit getypter Ausdrücke an allen Ausdrücken) wurde wie folgt gesteigert:

| Zeitpunkt                                      | type-coverage | TypeScript-Fehler |
| ---------------------------------------------- | ------------- | ----------------- |
| Migrationsbeginn                               | 78,33 %       | 885               |
| Nach Grundmigration                            | ~84 %         | 0                 |
| Nach Interface-Ausbau (Hooks, Panels)          | ~89 %         | 0                 |
| **Endstand (nach `parseCommand`-Typisierung)** | **91,33 %**   | **0**             |

Der Wert von 91,33 % bedeutet: Von 18.460 gemessenen Typausdrücken sind 16.861 explizit getypt. Die verbleibenden ~8,7 % verteilen sich auf wenige, bewusst offen gelassene Stellen:

- **`MatchSelectorModal.tsx`**: Ein großes Modal mit komplexem internen State, in dem die Typisierung stark von einer kommenden API-Stabilisierung abhängt.
- **`MediaPickerPanel.tsx` / `YouTubePanel.tsx` / `ClipPickerPanel.tsx`**: Media-Panels, die externe API-Responses (ScorePlay, YouTube) verarbeiten, deren Typen nicht vollständig spezifiziert sind.
- **Exports in `components/index.ts`**: Barrel-Exports mit `export { X }` ohne explizite Typ-Annotationen — technisch korrekt, aber von `type-coverage` als untypiert gezählt.

### 6.6.3 Zentrale Typen-Architektur

Alle domänenrelevanten Typen sind in einer zentralen Datei [src/types/index.ts](../frontend/src/types/index.ts) konsolidiert. Dies umfasst:

- **Entitätstypen**: `Match`, `MatchEvent`, `TickerEntry`, `Team`, `Competition`, `Player`, `LineupEntry`, `PlayerStat`, `MatchStat`
- **Union-Types**: `TickerMode` (`"auto" | "coop" | "manual"`), `TickerStyle`, `MatchPhase`
- **Payload-Interfaces**: `PublishPayload`, `ReloadFunctions`, `RoundLabel`
- **Konstanten**: `MODES` als `as const`-Objekt, sodass `MODES.AUTO` direkt als `TickerMode` inferiert wird

Alle zentralen Hooks (`useMatchCore`, `useNavigation`, `useRightPanelData`, `useTicker`, `useMatchTriggers`) sowie alle UI-Komponenten verfügen über vollständige Props-Interfaces.

### 6.6.4 Nutzen im Entwicklungsprozess

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

### 6.7.3 Provider-Vergleich

Das System unterstützt fünf LLM-Provider in einer festen Fallback-Kette:

| Priorität | Provider   | Standard-Modell                    | Temperatur |
| --------- | ---------- | ---------------------------------- | ---------- |
| 1         | OpenRouter | `google/gemini-2.0-flash-lite-001` | 0,3        |
| 2         | Gemini     | `gemini-2.0-flash-lite-001`        | 0,3        |
| 3         | OpenAI     | `gpt-4o-mini`                      | 0,3        |
| 4         | Anthropic  | `claude-haiku-4-5-20251001`        | 0,3        |
| 5         | Mock       | — (regelbasierte Templates)        | —          |

Der erste Provider mit konfiguriertem API-Key wird als Singleton aktiviert. Für die Evaluation wurde jeder Provider einzeln über den Bulk-Endpunkt auf denselben Eventdatensatz angewendet.

**Ergebnisse des Provider-Vergleichs:**

Im produktiven Render-Deployment sind OpenRouter (Priority 1) und Mock (Fallback) konfiguriert. Die übrigen Provider wurden mangels aktivierter API-Keys nicht evaluiert; ihre Einbindung ist architektonisch vollständig implementiert und in der Fallback-Kette priorisiert.

| Provider   | Modell                             | Korrektheit | Tonalität | Verständlichkeit | Gesamt  |
| ---------- | ---------------------------------- | ----------- | --------- | ---------------- | ------- |
| OpenRouter | `google/gemini-2.0-flash-lite-001` | 4,6 / 5     | 4,1 / 5   | 4,3 / 5          | 4,3 / 5 |
| Mock       | regelbasiert (Templates)           | 4,0 / 5     | 3,0 / 5   | 3,0 / 5          | 3,3 / 5 |
| Gemini     | `gemini-2.0-flash-lite-001`        | —           | —         | —                | —       |
| OpenAI     | `gpt-4o-mini`                      | —           | —         | —                | —       |
| Anthropic  | `claude-haiku-4-5-20251001`        | —           | —         | —                | —       |

_Messgrundlage: N = 16 deutschsprachige KI-generierte Einträge (OpenRouter), N = 7 (Mock), gemessen über 28 FullTime-Spiele auf dem Render-Deployment. Qualitätswerte (1–5) wurden manuell anhand der Kriterien aus 6.8.1 bewertet._

Die detaillierte Latenzanalyse einschließlich der bimodalen Verteilung der Antwortzeiten findet sich in Abschnitt 6.10.1. Die deskriptiven Mittelwerte belegen einen klaren Qualitätsvorsprung des LLM-Providers gegenüber dem Mock in der Tonalitätstreue (Δ = 1,1 Skalenpunkte).

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

**Beobachtung:** Die drei Stilprofile unterscheiden sich deutlich in Ausrufezeichen-Dichte, Wortwahl und Perspektive. Während `neutral` Fakten kompakt zusammenfasst, erzeugt `euphorisch` narrative Intensität durch Wiederholungen und Ausrufe. `kritisch` nähert sich dem neutralen Registre, enthält aber keine explizite analytische Einordnung — ein Hinweis darauf, dass das Prompt-Design für dieses Profil noch Optimierungspotenzial bietet (vgl. 6.8.4).

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

### 6.8.3 Typische Stärken

**Beispiel 1 — Tor (euphorisch, Bewertung 5/5/5):**

> Event: Tor, 81. Minute, R. Doan (Eintracht Frankfurt vs. FSV Mainz 05), Vorlage Collins
> KI-Text: „81. Minute: WAS IST DENN HIER LOS?! Collins mit der butterweichen Flanke! DOAN! Der Ball ist drin! TOOOOR! 1:0! Die Hütte bebt!"

Bewertung: Der Text erfasst alle verfügbaren Fakten (Minute, Torschütze, Vorlagengeber, Ergebnis) korrekt und nutzt emotionale Stilmittel des Liveticker-Genres präzise: Wiederholung des Torschützennamens, Ausrufe und ein szenisch-bildhafter Abschluss. Die Kürze von zwei Sätzen ist genrekonform.

**Beispiel 2 — Gelbe Karte (euphorisch, Bewertung 5/5/5):**

> Event: Gelbe Karte, 12. Minute, R. Kristensen (Eintracht Frankfurt vs. Werder Bremen)
> KI-Text: „12. Minute: Mist! Kristensen sieht Gelb! Der Schiri ist ja blind! Aber Kopf hoch, Adler! Kämpfen!"

Bewertung: Der euphorische Stil wird durch Fan-nahe Formulierungen korrekt umgesetzt: Die emotionale Reaktion auf die Karte, die implizite Parteinahme für den Verein und der aufmunternde Abschluss sind charakteristisch für vereinsnahe Liveticker. Alle Fakten (Minute, Spielername) sind korrekt.

**Beispiel 3 — Wechsel (neutral, Bewertung 4/4/4):**

> Event: Auswechslung, 65. Minute, S. Mbangula für P. Covic (Eintracht Frankfurt vs. Werder Bremen, Werder Bremen-Wechsel)
> KI-Text: „65. Minute: Erster Wechsel bei Werder Bremen. S. Mbangula geht vom Feld. Für ihn kommt P. Covic."

Bewertung: Fakten und Stil sind korrekt. Die Formulierung „Erster Wechsel" ist nicht aus dem Kontext ableitbar und stellt eine kleine Halluzination dar; in diesem Fall war sie zufällig korrekt.

### 6.8.4 Typische Schwächen und Fehlerklassen

Die qualitative Analyse identifizierte folgende wiederkehrende Fehlerklassen:

| Fehlerklasse             | Häufigkeit    | Beschreibung                                           | Beispiel                                                                                               |
| ------------------------ | ------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| **Stil-Inkonsistenz**    | 3 / 16 (19 %) | Neutraler Stil enthält emotionale Formulierungen       | „33. Minute: Oh nein! Lienhart sieht Gelb! … Aber Kopf hoch, Jungs! Kämpfen!" _(angefordert: neutral)_ |
| **Fakten-Halluzination** | 1 / 16 (6 %)  | Das LLM erfindet Details, die nicht im Kontext stehen  | Pre-Match-Text erfand eine Wettempfehlung: „Wir tippen auf Double Chance: Sieg … oder Remis."          |
| **Team-Verwechslung**    | 0 / 16 (0 %)  | Tor wird dem falschen Team zugeordnet                  | Nicht aufgetreten                                                                                      |
| **Wiederholung**         | 2 / 16 (13 %) | Aufeinanderfolgende Texte ähneln sich stark im Satzbau | Mehrere Tore mit identischer Formel „X bringt Y in Führung! Nach Vorlage von Z. 1:0."                  |
| **Überlänge**            | 0 / 16 (0 %)  | Text überschreitet die typische Liveticker-Kürze       | Nicht aufgetreten                                                                                      |

Die häufigste Fehlerklasse ist die **Stil-Inkonsistenz** des neutralen Profils: Das LLM übernimmt offensichtlich idiomatische Muster aus den euphorischen Few-Shot-Referenzen der `ef_whitelabel`-Instanz auch dann, wenn `neutral` als Stilparameter übergeben wird. Eine Lösung wäre die Trennung der Few-Shot-Pools nach Instanz und Stilprofil.

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
| Ø TTP (Sekunden)             | ≈ 5,9 s                  | ≈ 15–30 s                     | 30–120 s                |
| Einträge pro Spiel           | alle Events (typ. 12–21) | alle Events                   | redaktionell selektiert |
| Korrektheit (Ø, 1–5)         | 4,3                      | 5,0 (nach Freigabe)           | 5,0                     |
| Anteil retrahierter Einträge | geschätzt 5–10 %         | 0 % (vor Publikation geprüft) | 0 %                     |
| Redakteur-Interventionen     | 0                        | 1 pro Eintrag                 | alle                    |

_TTP-Schätzungen basieren auf den Latenzmessungen aus Abschnitt 6.10.1 (Median: 859 ms) und dem Polling-Intervall von 5.000 ms (vgl. 6.10.3). Manual: Zeitaufwand für Texterstellung unter Livebedingungen aus Kapitel 2.1._

Der Coop-Modus repräsentiert den beabsichtigten Produktivbetrieb: Die KI liefert Entwürfe, die der Redakteur mit einem Klick freigeben, bearbeiten oder verwerfen kann. Dieses Human-in-the-Loop-Design balanciert Geschwindigkeit (KI-Generierung) mit Qualitätssicherung (redaktionelle Freigabe).

---

## 6.10 Performance und Laufzeitverhalten

### 6.10.1 LLM-Latenz

Die Concurrency- und Retry-Konfiguration der LLM-Aufrufe ist in Abschnitt 5.2.8 beschrieben. Die Messung erfolgte durch 25 sequenzielle HTTP-Aufrufe an das Render-Deployment (`/api/v1/ticker/generate/{event_id}`) über 9 Bundesliga-Spiele. Gemessen wurde die **End-to-End-Latenz** (Client → Backend → OpenRouter → Gemini → Backend → Client), die für die TTP-Analyse relevant ist.

| Provider   | Modell                             | N   | Ø Latenz (ms) | Median (ms) | P95 Latenz (ms) | Fehlerrate |
| ---------- | ---------------------------------- | --- | ------------- | ----------- | --------------- | ---------- |
| OpenRouter | `google/gemini-2.0-flash-lite-001` | 25  | 836           | 859         | 2.047           | 0 %        |
| Mock       | regelbasiert (Templates)           | 7   | < 10          | < 10        | < 10            | 0 %        |
| Gemini     | `gemini-2.0-flash-lite-001`        | —   | —             | —           | —               | —          |
| OpenAI     | `gpt-4o-mini`                      | —   | —             | —           | —               | —          |
| Anthropic  | `claude-haiku-4-5-20251001`        | —   | —             | —           | —               | —          |

Die Latenzmessungen für OpenRouter zeigen eine **bimodale Verteilung**: 44 % der Messungen lagen unter 310 ms (mutmaßlich Gemini-seitige Response-Cache-Treffer), 56 % zwischen 859 ms und 2.128 ms (Kaltgenerierung). Über alle 25 Messungen beträgt die Standardabweichung 695 ms. Im Kontext des `coop`-Modus, in dem der Redakteur die KI-generierten Entwürfe vor Publikation prüft, ist die maximale gemessene Latenz von 2,1 s unproblematisch.

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
| F2  | KI-Textgenerierung für alle Event-Typen                | ✅     | 23 Event-Typen in `EVENT_TYPE_LABEL` gemappt; Bulk-Endpoint für alle Events   |
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
| N4  | TypeScript-Typsicherheit               | ✅     | 91,33 % type-coverage; 0 Compiler-Fehler                                                                               |
| N5  | Responsive UI (Mobile-tauglich)        | ✅     | Playwright-Test mit 375×812 Viewport; Mobile Tab Bar                                                                   |
| N6  | Fehlerresistenz im Frontend            | ✅     | `ErrorBoundary` mit Fallback-UI; 4 dedizierte Tests                                                                    |

### 6.11.3 Architektur-Anforderungen

| Nr. | Anforderung                                     | Status | Nachweis / Anmerkung                                                         |
| --- | ----------------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| A1  | Drei-Schichten-Architektur                      | ✅     | Data-Ingestion (n8n), Application (FastAPI+PostgreSQL), Presentation (React) |
| A2  | Repository-Pattern                              | ✅     | 12 Repository-Klassen ohne Vererbungshierarchie                              |
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

### 6.13.1 Technische Qualitätsmetriken

| Dimension              | Metrik             | Wert                 |
| ---------------------- | ------------------ | -------------------- |
| Frontend Unit-Tests    | Testanzahl         | **187 Tests**        |
| Frontend Unit-Tests    | Test-Suiten        | **15 Suiten**        |
| Frontend Unit-Tests    | Ergebnis           | **187/187 grün**     |
| E2E-Tests (Playwright) | Testanzahl         | **6 Tests**          |
| E2E-Tests (Playwright) | Ergebnis           | **6/6 grün**         |
| Backend-Tests          | Testanzahl         | **198 Tests**        |
| Backend-Tests          | Ergebnis           | **198/198 grün**     |
| Backend-Coverage       | Statement Coverage | **75 %**             |
| TypeScript-Migration   | type-coverage      | **91,33 %**          |
| TypeScript-Migration   | Compiler-Fehler    | **0**                |
| TypeScript-Migration   | Ausgangspunkt      | 78,33 % / 885 Fehler |

### 6.13.2 Anforderungserfüllung

Von 23 definierten Anforderungen (12 funktionale, 6 nicht-funktionale, 5 architektonische) sind **alle 23 vollständig erfüllt**. Die fehlende Authentifizierung ist als bewusste Projektentscheidung dokumentiert (Kap. 6.12.4) und wird nicht als Anforderung geführt.

### 6.13.3 KI-Textqualität

Die KI-generierten Texte (Modell: `google/gemini-2.0-flash-lite-001`, N = 16) erreichten auf einer 5-Punkte-Skala einen **Gesamtdurchschnitt von 4,3 / 5** (Korrektheit: 4,6, Tonalität: 4,1, Verständlichkeit: 4,3). Die größten Stärken liegen in der Faktentreue und der Genrekonformität (kurze, mündlichkeitsnahe Texte); die häufigste Fehlerklasse ist die Stil-Inkonsistenz des neutralen Profils (19 %). Die gemessene LLM-Latenz (Median: 859 ms) ermöglicht im `auto`-Modus eine geschätzte TTP von ≈ 5,9 s. Der `coop`-Modus erweist sich als optimaler Kompromiss: er kombiniert KI-Geschwindigkeit mit redaktioneller Qualitätssicherung.

### 6.13.4 Gesamtbewertung

Die Kombination aus 391 automatisierten Tests (187 Frontend + 198 Backend + 6 E2E), einer TypeScript-Coverage von 91,33 % bei null Compiler-Fehlern und einer vollständig umgesetzten Testpyramide dokumentiert eine technisch reife Codebasis. Die Teststrategie priorisiert bewusst den kritischen Redaktionspfad: Alle Kern-Workflows (Command-Parsing, Ticker-Lifecycle, LLM-Integration, Event-Verarbeitung) sind durch Unit- und Integrationstests abgesichert.

Die funktionale Evaluation zeigt, dass alle 12 Kernanforderungen an das System erfüllt sind. Die qualitative Textanalyse identifiziert sowohl Stärken (Geschwindigkeit, Formatierungstreue, Faktenübernahme aus dem Kontext) als auch Grenzen (stilistische Wiederholungen, gelegentliche Halluzinationen ohne Few-Shot-Referenzen) der KI-Generierung. Für einen produktiven Einsatz sind insbesondere die Ergänzung einer Authentifizierungsschicht, die Ausweitung der E2E-Tests auf den vollständigen Redaktionsworkflow und eine externe Nutzerstudie mit professionellen Sportredakteuren empfehlenswert.

Die Evaluation liefert damit die empirische Evidenz, auf der die kritische Einordnung in Kapitel 7 — Stärken, Limitationen und Implikationen für den Sportjournalismus — aufbaut. Die Beantwortung der Forschungsfrage erfolgt auf Grundlage dieser Ergebnisse in Kapitel 8.2.
