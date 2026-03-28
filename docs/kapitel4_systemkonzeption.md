# Kapitel 4 – Systemkonzeption

---

## 4.1 Überblick und Schichtenmodell

Das System ist als serviceorientierte, dreischichtige Architektur ausgelegt und trennt Datenbeschaffung, Anwendungslogik und Präsentation klar voneinander.

Die **Datenbeschaffungs- und Automatisierungsschicht** wird über n8n umgesetzt. Sie integriert externe Datenquellen (insbesondere Football-API sowie Medienquellen wie ScorePlay und Social-Feeds), transformiert die Rohdaten in ein einheitliches internes Format und schreibt diese strukturiert in die Persistenzschicht beziehungsweise über definierte Backend-Endpunkte in das System ein. Die Entkopplung der Integrationslogik in n8n ermöglicht eine schnelle Anpassung von Import-Workflows, ohne den Anwendungskern ändern zu müssen.

Die **Anwendungs- und Persistenzschicht** basiert auf FastAPI (Python) und PostgreSQL. Sie stellt die REST-Schnittstellen bereit, verwaltet den Zustandsübergang der Ticker-Einträge (z. B. draft, published, rejected), orchestriert KI-Generierungsschritte und übernimmt die konsistente Speicherung aller Domänendaten (u. a. Teams, Wettbewerbe, Spiele, Events, Statistiken, Ticker- und Media-Daten).

Die **Präsentationsschicht** ist als White-Label-Frontend in React realisiert. Sie bildet den Redaktionsworkflow für Auswahl, Sichtung, Bearbeitung und Publikation ab und bleibt dabei mandantenfähig konfigurierbar (z. B. Instanz, Stil, Sprache, Branding). Technisch kombiniert das Frontend REST-basiertes Polling für Ticker- und Spieldaten mit einem dedizierten WebSocket-Kanal für Echtzeit-Medienupdates.

---

## 4.1.2 Kommunikationsfluss

Der Kommunikationsfluss folgt einem Cache-first-Muster mit bedarfsgesteuerten Webhook-Triggern.

1. Beim Öffnen der Anwendung lädt das Frontend zunächst Länder aus dem Backend (`GET /teams/countries`).
2. Ist der Länderbestand leer, wird einmalig der n8n-Webhook `import-countries` ausgelöst; danach erfolgt ein erneuter Read aus dem Backend.
3. Nach Länderauswahl lädt das Frontend die zugehörigen Teams (`GET /teams/by-country/{country}`). Nur bei leerem Ergebnis wird `import-teams-by-country` in n8n ausgelöst.
4. Nach Teamauswahl werden Wettbewerbe geladen; ergänzend werden n8n-Importe für Wettbewerbe und Spiele gestartet, um den Datenbestand zu vervollständigen.
5. Spieltage und Spiele werden anschließend aus der Backend-Datenbank gelesen (REST), nicht direkt aus n8n.
6. Nach Auswahl eines konkreten Spiels startet eine automatische Importkette: Events, Aufstellungen, Match- und Spielerstatistiken sowie Prematch-Daten werden bei Bedarf über n8n nachgeladen.
7. Auf Basis der importierten Daten werden KI-Texte erzeugt: n8n triggert für neue Events die Backend-Route `POST /api/v1/ticker/generate/{event_id}`; abhängig vom Modus werden Einträge als `draft` oder direkt als `published` gespeichert.
8. Die Redaktion sieht die Vorschläge im Frontend, kann sie redigieren, freigeben oder verwerfen; Statusänderungen laufen über REST-Updates zurück ins Backend.
9. Parallel werden ScorePlay-Medien über n8n an `POST /api/v1/media/incoming` übergeben. Das Backend speichert neue Medien und verteilt sie in Echtzeit über `/ws/media` an verbundene Clients.

---

## 4.1.3 Partner-Team-Konzept und White-Label-Steuerung

Das System unterscheidet zwischen dem **Partner-Team** — dem Verein, für den die White-Label-Instanz konfiguriert ist — und den jeweiligen Gegnern. Diese Unterscheidung wird im aktuellen Stand über ein konfigurierbares Team-Keyword (`"frankfurt"`) umgesetzt, das sowohl in n8n als auch im Frontend gegen den Teamnamen abgeglichen wird.

Das Datenbankschema enthält zusätzlich ein `is_partner_team`-Flag im `teams`-Modell, das für zukünftige Erweiterungen vorgesehen ist; die laufende Erkennung basiert jedoch auf dem Namens-Matching.

In n8n (`09_events_llm_workflow`) erfolgt die Prüfung per SQL (`ht.name ILIKE '%Frankfurt%'`) direkt vor der Generierungs-Triggerentscheidung; das Ergebnis steuert, ob `ef_whitelabel` oder `generic` als Instanzbezeichner und ob `euphorisch` oder `neutral` als Stilvoreinstellung an das Backend übergeben wird.

Im Frontend wird dasselbe Keyword aus der Konfigurationsdatei (`config/whitelabel.ts`) ausgelesen; `isEfMatch` aktiviert den `ef_whitelabel`-Instanzpfad sowie EF-spezifische UI-Bereiche (z. B. Social-Media-Panels über `isOurTeam`). Für EF-Tormomente enthält `09_events_llm_workflow` zusätzlich einen dedizierten Pfad, der Spielerdaten von `profis.eintracht.de` abruft und Torjubel-Video-URLs aus dem Spieler-Datensatz in den Prompt-Kontext einbettet. Dieses Konzept ermöglicht eine konfigurationsgesteuerte Trennung zwischen vereinsspezifischen und generischen Verarbeitungspfaden.

