# Implementierung

---

## Überblick und Implementierungsstrategie

Dieses Kapitel dokumentiert die konkrete Umsetzung des in Kapitel 4 konzipierten Systems. Im Fokus stehen die technischen Entscheidungen auf Code-Ebene: die interne Struktur des FastAPI-Backends mit seinen Schichten aus Modellen, Repositories, Services und Routern; die KI-Generierungspipeline von der Ereigniserkennung bis zum Ticker-Eintrag; die Frontend-Implementierung mit React, Context-basiertem Zustandsmanagement und dem slash-command-getriebenen Eingabesystem; sowie die n8n-Workflow-Implementierung der fünf zentralen Automatisierungsworkflows. Ergänzend werden die TypeScript-Migration und die Testabdeckung als Qualitätsmerkmale des Entwicklungsprozesses dokumentiert.

Die Implementierung folgt dem Grundsatz **„so einfach wie nötig, so modular wie sinnvoll"**: Standardpfade (CRUD, Listabfragen) sind bewusst direkt gehalten (Router → Repository), während die LLM-Generierung mit ihren Retry-, Semaphore- und Few-Shot-Mechanismen in einen dedizierten Service extrahiert ist.

Die n8n-Workflows (Abschnitt 5.5) werden abweichend von der konzeptionellen Reihenfolge in Kapitel 4 nach der Frontend-Implementierung beschrieben: Die Workflows bauen auf Backend-Endpunkten auf, die bis dahin vollständig dokumentiert sind, sodass die Beschreibung der Orchestrierungslogik erst an dieser Stelle vollständig nachvollziehbar ist.

---

## Backend-Implementierung

### 5.2.1 Projektstruktur und Application Entry Point

Das Backend ist unterhalb von `backend/app/` in sieben funktionale Pakete gegliedert:

```
backend/app/
├── api/v1/          # HTTP-Router (FastAPI)
├── models/          # SQLAlchemy ORM-Modelle (17 Dateien)
├── repositories/    # Datenbankzugriff (je Entität eine Klasse)
├── schemas/         # Pydantic-Schemas (Request / Response)
├── services/        # Fachliche Services (llm_service, ticker_service)
├── utils/           # Hilfsmodule (llm_context_builders, evaluation_metrics)
└── core/            # Konfiguration, Datenbankverbindung, Enums, Konstanten
```

Diese Aufteilung entspricht dem klassischen Repository-Service-Router-Muster: Router delegieren an Repositories für einfache CRUD-Operationen und an Services für Logik, die mehrere Repositories oder externe Aufrufe koordiniert.

`app/main.py` ist der einzige Einstiegspunkt. Er registriert alle 12 Router unter dem Pfad-Prefix `/api/v1`, konfiguriert CORS-Middleware und bindet statische Dateien (Thumbnail-Cache) ein. Der WebSocket-Endpunkt `/ws/media` wird ohne API-Prefix eingehängt, da er kein REST-Ressourcenpfad ist. Beim Start führt `Base.metadata.create_all(bind=engine)` ein idempotentes Schema-Bootstrapping durch, das bei erstmaliger Inbetriebnahme alle Tabellen anlegt; Schema-Änderungen im Produktionsbetrieb werden via Alembic-Migrationen gesteuert.

Die Anwendung stellt zwei Metaendpunkte bereit:

| Endpunkt      | Funktion                                         |
| ------------- | ------------------------------------------------ |
| `GET /`       | Statusantwort mit Version (`0.3.0`)              |
| `GET /health` | Datenbankverbindungscheck (`healthy`/`degraded`) |

---

### 5.2.2 Datenmodelle: Datenbankschema und API-Validierung

**SQLAlchemy-Datenbankmodelle** — Das Schema umfasst **17 ORM-Modelle** (18 Datenbanktabellen, davon eine via Migration). Die zentralen Domänenobjekte sind:

| Modell            | Tabelle             | Kernfelder                                               |
| ----------------- | ------------------- | -------------------------------------------------------- |
| `Country`         | `countries`         | `id`, `name`, `uid`                                      |
| `Team`            | `teams`             | `id`, `uid`, `name`, `external_id`, `is_partner_team`    |
| `Competition`     | `competitions`      | `id`, `title`, `season_id`                               |
| `Match`           | `matches`           | `id`, `uid`, `match_state`, `match_phase`, `ticker_mode` |
| `Event`           | `events`            | `id`, `match_id`, `event_type`, `time`, `description`    |
| `SyntheticEvent`  | `synthetic_events`  | `id`, `match_id`, `type`, `data` (JSONB)                 |
| `TickerEntry`     | `ticker_entries`    | → siehe unten                                            |
| `Lineup`          | `lineups`           | `player_id`, `status`, `formation_place`, `position`     |
| `MatchStatistic`  | `match_statistics`  | 19 typisierte Spalten (Pässe, Zweikämpfe, Schüsse…)      |
| `PlayerStatistic` | `player_statistics` | `player_id`, `rating`, `goals`, `assists`, …             |
| `StyleReference`  | `style_references`  | `event_type`, `instance`, `league`, `text` (Few-Shot)    |
| `MediaQueue`      | `media_queue`       | `media_id`, `thumbnail_url`, `event_id`, `status`        |
| `MediaClip`       | `media_clips`       | `source`, `vid`, `thumbnail_url`, `match_id`             |

Das `TickerEntry`-Modell hat besondere Bedeutung im Lifecycle des Systems: Es verknüpft über `event_id` (FK auf `events`) und `synthetic_event_id` (FK auf `synthetic_events`) den generierten Text mit seinem Auslöser. Die Felder `status` (`draft`/`published`/`rejected`) und `source` (`ai`/`manual`) bilden den Ticker-Lifecycle ab (vgl. Kap. 4.3.2). Drei zusammengesetzte Indizes (`ix_ticker_match_status`, `ix_ticker_match_phase`, `ix_ticker_event_id`) optimieren die häufigsten Abfragen: publizierte Einträge je Spiel, Phase-Filter und den Deduplizierungs-Check per Event. Das Status-Enum wird als nicht-nativ gespeichert (`native_enum=False`), damit Migrationen ohne Enum-Typ-Änderungen in PostgreSQL auskommen.


**Pydantic-Schemas und API-Validierung** — Für jeden Router gibt es eigenständige Pydantic-Schemas für Create-, Update- und Response-Strukturen. Alle Schemas nutzen `alias_generator=to_camel` aus `pydantic.alias_generators`, damit JSON-Payloads in camelCase kommuniziert werden, während Python-intern snake_case gilt.

Ein spezifisches Beispiel illustriert die Alias-Mechanik für Match-Scores:

```python
class MatchResponse(BaseModel):
    home_score: Optional[int] = Field(None, serialization_alias="teamHomeScore")
    away_score: Optional[int] = Field(None, serialization_alias="teamAwayScore")
```

