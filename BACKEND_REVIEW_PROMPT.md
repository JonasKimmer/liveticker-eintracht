Du bist ein Senior-Backend-Architekt. Analysiere das Python-Backend in `backend/app/` gründlich und erstelle einen priorisierten Bericht. Fokus: Architekturschichten, Code-Qualität, DRY-Verstöße, fehlende Abstraktionen, Typ-Annot ationen, Testabdeckung.

---

## Kontext

- Python 3.12 + FastAPI 0.109 + SQLAlchemy (sync) + Alembic + Pydantic v2
- Zweck: REST-API für einen KI-gestützten Fußball-Liveticker (Eintracht Frankfurt)
- LLM-Integration: Anthropic, OpenAI, Gemini, OpenRouter — wählbar per Config
- Layers: `api/v1/` (Router) → `services/` → `repositories/` → `models/` (SQLAlchemy)
- Schemas: Pydantic v2 in `schemas/`, CamelCase-Aliases via `alias_generator=to_camel`
- 13 Repositories, 17 SQLAlchemy-Models, 12 Router-Dateien, 2 Services
- Tests: 11 Dateien + conftest.py — pytest + TestClient
- Ziel: Bachelorarbeit (Note 1.0) — Clean Code ist Bewertungskriterium

---

## Dateistruktur (aktuell)

```
backend/
  app/
    api/v1/
      ticker.py          # 31Z  — Aggregator (importiert 3 Sub-Router)
      ticker_crud.py     # 160Z — 7 CRUD-Endpoints
      ticker_generate.py # 363Z — 4 KI-Generierungs-Endpoints
      ticker_batch.py    # 126Z — 2 Bulk-Eval/Translate-Endpoints
      matches.py         # 345Z — 11 Endpoints (inkl. Lineup, Stats, Sync)
      teams.py           # 278Z — 9 Endpoints + separater assignment_router
      clips.py           # 264Z — 8 Endpoints
      media.py           # 257Z — 6 Endpoints + inline WebSocket-Manager-Klasse
      players.py         # 151Z — 5 Endpoints
      seasons.py         # 102Z — 5 Endpoints
      competitions.py    #  97Z — 5 Endpoints
      events.py          #  92Z — 4 Endpoints
      countries.py       #  56Z — 3 Endpoints
    services/
      llm_service.py     # 607Z — LLM-Abstraktion für 4 Provider + Singleton
      ticker_service.py  # 193Z — LLM-Orchestrierung, Semaphore, Style-References
    repositories/        # 13 Dateien, 62–344Z
    models/              # 17 SQLAlchemy-Modelle
    schemas/             # 11 Pydantic-Schema-Dateien
    utils/
      llm_context_builders.py  # Kontext-Strings für LLM-Prompts
      db_utils.py
      evaluation_metrics.py
      http_errors.py
    core/
      config.py          # Settings (pydantic-settings)
      constants.py       # Domänen-Konstanten + resolve_phase()
      database.py        # SessionLocal, get_db dependency
      enums.py
```

---

## Prüfe folgende Punkte und berichte Findings + Fixes

### 1. Kritische Bugs (Runtime-Fehler)

**Bekannte Problemstellen — verifiziere und beschreibe:**

- **`clips.py` und `media.py`**: Rufen `generate_ticker_text(db=db, instance=...)` auf. Die Signatur von `generate_ticker_text` in `llm_service.py` akzeptiert weder `db` noch `instance`. → `TypeError` bei jedem Aufruf, 100% Runtime-Fehler.
- **Semaphore-Bypass**: `clips.py` und `media.py` rufen `llm_service.generate_ticker_text` direkt auf statt `ticker_service.call_llm`. Das `asyncio.Semaphore(settings.LLM_CONCURRENCY)` in `ticker_service.py` wird für diese Pfade nie erworben.
- **`ticker_batch.py` — unbegrenzte Parallelität**: `asyncio.gather(*[_translate_one(e) for ...]` — bei 30 Ticker-Einträgen werden 30 gleichzeitige LLM-Requests abgefeuert, ohne Semaphore.

### 2. DRY-Verstöße (Duplikate, Copy-Paste-Code)

**Konkrete Verdachtsfälle:**

