# 3. Stand der Technik

## 3.1 Large Language Models

Die Entwicklung großer Sprachmodelle hat die Verarbeitung natürlicher Sprache in den vergangenen Jahren grundlegend verändert. Den technischen Ausgangspunkt bildet die **Transformer-Architektur**, die Vaswani et al. (2017, S. 1) als ein neuartiges Netzwerkdesign einführten, das ausschließlich auf Aufmerksamkeitsmechanismen basiert. Das Modell verarbeitet Text autoregressiv — bei jedem Schritt werden die zuvor generierten Tokens (Symbole) als zusätzliche Eingabe für die Erzeugung des nächsten verwendet (Vaswani et al. 2017, S. 2). Diese Eigenschaft macht Transformer-basierte Modelle besonders geeignet für sequenzielle Textgenerierungsaufgaben wie die Liveticker-Produktion. Die empirische Grundlage für das In-Context Learning wurde dabei mit GPT-3 gelegt — einem autoregressiven Sprachmodell mit 175 Milliarden Parametern (Brown et al. 2020, S. 1).

Für das vorliegende System wird primär **OpenRouter** als LLM-Gateway eingesetzt. OpenRouter fungiert als einheitliche API-Schnittstelle, über die mit einem einzelnen API-Schlüssel verschiedene Sprachmodelle unterschiedlicher Anbieter angesprochen werden können — darunter Modelle von Google (Gemini), OpenAI (GPT) und Anthropic (Claude). Das gewünschte Modell wird über eine Umgebungsvariable (`OPENROUTER_MODEL`) konfiguriert; ein Wechsel des Modells erfordert somit keine Codeanpassung, sondern lediglich eine Änderung der Konfiguration. Im produktiven Einsatz wird aktuell **Gemini 2.0 Flash** (Google, Modell-ID `google/gemini-2.0-flash-001`) über OpenRouter genutzt, da dieses Modell eine günstige Balance aus Latenz, Kosten und Textqualität bietet.

Ergänzend implementiert das Backend eine **Fallback-Kette** für den Fall, dass OpenRouter nicht konfiguriert ist: Das System prüft zur Startzeit in der Reihenfolge OpenRouter → Gemini (direkte API) → OpenAI → Anthropic, ob ein API-Schlüssel hinterlegt ist, und aktiviert den ersten verfügbaren Provider als Singleton. Ist kein Schlüssel konfiguriert, wird auf einen regelbasierten **Mock-Provider** zurückgefallen, der Template-basierte Texte ohne LLM-Aufruf erzeugt. Diese Architektur stellt sicher, dass das System auch ohne LLM-Anbindung lauffähig bleibt — etwa für Entwicklung und Tests. Moderne LLMs adressieren zudem die Mehrsprachigkeitsanforderung (Kapitel 2.2), da sie in zahlreichen Sprachen den bisherigen Stand der Technik übertreffen (OpenAI 2023, S. 1).

Trotz dieser Leistungsfähigkeit weisen LLMs strukturelle Schwächen auf, insbesondere die Neigung zu **Halluzinationen** — also der Generierung von Inhalten, die sachlich unzutreffend oder erfunden sind (OpenAI 2023, S. 46). Im journalistischen Kontext ist dies kritisch, da faktische Fehler die Glaubwürdigkeit nachhaltig beschädigen (Bluhm & Schäfer 2023, S. 33). Dies begründet den **hybriden Ansatz** der vorliegenden Arbeit: Das System generiert Textvorschläge, die finale Freigabeentscheidung verbleibt jedoch beim Redakteur.

---

## 3.2 Prompt Engineering

Die Qualität der Ausgaben eines LLM hängt maßgeblich vom **Prompt** ab. Prompt Engineering bezeichnet die systematische Gestaltung dieser Eingaben, um das Modell ohne Änderung seiner Gewichte zu einem gewünschten Verhalten zu lenken (Brown et al. 2020). Das Prinzip des **In-Context Learning** sieht vor, dass das Modell auf eine Instruktion und ggf. Beispiele konditioniert wird.

Das System nutzt zwei wesentliche Ansätze:

