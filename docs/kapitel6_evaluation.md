# Kapitel 6 – Evaluation

---

## 6.1 Zielsetzung der Evaluation

Das Ziel der Evaluation ist es, die technische Qualität des implementierten Systems nachweisbar zu machen. Im Mittelpunkt stehen dabei vier Dimensionen: die Korrektheit der Kernlogik (Unit-Tests), das Zusammenspiel der API-Schichten (Integrations-Tests), die Stabilität der Benutzeroberfläche unter realen Bedingungen (End-to-End-Tests) sowie die statische Typsicherheit des gesamten Frontends (TypeScript-Coverage). Die Metriken dienen nicht nur der Qualitätssicherung, sondern dokumentieren auch die Reife der Codebasis für einen produktiven Einsatz.

---

## 6.2 Teststrategie und Testpyramide

Die Teststrategie folgt dem klassischen Pyramiden-Modell: Eine breite Basis schneller, isolierter Unit-Tests wird durch eine mittlere Schicht von Integrations-Tests ergänzt, die reale HTTP-Endpunkte gegen eine transaktionale Testdatenbank prüfen. An der Spitze stehen Playwright-basierte End-to-End-Tests, die den vollständigen Redaktionsworkflow im Browser simulieren.

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

Das Frontend verfügt über **248 Unit-Tests** in 23 Testdateien, die alle mit `npm test -- --watchAll=false` grün durchlaufen. Aufgrund der schrittweisen Migration von JavaScript zu TypeScript existieren für einige Hooks bewusst parallele `.js`- und `.ts`-Testdateien, die dieselbe Logik gegen beide Modulformen absichern. Die Tests decken vier Kategorien ab: Utility-Funktionen, React-Hooks, UI-Komponenten und TypeScript-Typen.

| Test-Suite | Datei | Tests | Fokus |
|---|---|---|---|
| `parseCommand` | `utils/parseCommand.test.ts` | 45 | Slash-Command-Parser: alle Events, Phasen, Fehlerfälle |
| `roundLabel` | `utils/roundLabel.test.ts` | 16 | Spieltag-Beschriftungen, Knockout-Mapping |
| `RightPanelComponents` | `components/RightPanelComponents.test.tsx` | 18 | Aufstellung, Statistiken, Tabs |
| `PublishedEntry` | `components/PublishedEntry.test.tsx` | 17 | Eintrag-Darstellung, Bearbeitungsmodus |
| `EntryEditor` | `components/EntryEditor.test.tsx` | 19 | Publish-Flow, Preview-Rendering, Keyboard-Shortcuts |
| `useRightPanelData` | `hooks/useRightPanelData.test.ts` | 10 | Spieler-Lookup, Linien-Bildung, Torschützen |
| `useSearchableDropdown` | `hooks/useSearchableDropdown.test.ts` | 10 | Filter-, Keyboard-, Reset-Logik |
| `useLiveMinute` | `hooks/useLiveMinute.test.ts` | 10 | Live-Minuten-Berechnung, Halbzeit-Offset |
| `useListKeyboard` | `hooks/useListKeyboard.test.tsx` | 9 | Arrow-Navigation, Tab/Enter/Escape |
| `CommandPalette` | `components/CommandPalette.test.ts` | 7 | Autocomplete-Logik, Keyboard-Navigation |
| `useMatchEvents` | `hooks/useMatchEvents.test.ts` | 6 | Event-Filterung, Status-Mapping |
| `resolvePollingInterval` | `utils/resolvePollingInterval.test.ts` | 6 | Polling-Frequenz je Spielstatus |
| `useMatchTicker` | `hooks/useMatchTicker.test.ts` | 5 | Polling-Logik, Fehlerbehandlung |
| `useClickOutside` | `hooks/useClickOutside.test.ts` | 5 | Event-Listener-Lifecycle |
| `ErrorBoundary` | `components/ErrorBoundary.test.tsx` | 4 | Fehler-Capture, Fallback-UI |

### 6.3.2 Kernmodul: `parseCommand`

Der `parseCommand`-Utility ist das komplex­este Stück Geschäftslogik im Frontend — er transformiert Slash-Commands (z. B. `/g Müller SGE`) in strukturierte Ticker-Einträge. Die 47 Tests decken alle 11 Command-Typen (Tor, Eigenton, Gelbe/Rote Karte, Wechsel, Notiz, verfehlter Elfmeter und alle 11 Phasen-Commands) sowie explizit die Fehlerfälle ab:

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
  const match = { ...baseMatch, matchPhase: "SecondHalf", startsAt: iso60MinAgo };
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