---

## 4.1.4 Schnittstellen und Triggerlogik

Die Systemkopplung erfolgt über klar getrennte Schnittstellentypen: REST-API (Backend), n8n-Webhooks (Orchestrierung) und WebSocket (Echtzeit-Medien). Diese Trennung reduziert Abhängigkeiten zwischen UI, Geschäftslogik und Datenimport und erlaubt eine gezielte Skalierung je Kommunikationsmuster.

Die **REST-Schnittstellen** des Backends bilden den stabilen Kern für Lese- und Schreiboperationen im Redaktionsprozess. Hierzu zählen Navigationsabfragen (z. B. Länder, Teams, Wettbewerbe, Spiele), das Laden von Match-/Event-/Ticker-Daten sowie Statusänderungen von Ticker-Einträgen. REST wird auch für manuelle Eingaben (z. B. manuelle Tickertexte, Medienpublikation) genutzt und stellt damit den kontrollierten, transaktionalen Pfad für redaktionelle Entscheidungen dar.

Die **n8n-Webhooks** werden als ereignis- bzw. bedarfsgetriebene Trigger verwendet. Funktional lassen sich drei Triggerklassen unterscheiden:

1. **Initialisierungs-Trigger**: Aufbau fehlender Stammdaten (z. B. Länder, Teams, Wettbewerbe, Spiele), typischerweise bei leerem Datenbestand.
2. **Match-Kontext-Trigger**: Import von spielbezogenen Daten nach Matchauswahl (Events, Lineups, Match-/Spielerstatistiken, Prematch-Daten).
3. **Generierungs-Trigger**: Anstoß von KI-Textprozessen (Event-basierte Generierung, Matchphasen-/Summary-Generierung), abhängig von Matchzustand und Ticker-Modus.

Die Triggerlogik folgt dabei dem Prinzip **„read first, trigger if missing"**: Das Frontend liest zunächst den vorhandenen Datenbestand über REST; nur bei fehlenden Daten wird ein passender n8n-Webhook ausgelöst. Dadurch werden externe API-Aufrufe minimiert und redundante Importe vermieden.

Für Medieninhalte existiert ein separater Echtzeitpfad: n8n übergibt neue ScorePlay-Objekte an das Backend, das diese persistiert und anschließend über den WebSocket-Endpunkt `/ws/media` an verbundene Clients broadcastet. Ticker- und Matchdaten bleiben hingegen bewusst im Polling-Modell, um die Komplexität des Hauptdatenpfads niedrig zu halten.

Insgesamt ergibt sich eine **hybride Triggerarchitektur**: REST für konsistente CRUD-Interaktionen, n8n für asynchrone Datenorchestrierung und WebSocket für latenzkritische Medien-Updates. Diese Kombination unterstützt sowohl redaktionelle Kontrolle (Human-in-the-Loop) als auch weitgehend automatisierte Live-Prozesse.

---

## 4.2 Backend-Konzeption

### 4.2.1 Framework-Wahl: FastAPI

Als Backend-Framework wurde FastAPI gewählt. FastAPI basiert auf dem ASGI-Standard und unterstützt nativ asynchrone Request-Handler über `async/await`. Diese Eigenschaft ist für das vorliegende System relevant, da mehrere I/O-lastige Prozesse parallel stattfinden, darunter externe API-Abfragen, LLM-Aufrufe und Medienverarbeitung.

Ein weiterer Vorteil ist die enge Integration von Pydantic zur typsicheren Request-/Response-Validierung. Dadurch werden Eingabefehler früh erkannt und Schnittstellenverträge konsistent gehalten. Zusätzlich erzeugt FastAPI automatisch eine OpenAPI-Spezifikation (inkl. Swagger UI), was Entwicklung und Test der Integrationen mit n8n vereinfacht. Als Laufzeitserver wird Uvicorn eingesetzt. Für externe HTTP-Kommunikation kommt `httpx` zum Einsatz.

Insgesamt verbindet FastAPI damit hohe Entwicklungsgeschwindigkeit mit klarer Typisierung und einem performanten Betriebsmodell.

---

### 4.2.2 Interne Struktur und Datenzugriff

Die interne Struktur folgt einer klaren Trennung aus API-Routern, Repository-Schicht sowie ORM-Modellen und Pydantic-Schemas. Die Router bilden die HTTP-Schnittstelle und übernehmen Validierung, Statuscodes sowie die Orchestrierung einzelner Use Cases. Datenbankzugriffe sind in dedizierten Repositories gekapselt. Dadurch bleibt die API-Schicht frei von SQL-Details, während Persistenzlogik zentral gebündelt und wiederverwendbar gehalten wird.

Für LLM-nahe Abläufe wird ergänzend eine Service-Schicht genutzt (insbesondere `ticker_service` und `llm_service`). Die Service-Schicht wird dabei gezielt, aber nicht flächendeckend eingesetzt: Viele Standard-CRUD- und Listenoperationen folgen dem Muster Router → Repository, während komplexere Generierungs- und Orchestrierungspfade über Services laufen.

Für die Datenrepräsentation gilt eine bewusste Trennung: ORM-Modelle definieren die Persistenzstruktur, Pydantic-Schemas die API-Verträge. Das stabilisiert die Schnittstellen gegenüber internen Refactorings und verbessert Wartbarkeit und Testbarkeit.