Hier wird `serialization_alias` (nicht `alias`) verwendet, da das Frontend die Partner-API-Feldnamen erwartet (`teamHomeScore`/`teamAwayScore`), während Schreiboperationen über `populate_by_name=True` auch den Python-Namen akzeptieren.

Diese duale Alias-Konvention zieht sich durch alle Schemas: Felder, die Spielstandwerte aus der Partner-API widerspiegeln, erhalten explizite `serialization_alias`-Werte mit Partner-Konvention (`teamHomeScore`). Standard-Beziehungsfelder hingegen erhalten durch den globalen `alias_generator=to_camel` automatisch kanonisches camelCase (`homeTeamId`, `awayTeamId`). Die Koexistenz beider Konventionen in derselben Schema-Klasse ist eine bewusste Designentscheidung: Das Frontend konsumiert sowohl Partner-API-Daten als auch eigenständig modellierte Beziehungen, und beide müssen ohne Feldumbenennungen im Frontend konsistent adressierbar sein.

Für den Match-Status-Lifecycle definiert `MatchUpdate` ein explizites Alias:

```python
match_state: Optional[MatchState] = Field(None, alias="state")
```

Für Ticker-Einträge wird der Status über ein separates PATCH-Schema gesteuert, um versehentliche Massenänderungen durch offene Update-Schemas zu vermeiden.

---

### 5.2.3 Repository-Schicht

Jede Entität hat ein dediziertes Repository, das alle SQL-Operationen kapselt. Alle Repositories erben von einer gemeinsamen `BaseRepository[T]`-Basisklasse, die die generische Operation `exists()` bereitstellt; jede Instanz erhält eine `Session` im Konstruktor:

```python
class TickerEntryRepository(BaseRepository[TickerEntry]):
    model = TickerEntry

    def get_by_event(self, event_id: int) -> Optional[TickerEntry]:
        return self.db.query(TickerEntry).filter(
            TickerEntry.event_id == event_id
        ).first()

    def get_by_match(self, match_id: int, status=None) -> list[TickerEntry]:
        ...
```

Diese Kapselung hat zwei Vorteile: Router bleiben frei von ORM-Details, und Repository-Methoden können direkt mit echten Datenbanken in Integrationstests geprüft werden — ohne Mock-Schichten, die Implementierungsabweichungen verbergen.

Das `MatchRepository` definiert eine interne `_base_query()`-Methode, die Heimteam, Auswärtsteam, Wettbewerb und Saison per `joinedload` in einer einzigen Datenbankabfrage vorlädt. `get_by_id()` nutzt diese Methode konsequent:

```python
class MatchRepository(BaseRepository[Match]):
    model = Match

    def _base_query(self) -> Query:
        return self.db.query(Match).options(
            joinedload(Match.home_team),
            joinedload(Match.away_team),
            joinedload(Match.competition),
            joinedload(Match.season),
        )

    def get_by_id(self, match_id: int) -> Optional[Match]:
        return self._base_query().filter(Match.id == match_id).first()
```

Diese Methode wird von der KI-Generierungsroute intensiv genutzt, da für jeden Aufruf vollständige Kontext-Daten (Teamnamen, Wettbewerb) benötigt werden.

---

### 5.2.4 API-Router: Endpunktstruktur

Der Ticker-Bereich ist in drei Router aufgeteilt, die gemeinsam unter `/api/v1/ticker` eingehängt werden:

| Router            | Datei                | Kernoperationen                                              |
| ----------------- | -------------------- | ------------------------------------------------------------ |
| `ticker_crud`     | `ticker_crud.py`     | GET list, GET single, PATCH status, DELETE, POST manual      |
| `ticker_generate` | `ticker_generate.py` | POST generate/{event_id}, generate-synthetic, generate-batch |
| `ticker_batch`    | `ticker_batch.py`    | POST translate-batch, generate-match-phases                  |

Diese Aufteilung verhindert, dass eine einzelne Routerdatei durch die Kombination aus CRUD-, Generierungs- und Batch-Endpunkten unübersichtlich wird.

Ein kapselndes Hilfsmuster zieht sich durch alle Router: `require_or_404(value, message)` — eine schmale Utility-Funktion in `utils/http_errors.py`, die `None`-Rückgaben aus Repository-Aufrufen direkt in eine `HTTPException(404)` überführt. Das eliminiert das repetitive `if obj is None: raise HTTPException(404, ...)` in Routern und stellt sicher, dass alle 404-Antworten einheitlich formuliert sind. Der Batch-Endpunkt `POST /api/v1/ticker/translate-batch/{match_id}` ruft für alle publizierten KI-Einträge eines Spiels den LLM-Service mit reduzierter Temperatur (`0.1`) auf, um sprachlich deterministische Übersetzungen zu erzeugen — eine gegenüber der Originalgenerierung bewusst andere Parametrisierung.

Die wichtigsten Endpunkte gliedern sich in vier funktionale Bereiche: **Stammdaten** (Countries, Teams, Matches, Seasons, Competitions), **Ticker-Lifecycle** (CRUD, Generierung per Event, Batch-Generierung für Synthetic Events, Übersetzung), **Medien & Clips** (ScorePlay-Import, Media-Queue, WebSocket) und **Spielkontext** (Lineups, Statistiken, Events). Insgesamt umfasst die API über 70 Routen; die vollständige Endpunktliste ist über die automatisch generierte OpenAPI-Dokumentation unter `/api/docs` einsehbar.

---

### 5.2.5 Ticker-Service: Domänenlogik

Der `ticker_service` kapselt die Domänenlogik für KI-Einträge. Er koordiniert Datenbankabfragen, Kontextaufbau und den LLM-Aufruf, hält dabei aber die Schichten klar getrennt: `llm_service.py` hat keine Datenbankabhängigkeit.

Die vier zentralen Funktionen:

**`score_at_event()`** berechnet den Spielstand zum Zeitpunkt eines Torereignisses. Da die Football-API den kumulativen Stand liefert, muss der Stand _vor_ dem aktuellen Event rekonstruiert werden. Die Funktion lädt alle Tore bis zur `position` des Events, unterscheidet zwischen regulären Toren und Eigentoren (letztere zählen für den Gegner) und akkumuliert die Scores für Heim- und Auswärtsteam.

**`build_match_context()`** erstellt das Kontext-Dictionary für den LLM-Prompt: Teamnamen, aktueller Stand, Matchzustand, Spielminute und Liga.

**`call_llm()`** ist der zentrale, Semaphore-gesicherte LLM-Aufruf. Er lädt zunächst aus dem `StyleReferenceRepository` bis zu drei Stilbeispiele für `event_type + instance + league` als Few-Shot-Kontext und delegiert dann an `generate_ticker_text()`:

```python
async with _llm_semaphore:   # asyncio.Semaphore(settings.LLM_CONCURRENCY)
    return await generate_ticker_text(
        event_type=event_type,
        style_references=style_references,  # aus DB geladen
        ...
    )
```

Die Semaphore ist auf Modulebene als Singleton definiert (`_llm_semaphore = asyncio.Semaphore(settings.LLM_CONCURRENCY)`, Standard: 8) und begrenzt gleichzeitige LLM-Aufrufe pro Prozessinstanz.

**`make_ai_entry()`** ist ein schlanker Builder, der aus den LLM-Ergebnissen ein `TickerEntryCreate`-Schema erzeugt. Er setzt `source="ai"` und legt den initialen Status abhängig vom Aufrufkontext fest (`draft` im Co-op-Modus, `published` im Auto-Modus).

---

### 5.2.6 LLM-Service: Prompt-Aufbau und Provider-Dispatch

Der `LLMService` ist eine single-class-Implementierung, die beim Initialisieren den passenden Client instanziiert und über ein Dispatch-Dictionary aufruft:

```python
dispatch = {
    "mock":       self._generate_mock_text,
    "gemini":     self._generate_gemini_text,
    "openrouter": self._generate_openrouter_text,
    "openai":     self._generate_openai_text,
    "anthropic":  self._generate_anthropic_text,
}
return dispatch[self.provider](**kwargs)
```

Das Dispatch-Pattern macht es trivial, neue Provider hinzuzufügen: Implementierung einer Methode `_generate_X_text()` und ein Eintrag im Dictionary.

Der Prompt wird in vier modularen Methoden aufgebaut:

**`_build_event_lines()`** erzeugt die Fakten-Sektion. Jeder Parameter (Ereignistyp, Detail, Minute, Spieler, Team) wird nur dann eingebunden, wenn er vorhanden ist. Die Ereignisbezeichnung wird aus `EVENT_TYPE_LABEL` in lesbares Deutsch übersetzt (z. B. `"goal"` → `"Tor"`).

**`_build_few_shot_block()`** formatiert die Stilreferenzen als nummerierte Beispiele:

```
### STILREFERENZEN
Schreibe in exakt diesem Stil (Rhythmus, Wortwahl, Emotionalität):
- "Mustermann trifft mit einem satten Rechtsschuss – 1:0!"
- "Eintracht schlägt zu – der erste Treffer des Abends!"
```

**`_build_prematch_parts()`** ergänzt für Pre-Match-Typen eine zusätzliche harte Instruktion: Das Modell darf keine Live-Szenen erfinden, sondern ausschließlich Vorschau- und Analyseinhalte produzieren.

Der vollständig zusammengesetzte System-Prompt folgt der in Abschnitt 4.5.2 beschriebenen modularen Struktur aus sechs Bausteinen (Rolleninstruktion, Stilinstruktion, Faktenblock, Match-Kontext, Few-Shot-Block, Regelblock). Für Pre-Match-Typen fügt `_build_prematch_parts()` eine zusätzliche harte Schutzregel ein, die das Modell auf Vorschau- und Analyseinhalte beschränkt. Die vier `_build_*`-Methoden erzeugen die Bausteine unabhängig voneinander, sodass fehlende Informationen (z. B. kein Spieler bei Phasenereignissen) den Prompt nicht invalidieren, sondern den entsprechenden Block auslassen.

LLM-Parameter: `temperature=0.3` für konsistente Ausgaben, `max_tokens` aus `LLM_MAX_TOKENS` (konfigurierbar). Bei Rate-Limit-Fehlern werden bis zu `LLM_RETRY_ATTEMPTS` (3) Versuche mit linearem Backoff (`30 s / 60 s / 90 s`) unternommen; bei sonstigen transienten Fehlern greift exponentielles Backoff (`1 s / 2 s / 4 s`).

**Normalisierung des Event-Typs** erfolgt vorab in `_normalize_event_type()`. Die `EVENT_TYPE_MAP` übersetzt externe Strings (Partner-API: `PartnerGoal`, Football-API: `Goal`) auf interne Bezeichner (`goal`). Nicht erkannte Typen fallen auf `"comment"` zurück.

---

### 5.2.7 WebSocket-Endpunkt für Media-Queue

Der WebSocket-Endpunkt `/ws/media` wird durch einen dedizierten `MediaConnectionManager` verwaltet:

```python
class MediaConnectionManager:
    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)

    async def broadcast(self, data: dict) -> None:
        dead: list[WebSocket] = []
        for ws in self.active_connections:
            try:
                await ws.send_json(data)
            except (WebSocketDisconnect, RuntimeError):
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)
```

Wenn das Backend neue Media-Queue-Einträge über `POST /api/v1/media/incoming` erhält, ruft der Router anschließend `manager.broadcast({"type": "new_media", "items": [...]})` auf. Alle verbundenen Clients erhalten das Update in Echtzeit. Der Manager hält Verbindungen in einer einfachen In-Memory-Liste, was für die aktuelle Nutzung (wenige gleichzeitige Redakteur-Clients) ausreichend ist; bei Multi-Prozess-Deployments wäre ein externes Pub/Sub-System (z. B. Redis) erforderlich.

Die persistente Seite der Media-Queue wird durch das `MediaQueueStatus`-Enum gesteuert, das zwei Zustände unterscheidet: `pending` (Medien sind eingegangen und warten auf redaktionelle Zuordnung) und `published` (Medien wurden einem Ticker-Eintrag zugewiesen). Das Frontend zeigt im `MediaPickerPanel` ausschließlich `pending`-Einträge an; sobald ein Redakteur ein Bild einem Ticker-Eintrag anhängt, wird der Status per `PATCH /api/v1/media/queue/{id}` auf `published` gesetzt. Dieses einfache Zwei-Zustands-Modell verhindert, dass einmal zugeordnete Medien in der Auswahl erneut auftauchen. Der korrespondierende Frontend-Hook `useMediaWebSocket`, der die Verbindungslebensdauer, das exponentielle Reconnect-Backoff und das Nachrichten-Handling auf Client-Seite übernimmt, ist in Abschnitt 5.4.5 beschrieben.

---

## KI-Generierungspipeline

### 5.3.1 Ablaufdiagramm

Die folgende Darstellung zeigt den vollständigen Ablauf von einem neuen Live-Ereignis bis zum publizierten Ticker-Eintrag:


---

### 5.3.2 Deduplizierung

Ein zentrales Qualitätsmerkmal der Pipeline ist die Deduplizierung: Der Generierungsendpunkt prüft vor jedem LLM-Aufruf, ob bereits ein Ticker-Eintrag für die `event_id` existiert:

```python
existing = ticker_repo.get_by_event(event_id)
if existing:
    return existing  # Idempotenter Rückgabepfad ohne LLM-Aufruf
```