- **`pre_match_injuries_*`-Normalisierung in 3 Dateien**: `llm_service.py:_normalize_event_type`, `llm_service.py:_build_event_lines`, `llm_context_builders.py:build_context_str` — dreifache Pflege desselben String-Prefix-Checks.
- **`EVENT_TYPE_MAP` (llm_service.py) vs. `LiveTickerEventType` (schemas/event.py)**: Beide mappen Partner-API-Strings auf normalisierte Typnamen. Eine Quelle der Wahrheit?
- **Paginierungs-Fabrik in `PaginatedMatchResponse.create()` vs. `PaginatedEventResponse.create()`**: Identische Berechnung (`ceil(total / page_size)`), identische Felder — in zwei Dateien. Dazu: `TeamRepository` und `SeasonRepository` bauen das Paginierungsobjekt direkt im Repository. Drei inkonsistente Orte für dieselbe Logik.
- **`TickerEntryCreate(source="manual", status=published)` in `ticker_crud.py`, `clips.py`, `media.py`**: Drei Stellen konstruieren manuell dasselbe Objekt. `ticker_service.make_ai_entry()` existiert als Factory-Pattern für KI-Einträge — warum kein `make_manual_entry()`?
- **`exists()`-Einzeiler in 4 Repositories**: `MatchRepository`, `TeamRepository`, `SeasonRepository`, `CompetitionRepository` — identischer SQLAlchemy-Query. Copy-Paste ohne abstrakte Basis.
- **`_PROVIDER_DEFAULT_MODEL`-Dict vs. `__init__`-Fallbacks in `llm_service.py`**: Dieselben Default-Modellnamen an zwei Stellen — bei OpenRouter sogar unterschiedlich (`"google/gemini-2.0-flash-lite-001"` vs. `settings.OPENROUTER_MODEL`).

### 3. Fehlende Abstraktionen

- **Kein `BaseRepository[T]`**: 13 Repositories mit konsistenter Struktur (`__init__(db)`, `get_by_id`, `create`, `update`, `delete`, `exists`), aber keine abstrakte Basisklasse erzwingt den Vertrag. Neue Repositories können und weichen ab (z.B. `EventRepository` ohne `create`, `StyleReferenceRepository` ohne `get_by_id`).
- **Kein `LLMProvider`-Protokoll**: `LLMService.__init__` verwendet eine if/elif-Kette die bei jedem neuen Provider erweitert werden muss. Kein Strategy-Pattern, kein Protocol, keine Registrierung. Testbarkeit leidet.
- **Kein `GenerationContext`-Dataclass**: `generate_ticker_text` hat 10 Parameter, `ticker_service.call_llm` hat 13. Jede Call-Site ist eine lange Keyword-Argument-Liste. Ein `GenerationContext`-Dataclass würde Lesbarkeit und Typsicherheit herstellen.
- **`MediaConnectionManager` als Service-Klasse in `media.py`**: WebSocket-Manager ist eine eigenständige stateful Service-Klasse — aber sie lebt im Route-Modul. Gehört in `services/` oder `core/`.
- **Keine `FootballApiClient`-Abstraktion**: `matches.py:sync_live` ruft `httpx.get(settings.API_FOOTBALL_BASE_URL...)` direkt im Route-Handler auf — synchron, ungetestet, ohne Fehlerbehandlung für Timeouts.

### 4. Inkonsistente Patterns über ähnliche Dateien

- **HTTP-Verben**: `teams.py` nutzt `PUT` für Updates, `matches.py` nutzt `PATCH`, `players.py` nutzt `PUT` — keine dokumentierte Konvention.
- **Paginierungs-Rückgabetypen**: 3 verschiedene Patterns in Repositories:
  - `tuple[list, int]` → Router baut Response (Match, Event, Player)
  - `PaginatedXxxResponse` direkt aus dem Repository (Team, Season)
  - Einfache `list` ohne Paginierung (Competition, Country)
- **`MatchRepository.get_by_id` vs. `load_with_teams`**: Beide Methoden führen exakt denselben Query aus (`_base_query().filter(Match.id == match_id).first()`). `load_with_teams` ist ein toter Alias — wird von 4 Dateien importiert.
- **`MatchResponse` nutzt bare `dict` für strukturierte Felder**: `localized_title`, `matchday_title`, `team_home_jersey`, `team_away_jersey` sind `Optional[dict]`, obwohl `LocalizedTitle` und `JerseyInfo` Sub-Schemas in derselben Datei existieren.
- **`EventResponse.players: Optional[list]`** im Response-Schema, aber `EventCreate.players: Optional[list[EventPlayerDto]]` im Input-Schema — inkonsistente Typisierung.
- **`TickerEntryResponse` fehlen CamelCase-Aliases**: Alle anderen Response-Schemas nutzen `alias_generator=to_camel` im `model_config`. `TickerEntryResponse` gibt snake_case-JSON zurück — das einzige Schema ohne Alias-Generator.

### 5. Große Dateien (Top nach Zeilenzahl)

```
607  app/services/llm_service.py
363  app/api/v1/ticker_generate.py
345  app/api/v1/matches.py
344  app/repositories/match_repository.py
278  app/api/v1/teams.py
264  app/api/v1/clips.py
257  app/api/v1/media.py
193  app/services/ticker_service.py
160  app/api/v1/ticker_crud.py
```

- **`llm_service.py` (607Z)**: Mischt 5 Concerns — Konfiguration, 4 Provider-Implementierungen, Mock-Templates, Singleton-Aufbau, Async-Wrapper-Funktionen. Wie aufteilen?
- **`match_repository.py` (344Z)**: Enthält faktisch 3 Sub-Repositories — Match-CRUD, Navigation (Matchdays, Competitions), Lineup-Operationen, Match-Statistiken. Sinnvoll aufteilen?
- **`ticker_generate.py` (363Z)**: 4 Endpoints mit viel Orchestrierungs-Logik direkt im Router. Was gehört in den Service?