---

### 4.2.3 API-Design und Endpunktstrategie

Die Backend-Schnittstelle ist als versionierte REST-API unter `/api/v1` ausgelegt. Endpunkte sind ressourcenorientiert strukturiert (z. B. `teams`, `matches`, `ticker`, `media`, `clips`) und folgen konsistenten Benennungs- und Methodenregeln. `GET` dient lesenden Abfragen, `POST` dem Erzeugen bzw. Triggern, `PATCH` partiellen Zustandsänderungen und `DELETE` kontrollierten Löschoperationen. Insbesondere im Ticker-Kontext bildet `PATCH` den redaktionellen Lebenszyklus (`draft` → `published` bzw. `rejected`) explizit ab.

Konzeptionell wird zwischen fachlichen Datenendpunkten und prozessualen Triggerendpunkten getrennt. Dadurch bleiben Leseoperationen seiteneffektfrei, während Import- und Generierungsprozesse gezielt ausgelöst werden können. Fehlerfälle werden konsistent über HTTP-Statuscodes und strukturierte Fehlermeldungen kommuniziert, sodass Frontend und n8n-Workflows deterministisch reagieren können.

---

### 4.2.4 Asynchronität, Nebenläufigkeit und Performance

Die Laufzeitkonzeption setzt Asynchronität gezielt auf I/O-intensiven Pfaden ein, insbesondere bei LLM-bezogenen Generierungsrouten, Media-Verarbeitung und WebSocket-Kommunikation. Das erhöht die Reaktionsfähigkeit unter paralleler Last, da Wartezeiten auf externe Dienste keine Worker dauerhaft blockieren.

Die Anzahl gleichzeitiger LLM-Aufrufe wird über `asyncio.Semaphore` begrenzt; der Grenzwert ist über `LLM_CONCURRENCY` konfigurierbar (Standard: 8). Diese Begrenzung reduziert Lastspitzen und verringert die Wahrscheinlichkeit von Rate-Limit-Problemen. Die Semaphore wirkt dabei pro Prozessinstanz — bei horizontaler Skalierung steigt die effektive Gesamtkonkurrenz entsprechend der Anzahl laufender Instanzen.

Die Implementierung ist bewusst hybrid aus synchronen und asynchronen Pfaden aufgebaut. Nicht alle Endpunkte sind vollständig asynchronisiert; stattdessen wurde ein pragmatischer Kompromiss zwischen Performance, Komplexität und Wartbarkeit gewählt.

Architektonisch ist das System zudem hybrid in der Datenübertragung: Ticker- und Spieldaten werden überwiegend per Polling aktualisiert, während latenzkritische Medienupdates per WebSocket übertragen werden. Langlaufende Integrationslogik ist in n8n ausgelagert, wodurch der API-Server als transaktionaler Kern entlastet wird.

---

### 4.2.5 Fehlerbehandlung, Robustheit und Betriebsaspekte

Für den Live-Betrieb wurde das Backend auf robuste Fehlerbehandlung und kontrollierte Degradation ausgelegt. Fehler werden über konsistente HTTP-Antworten und strukturierte Meldungen zurückgegeben, sodass Frontend und n8n-Workflows differenziert reagieren können.

Ein zentraler Robustheitsfaktor ist die **idempotente Import- und Persistenzstrategie**: Wiederholte Trigger führen nicht zu unkontrollierten Duplikaten, sondern aktualisieren den Datenbestand konsistent. Das ist für webhook-basierte Integrationen mit externen Diensten essenziell.

Bei Teilausfällen bleibt das System funktionsfähig: Bereits persistierte Daten bleiben verfügbar, und redaktionelle Kernprozesse können eingeschränkt weitergeführt werden (z. B. manuelle Tickererstellung). Für Ticker- und Spieldaten wird bewusst kein harter Echtzeitanspruch verfolgt; der Polling-Ansatz priorisiert Stabilität und Vorhersagbarkeit. Echtzeit-Push ist auf den Medienkanal (`/ws/media`) fokussiert, wo der größte redaktionelle Mehrwert entsteht.

Ergänzend sichern Health-Checks, Logging, CORS-Konfiguration und klare Schnittstellentrennung die Betriebs- und Diagnosefähigkeit.

---

### 4.2.6 Grenzen und Nicht-Ziele

Die vorliegende Backend-Konzeption ist als prototypische, produktionsnahe Referenzimplementierung ausgelegt, nicht als vollständig ausgehärtete Enterprise-Plattform. Entsprechend wurden bewusst Abgrenzungen vorgenommen:

1. Sicherheits- und Rollenmodelle (z. B. feingranulare Authentifizierung/Autorisierung pro Endpunkt) sind im Prototyp nicht als Schwerpunkt umgesetzt.
2. Für Ticker- und Spieldaten wird kein vollständiger Event-Streaming-Ansatz verfolgt; die Aktualisierung erfolgt überwiegend über Polling.
3. Die Verfügbarkeit externer Dienste (Football-API, LLM-Provider, ScorePlay, n8n) bleibt eine systemische Abhängigkeit und kann trotz Degradationsstrategien die Aktualität einzelner Funktionen begrenzen.
4. Ziel der Arbeit ist nicht die vollständige betriebliche Härtung (z. B. Multi-Region-Betrieb, umfassende SLO-/SLA-Absicherung), sondern der Nachweis eines tragfähigen, erweiterbaren End-to-End-Ansatzes für KI-gestützte Liveticker-Generierung.