Dies macht den Endpunkt idempotent gegenüber Mehrfachaufrufen — ein wichtiges Merkmal, da n8n-Workflows bei Fehlern automatisch wiederholen. Ohne diese Prüfung würde jeder Retry einen zusätzlichen Ticker-Eintrag mit unterschiedlichem (nicht-deterministischem) Text erzeugen.

---

### 5.3.3 Statusentscheidung und Modus-Steuerung

Der initiale Status des erzeugten Ticker-Eintrags wird über den Aufrufparameter `auto_publish` gesteuert, den n8n aus dem `ticker_mode` des Spiels ableitet (vgl. Kap. 4.3.3 für die konzeptionelle Beschreibung der drei Betriebsmodi):

```python
status=TickerStatus.published if data.auto_publish else TickerStatus.draft
```

Damit wird die Modus-Logik zu einem reinen Aufrufparameter des Backends — die Entscheidungsinstanz ist n8n auf Basis des in der Datenbank gespeicherten `ticker_mode`. Das Backend selbst ist modus-agnostisch: Es erhält einen Booleschen Wert und setzt den Status entsprechend.

Die drei Modi übersetzen sich auf Implementierungsebene in drei verschiedene Pfade:

| Modus    | `auto_publish` | Ergebnis    | Redakteurs-Eingriff            |
| -------- | -------------- | ----------- | ------------------------------ |
| `auto`   | `True`         | `published` | —                              |
| `coop`   | `False`        | `draft`     | TAB (accept) / ESC (reject)    |
| `manual` | —              | —           | Slash-Command → `POST /manual` |

Im `manual`-Modus wird der Generierungs-Endpunkt gar nicht aufgerufen: n8n importiert zwar weiterhin Ereignisse, triggert aber keinen LLM-Aufruf. Ticker-Einträge entstehen ausschließlich über den `POST /api/v1/ticker/manual`-Endpunkt, den das Frontend aus dem Slash-Command-Parser heraus bedient. Der Eintrag wird dort direkt mit `status=published` angelegt, da die Redakteurin den Text selbst verfasst hat und keine weitere Freigabe erforderlich ist.

Im `coop`-Modus liegt die gesamte UX-Last auf der Draft-Queue: Das Frontend zeigt neue `draft`-Einträge mit `TAB`/`ESC`-Shortcuts an (vgl. Abschnitt 5.4.6), und die Entscheidungs-Latenz beträgt je nach Komplexität des Entwurfs 15–30 Sekunden. Dieses Design stellt sicher, dass keine KI-generierten Texte ohne menschliche Prüfung publiziert werden — eine Entscheidung, die direkt aus dem journalistischen Qualitätsanspruch in Kapitel 2.1 folgt.

---

### 5.3.4 Zustandsautomat der Ticker-Einträge

Das konzeptionelle Statusmodell (`draft` → `published` / `rejected`, Undo-Übergang `published → draft`) ist vollständig in Abschnitt 4.3.2 beschrieben. Implementierungsseitig sind zwei Details hervorzuheben:

Der Übergang `published → draft` (Undo) ist im Frontend als **Toast-Aktion** realisiert: Nach jeder Publikation erscheint für 5 Sekunden ein Widerruf-Button. Über `PATCH /api/v1/ticker/{id}` mit `{ "status": "draft" }` wird der Eintrag zurückgesetzt und steht erneut zur Bearbeitung bereit.

`rejected`-Einträge werden nicht aus der Datenbank gelöscht, sondern behalten ihren Status. Diese Entscheidung sichert die Reproduzierbarkeit der Evaluation: Alle je generierten Einträge — auch verworfene — sind für spätere Qualitätsanalysen auswertbar.

---

## Frontend-Implementierung

### 5.4.1 Komponentenhierarchie

Das Frontend ist als React-Anwendung mit TypeScript organisiert. Die Hauptansicht (`LiveTicker`) gliedert sich in drei Panel-Komponenten, die von gemeinsam genutzten Hooks und Contexts gespeist werden:


Die drei Panels sind physisch getrennte React-Komponenten, kommunizieren aber ausschließlich über Context-Provider — kein Prop-Drilling über Komponentengrenzen hinweg.

---

### 5.4.2 React Context-Architektur

Das Frontend verwendet drei spezialisierte Contexts, die in `LiveTicker` zusammengeführt werden. Jeder Context hat eine klar definierte Verantwortung:

**`TickerModeContext`** — Modus-State und Tastatur-Aktionen:

```typescript
interface TickerModeContextValue {
  mode: TickerMode; // "auto" | "coop" | "manual"
  setMode: (mode: TickerMode) => void;
  acceptDraft: () => Promise<void>; // TAB-Shortcut
  rejectDraft: () => Promise<void>; // ESC-Shortcut
}
```

**`TickerDataContext`** — Match-Daten und Reload-Funktionen:

```typescript
interface TickerDataContextValue {
  match: Match | null;
  events: MatchEvent[];
  tickerTexts: TickerEntry[];
  prematch: TickerEntry[];
  lineups: LineupEntry[];
  matchStats: MatchStat[];
  players: Player[];
  playerStats: PlayerStat[];
  injuries: InjuryGroup[];
  reload: ReloadFunctions;
  generatingId: number | null;
}
```

**`TickerActionsContext`** — Callbacks für redaktionelle Aktionen:

```typescript
interface TickerActionsContextValue {
  onGenerate: (eventId: number, style: TickerStyle) => Promise<void>;
  onManualPublish: (text, icon?, minute?, phase?, rawInput?) => Promise<void>;
  onDraftActive: (id: number, text: string) => void;
  onPublished: (id: number, text: string, isManual?: boolean) => void;
  onEditEntry: (id: number, text: string) => Promise<void>;
  onDeleteEntry: (id: number) => Promise<void>;
  retractedText: string | null;
  clearRetractedText: () => void;
}
```

Die Trennung von Daten- und Aktions-Context hat einen konkreten Performance-Vorteil: Komponenten, die nur Actions konsumieren (z. B. `EntryEditor`), re-rendern nicht bei Änderungen an `tickerTexts`. Dies ist bei einem Live-Ticker mit 5-Sekunden-Polling relevant.

Alle Contexts exportieren zusätzlich einen Hook (`useTickerModeContext`, `useTickerDataContext`, `useTickerActionsContext`), der bei Verwendung außerhalb des Providers einen klaren Fehler wirft — ein Entwicklungssicherheitsnetz.

---

### 5.4.3 Hook-Architektur

Die Zustandslogik ist in zwei Ebenen von Hooks organisiert: gemeinsame Hooks unter `src/hooks/` und feature-spezifische Hooks unter `components/LiveTicker/hooks/`.