1.  **Zero-Shot Prompting:** Reine Aufgabenbeschreibung ohne Beispiele für maximale Flexibilität (generischer Modus).
2.  **Few-Shot Prompting:** Bereitstellung von Demonstrations-Beispielen als Stilreferenz zur Konditionierung der Tonalität ohne aufwendiges Fine-Tuning. Die Beispiele werden dabei **dynamisch aus einer dedizierten `style_references`-Datenbanktabelle** geladen, die manuell kuratierte Original-Tickertexte von Eintracht Frankfurt enthält. Pro LLM-Aufruf werden bis zu drei zufällige Referenzen selektiert, gefiltert nach Ereignistyp (z. B. Tor, Gelbe Karte) und Instanz. Durch die Randomisierung wird eine monotone Reproduktion vermieden, während der stilistische Korridor gewahrt bleibt.

Der Inferenzparameter **Temperature** wird im System auf `0.3` festgelegt, um die faktische Korrektheit gegenüber kreativer Varianz zu priorisieren. Für Übersetzungsaufgaben wird ein noch niedrigerer Wert von `0.1` verwendet, um semantische Abweichungen vom Originaltext zu minimieren. Die gewünschte Emotionalität (Kapitel 2.4) wird stattdessen durch drei definierte Stilprofile — *neutral*, *euphorisch* und *kritisch* — im Prompt gesteuert.

---

## 3.3 Natural Language Generation im Sportjournalismus

Die automatisierte Erzeugung natürlichsprachlicher Texte aus strukturierten Daten (Data-to-Text Generation) bildet die technische Grundlage. Im Sportkontext bedeutet dies die Überführung von Spielereignissen und Statistiken in journalistisch verwertbare Texte (Puduppully & Lapata 2021, S. 510).

Während historische Systeme auf starren Template-Architekturen basierten, die oft steif und inkohärent wirkten, überwinden moderne neuronale **End-to-End-Ansätze** diese Grenzen. Im Roboterjournalismus erzeugt beispielsweise "Die Welt" bereits automatisierte Spielberichte via Retresco (Beils 2023, S. 207). Solche Systeme stoßen jedoch bei unvorhergesehenen Ereignissen oder unsauberer Datenlage an Grenzen, was erneut den hier gewählten hybriden Ansatz motiviert.

---

## 3.4 Echtzeit-Kommunikation im Web

Die Übertragung von Daten zwischen Frontend und Backend erfordert eine optimale Balance zwischen Latenz, Ressourcenverbrauch und Komplexität. Das vorliegende System kombiniert zwei komplementäre Kommunikationsmuster:

Für die Hauptkomponenten — Match-Daten, Spielevents und Ticker-Einträge — wird **intervallbasiertes HTTP-Polling** mit einer Abfragefrequenz von 5 Sekunden eingesetzt. Das Polling wird über drei spezialisierte React Hooks realisiert (`useMatchCore`, `useMatchEvents`, `useMatchTicker`), die jeweils einen eigenen `setInterval`-Zyklus betreiben. Dieser Ansatz wurde gegenüber persistenten Verbindungsmechanismen wie Server-Sent Events (SSE) gewählt, da die zustandslose HTTP-Architektur die Skalierbarkeit auf Render-Serverless-Instanzen vereinfacht.

Für die Echtzeit-Benachrichtigung neuer **Medieninhalte** (ScorePlay-Bilder, YouTube-Videos, Instagram-Stories) wird ergänzend das **WebSocket-Protokoll** eingesetzt. RFC 6455 nennt Börsen-Ticker explizit als Einsatzszenario (Fette & Melnikov 2011, S. 1), das strukturell dem vorliegenden Liveticker entspricht. Der Backend-Server verwaltet einen Pool aktiver WebSocket-Verbindungen über den Endpunkt `/ws/media` und broadcastet neue Medien-Assets als `new_media`-Nachrichten an alle verbundenen Clients. Der Client implementiert eine **Exponential-Backoff-Reconnect-Strategie** (1 s Basisverzögerung, max. 30 s), um Verbindungsabbrüche automatisch zu kompensieren.

---

## 3.5 ETL-Prozesse und Workflow-Automatisierung

Die Datenbeschaffung folgt dem **Extract-Transform-Load-Prinzip (ETL)**. Daten werden aus Quellen extrahiert, transformiert und in den Datenspeicher geladen (Freitas et al. 2025, S. 807). Im System werden Spielplandaten und Live-Events aus APIs extrahiert, während **Firecrawl** als Web-Scraping-Komponente für die automatisierte Extraktion von Medien-URLs (insbesondere YouTube-Video-Links vom Eintracht-Frankfurt-Kanal) dient.