Diese Abgrenzung ist für die wissenschaftliche Einordnung wesentlich, da sie den realisierten Funktionsumfang klar von weiterführenden Betriebszielen trennt und die Ergebnisse im Kontext des Projektzeitraums korrekt bewertet.

---

## 4.3 Datenbankkonzeption

Die Persistenzschicht basiert auf PostgreSQL und umfasst in der aktuellen Fassung **17 Tabellen**. Das Schema ist auf einen stabilen Live-Betrieb mit wiederholbaren Importen, klaren Zustandsübergängen und nachvollziehbaren Redaktionsentscheidungen ausgelegt.

### 4.3.1 Schemadesign-Prinzipien

Das Datenbankschema folgt einem hybriden Entwurfsansatz aus strukturierter Normalisierung und gezielter Schemaflexibilität:

1. **Normalisierte Kernentitäten** — Zentrale Domänenobjekte wie `teams`, `matches`, `events`, `ticker_entries`, `players`, `competitions` und Zuordnungstabellen sind relational normalisiert modelliert. Dadurch bleiben Beziehungen, Integrität und Auswertbarkeit im Live-Betrieb stabil.
2. **Gezielter JSONB-Einsatz** — JSONB wird bewusst nur dort eingesetzt, wo sich Strukturen dynamisch ändern oder kontextabhängig sind (z. B. `synthetic_events.data`, sowie mehrere Kontextfelder in `matches`). Die Statistiktabellen (`match_statistics`, `player_statistics`) sind dagegen bewusst stark typisiert über explizite Spalten modelliert, um konsistente Abfragen und robuste Aggregationen zu ermöglichen.
3. **Schlüsselstrategie: Integer-PK + UUID-Fachschlüssel** — Das Schema verwendet numerische Primärschlüssel (`id`) für performante Joins und Fremdschlüsselbeziehungen. Zusätzlich existiert in mehreren Kernentitäten ein eindeutiges `uid`-Feld (UUID) als stabiler externer Referenzschlüssel. Es handelt sich damit nicht um ein reines UUID-Primary-Key-Schema, sondern um eine kombinierte Strategie.

---

### 4.3.2 Status-Lifecycle der Ticker-Einträge

Jeder Ticker-Eintrag in `ticker_entries` folgt einem klaren Statusmodell mit drei Zuständen:

- **`draft`**: Entwurf, noch nicht freigegeben
- **`published`**: redaktionell oder automatisch veröffentlicht
- **`rejected`**: verworfen, bleibt zur Nachvollziehbarkeit erhalten

Ergänzend markiert das Feld `source` die Herkunft (`ai` vs. `manual`) und erlaubt eine saubere Trennung für Evaluationen (z. B. ausschließlich KI-generierte Einträge).

> **Hinweis für die Methodik**: Im aktuellen Schema ist kein separates `published_at`-Feld vorhanden. Persistiert wird `created_at` des jeweiligen Ticker-Eintrags. Für sekundengenaue Time-to-Publish-Analysen sind daher zusätzliche Messzeitpunkte im Evaluationsdatensatz bzw. in der Messlogik erforderlich, statt sich allein auf den Tabellenzustand zu stützen.

---

### 4.3.3 Die drei Betriebsmodi

Das Feld `ticker_mode` in `matches` steuert das Verhalten der Generierungspipeline pro Spiel und ist zur Laufzeit umschaltbar über `PATCH /api/v1/matches/{id}/ticker-mode`. Es sind drei Modi implementiert:

1. **`auto`** (vollautomatisch) — Triggerkette läuft ohne redaktionellen Eingriff; KI-Ergebnisse werden direkt veröffentlicht.
2. **`coop`** (kooperativ / Human-in-the-Loop) — KI erzeugt Entwürfe (`draft`), die Redaktion entscheidet über Veröffentlichung oder Ablehnung. Dieser Modus bildet das primäre Zielbild des Systems.
3. **`manual`** (rein redaktionell) — Einträge werden manuell erstellt; KI-Generierung ist nicht leitend für den Veröffentlichungsprozess. Dieser Modus dient als Referenz für Vergleiche in der Evaluation.

Damit wird der Moduswechsel als Laufzeitparameter auf Datenbankebene abgebildet, ohne Deploy oder Neustart des Systems.

---

### 4.3.4 Integrität, Idempotenz und Auswertbarkeit

Für den Zusammenschluss aus n8n-Workflows, externen APIs und Backend-Routen ist die Datenbank auf idempotente Verarbeitung ausgelegt:

1. **Konfliktarme Wiederholbarkeit** — Wiederholte Imports führen durch Unique-Constraints und Upsert-Strategien nicht zu unkontrollierten Duplikaten.
2. **Eindeutige Zuordnung in zentralen Tabellen** — Eindeutige Schlüssel (z. B. `source_id` pro Ereignisquelle) sichern die Nachvollziehbarkeit importierter Ereignisse.
3. **Referenzielle Integrität über FK-Regeln** — Lösch- und Nullsetz-Strategien (`CASCADE`, `SET NULL`) sorgen dafür, dass abhängige Daten konsistent bleiben und Historie dort erhalten wird, wo sie fachlich relevant ist.
4. **Auswertungskompatibilität** — Die Kombination aus `ticker_mode`, `status`, `source`, Spielbezug und Zeitfeldern schafft die Grundlage für reproduzierbare Vergleichsauswertungen zwischen manuellen, kooperativen und automatisierten Abläufen.