Die wichtigsten Hooks und ihre Verantwortlichkeiten:

| Hook                | Paket     | Verantwortlichkeit                                                |
| ------------------- | --------- | ----------------------------------------------------------------- |
| `useNavigation`     | hooks/    | Land→Team→Wettbewerb→Spieltag→Spiel Navigationskette              |
| `useMatchData`      | hooks/    | Aggregiert die drei Polling-Hooks und koordiniert Reload-Zyklen   |
| `useMatchCore`      | hooks/    | Polling der Match-Metadaten (Teams, Status, Spielstand, Minute)   |
| `useMatchEvents`    | hooks/    | Polling der Spielereignisse (Tore, Karten, Auswechslungen)        |
| `useMatchTicker`    | hooks/    | Polling der Ticker-Einträge (Entwürfe, publizierte Texte)         |
| `useMatchTriggers`  | hooks/    | n8n-Webhooks nach Matchauswahl und Statuswechseln                 |
| `useTickerMode`     | hooks/    | `mode`-State, PATCH zum Backend, Keyboard-Shortcuts               |
| `useMediaWebSocket` | hooks/    | WebSocket-Verbindung mit exponentiellem Reconnect-Backoff         |
| `usePanelResize`    | hooks/    | Drag-Resize zwischen Center- und Right-Panel                      |
| `useApiStatus`      | hooks/    | Health-Check gegen Backend (alle 30 s)                            |
| `useTicker`         | LT/hooks/ | Ticker-Actions, Draft-Queue, Publish-Toast (Undo)                 |
| `useEventDraft`     | LT/hooks/ | Entwurfsansicht, Accept/Reject-Logik                              |
| `useAutoPublisher`  | LT/hooks/ | Automatisches Publizieren im Auto-Modus                           |
| `useRightPanelData` | LT/hooks/ | Aufbereitung von Lineups, Stats, Spielerinfo für das rechte Panel |

`useMatchCore`, `useMatchEvents` und `useMatchTicker` betreiben jeweils einen eigenen `setInterval`-Zyklus, der bei Mount startet und bei Unmount gestoppt wird. Die HTTP-Kommunikation erfolgt über **Axios** als HTTP-Client. `useMatchData` aggregiert die drei Hooks und stellt die Daten über `TickerDataContext` bereit.

`useMatchData` steuert das Polling-Intervall über die Hilfsfunktion `resolvePollingInterval()`:

```typescript
// src/utils/resolvePollingInterval.ts
export function resolvePollingInterval(matchState: string | null): number {
  if (matchState === "Live" || matchState === "FullTime") return POLL_EVENTS_MS; // 5000
  if (matchState == null) return POLL_EVENTS_MS; // 5000
  return POLL_PREMATCH_MS; // 5000
}
```

Aktuell sind beide Konstanten (`POLL_EVENTS_MS`, `POLL_PREMATCH_MS`) auf 5000 ms gesetzt, sodass alle Zustände mit einem einheitlichen 5-Sekunden-Intervall gepollt werden. Die Unterscheidung ist als Erweiterungspunkt vorgesehen, um bei Bedarf ruhigere Polling-Intervalle für inaktive Spiele einzuführen.

---

### 5.4.4 Slash-Command-Parser (`parseCommand.ts`)

Der Slash-Command-Parser ermöglicht schnelle manuelle Texteingabe ohne Maus-Interaktion. Er übersetzt kurze Kommandos in formatierte Ticker-Texte und liefert Metadaten (Icon, Phase, Minute) für die Publikation.

Die Funktion `parseCommand(input, currentMinute)` gibt ein typisiertes `ParseResult` zurück:

```typescript
export interface ParseResult {
  type: string;
  formatted: string;
  warnings: string[];
  isValid: boolean;
  meta: {
    icon: string;
    phase: string | null;
    minute: number | null;
  };
}
```

**Phasen-Commands** (11 Einträge in `PHASE_CMDS`) erzeugen vordefinierte Texte mit optionaler Minutenangabe. Die folgende Tabelle zeigt eine Auswahl der häufigsten Einträge (7 von 11):

| Command     | Ausgabe                    | Phase             | Icon |
| ----------- | -------------------------- | ----------------- | ---- |
| `/prematch` | „Vorbericht"               | `Before`          | 📣   |
| `/anpfiff`  | „Anpfiff!"                 | `FirstHalf`       | 📣   |
| `/hz`       | „Halbzeit!"                | `FirstHalfBreak`  | 🔔   |
| `/2hz`      | „Anstoß zur 2. Halbzeit"   | `SecondHalf`      | 📣   |
| `/vz1`      | „Beginn der Verlängerung"  | `ExtraFirstHalf`  | 📣   |
| `/elfmeter` | „Elfmeterschießen beginnt" | `PenaltyShootout` | 🥅   |
| `/abpfiff`  | „Abpfiff!"                 | `After`           | 📣   |

**Event-Commands** (12 Einträge in `CMD_MAP`, 8 Typen nach Expansion) erzeugen strukturierte Texte mit Validierungshinweisen:

```
/g Mustermann EF  → "TOR — Mustermann (EF)"  + icon ⚽
/gelb Müller EF   → "Gelb — Müller (EF)"     + icon 🟨
/rot Huber Bayern → "Rote Karte — Huber (Bayern)" + icon 🟥
/s EinRaus AusRein EF → "Wechsel — EinRaus ↔ AusRein (EF)" + icon 🔄
/n Freistoß knapp über das Tor → "Freistoß knapp über das Tor"
```

Für unvollständige Eingaben gibt `warnings[]` gezielte Hinweise zurück (`"Fehlend: Spieler"`), die im `EntryEditor` live angezeigt werden. Das Frontend kann damit ohne Backend-Aufruf Validierungsfeedback geben.

Nicht erkannte Commands werden mit `isValid: false` und einer Fehlermeldung zurückgegeben (`"Unbekannter Command: /xyz"`), statt einen Laufzeitfehler zu werfen.

---

### 5.4.5 WebSocket-Hook (`useMediaWebSocket`)

Der `useMediaWebSocket`-Hook verwaltet die Lebensdauer der WebSocket-Verbindung zum Backend. Die Kernentscheidung ist das **exponentielle Reconnect-Backoff**:

```typescript
const delay = Math.min(
  BASE_DELAY_MS * 2 ** retryCountRef.current, // 1s → 2s → 4s → 8s → …
  MAX_DELAY_MS, // max 30s
);
```

Der `retryCountRef` zählt aufeinanderfolgende Verbindungsabbrüche. Bei erfolgreicher Reconnection wird er auf 0 zurückgesetzt. `BASE_DELAY_MS = 1000`, `MAX_DELAY_MS = 30_000`.

Ein `mountedRef` verhindert Zustandsänderungen nach dem Unmounten der Komponente — ein häufiges React-Problem bei asynchronen Operationen:

```typescript
ws.onclose = () => {
  if (!mountedRef.current) return; // Kein setState nach Unmount
  // … retry-Logik
};
```

Der Cleanup im `useEffect` setzt `ws.onclose = null`, bevor die WebSocket geschlossen wird. Ohne diesen Schritt würde das `close`-Event des kontrollierten Schließens einen unbeabsichtigten Reconnect-Versuch auslösen.

---

### 5.4.6 Modusimplementierung im Frontend

Der aktive Modus (`auto` / `coop` / `manual`) steuert das Verhalten mehrerer Frontend-Komponenten (vgl. Kap. 4.6.4 für die konzeptionelle Einordnung der Moduslogik und Interaktionsdesign). Die Implementierung verteilt sich auf drei Ebenen:

**Persistenz und Synchronisation** — `useTickerMode` initialisiert den Modus lokal mit `coop` als Standardwert und überschreibt diesen beim Laden eines Spiels mit dem in der Datenbank gespeicherten `ticker_mode`. Änderungen werden über `PATCH /matches/{id}/ticker-mode` ans Backend zurückgeschrieben. Lokale Optimistic-Updates vermeiden wahrnehmbare Latenz beim Umschalten.

**Keyboard-Shortcuts** — Im Co-op-Modus registriert `useTickerMode` die Shortcuts `TAB` (acceptDraft) und `ESC` (rejectDraft) direkt als Keyboard-Event-Listener. Die Shortcut-Registrierung ist an den Modus-Zustand gebunden und wird bei Moduswechsel automatisch aktualisiert.

**`useAutoPublisher`** — Im Auto-Modus überwacht dieser Hook die `tickerTexts` auf neue Draft-Einträge (`status="draft"`) und publiziert sie automatisch. Dies ist als Frontend-Fallback gedacht: Primär setzt n8n mit `auto_publish=True` den Status direkt beim Generieren; `useAutoPublisher` fängt Fälle auf, in denen das nicht geschehen ist.

---

### 5.4.7 TypeScript-Migration

Das Frontend wurde im Verlauf des Projekts von reinem JavaScript auf TypeScript migriert. Ziel war nicht die vollständige Auflösung aller `any`-Typen, sondern eine pragmatische Typisierung der systemkritischen Pfade mit messbaren Qualitätskennzahlen.

**Migrationsstrategie** — Die Migration folgte einem schrittweisen Ansatz: Zuerst wurden alle `.js`- und `.jsx`-Dateien in `.ts` und `.tsx` umbenannt, dann `tsconfig.json` konfiguriert (`target: es2015`, `module: esnext`, `jsx: react-jsx`, `moduleResolution: node`). Anschließend wurden TypeScript-Fehler von innen nach außen behoben — beginnend mit dem Typ-System (`src/types/index.ts`) über Contexts bis zu den Komponenten. Der `strict`-Modus ist derzeit deaktiviert (`"strict": false`), um die inkrementelle Migration ohne blockierende Fehlereskalation zu ermöglichen.

**Zentrale Typ-Definitionen** — `src/types/index.ts` definiert die gemeinsamen Domain-Interfaces:

```typescript
export type TickerMode = "auto" | "coop" | "manual";
export type TickerStyle = "neutral" | "euphorisch" | "kritisch";
export type MatchPhase = "Before" | "FirstHalf" | "FirstHalfBreak" | "SecondHalf" | ...;

export interface TickerEntry {
  id: number;
  match_id: number;
  event_id?: number | null;
  text: string;
  style?: string | null;
  status: "draft" | "published" | "rejected";
  source?: "ai" | "manual";
  minute?: number | null;
  phase?: string | null;
  icon?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  llm_model?: string | null;
}
```

**Ergebnis** — Nach der Migration erzielt das Projekt **0 TypeScript-Compilerfehler** und eine **type-coverage von 95,84 %** (gemessen mit `type-coverage --strict`). Die detaillierte Darstellung der Migrationsergebnisse und die Analyse der verbleibenden untypisierten Stellen folgt in Abschnitt 6.2.5.

---

## n8n Workflow-Implementierung

Die n8n-Workflows bilden die Orchestrierungsschicht zwischen externen Datenquellen, dem FastAPI-Backend und dem LLM-Dienst. Alle 15 Workflow-Dateien liegen als versionierte JSON-Exporte im Projektverzeichnis `n8n/` vor und können direkt in eine n8n-Instanz importiert werden. Die Workflows gliedern sich in vier funktionale Gruppen:

**A) Stammdaten und Matchstruktur** — Die Workflows `01_import_countries`, `02_import_teams_by_country`, `03_import_competitions_and_matches` und `04_import_matches` laden Länder, Teams, Wettbewerbe und Spielpläne aus API-Football und persistieren diese via Upsert-Strategien. Externe IDs dienen als stabile Zuordnungsschlüssel für konfliktfreie Aktualisierungen.

**B) Spielbezogene Detaildaten** — `04_import_lineups`, `05_import_match_statistics`, `06_import_player_statistics` und `07_import_prematch` importieren Aufstellungen, Match- und Spielerstatistiken matchbezogen. Der Prematch-Workflow erzeugt zusätzlich strukturierte Kontextdaten (Verletzungen, Head-to-Head, Tabellenstand) als synthetische Events, die dem LLM als Promptkontext dienen.

**C) KI-Generierung** — `09_events_llm_workflow`, `13_Halftime_aftertime` und `14_Game_ANpfiff_ABpfiff` importieren Live-Ereignisse, erzeugen synthetische Phasenereignisse und delegieren die Textgenerierung an das Backend. Der Zusammenfassungs-Workflow (`13`) ruft den LLM-Provider direkt auf, da Halbzeit-/Abpfiff-Zusammenfassungen einen umfangreicheren Prompt mit Statistiken erfordern.

**D) Medien und Social Media** — `08_scoreplay_media_workflow`, `10_Twitter`, `11_youtube` und `12_insta` importieren Medien- und Social-Media-Inhalte. Der Media-Workflow übergibt Bilder an das Backend, das diese über WebSocket verteilt; die Social-Media-Workflows speichern Clips in der Datenbank. Diese Workflows dienen der Ingestion, nicht dem Publishing.

Dieser Abschnitt dokumentiert die Implementierungsdetails der fünf zentralen Workflows (Gruppen B–D).

---

### 5.5.1 Events-LLM-Workflow (`09_events_llm_workflow.json`)