Die Orchestrierung erfolgt über **n8n**, eine Low-Code-Plattform, die auf **Directed Acyclic Graphs (DAGs)** basiert. n8n bietet gegenüber Alternativen wie Zapier oder Airflow eine überlegene Flexibilität bei der KI-Orchestrierung und ermöglicht durch Self-Hosting die volle Datenkontrolle gemäß DSGVO. Performanztests bestätigen eine niedrige durchschnittliche Latenz von 2,4 Sekunden pro Transaktion (Venkiteela 2025, S. 8). Das System definiert acht Webhook-Endpunkte für den Datenimport (Aufstellungen, Events, Statistiken, Spielerstatistiken, Prematch-Daten, Wettbewerbe, Spielpläne, Länderdaten), die n8n-Workflows bidirektional mit dem Backend verbinden.

---

## 3.6 Externe Datenquellen

Das System integriert Daten aus mehreren externen APIs, die jeweils spezifische Aufgaben erfüllen und über n8n orchestriert werden:

### 3.6.1 API-Football (Spielplandaten und Statistiken)

**API-Football v3** ist die Primärquelle für strukturierte Sportdaten. Das System nutzt diese API für:

- **Spielpläne und Teamdaten**: Abrufen von aktuellen und zukünftigen Spielen, an denen Eintracht Frankfurt beteiligt ist
- **Aufstellungen**: Live-Aktualisierung der Spielpositionen und Spielerbesetzungen
- **Statistiken**: Spielstatistiken (Ballbesitz, Schüsse, Pass-Erfolgsquoten) und Spielerstatistiken (Bewertung, Tore, Assists, Pässe, Zweikämpfe)
- **Wettbewerbskontext**: Tabellenstand und historische Daten für Kontextualisierung der LLM-Prompts
- **Live-Synchronisation**: Echtzeit-Abfrage der aktuellen Spielminute und Spielphase über den Endpunkt `/fixtures`, wobei API-Football-Statuscodes (`1H`, `2H`, `HT`, `FT`) auf interne Phasen gemappt werden

Die API liefert strukturierte JSON-Daten, die über n8n-Workflows transformiert und in die PostgreSQL-Datenbank eingespeist werden.

### 3.6.2 Partner Live-API (Echtzeitevents)

Eine zweite, proprietäre **Partner Live-API** liefert Echtzeitevents während des Spielbetriebs:

- **Spielevents in Echtzeit**: Tore, Gelbe und Rote Karten, Gelb-Rote Karten, Auswechslungen, Elfmeter
- **Match-Status**: Anpfiff, Halbzeitpause, Spielende
- **Minute und Kontext** der jeweiligen Events

Die Partner-API-Eventtypen (z. B. `PartnerGoal`, `PartnerYellowCard`, `PartnerSubstitution`) werden im Backend über eine Mapping-Tabelle auf normalisierte interne Typen überführt, bevor sie die LLM-Textgenerierung anstoßen.

### 3.6.3 ScorePlay Media API (Medieninhalte)

**ScorePlay** ist die Bildquelle für die Multimedia-Anreicherung des Livetickers. Die Bilder werden nicht direkt vom Backend abgerufen, sondern über n8n-Workflows an den Endpunkt `POST /api/v1/media/incoming` geliefert und in eine **Media-Queue** eingereiht. Der Redakteur kann wartende Bilder über das Frontend selektieren, mit einem KI-generierten Untertitel versehen und als Ticker-Eintrag publizieren. Zur Echtzeit-Benachrichtigung des Frontends wird beim Eintreffen neuer Bilder ein WebSocket-Broadcast (`new_media`) ausgelöst.

### 3.6.4 Social-Media-Quellen (YouTube, Instagram, Twitter/X)

Das System extrahiert zusätzliche Inhalte aus den offiziellen Social-Media-Kanälen von Eintracht Frankfurt und speichert diese als **Media Clips** in der Datenbank:

- **YouTube** (via Firecrawl): Automatische Extraktion von Video-URLs des offiziellen Eintracht-Frankfurt-Kanals (`youtube.com/@Eintracht`). Die n8n-Workflow-Kette scrapet die Kanalseite, extrahiert Video-Links und importiert sie über `POST /api/v1/clips/import`.
- **Instagram**: Extraktion von Story- und Post-URLs. Da Instagram-Thumbnails durch CORS-Beschränkungen im Browser nicht darstellbar sind, werden diese serverseitig als Base64-Data-URLs in der Datenbank zwischengespeichert.
- **Twitter/X**: Zugriff auf offizielle Klub-Beiträge zur Einbettung im Ticker.

---

## 3.7 Backend-Technologien

### 3.7.1 Python als Implementierungssprache