---

## 4.4 Workflow-Konzeption (n8n)

Die Workflow-Schicht ist als entkoppelte Orchestrierungsebene zwischen externen Datenquellen und Backend ausgelegt. n8n übernimmt dabei API-Aufrufe, Transformation, Persistenzvorbereitung und Triggersteuerung, während das FastAPI-Backend als transaktionaler Kern und Integrationspunkt für Frontend und KI-Generierung fungiert.

### 4.4.1 Workflow-Klassen und Verantwortlichkeiten

Die n8n-Landschaft gliedert sich in vier funktionale Klassen:

**1. Stammdaten- und Strukturimporte**

- `01_import_countries.json`
- `02_import_teams_by_country.json`
- `03_import_competitions_and_matches.json`
- `04_import_matches.json`

**2. Matchdaten-Importe (spielbezogen)**

- `04_import_lineups.json`
- `05_import_match_statistics.json`
- `06_import_player_statistics.json`
- `07_import_prematch.json`

**3. Generierungs- und Phasenworkflows**

- `09_events_llm_workflow.json`
- `13_Halftime_aftertime.json`
- `14_Game_ANpfiff_ABpfiff.json`

**4. Medien- und Social-Ingestion**

- `08_scoreplay_media_workflow.json`
- `10_Twitter.json`
- `11_youtube.json`
- `12_insta.json`

Diese Trennung reduziert Kopplung, erleichtert Fehlersuche und erlaubt es, einzelne Teilprozesse unabhängig anzupassen.

---

### 4.4.2 Triggermodell und Aufrufkette

Das Frontend triggert n8n über Webhooks bedarfsgesteuert. Der zentrale Ablauf ist:

1. **Navigation / Datenbasis** — `import-countries`, `import-teams-by-country`, `import-competitions`, `import-matches`
2. **Nach Matchauswahl** — lineups, match-statistics, player-statistics, `import-prematch`, Events (Event-Import + LLM-Trigger für einzelne Ereignisse)
3. **Phasen- und Statusereignisse** — `match-status` (synthetische Matchphasen-Events), `match-summary` (Halbzeit-/Abpfiff-Zusammenfassung)
4. **Medien** — `scoreplay-media` (ScorePlay-Suche und Übergabe an Backend), dedizierte Webhooks für Twitter/X-, YouTube- und Instagram-Ingestion

Wesentlich ist die Rollenverteilung: n8n orchestriert externe Aufrufe und Triggerketten; das Backend persistiert und stellt die fachlichen API-Endpunkte bereit; das Frontend konsumiert Resultate (Polling für Ticker/Matchdaten, WebSocket für Media-Queue).

---

### 4.4.3 Datenfluss pro Workflow-Gruppe

**A) Stammdaten und Matchstruktur**

Die Workflows 01 bis 04 laden Länder, Teams, Wettbewerbe und Fixtures aus API-Football und schreiben diese via Upserts in die relationalen Tabellen. Externe IDs dienen als stabile Zuordnungsschlüssel. In 03 und 04 werden u. a. `competitions`, `competition_teams` und `matches` aktualisiert; Konflikte werden per `ON CONFLICT` behandelt.

**B) Spielbezogene Detaildaten**

`04_import_lineups`, `05_import_match_statistics` und `06_import_player_statistics` arbeiten matchbezogen: Lookup der `matches.external_id`, API-Football-Request, Transformation auf internes Schema, Persistenz (teilweise mit vorherigem Delete + Reinsert, teilweise Upsert). `07_import_prematch` erzeugt zusätzlich strukturierte Prematch-Kontexte und schreibt sie als `synthetic_events` (z. B. Injuries, H2H, Teamstats, Standings) mit konfliktarmer Aktualisierung über `ON CONFLICT (match_id, type)`.

**C) Eventbasierte KI-Generierung**

`09_events_llm_workflow` importiert Live-Events, persistiert sie in `events` und ruft anschließend für neue Ereignisse gezielt den Backend-Endpunkt `POST /api/v1/ticker/generate/{event_id}` auf. Der Workflow bestimmt vorab per SQL, ob das Spiel eine EF-Instanz ist, und übergibt `instance` und `style` entsprechend. Für EF-Tormomente enthält der Workflow einen dedizierten Pfad, der Spieler-Avatar- und Torjubel-Video-URLs aus `profis.eintracht.de` bezieht und den Spielerdatensatz im Backend aktualisiert.

**D) Matchphasen und Zusammenfassungen**

`14_Game_ANpfiff_ABpfiff` validiert Status-Transitionen, aktualisiert Matchzustände, erzeugt synthetische Phasenereignisse und stößt bei Bedarf `generate-synthetic` an. `13_Halftime_aftertime` baut aus Match-, Event-, Statistik- und Playerdaten einen Prompt, ruft OpenRouter auf und veröffentlicht den resultierenden Text über `POST /api/v1/ticker/manual` als `draft` oder `published` abhängig vom `ticker_mode`.

**E) ScorePlay und Social Media**