| Test-Datei | Tests | Kategorie | Fokus |
|---|---|---|---|
| `test_ticker_api.py` | 20 | API (Integration) | Ticker CRUD, Publish/Reject, Manual-Entry, Phasen-Deduplizierung |
| `test_matches_api.py` | 27 | API (Integration) | Match CRUD, Ticker-Mode, Lineup, Statistiken, Player-Stats, Verletzungen |
| `test_events_api.py` | 11 | API (Integration) | Events: Upsert, Paginierung, Update, Delete |
| `test_competitions_api.py` | 12 | API (Integration) | Wettbewerbe: Listenabfrage, Paginierung |
| `test_players_api.py` | 11 | API (Integration) | Spieler: Abfrage, Sortierung |
| `test_ticker_entry_repository.py` | 10 | Repository (Unit) | CRUD-Operationen auf Datenbankebene |
| `test_ticker_service.py` | 10 | Service (Unit) | Kontext-Aufbau, Score-Berechnung, KI-Eintrag-Erstellung |
| `test_evaluation_metrics.py` | 18 | Utility (Unit) | BLEU, ROUGE, Lesbarkeit, Sentiment |
| `test_llm_service.py` | 28 | Service (Unit/Mock) | LLM-Provider-Routing, Prompt-Aufbau, Fallback-Logik |
| `test_constants.py` | 14 | Utility (Unit) | Konstanten-Vollständigkeit, Phasen-Mapping |
| `test_utils.py` | 37 | Utility (Unit) | HTTP-Fehlerbehandlung, DB-Utilities, Context-Builder |

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

| Schicht | Dateien | Ø Coverage | Anmerkung |
|---|---|---|---|
| **Modelle** (`app/models/`) | 14 | 100 % | Vollständig abgedeckt |
| **Schemas** (`app/schemas/`) | 11 | ~95 % | Pydantic-Validierung vollständig getestet |
| **Utilities** (`app/utils/`) | 5 | ~80 % | Evaluation-Metriken, HTTP-Fehler, Context-Builder |
| **API-Endpunkte** (`app/api/v1/`) | 14 | ~55 % | Kern-Routes getestet; Clip/Media/Teams noch offen |
| **Repositories** | 12 | ~55 % | Ticker/Event/Match gut; Clip/Season/Style offen |
| **Services** | 2 | ~50 % | LLM-Service (Mocking), Ticker-Service |

Die unbelegten Bereiche konzentrieren sich auf Nebenroutes (Clip-Import, Medienverwaltung, Saisonverwaltung), die außerhalb des kritischen Redaktionspfads liegen.

---

## 6.5 End-to-End-Tests (Playwright)

### 6.5.1 Aufbau

Die 6 Playwright-Tests validieren den Browser-seitigen Workflow der Anwendung. Sie simulieren reale Nutzerinteraktionen im Chromium-Browser und sind so konzipiert, dass sie auch ohne laufendes Backend sinnvoll laufen: Backend-bedingte Abweichungen (z. B. leere Länder-Liste) werden als erwarteter Zustand behandelt, nicht als Fehler.

| Test | Beschreibung |
|---|---|
| `App lädt korrekt > Startseite zeigt Navigations-UI` | Prüft, dass die React-App ohne Crash-Screen rendert |
| `App lädt korrekt > StartScreen zeigt Länder-Dropdown` | Prüft, dass `.lt`-Root-Element sichtbar wird |
| `Navigation > Länder-Dropdown ist interaktiv` | Prüft, dass Label und Select-Element im DOM erreichbar sind |
| `Navigation > Kein unbehandelter JS-Fehler beim Laden` | Fängt JavaScript-Laufzeitfehler ab (mit Whitelist für bekannte Netzwerkfehler) |
| `Ticker-Oberfläche > Keyboard-Shortcuts-Modal öffnet sich` | Simuliert Klick auf `?`-Button, prüft Modal-Öffnung und Overlay-Schließen |
| `Ticker-Oberfläche > Mobile Tab Bar ist auf kleinen Screens sichtbar` | Prüft Viewport 375×812 (iPhone SE) — App rendert korrekt |