Das Backend ist in **Python 3.12** implementiert. Python bietet ein umfangreiches Ökosystem an Bibliotheken für HTTP-Kommunikation, Datenbankzugriff und LLM-Anbindung. Im vorliegenden System wird Python sowohl für die REST-API als auch für die LLM-Integration über die offiziellen SDKs von OpenAI, Anthropic und Google (`google-genai`), die Datenbankmodellierung via SQLAlchemy und die asynchrone WebSocket-Kommunikation via `websockets` eingesetzt.

### 3.7.2 FastAPI und asynchrone Verarbeitung

Die REST-API ist mit **FastAPI** (v0.109) implementiert, einem modernen asynchronen Web-Framework, das auf **Starlette** (ASGI) und **Pydantic** (Datenvalidierung) aufbaut. FastAPI generiert automatisch eine OpenAPI-Spezifikation, sodass alle Endpunkte über eine interaktive Swagger-Oberfläche (`/api/docs`) dokumentiert und testbar sind.

Die automatische **Pydantic-basierte Request/Response-Validierung** stellt sicher, dass alle Eingaben gegen stark typisierte Schemas geprüft werden, bevor sie die Geschäftslogik erreichen. Die API folgt RESTful-Konventionen mit versionierter Ressourcen-Hierarchie unter dem Präfix `/api/v1`:

- `/matches` — Spielverwaltung und Live-Synchronisation
- `/ticker` — Ticker-Einträge (CRUD, LLM-Generierung, Übersetzung)
- `/media` — Medien-Queue und ScorePlay-Integration
- `/clips` — Social-Media-Clips (YouTube, Instagram, Twitter/X)
- `/players`, `/teams`, `/competitions`, `/seasons` — Stammdatenverwaltung

Der ASGI-Server **Uvicorn** dient als Laufzeitumgebung und ermöglicht die Bearbeitung konkurrierender Anfragen über das `asyncio`-Eventloop-Modell. Für rechenintensive LLM-Aufrufe wird ein **Semaphore-basiertes Concurrency-Limiting** eingesetzt, das die Anzahl gleichzeitiger Provider-Anfragen begrenzt.

### 3.7.3 Persistenz und Datenbankarchitektur

Die Datenverwaltung erfolgt über **PostgreSQL** als relationales Datenbankmanagementsystem. Diese Wahl wurde gegenüber NoSQL-Alternativen getroffen, da die stark strukturierten und relational verknüpften Entitäten (Spiele, Teams, Events, Ticker-Einträge) die ACID-Garantien und Fremdschlüssel-Constraints relationaler Datenbanken erfordern. Das Schema umfasst 18 Tabellen, die sich in vier Domänen gliedern lassen: Stammdaten (`competitions`, `seasons`, `teams`, `countries`, `players`), Spielbetrieb (`matches`, `events`, `synthetic_events`, `lineups`, `standings`, `match_statistics`, `player_statistics`), Ticker (`ticker_entries`, `style_references`) und Medien (`media_queue`, `media_clips`).

Das Backend nutzt **SQLAlchemy 2.0** als Object-Relational Mapping (ORM), das die Python-Domänenmodelle deklarativ auf SQL-Tabellen abbildet. Die Datenbankverbindung wird über einen **Connection Pool** (`pool_size=20`, `max_overflow=30`, `pool_pre_ping=True`) verwaltet, um die Verbindungseffizienz unter Last zu optimieren. Der Datenzugriff folgt einem **Repository Pattern**, bei dem dedizierte Repository-Klassen die SQL-Logik kapseln und eine abstrakte Schnittstelle zur Service-Schicht bieten.

Die Datenbankmigrationen werden durch **Alembic** versionskontrolliert. Dies ermöglicht eine reproduzierbare Schema-Evolution über die gesamte Lebensdauer des Systems — insbesondere kritisch für Produktionsdeployments, bei denen das Dockerfile automatisch `alembic upgrade head` vor dem Serverstart ausführt.

### 3.7.4 Deployment

Die Anwendung wird über **Docker**-Container auf **Render** als Cloud-Plattform betrieben. Das Backend-Dockerfile basiert auf `python:3.12-slim`, installiert die Abhängigkeiten aus `requirements.txt`, führt die Datenbankmigrationen aus und startet den Uvicorn-Server. Diese Containerisierung gewährleistet Reproduzierbarkeit zwischen Entwicklungs- und Produktionsumgebung.

### 3.7.5 Qualitätssicherung und Testing