Workflow `09` ist der kritischste im System: Er importiert Live-Ereignisse via Webhook (`POST /Events`), persistiert sie per UPSERT (`ON CONFLICT (source_id) DO NOTHING`) und triggert die KI-Generierung für jeden neuen Event. Eine initiale SQL-Abfrage bestimmt anhand der Teamzugehörigkeit, ob die Instanz `ef_whitelabel` oder `generic` und der Stil `euphorisch` oder `neutral` ist; `auto_publish` wird direkt aus `ticker_mode` des Spiels gesetzt. Nur Events mit erfolgreicher Datenbankzeile (zurückgegebene `id`, kein `DO NOTHING`-Konflikt) passieren den Filter-Knoten und triggern den Backend-Endpunkt. Ein zusätzlicher EF-spezifischer Zweig liest Spielerdaten von `profis.eintracht.de`, baut S3-Video-URLs aus neunstellig aufgefüllten Spieler-IDs auf und persistiert Torjubel-Videos als Ticker-Einträge.

---

### 5.5.2 Prematch-Import-Workflow (`07_import_prematch.json`)

Workflow `07` baut den Vorberichtskontext aus fünf parallelen Football-API-Abfragen auf (Verletzungen, Head-to-Head, Teamstatistiken Heim/Gast, Tabellenstand) und persistiert die Ergebnisse als `synthetic_events` mit idempotenter `ON CONFLICT (match_id, type) DO UPDATE`-Strategie. Ein LLM-Trigger wird nur ausgelöst, wenn noch kein nicht-verworfener Ticker-Eintrag für das jeweilige synthetische Event existiert (`WHERE te.id IS NULL`) — bereits generierte und eventuell publizierte Texte werden damit nicht überschrieben.

---

### 5.5.3 Matchphasen-Workflow (`14_Game_ANpfiff_ABpfiff.json`)

Workflow `14` verarbeitet Spielzustands-Übergänge (Anpfiff, Halbzeit, Abpfiff etc.) via Webhook (`POST /match-status`). Ein JavaScript-Knoten validiert Zustandsübergänge gegen eine Matrix erlaubter Vorzustände — ungültige Übergänge (z. B. direkt von `PreMatch` zu `2H`) werden zurückgewiesen. Für Vollzeit-Ereignisse (`FT`, `AET`, `PEN`) generiert der Workflow die gesamte Phasensequenz rückwirkend: Ein `FT`-Signal erzeugt vier synthetische Events (Anstoß, Halbzeit, 2. Halbzeit, Abpfiff). Das zentrale SQL-Statement kombiniert Match-Update, Event-Insert und eine `demote`-CTE in einer einzigen Transaktion — Letztere stuft bereits publizierte Phasen-Texte bei Re-Triggers auf `draft` zurück, sodass die Redaktion sie erneut prüfen kann.

---

### 5.5.4 Halbzeit/Abpfiff-Zusammenfassung (`13_Halftime_aftertime.json`)

Workflow `13` erzeugt narrative Zusammenfassungen für Halbzeit und Abpfiff. Im Gegensatz zu `09` ruft er OpenRouter (`google/gemini-2.0-flash-lite-001`) **direkt** auf, da Zusammenfassungen keinen Few-Shot-Stil aus der Datenbank benötigen, sondern einen umfangreicheren Prompt mit parallel geladenen Statistiken (Ballbesitz, Schüsse, Pässe, Spieler-Ratings) erfordern. Das Ergebnis wird über `POST /api/v1/ticker/manual` als Ticker-Eintrag gespeichert — je nach `ticker_mode` direkt als `published` oder als `draft`.

---

### 5.5.5 ScorePlay-Medien-Workflow (`08_scoreplay_media_workflow.json`)

Workflow `08` sucht Medien-Assets bei ScorePlay für Spieler eines Torereignisses. Die Spieler-Suche (`GET /v1/tag/search`) normalisiert Umlaute (ä→a, ö→o, ü→u, ß→ss) und matcht gegen vier Namensfelder (`full_name`, `first_name`, `last_name`, `ai_name`). Gefundene Thumbnail-, Compressed- und Original-URLs werden an `POST /api/v1/media/incoming` übertragen und vom Backend per WebSocket an verbundene Frontend-Clients verteilt.

---

### 5.5.6 Implementierungsübergreifende Muster

Über alle Workflows hinweg lassen sich fünf Implementierungsmuster identifizieren:

**1. Idempotente UPSERT-Strategie** — Alle Insert-Operationen verwenden `ON CONFLICT DO UPDATE` oder `DO NOTHING`. Als Konfliktschlüssel dienen externe IDs (`source_id`, `external_id`, `vid`), zusammengesetzte Schlüssel (`match_id, type`) oder Unique-Constraints auf Namensfeldern. Das macht alle Workflows bei Mehrfachausführung sicher.

**2. Filter-vor-Trigger-Muster** — Vor jedem LLM-Trigger steht ein Filter-Knoten, der nur Rows mit einer `id` (erfolgreicher DB-Insert) durchlässt. Events mit `DO NOTHING`-Konflikten (bereits importiert) erzeugen keinen neuen LLM-Aufruf.

**3. Statusbasierte Filterung** — Bei synthetischen Events und Ticker-Einträgen werden vorhandene Zustände berücksichtigt, um redundante Generierungen zu vermeiden: Ein LLM-Aufruf wird nur getriggert, wenn noch kein nicht-verworfener Ticker-Eintrag für das Event existiert (vgl. die WHERE-Bedingungen in 5.5.2 und 5.5.3). Bei Re-Triggern werden bereits publizierte Phasen-Texte auf `draft` zurückgestuft (`demote`-CTE in 5.5.3).

**4. Ticker-Mode-Propagation** — `ticker_mode` wird in allen Generierungsworkflows als `auto_publish`-Flag an das Backend weitergegeben (vgl. Kap. 5.3.3). Die Moduslogik sitzt damit vollständig in der Datenbank; n8n liest sie bei jedem Aufruf neu aus.

**5. Instanz-Routing** — Die Unterscheidung zwischen `ef_whitelabel` und `generic` erfolgt per `ILIKE '%Frankfurt%'`-Abfrage auf Teamnamen. Das Ergebnis steuert Stilwahl, Few-Shot-Auswahl im Backend und ob der Torjubel-Video-Pfad aktiviert wird.

---


## Qualitätssicherung und Tests

Die Qualitätssicherung folgt dem Testpyramiden-Modell nach Cohn (2009) mit drei Ebenen: Unit-Tests, Integrations-Tests und End-to-End-Tests. Insgesamt umfasst die Testsuite **391 Tests** (187 Frontend, 198 Backend, 6 E2E), die alle grün durchlaufen.

**Frontend-Tests** — Das Frontend verwendet Jest mit `@testing-library/react` für 187 Tests in 15 Dateien. Die Testdateien sind kolokiert mit ihrem Quellcode: Komponentendateien unter `components/LiveTicker/components/`, Hook-Tests unter `hooks/` und Utility-Tests unter `utils/`. Besonders umfangreich getestet ist der `parseCommand`-Parser (45 Testfälle), da er die kritische manuelle Eingabeschicht bildet. Ein exemplarischer Testfall illustriert das Prüfmuster:

```typescript
test("vollstaendiger Command ist valid", () => {
  const result = parseCommand("/g Muller EIN", 32);
  expect(result.isValid).toBe(true);
  expect(result.type).toBe("goal");
  expect(result.formatted).toBe("TOR -- Muller (EIN)");
  expect(result.meta.icon).toBe("⚽");
  expect(result.warnings).toHaveLength(0);
});
```

**Backend-Tests** — Das Backend nutzt pytest mit FastAPI `TestClient` und transaktionalem Rollback für 198 Tests bei 75 % Statement-Coverage. Die Tests gliedern sich in API-Integrations-Tests (`test_ticker_api.py`, `test_matches_api.py`, `test_events_api.py` u. a.), die Endpunkte gegen eine PostgreSQL-Testdatenbank prüfen, sowie Unit-Tests für Services (`test_llm_service.py`, `test_ticker_service.py`) und Repositories (`test_ticker_entry_repository.py`). Gemeinsame Fixtures (Datenbankverbindung, Test-Match, Test-Events) sind in `conftest.py` zentralisiert.

**End-to-End-Tests** — Sechs Playwright-Tests validieren den stabilen Kern der Browser-Anwendung: korrektes Rendern, Fehlerfreiheit beim Laden und grundlegende Interaktionspunkte.

**Evaluations-Infrastruktur** — Ergänzend zur Testsuite enthält `backend/app/utils/evaluation_metrics.py` sechs statistische Hilfsfunktionen, die speziell für die Qualitätsevaluation der KI-Textgenerierung implementiert wurden:

| Funktion                              | Aufgabe                                                                                        |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `compute_ttp_stats(entries)`          | Berechnet TTP-Statistiken (Mean, Median, Perzentile) aus gemessenen Latenzen                   |
| `cliffs_delta(group_a, group_b)`      | Effektstärkemaß nach Cliff (1993) für ordinal-skalierte Vergleiche (z. B. auto vs. manual TTP) |
| `bootstrap_ci(data, n_resamples)`     | Bootstrap-Konfidenzintervall (95 %) über nichtparametrisches Resampling                        |
| `cohens_kappa(rater_a, rater_b)`      | Inter-Rater-Übereinstimmungsmaß nach Cohen (1960) für die Qualitätsbewertung                   |
| `distribution_summary(scores)`        | Deskriptive Zusammenfassung (Mean, SD, Min, Max) für Bewertungslisten                          |
| `aggregate_quality_by_group(entries)` | Aggregiert Qualitätsscores nach Gruppe (Stil, Ereignistyp, Instanz)                            |

Diese Funktionen werden in Kapitel 6.3–6.5 direkt genutzt: `cliffs_delta` für den TTP-Vergleich, `cohens_kappa` für die Bewertungsübereinstimmung und `aggregate_quality_by_group` für die profilspezifische Qualitätsanalyse. Die Implementierung in einem dedizierten `utils`-Modul (statt im Test-Code) macht die Statistikfunktionen wiederverwendbar — etwa für einen zukünftigen automatisierten Scoring-Dienst im Produktivbetrieb (vgl. Kap. 8.3.3).

Die detaillierte Auswertung aller Testmetriken, Coverage-Verteilungen und konkreten Testbeispiele folgt in Abschnitt 6.2.

---

## Deployment

Das System ist als dreischichtige Cloud-Deployment auf **Render.com** (Region: Oregon, US West) realisiert. Alle drei Dienste werden aus demselben Repository-Branch (`deploy/render-v2`) deployt und kommunizieren über das private Render-Netzwerk.

**Backend (Docker Web Service)** — Das FastAPI-Backend läuft als Docker-Container auf einem Free-Tier-Web-Service (`0.1 vCPU`, `512 MB RAM`). Render baut das Image aus `./backend/Dockerfile` mit `./backend` als Build-Kontext und startet den Uvicorn-Server gemäß der `CMD`-Instruktion im Dockerfile. Die Health-Check-Route `GET /health` (vgl. Abschnitt 5.2.1) wird von Render periodisch abgefragt; bei Ausfall wird der Dienst automatisch neu gestartet. Zugangsdaten und Konfiguration werden als Umgebungsvariablen injiziert (Datenbankverbindungs-URL, API-Keys für LLM-Provider). Das Backend ist unter `https://liveticker-backend.onrender.com` erreichbar.

**Datenbank (PostgreSQL 15)** — Die Datenbankinstanz `liveticker-db` läuft auf einem Render-Managed-PostgreSQL-Dienst (Free Tier: `256 MB RAM`, `1 GB Storage`). Die Verbindung zum Backend erfolgt über den internen Hostnamen innerhalb des privaten Render-Netzwerks. Beim ersten Start legt `Base.metadata.create_all(bind=engine)` alle Tabellen an; nachfolgende Schema-Änderungen werden via Alembic-Migrationen eingespielt. Da Free-Tier-Instanzen keinen persistenten Prozess-Storage vorhalten, ist alle Zustandshaltung in der Datenbank zentralisiert — ein direktes Ergebnis des in Abschnitt 3.8.3 beschriebenen Stateless-Design-Prinzips.

**Frontend (Static Site)** — Das React/TypeScript-Frontend wird als statische Seite deployt. Render führt `cd frontend && npm ci && npm run build` aus und veröffentlicht das Verzeichnis `./frontend/build` über sein CDN. Da kein Server-Prozess läuft, werden die generierten Dateien direkt aus dem CDN ausgeliefert. Das Frontend ist unter `https://liveticker-frontend.onrender.com` erreichbar.

**n8n (lokal mit ngrok)** — Die n8n-Workflow-Instanz läuft lokal und ist über einen **ngrok**-Tunnel für externe Webhooks erreichbar. Ngrok stellt einen öffentlich adressierbaren HTTPS-Endpunkt bereit, der eingehende Trigger-Anfragen (z. B. Spielereignisse vom Football-API-Provider) an die lokale n8n-Instanz weiterleitet. Diese Konfiguration ist für den Entwicklungs- und Evaluationsbetrieb ausreichend; ein produktiver Dauerbetrieb erfordert eine persistente n8n-Instanz mit fester Webhook-URL (z. B. self-hosted auf einem VPS oder n8n Cloud).

Die vier Komponenten bilden zusammen die in Abschnitt 4.1 konzipierten drei Systemschichten: n8n übernimmt die Datenbeschaffung (Schicht 1), Backend und Datenbank die Anwendungs- und Persistenzlogik (Schicht 2), das Frontend die Präsentation (Schicht 3). Damit ist die Implementierung vollständig; Kapitel 6 dokumentiert die systematische Evaluation des so realisierten Systems.