`08_scoreplay_media_workflow` sucht Media-Assets bei ScorePlay, extrahiert relevante URLs und übergibt neue Objekte an `POST /api/v1/media/incoming`. Das Backend verteilt neue Queue-Elemente anschließend in Echtzeit über `/ws/media`. Die Workflows 10, 11, 12 importieren Content aus Twitter/X, YouTube und Instagram in `media_clips` (inkl. Thumbnail-Caching). Diese Workflows dienen der Ingestion ins System, nicht dem Publishing in externe Netzwerke.

---

### 4.4.4 Idempotenz, Konsistenz und Fehlerrobustheit

Die Workflows sind auf wiederholbare Ausführung ausgelegt:

1. **Upsert-Strategien** — Mehrere Tabellen werden mit `ON CONFLICT DO UPDATE` oder `DO NOTHING` geschrieben, um Duplikate zu vermeiden.
2. **Deterministische Schlüsselverwendung** — Externe IDs (`external_id`, `vid`, `source_id`) werden systematisch zur Wiedererkennung genutzt.
3. **Kontrollierte Re-Triggers** — Wiederholte Aufrufe aktualisieren primär Bestände statt neue inkonsistente Datensätze zu erzeugen.
4. **Statusbasierte Filterung** — Bei synthetischen Events und Ticker-Einträgen werden vorhandene Zustände berücksichtigt, um redundante Generierungen zu reduzieren.

---

### 4.4.5 Workflow-Grenzen und projektspezifische Besonderheiten

Die Workflow-Landschaft ist funktional umfassend, enthält aber bewusst pragmatische Projektentscheidungen:

1. **Teilweise saisonspezifische Fixierung** — In einzelnen Flows ist die Saisonlogik auf 2025 begrenzt.
2. **Hybride Aktualisierungslogik** — Nicht alle Datenpfade sind eventgetrieben; ein Teil wird durch Polling und bedarfsgesteuerte Trigger ergänzt.
3. **Instanzspezifische Spezialpfade** — Einige LLM-/Medienprozesse enthalten EF-spezifische Logik, was für eine vollständig generalisierte White-Label-Fähigkeit parametriert werden müsste.

In Summe bildet n8n eine tragfähige Orchestrierungsschicht, die externe Datenquellen, interne Persistenz und KI-generierte Inhalte in einem modularen, nachvollziehbaren und erweiterbaren Ablauf zusammenführt.

---

## 4.5 KI-Komponente

### 4.5.1 Multi-Provider-Architektur

Die KI-Komponente ist als providerunabhängige Abstraktionsschicht implementiert. Der LLM-Dienst kapselt mehrere Anbieter hinter einer einheitlichen Schnittstelle und unterstützt aktuell OpenAI, Anthropic, Google Gemini, OpenRouter sowie einen Mock-Modus für Entwicklungs- und Fallbackszenarien ohne API-Key.

Die initiale Providerwahl erfolgt schlüsselbasiert in einer festen Prioritätsreihenfolge:

> `openrouter` → `gemini` → `openai` → `anthropic` → `mock`

Standardmodelle sind:

| Provider   | Standardmodell                     |
| ---------- | ---------------------------------- |
| OpenRouter | `google/gemini-2.0-flash-lite-001` |
| Gemini     | `gemini-2.0-flash-lite-001`        |
| OpenAI     | `gpt-4o-mini`                      |
| Anthropic  | `claude-haiku-4-5-20251001`        |

Zusätzlich kann die Auswahl in Generierungsrouten pro Request über `provider` und `model` überschrieben werden, was insbesondere für Evaluationsvergleiche zwischen Modellen genutzt wird.

---

### 4.5.2 Prompt-Engineering-Strategie

Die Generierung verwendet ein template-basiertes Prompting mit modularen Bausteinen, die dynamisch zusammengesetzt werden:

1. Rollen- und Stilinstruktion
2. Faktenblock zum Ereignis (Typ, Detail, Minute, beteiligte Spieler/Team)
3. Dynamischer Kontextblock mit relevanten Matchinformationen
4. Optionaler Few-Shot-Block mit Stilbeispielen
5. Regelblock mit formativen und inhaltlichen Einschränkungen

Der Few-Shot-Block wird aus der Tabelle `style_references` gespeist und nach `event_type`, `instance` und optional `league` gefiltert. Für Pre-Match-Typen enthält der Prompt zusätzliche harte Restriktionen, um Live-Szenen-Halluzinationen zu vermeiden und die Ausgabe auf Vorschau- und Analyseinhalte zu begrenzen.

---

### 4.5.3 Stilprofile und Instanzspezifik

Das System unterstützt drei zentrale Stilprofile:

- **`neutral`**: sachlich, ausgewogen, ohne Vereinspräferenz
- **`euphorisch`**: emotional und fan-nah
- **`kritisch`**: analytisch und bewertend

Ergänzend steuert die Instanzkonfiguration (`generic` vs. `ef_whitelabel`) die Tonalität. Für `ef_whitelabel` werden vereinsspezifische Stilbeispiele aus `style_references` als Few-Shot-Kontext eingebunden; die generische Instanz kann ohne vereinsgebundene Stilprägung betrieben werden.

---

### 4.5.4 Mehrsprachigkeit

Die Zielsprache ist ein expliziter Parameter der Generierungsendpunkte (`language`, Standard `de`). Texte werden direkt in der gewünschten Sprache erzeugt. Für bestehende Einträge steht eine Batch-Übersetzung über `POST /api/v1/ticker/translate-batch/{match_id}` zur Verfügung. Der aktuelle Implementierungsstand übersetzt dabei alle Einträge mit vorhandenem Textinhalt des Spiels, nicht ausschließlich KI-generierte Einträge.