Die Qualitätssicherung des Systems erfolgt auf mehreren Ebenen:

**Backend-Testing:** Das Backend nutzt **pytest** als Test-Framework, ergänzt durch `pytest-asyncio` für die Testbarkeit asynchroner FastAPI-Endpunkte und Service-Methoden. Die Code-Coverage wird durch `pytest-cov` gemessen, um ungetestete Codepfade systematisch zu identifizieren.

**Statische Analyse:** Drei komplementäre Werkzeuge sichern die Codequalität vor der Laufzeit:
- **mypy** für statische Typprüfung der Python-Codebasis
- **flake8** für Linting (PEP-8-Konformität, potenzielle Fehler)
- **black** für deterministische Code-Formatierung

**Frontend-Testing:** Im Frontend wird **React Testing Library** (`@testing-library/react`) für komponentenbasierte Unit-Tests eingesetzt, die das Verhalten aus Benutzerperspektive prüfen (DOM-Interaktion statt Implementierungsdetails). **Playwright** deckt als End-to-End-Test-Framework den gesamten Benutzerfluss ab — vom Match-Selektor über die LLM-Textgenerierung bis zur Ticker-Publikation.

---

## 3.8 Frontend-Technologien

### 3.8.1 React und komponentenbasierte Architektur

Das Frontend ist als **Single-Page Application (SPA)** mit **React 19** implementiert, erstellt über Create React App. React folgt einem komponentenbasierten Architekturmuster, bei dem die Benutzeroberfläche in wiederverwendbare, isolierte Bausteine zerlegt wird. Das System nutzt ausschließlich **funktionale Komponenten** mit React Hooks (`useState`, `useCallback`, `useRef`, `useMemo`) — Klassenkomponenten werden nicht eingesetzt. Die bewusst minimale Dependency-Liste (keine externen State-Management-, Routing- oder CSS-Bibliotheken) reduziert die Bundle-Größe und vermeidet transitive Abhängigkeitskonflikte.

Die Anwendung folgt einem **Drei-Panel-Layout**: ein linkes Panel für die publizierten Ticker-Einträge, ein zentrales Editor-Panel für die Erstellung und Bearbeitung, sowie ein rechtes Panel für Spielstatistiken, Aufstellungen und Formationsvisualisierungen.

### 3.8.2 TypeScript

Das Frontend ist vollständig in **TypeScript** geschrieben, das die dynamische Typisierung von JavaScript mit statischer Typenprüfung erweitert. Dies reduziert Runtime-Fehler und verbessert die Entwicklerproduktivität durch IDE-Autocompletion und frühe Fehlererkennung. Alle API-Responses werden gegen TypeScript-Schnittstellendefinitionen validiert.

### 3.8.3 Zustandsverwaltung

Anstelle externer State-Management-Bibliotheken (Redux, Zustand) setzt das System auf die **React Context API** mit einer bewussten Drei-Kontext-Trennung:

- **TickerDataContext**: Match-Daten, Events, Ticker-Texte, Aufstellungen, Statistiken
- **TickerModeContext**: Betriebsmodus (Auto/Coop/Manuell) und Draft-Aktionen
- **TickerActionsContext**: Generierungs-, Publikations- und Löschoperationen

Diese Aufteilung verhindert unnötige Re-Renders: Komponenten, die ausschließlich Aktionen benötigen, werden nicht bei Datenänderungen neu gerendert.

### 3.8.4 HTTP-Kommunikation und Datenabfrage

Die Kommunikation mit dem Backend erfolgt über **Axios** als HTTP-Client. Das Polling-System ist in drei spezialisierte Custom Hooks aufgeteilt (`useMatchCore`, `useMatchEvents`, `useMatchTicker`), die über einen aggregierenden Hook `useMatchData` koordiniert werden. Die Abfrageintervalle werden durch eine `resolvePollingInterval`-Funktion dynamisch auf Basis des aktuellen Match-Status bestimmt.

### 3.8.5 Styling

Das visuelle Design verwendet ausschließlich **handgeschriebenes CSS** mit **CSS Custom Properties** (CSS-Variablen) und einer BEM-artigen Namenskonvention (Prefix `lt-`). Sämtliche Design-Tokens (Farben, Abstände, Schriftgrößen) sind in `:root`-Variablen definiert, was eine zentrale Anpassung des gesamten Erscheinungsbilds ermöglicht. Auf externe CSS-Frameworks wie Tailwind oder Bootstrap wird bewusst verzichtet.

---