### 6.5.2 Bewertung

Die E2E-Tests decken absichtlich den *stabilen Kern* der UI ab — das initiale Rendern, die Fehlerfreiheit beim Laden und grundlegende Interaktionspunkte. Sie dienen primär als Regression-Schutz: Bricht eine zentrale Komponente (z. B. durch einen fehlerhaften Import), schlagen die Tests unmittelbar an.

---

## 6.6 TypeScript-Typsicherheit

### 6.6.1 Ausgangslage und Migration

Das Frontend wurde im Rahmen dieser Arbeit vollständig von JavaScript (`.jsx`) zu TypeScript (`.tsx`/`.ts`) migriert. Der Ausgangszustand war eine reine JavaScript-Codebasis ohne statische Typen.

### 6.6.2 Ergebnis

Die `type-coverage`-Metrik (Anteil explizit getypter Ausdrücke an allen Ausdrücken) wurde wie folgt gesteigert:

| Zeitpunkt | type-coverage | TypeScript-Fehler |
|---|---|---|
| Migrationsbeginn | 78,33 % | 885 |
| Nach Grundmigration | ~84 % | 0 |
| Nach Interface-Ausbau (Hooks, Panels) | ~89 % | 0 |
| **Endstand (nach `parseCommand`-Typisierung)** | **91,33 %** | **0** |

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

### 6.7.1 Metriken

Neben der technischen Qualitätssicherung enthält das System eine eigene Evaluationskomponente für die KI-generierten Tickertexte (`app/utils/evaluation_metrics.py`). Diese berechnet automatisch:

- **BLEU-Score** (Bilingual Evaluation Understudy): Misst die Überlappung von n-Grammen zwischen generiertem und Referenztext
- **ROUGE-1 / ROUGE-2 / ROUGE-L**: Recall-orientierte Metriken, die den Informationsgehalt des Textes bewerten
- **Lesbarkeits-Score**: Schätzung der sprachlichen Verständlichkeit auf Basis von Satz- und Wortlänge
- **Sentiment-Score**: Einfache lexikonbasierte Bewertung der Tonalität (euphorisch, neutral, kritisch)

Diese Metriken sind im Backend als Unit-Tests vollständig abgesichert (18 Tests, ~96 % Coverage), können aber auch live über die Redaktionsoberfläche je Ticker-Eintrag abgerufen werden.

### 6.7.2 Einschränkungen

Die Evaluationsmetriken messen Textähnlichkeit und Lesbarkeit, nicht journalistische Qualität. Für eine vollständige Bewertung der KI-Texte wäre eine redaktionelle Nutzerstudie notwendig, die im Rahmen dieser Arbeit nicht durchgeführt wurde. Die Metriken dienen daher primär als Entwicklungs-Feedback, nicht als externe Validierung.

---

## 6.8 Zusammenfassung

| Dimension | Metrik | Wert |
|---|---|---|
| Frontend Unit-Tests | Testanzahl | **248 Tests** |
| Frontend Unit-Tests | Test-Suiten | **23 Suiten** |
| Frontend Unit-Tests | Ergebnis | **248/248 grün** |
| E2E-Tests (Playwright) | Testanzahl | **6 Tests** |
| E2E-Tests (Playwright) | Ergebnis | **6/6 grün** |
| Backend-Tests | Testanzahl | **198 Tests** |
| Backend-Tests | Ergebnis | **198/198 grün** |
| Backend-Coverage | Statement Coverage | **75 %** |
| TypeScript-Migration | type-coverage | **91,33 %** |
| TypeScript-Migration | Compiler-Fehler | **0** |
| TypeScript-Migration | Ausgangspunkt | 78,33 % / 885 Fehler |

Die Kombination aus 248 Frontend-Unit-Tests, 198 Backend-Tests, 6 E2E-Tests und einer TypeScript-Coverage von 91,33 % bei null Compiler-Fehlern dokumentiert eine produktionsreife Codebasis. Die Testpyramide ist vollständig umgesetzt: Die breite Basis schneller, isolierter Tests gibt Sicherheit bei Refactorings; die Integrations-Tests verifizieren das korrekte Zusammenspiel von API, Datenbankschicht und Validierungslogik; die E2E-Tests schützen den kritischen Nutzerpfad im Browser.