---

### 4.5.5 Laufzeitkontrolle, Stabilität und Grenzen

Zur Stabilisierung der KI-Laufzeit sind mehrere Kontrollmechanismen implementiert:

1. **Konkurrenzbegrenzung** — Gleichzeitige LLM-Aufrufe werden über `asyncio.Semaphore` mit `LLM_CONCURRENCY` (Standard: 8) limitiert; die Semaphore wirkt pro Prozessinstanz (vgl. Abschnitt 4.2.4).
2. **Retry-Mechanismus mit Backoff** — Bei transienten Fehlern und Rate-Limits erfolgen automatische Wiederholungsversuche (3 Versuche, Backoff 30 s / 60 s).
3. **Konservative Temperatur** — Für die Textgenerierung wird `temperature=0.3` genutzt, um konsistentere Ausgaben zu erhalten.
4. **Fachliche Einbettung in den Ticker-Lifecycle** — Generierte Inhalte werden in die Statuslogik (`draft` / `published` / `rejected`) überführt und können im kooperativen Modus redaktionell kontrolliert werden.

---

## 4.6 Frontend-Konzeption

### 4.6.1 Architekturprinzipien

Das Frontend ist als React-Client mit TypeScript und klarer Trennung zwischen UI-Komponenten, datenbezogenen Hooks und API-Zugriffsschicht umgesetzt. Der zentrale Anwendungszustand wird überwiegend lokal bzw. feature-nah gehalten; gemeinsamer Zustand für tief verschachtelte Komponenten wird über drei dedizierte Contexts bereitgestellt (`TickerModeContext`, `TickerDataContext`, `TickerActionsContext`), um Prop-Drilling zu vermeiden und Re-Renders besser zu kontrollieren.

Die White-Label-Fähigkeit ist über eine Konfigurationsschicht (`config/whitelabel.ts`) realisiert (u. a. Farben, Team-Keyword, API-Base-URLs). Die Oberfläche unterstützt alle drei Betriebsmodi (`auto`, `coop`, `manual`) inklusive Laufzeitumschaltung über den `ModeSelector` und Synchronisierung mit dem Backend.

---

### 4.6.2 Hook- und State-Architektur

Die Zustands- und Interaktionslogik ist in wiederverwendbare Hooks aufgeteilt. Im aktuellen Stand umfasst das Frontend **16 gemeinsame Hooks** in `src/hooks` sowie **9 feature-spezifische Hooks** in `components/LiveTicker/hooks`.

Die Kernhooks sind funktional wie folgt zuzuordnen:

| Hook                | Verantwortlichkeit                                                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `useNavigation`     | Team-first Navigationskette (Land → Team → Wettbewerb → Spieltag → Spiel) inkl. bedarfsgesteuerter Importtrigger                              |
| `useMatchData`      | Laden und Polling zentraler Matchdaten (Match, Events, Ticker, Lineups, Stats, Injuries)                                                      |
| `useMatchTriggers`  | Automatische Triggerketten nach Matchauswahl und Statuswechsel (Events, Prematch, Synthetic Batch, Match-Status, Summary, Live-Stats-Monitor) |
| `useTickerMode`     | Modusverwaltung (auto/coop/manual) inkl. Keyboard-Shortcuts                                                                                   |
| `useMediaWebSocket` | Echtzeit-Feed für neue Media-Queue-Items mit exponentiellem Reconnect-Backoff (1 s → 30 s max)                                                |
| `usePanelResize`    | Interaktive Größenanpassung von Center- und Right-Panel per Drag                                                                              |
| `useApiStatus`      | Regelmäßiger Health-Check gegen Backend-Endpunkt (Intervall: 30 s)                                                                            |

---

### 4.6.3 Dreispalten-Layout und Redaktionsfluss

Die Hauptansicht folgt einem responsiven Dreispalten-Ansatz mit klarer Aufgabenverteilung:

1. **Linkes Panel** — Veröffentlichungsperspektive: listet publizierte Ticker-Einträge als chronologischen Feed, dedupliziert nach `event_id` und sortiert nach Spielminute.
2. **Mittleres Panel** — Redaktionelle Kernarbeit: Event-Verarbeitung in Abhängigkeit vom Modus (auto, coop, manual), Draft-Prüfung und Freigabe/Ablehnung, manuelle Eingabe mit Command-Parser (z. B. `/g`, `/gelb`, `/rot`, `/s`), sowie am unteren Rand integrierte Media- und Social-Panels (ScorePlay-Clips, Bundesliga-Clips, YouTube, Twitter/X, Instagram). Die Social-Media-Panels werden ausschließlich bei erkannten EF-Spielen (`isOurTeam`) eingeblendet.
3. **Rechtes Panel** — Kontext- und Analyseinformationen: Matchstatistiken, Aufstellungen inkl. Wechsel-/Karten-/Injury-Kontext sowie spielerbezogene Leistungsdaten.

---

### 4.6.4 Moduslogik und Interaktionsdesign

Die Modusumschaltung ist zentraler Bestandteil der Frontend-Konzeption:

- **AUTO** — KI generiert und veröffentlicht weitgehend automatisch.
- **CO-OP** — KI erzeugt Entwürfe, Redaktion bestätigt oder verwirft.
- **MANUAL** — ausschließlich manuelle Redaktion.