### 6. Typ-Annotierungen

- `llm_context_builders.py`: Keine Parameter- oder Rückgabe-Typ-Annotierungen bei den Builder-Funktionen (`ctx_injuries`, `ctx_prediction`, etc.).
- `events.py:_get_match_or_404`: Fehlende Rückgabe-Typ-Annotation.
- `llm_service.py`: `**kwargs: object` in Provider-Methoden ist zu weit — die Parameterliste ist bekannt und fest.
- `match_repository.py:105`: Forward-Reference `list["Competition"]` mit bedingtem Import im Funktionskörper — besser als `TYPE_CHECKING`-Guard auf Modulebene.
- Gibt es weitere `Any`-Typen oder fehlende Annotierungen die einfach zu fixen wären?

### 7. Fehlerbehandlung & Session-Management

- **`ticker_service.py` ruft `db.rollback()` im Service auf**: Session-Lifecycle ist Aufgabe des Request-Layers (FastAPI `get_db`-Dependency), nicht des Services. Ist dieses Muster konsistent oder ein Ausreißer?
- **`matches.py:sync_live` — synchrones `httpx.get` in FastAPI-Route**: Blockiert den Worker-Thread bei jedem externen API-Call. Wie beheben?
- **`MatchRepository` re-raiseed `IntegrityError` roh**: Routen die `handle_integrity_error()` verwenden, handhaben das korrekt — aber `ticker_crud.py:create_manual_entry` tut das nicht. Kann zu unkontrolliertem 500er führen.
- **Dead Config-Werte**: `config.py` definiert `LLM_MODEL: str = "gpt-4"` und `LLM_TEMPERATURE: float = 0.7` — beide werden im Code nie gelesen. `constants.py:LLM_TEMPERATURE = 0.3` ist der tatsächlich genutzte Wert. Ist das bewusste Dokumentation oder ein Bug?

### 8. Code Smells

- **`LLMService`-Singleton auf Modulebene**: `llm_service = _build_singleton()` wird bei jedem Import ausgeführt — instanziiert LLM-Clients und prüft API-Keys zur Import-Zeit. Erschchwert Unit-Tests und erhöht Cold-Start-Zeit.
- **Inline-Schema im Route-Modul**: `class TickerModeUpdate(BaseModel): mode: str` direkt in `matches.py:137`. Gehört in `schemas/match.py`. Die Validierung `if data.mode not in ("auto", "coop", "manual")` reimplementiert was ein Pydantic-`Field(pattern=...)` erledigen würde.
- **`assignment_router` als Second-Router in `teams.py`**: Einziges Beispiel im Codebase wo eine Router-Datei zwei Router-Objekte registriert. Einheitliche Konvention?
- **`repositories/__init__.py` exportiert 4 von 13 Repositories**: Die anderen 9 werden per direktem Modul-Import importiert. Das `__init__.py` ist unvollständig und irreführend.
- **`resolve_phase()` in `constants.py`**: String-Prefix-Checks (`startswith("pre_match")`) statt Map-Einträge — inkonsistent mit dem `SYNTHETIC_EVENT_PHASE_MAP`-Ansatz für alle anderen Events.

### 9. Testabdeckung

Bekannte Testlücken:

- `ticker_generate.py` (363Z, 4 Endpoints) — **kein einziger Test** für den Kern-Feature (KI-Generierung)
- `ticker_batch.py` (126Z) — kein Test
- `clips.py` (264Z) — kein Test (und enthält den Runtime-Bug mit `db`-Kwarg)
- `media.py` (257Z) — kein Test (inkl. WebSocket-Endpoints)
- `teams.py` (278Z) — kein Test
- `seasons.py` (102Z) — kein Test
- `countries.py` — kein Test
- `StyleReferenceRepository`, `MediaClipRepository`, `MediaQueueRepository` — kein Test
- `LLM`-Semaphore-Enforcement — nirgends geprüft
- `score_at_event`-Berechnung mit Own-Goal-Logic — kein dedizierter Test

Frage: Welche 3-5 Test-Dateien hätten den größten Impact auf die Stabilität — und wie würden die Tests aussehen?

---

## Ausgabeformat

Erstelle eine priorisierte Liste:

**P0 — Muss gefixt werden** (Runtime-Bugs, kritische Architektur-Verletzungen, tote Code-Pfade)
**P1 — Sollte gefixt werden** (fehlende Abstraktionen, DRY-Verstöße, Typ-Erosion)
**P2 — Nice-to-have** (Konsistenz, Konventionen, kleinere Code Smells)

Pro Finding:

- **Was:** Kurze Beschreibung
- **Wo:** Dateipfad(e) + Zeilennummern wenn möglich
- **Warum:** Was ist das konkrete Problem?
- **Fix:** Konkreter Vorschlag (max 2-3 Sätze)
- **Aufwand:** S/M/L