Die Umschaltung erfolgt über einen dedizierten `ModeSelector` mit Portal-basiertem Bestätigungsdialog, visueller Toast-Rückmeldung (2200 ms) und Tastatur-Shortcuts (`Ctrl+1` / `Ctrl+2` / `Ctrl+3`). Im kooperativen Modus sind zusätzliche Tastatur-Interaktionen für den Accept-/Reject-Flow (`TAB` / `ESC`) eingebunden, um den Redaktionsdurchsatz zu erhöhen.

---

### 4.6.5 Kommunikationsmuster im Frontend

Das Frontend nutzt einen hybriden Kommunikationsansatz:

1. **REST/Polling** für Match-, Event-, Ticker- und Statistikdaten. Das Polling-Intervall ist statusabhängig: **5 Sekunden** bei laufenden Spielen (Live, FullTime) sowie in der Pre-Match-Phase, um KI-Entwürfe schnell sichtbar zu machen (LLM-Latenz typischerweise 15–30 s).
2. **Webhook-Trigger über n8n** für bedarfsgesteuerte Importe und Generierungsprozesse.
3. **WebSocket** ausschließlich für latenzkritische Media-Queue-Updates (`/ws/media`) mit automatischem Reconnect bei Verbindungsabbruch.

Diese Aufteilung reduziert Komplexität in den Kerndatenflüssen und konzentriert Echtzeitmechanismen auf den Bereich mit höchstem redaktionellem Nutzen.

---

## 4.7 Skalierbarkeit, Erweiterbarkeit und Systemgrenzen

### 4.7.1 Horizontale Skalierung des Backends

Die Anwendungsschicht ist zustandslos konzipiert und kann horizontal skaliert werden, indem zusätzliche Uvicorn-Prozesse hinter einem Load-Balancer gestartet werden. Der gemeinsame PostgreSQL-Connection-Pool (`QueuePool` mit `pool_size=20`, `max_overflow=30`) stellt sicher, dass mehrere Backend-Instanzen dieselbe Datenbankverbindungskapazität teilen, ohne diese zu erschöpfen. n8n kommuniziert ausschließlich über die REST-API mit dem Backend — Backend-Skalierung hat damit keinen Einfluss auf die Workflow-Logik.

Die WebSocket-Verbindungen für ScorePlay-Medien stellen eine Skalierungseinschränkung dar: Da der in-Memory-`MediaConnectionManager` eine einfache Liste aktiver Verbindungen hält und nicht über Prozessgrenzen hinweg funktioniert, müsste bei einem Multi-Prozess-Deployment ein verteiltes Pub/Sub-System (z. B. Redis) als Broadcast-Schicht ergänzt werden. Für den aktuellen Betrieb mit wenigen gleichzeitigen Redakteurs-Clients ist diese Einschränkung nicht relevant.

---

### 4.7.2 Erweiterung um neue Ereignistypen

Neue Ereignistypen können ohne Datenbankschema-Änderungen ergänzt werden: Die `events`-Tabelle verfügt über ein generisches `description`-Feld, und die `synthetic_events`-Tabelle nutzt JSONB für vollständig flexible Payloads. Die Übersetzung von Football-API-Codes auf interne Typbezeichnungen ist im Backend in einer zentralen `EVENT_TYPE_MAP`-Konfiguration hinterlegt. Im Frontend bildet die Funktion `getEventMeta()` jeden Ereignistyp auf Icon und CSS-Klasse ab — neue Typen erfordern ausschließlich einen zusätzlichen Eintrag in dieser Funktion. Alle übrigen Komponenten konsumieren das normalisierte Icon und sind damit von konkreten Typ-Strings entkoppelt.

---

### 4.7.3 Erweiterung um neue LLM-Anbieter

Der LLM-Dienst dispatcht über ein zentrales Dictionary auf den providerabhängigen Handler: Für jeden Anbieter existiert eine interne Methode (`_generate_openai_text`, `_generate_gemini_text` etc.), die im dispatch-Dictionary unter dem Providernamen registriert ist. Neue Anbieter können durch Implementierung eines gleichnamigen Handlers und einen Eintrag in diesem Dictionary ergänzt werden, ohne bestehenden Code zu berühren. OpenRouter wird bereits als generischer Proxy-Einstiegspunkt genutzt, der unter Verwendung des OpenAI-kompatiblen SDK Zugang zu einer Vielzahl weiterer Modelle ohne separate API-Clients bietet.

---

### 4.7.4 Systemgrenzen und bekannte Limitationen

Das System weist drei konzeptionell relevante Grenzen auf.

**Erstens** hängt die Qualität aller generierten Texte direkt von der Qualität der eingehenden Ereignisdaten ab — fehlerhafte oder verzögerte Football-API-Daten propagieren direkt in die LLM-Pipeline.

**Zweitens** setzt das Short-Polling-Modell des Frontends einen Mindestabstand zwischen Ereignis und Dashboard-Aktualisierung: Das Polling-Intervall beträgt einheitlich fünf Sekunden — sowohl bei laufenden Spielen als auch in der Pre-Match-Phase, um KI-Entwürfe zeitnah sichtbar zu machen.

**Drittens** sind LLM-Ausgaben grundsätzlich nicht deterministisch — bei niedrigen Temperaturen ist die Varianz gering, aber nicht null. Für den `auto`-Modus bedeutet dies, dass gelegentlich suboptimale Texte ohne menschliche Kontrolle publiziert werden können.
