# Kapitel 3 – Stand der Technik

## 3.1 Large Language Models

Die Entwicklung großer Sprachmodelle (Large Language Models, LLMs) hat die Verarbeitung natürlicher Sprache in den vergangenen Jahren grundlegend verändert. Den technischen Ausgangspunkt bildet die **Transformer-Architektur**, die Vaswani et al. (2017, S. 1) als ein neuartiges Netzwerkdesign einführten, das ausschließlich auf Aufmerksamkeitsmechanismen basiert. Das Modell verarbeitet Text autoregressiv — bei jedem Schritt werden die zuvor generierten Tokens als zusätzliche Eingabe für die Erzeugung des nächsten verwendet (Vaswani et al. 2017, S. 2). Diese Eigenschaft macht Transformer-basierte Modelle besonders geeignet für sequenzielle Textgenerierungsaufgaben wie die Liveticker-Produktion.

Diese großen Sprachmodelle werden zunächst auf umfangreichen Textkorpora vortrainiert und können anschließend durch **Transfer Learning** — also die Übertragung erlernter Sprachstrukturen auf neue Aufgaben — ohne aufgabenspezifisches Fine-tuning eingesetzt werden (Brown et al. 2020, S. 2). Das ermöglicht den Einsatz von LLMs für spezialisierte Aufgaben wie die Liveticker-Generierung, ohne modellseitige Anpassungen vornehmen zu müssen.

Die empirische Grundlage für das In-Context Learning wurde mit **GPT-3** gelegt — einem autoregressiven Sprachmodell mit 175 Milliarden Parametern (Brown et al. 2020, S. 1). Mit **GPT-4** demonstrierte OpenAI (2023, S. 1) anschließend, dass LLMs in zahlreichen Sprachen und Aufgabendomänen den bisherigen Stand der Technik übertreffen — einschließlich mehrsprachiger Textgenerierung, wie sie für die vorliegende Arbeit relevant ist (vgl. Kap. 2.2). Parallel entwickelten weitere Anbieter vergleichbare Modellarchitekturen, die in unterschiedlichen Größenordnungen verfügbar sind.

Für die Liveticker-Produktion sind **kompakte Modelle** besonders relevant. Die Generierungsaufgabe erfordert kurze Texte (1–3 Sätze) auf Basis strukturierter Eingabedaten (Spielereignisse, Kontext) — eine Aufgabe, die keine komplexe Inferenz oder umfangreiches Weltwissen voraussetzt. Kompakte Modelle bieten für solche kurzen, faktenbasierten Textgenerierungsaufgaben eine vergleichbare Qualität wie größere Modelle, bei deutlich niedrigerer Latenz und Kosten — Google DeepMind (2025, Gemini API: Models Overview, online) dokumentiert für Gemini 2.0 Flash Lite eine Inferenzgeschwindigkeit, die speziell auf hochfrequente, kurze Generierungsaufgaben zugeschnitten ist (vgl. Kap. 4.5.1 für die konkrete Modellauswahl).

Trotz ihrer Leistungsfähigkeit weisen LLMs strukturelle Schwächen auf, insbesondere die Neigung zu **Halluzinationen** — also der Generierung von Inhalten, die sachlich unzutreffend oder erfunden sind (OpenAI 2023, S. 46). Im journalistischen Kontext ist dies kritisch, da faktische Fehler die Glaubwürdigkeit nachhaltig beschädigen (Bluhm & Schäfer 2023, S. 33). Dies begründet den **hybriden Ansatz** der vorliegenden Arbeit: Das System generiert Textvorschläge, die finale Freigabeentscheidung verbleibt jedoch beim Redakteur.

---

## 3.2 Prompt Engineering

Die Qualität der Ausgaben eines LLM hängt maßgeblich vom **Prompt** ab. Prompt Engineering bezeichnet die systematische Gestaltung dieser Eingaben, um das Modell ohne Änderung seiner Gewichte zu einem gewünschten Verhalten zu lenken (Brown et al. 2020). Das Prinzip des **In-Context Learning** sieht vor, dass das Modell auf eine Instruktion und ggf. Beispiele konditioniert wird.

Für die Anwendung von LLMs auf spezifische Aufgaben existieren grundsätzlich zwei Ansätze: **Fine-tuning** erfordert ein aufgabenspezifisches Nachtrainieren des Modells auf kuratierten Datensätzen und ist ressourcenintensiv (Rechenzeit, Infrastruktur, Datenkuration). **Prompting-basierte Ansätze** hingegen nutzen das vortrainierte Modell direkt und steuern dessen Verhalten ausschließlich über die Eingabeformulierung (Brown et al. 2020, S. 1). Für ressourcenbeschränkte Kontexte — etwa im Vereinssport — stellen Prompting-Verfahren eine zugängliche Alternative dar.

Innerhalb des Prompting-Paradigmas lassen sich zwei wesentliche Techniken unterscheiden:

1.  **Zero-Shot Prompting:** Das Modell erhält ausschließlich eine Aufgabenbeschreibung ohne Demonstrationsbeispiele (Brown et al. 2020, S. 13). Dieser Ansatz maximiert Flexibilität und eignet sich für generische Anwendungsfälle ohne spezifische Stilerwartungen.
2.  **Few-Shot Prompting:** Dem Modell werden neben der Aufgabenbeschreibung zusätzlich wenige Beispiele (typischerweise 1–5) als Stilreferenz bereitgestellt. Diese Beispiele konditionieren das Modell auf eine gewünschte Tonalität, ohne dass ein modellseitiges Fine-tuning erforderlich ist (Brown et al. 2020, S. 14).

Ein weiterer zentraler Steuerungsparameter ist die **Temperature**, die die Wahrscheinlichkeitsverteilung der Token-Auswahl beeinflusst (Brown et al. 2020, S. 24). Niedrige Werte (z. B. 0,0–0,3) führen zu deterministischeren, faktentreueren Ausgaben; höhere Werte (z. B. 0,7–1,0) erhöhen die kreative Varianz. Für journalistische Anwendungen, bei denen faktische Korrektheit priorisiert wird, sind niedrige Temperature-Werte vorzuziehen.

Die konkrete Umsetzung dieser Techniken im vorliegenden System — einschließlich der Prompt-Template-Struktur, Few-Shot-Datenquellen, Stilprofile und Temperature-Konfiguration — wird in Kapitel 4.5.2 beschrieben.

---

## 3.3 Natural Language Generation im Sportjournalismus

Die automatisierte Erzeugung natürlichsprachlicher Texte aus strukturierten Daten (Data-to-Text Generation) bildet die technische Grundlage für KI-gestützte Berichterstattungssysteme. Im Sportkontext bedeutet dies die Überführung von Spielereignissen und Statistiken in journalistisch verwertbare Texte (Puduppully & Lapata 2021, S. 510).

Der Sportjournalismus bietet für NLG-Systeme besonders günstige Voraussetzungen: Spielereignisse folgen standardisierten Mustern (Tore, Karten, Auswechslungen), liegen bereits in strukturierter Form vor und erfordern eine zeitnahe Verarbeitung. Diese Kombination aus strukturierten Eingabedaten und Echtzeitanforderung macht Sport zu einer der erfolgreichsten Anwendungsdomänen für Data-to-Text-Systeme (Puduppully & Lapata 2021, S. 510). Für kleinere Vereine und Medienunternehmen ermöglicht automatisierte Textgenerierung zudem eine skalierbare Berichterstattung, die mit rein manueller Redaktion nicht wirtschaftlich darstellbar wäre.

Historische NLG-Systeme basierten überwiegend auf **regelbasierten Template-Architekturen** (Puduppully & Lapata 2021, S. 511). Diese Systeme nutzen vordefinierte Satzmuster, in die Ereignisdaten eingesetzt werden (z. B. „[Spieler] erzielt in der [Minute] Minute das [Tor-Nr.] für [Team]"). Der Vorteil liegt in vorhersagbarer Qualität und vollständiger Kontrolle über die Ausgabe; der Nachteil ist stilistische Monotonie und begrenzte sprachliche Variabilität. Solche Systeme wirkten oft steif und inkohärent, insbesondere bei komplexeren narrativen Anforderungen.

Moderne **neuronale End-to-End-Ansätze** überwinden diese Grenzen durch datengetriebenes Lernen sprachlicher Muster. Statt starrer Regeln trainieren diese Modelle auf großen Textkorpora und erzeugen flüssigere, natürlichere Formulierungen. Im professionellen Roboterjournalismus erzeugt beispielsweise „Die Welt" bereits automatisierte Spielberichte via Retresco (Beils 2023, S. 207). Solche Systeme stoßen jedoch bei unvorhergesehenen Ereignissen, unsauberer Datenlage oder der Notwendigkeit emotionaler Tonalität an Grenzen — insbesondere die Neigung zu Halluzinationen (vgl. Kap. 3.1) bleibt eine systemische Herausforderung für den journalistischen Einsatz.

Die Kombination beider Ansätze in einem **hybriden System** verbindet die Stärken: LLMs übernehmen die flexible, stilistisch variable Textgenerierung, während menschliche Redakteure die faktische Korrektheit absichern und editoriale Entscheidungen treffen. Dieser **Human-in-the-Loop-Ansatz** (Monarch 2021, S. 8) bildet die konzeptionelle Grundlage des vorliegenden Systems und adressiert sowohl die Qualitätsanforderungen des Journalismus als auch die Ressourcenbeschränkungen kleinerer Redaktionen.

---

## 3.4 Echtzeit-Kommunikation im Web

Die Übertragung von Daten zwischen Frontend und Backend erfordert eine ausgewogene Balance zwischen Latenz, Ressourcenverbrauch und Implementierungskomplexität. Für Echtzeitanwendungen wie Liveticker stehen mehrere etablierte Kommunikationsmuster zur Verfügung, die sich hinsichtlich dieser Dimensionen unterscheiden.

**HTTP-Polling** ist das einfachste Muster: Der Client sendet in regelmäßigen Intervallen Anfragen an den Server, um neue Daten abzurufen. Der Vorteil liegt in der Einfachheit und breiten Kompatibilität — das Muster nutzt Standard-HTTP-Requests ohne zusätzliche Protokollschichten. Nachteile sind die inhärente Latenz (Daten werden erst beim nächsten Polling-Zyklus sichtbar) und der erhöhte Ressourcenverbrauch durch wiederholte Request/Response-Zyklen, selbst wenn keine neuen Daten vorliegen. Für Anwendungen mit akzeptabler Latenztoleranz (z. B. wenige Sekunden) und begrenzter Updatefrequenz ist Polling jedoch eine robuste und wartbare Lösung.

**Server-Sent Events (SSE)** bieten eine standardisierte, HTTP-basierte Push-Verbindung vom Server zum Client (Hickson 2015). SSE eignet sich für unidirektionale Datenströme (Server → Client) und nutzt eine persistente HTTP-Verbindung mit inkrementellen `text/event-stream`-Antworten. SSE sind ressourceneffizienter als Polling, da der Server Daten bei Bedarf sendet, ohne dass der Client wiederholt anfragen muss. Die Verbindung wird bei Abbruch automatisch wiederhergestellt. Limitierungen bestehen in der fehlenden bidirektionalen Kommunikation und browserseitigen Beschränkungen paralleler HTTP-Verbindungen.

**WebSocket** etabliert eine vollständig bidirektionale, persistente Verbindung über das WebSocket-Protokoll (RFC 6455). Nach einem initialen HTTP-Handshake wechselt die Verbindung in ein binäres Protokoll mit minimalen Framing-Overhead (Fette & Melnikov 2011, S. 1). WebSocket eignet sich für latenzkritische Echtzeitanwendungen, bei denen sowohl Client als auch Server jederzeit Nachrichten senden müssen. RFC 6455 nennt Börsen-Ticker explizit als Einsatzszenario — eine strukturelle Parallele zum Sport-Liveticker. Der Preis für niedrige Latenz sind höhere Implementierungskomplexität (Connection-Management, Reconnect-Strategien) und erhöhter Server-Ressourcenbedarf durch persistente Verbindungen.

**Long-Polling** kombiniert Elemente beider Ansätze: Der Client sendet eine Anfrage, die der Server erst dann beantwortet, wenn neue Daten verfügbar sind oder ein Timeout eintritt. Anschließend sendet der Client sofort eine neue Anfrage. Long-Polling reduziert Latenz gegenüber kurzem Polling, bleibt aber aufwändiger als SSE oder WebSocket.

Die Wahl des Kommunikationsmusters hängt von den Anforderungen der Anwendung ab: Polling bevorzugt Einfachheit, SSE bietet effizienten unidirektionalen Push, WebSocket minimiert Latenz bei bidirektionaler Kommunikation. Hybridansätze nutzen verschiedene Muster für unterschiedliche Datenströme innerhalb derselben Anwendung, um Trade-offs gezielt zu optimieren.

Die konkrete Umsetzung im vorliegenden System wird in Kapitel 4.6.5 beschrieben.

---

## 3.5 ETL-Prozesse und Workflow-Automatisierung

Die Datenbeschaffung in datengetriebenen Anwendungen folgt überwiegend dem **Extract-Transform-Load-Prinzip (ETL)**. Daten werden aus heterogenen Quellen extrahiert, in ein einheitliches Zielformat transformiert und in den Datenspeicher geladen (Freitas et al. 2025, S. 807). Für Sport-Liveticker bedeutet dies die Integration von Live-Spielereignissen, Statistiken, Aufstellungen und Mediendaten aus unterschiedlichen APIs oder Datenfeeds. Die Herausforderung besteht darin, diese Daten zeitnah, konsistent und in einer für die Anwendungslogik verwertbaren Struktur bereitzustellen.

Historisch wurden ETL-Prozesse durch monolithische Batch-Jobs oder direkt in Anwendungscode implementiert. Moderne Ansätze setzen zunehmend auf **Workflow-Orchestrierungsplattformen**, die ETL-Logik als konfigurierbare Prozesse abbilden. Diese Plattformen basieren typischerweise auf **Directed Acyclic Graphs (DAGs)**, die Datenflüsse als gerichtete, azyklische Graphen modellieren und damit Abhängigkeiten zwischen Verarbeitungsschritten explizit machen. Jeder Knoten im DAG repräsentiert eine Transformation oder einen API-Aufruf, während Kanten die Datenflussrichtung definieren.

Ein zentraler Vorteil dieser Entkopplung ist die **Trennung von Integrationslogik und Anwendungskern**: API-Aufrufe, Datenformatkonvertierungen und Retry-Strategien werden in eigene Workflows ausgelagert, während die Anwendungsschicht ausschließlich mit bereits transformierten Daten arbeitet. Das reduziert Komplexität im Hauptcode und ermöglicht eine unabhängige Anpassung von Datenquellen ohne Deployment-Zyklen der Anwendung.

**Low-Code- und No-Code-Plattformen** haben diesen Ansatz weiter demokratisiert: Statt prozeduralen Code zu schreiben, werden Workflows grafisch zusammengestellt. Diese visuellen Editoren erleichtern sowohl die Entwicklung als auch die Wartung von Integrationspfaden. Für kleinere Teams oder prototypische Systeme bieten solche Plattformen eine erheblich niedrigere Einstiegshürde als vollprogrammierte ETL-Pipelines. Gleichzeitig erlauben sie bei Bedarf die Einbettung von Custom-Code-Blöcken für komplexe Transformationen.

Für Echtzeitanwendungen wie Liveticker ist zusätzlich die **Latenz der Orchestrierung** kritisch. Während klassische Batch-ETL-Prozesse mit Stunden- oder Minutentakten arbeiten, müssen Sport-Events innerhalb von Sekunden verarbeitet werden. Das erfordert Orchestrierungsplattformen mit niedrigem Overhead, asynchroner Verarbeitung und effizienten Webhook-Mechanismen, um auf externe Ereignisse sofort reagieren zu können.

Die konkrete Umsetzung der ETL-Architektur im vorliegenden System — einschließlich der gewählten Orchestrierungsplattform, der Datenquellen (API-Football, ScorePlay, Social Media), der 15 definierten Workflows und der Webhook-basierten Triggerstruktur — wird in Kapitel 4.4 beschrieben.

---

## 3.6 Backend-Technologien

### 3.6.1 Python

**Python** hat sich als dominierende Programmiersprache für datenintensive Webanwendungen und KI-Systeme etabliert. Die Sprache verbindet dynamische Typisierung mit einem umfangreichen Ökosystem an Bibliotheken für HTTP-Kommunikation, Datenbankzugriff und maschinelles Lernen (Van Rossum & Drake 2009). Im Kontext des vorliegenden Systems ist Python die natürliche Wahl, weil die zentralen Frameworks FastAPI, SQLAlchemy und Pydantic Python-nativ sind und in anderen Backend-Sprachen ohne vergleichbare Alternativen auskommen müssten. Darüber hinaus ermöglicht Pythons `asyncio`-Eventloop — auf dem ASGI-Frameworks wie FastAPI aufsetzen — die nicht-blockierende Verarbeitung paralleler LLM-Aufrufe, die für ein Echtzeitsystem mit hoher API-Latenz entscheidend ist (vgl. Kap. 3.6.2). Für produktive Systeme, in denen Typsicherheit erforderlich ist, stehen Werkzeuge wie **mypy** zur Verfügung, die statische Typprüfung auf Basis von Type Hints ermöglichen, ohne die Flexibilität der Sprache einzuschränken.

### 3.6.2 ASGI und asynchrone Web-Frameworks

Moderne Python-Web-Frameworks unterscheiden sich grundlegend in ihrem Verarbeitungsmodell. Das klassische **WSGI-Protokoll** (Web Server Gateway Interface) verarbeitet Anfragen synchron — jede Anfrage blockiert einen Thread, bis die Antwort vollständig erzeugt ist. Das neuere **ASGI-Protokoll** (Asynchronous Server Gateway Interface) ermöglicht hingegen eine nicht-blockierende Verarbeitung auf Basis von Pythons `asyncio`-Eventloop (Grigorev 2019). ASGI-Frameworks wie FastAPI oder Starlette können während wartender I/O-Operationen (Datenbankabfragen, API-Aufrufe) andere Anfragen bearbeiten, was insbesondere für Anwendungen mit vielen externen Abhängigkeiten — wie LLM-API-Aufrufe — eine signifikant höhere Durchsatzrate ermöglicht.

### 3.6.3 ORM und Repository Pattern

Das **Object-Relational Mapping (ORM)** bildet Programmiersprachenklassen auf relationale Datenbanktabellen ab und abstrahiert den direkten SQL-Zugriff. ORMs wie SQLAlchemy oder Django ORM ermöglichen eine deklarative Modellierung von Entitäten und Beziehungen, wobei SQL automatisch generiert wird. Ein ergänzendes Architekturmuster ist das **Repository Pattern** (Fowler 2002, S. 322), das den Datenzugriff in dedizierte Klassen kapselt und eine abstrahierte Schnittstelle zur darüberliegenden Service-Schicht bietet. Diese Trennung erleichtert die Testbarkeit und ermöglicht den Austausch der Persistenzschicht ohne Änderungen an der Geschäftslogik.

### 3.6.4 Relationale Datenbanken

**Relationale Datenbankmanagementsysteme (RDBMS)** organisieren Daten in Tabellen mit definierten Schemata und erzwingen referenzielle Integrität über Fremdschlüssel-Constraints. Das **relationale Modell** (Codd 1970) bildet die theoretische Grundlage: Daten werden als Relationen modelliert, Operationen basieren auf der relationalen Algebra. RDBMS wie PostgreSQL garantieren **ACID-Eigenschaften** (Atomicity, Consistency, Isolation, Durability), die transaktionssichere Operationen gewährleisten. Für Anwendungen mit stark strukturierten, relational verknüpften Entitäten (z. B. Spiele, Teams, Ereignisse, Texte) bieten relationale Datenbanken gegenüber dokumentbasierten NoSQL-Alternativen Vorteile hinsichtlich Datenkonsistenz und Abfragekomplexität.

Die konkrete Backend-Architektur des vorliegenden Systems wird in Kapitel 4.2 beschrieben.

---

## 3.7 Frontend-Technologien

### 3.7.1 TypeScript

**TypeScript** erweitert JavaScript um ein statisches Typsystem, das Typfehler bereits zur Entwicklungszeit erkennt, ohne die Laufzeitsemantik zu verändern (Microsoft 2012). Der TypeScript-Compiler (`tsc`) transpiliert den typisierten Quellcode in Standard-JavaScript, sodass keine zusätzliche Laufzeitumgebung erforderlich ist. Für größere Codebasen reduziert statische Typisierung die Fehlerquote und verbessert die Wartbarkeit durch IDE-Autocompletion und automatisierte Refactoring-Unterstützung.

### 3.7.2 Komponentenbasierte UI-Architekturen

Moderne Frontend-Frameworks folgen einem **komponentenbasierten Architekturmuster**, bei dem die Benutzeroberfläche in wiederverwendbare, isolierte Bausteine zerlegt wird. Jede Komponente kapselt Markup, Logik und ggf. Styling. **React** (Meta 2013) implementiert dieses Muster mit einer deklarativen, zustandsgesteuerten Rendering-Logik: Die Oberfläche wird als Funktion des Anwendungszustands beschrieben, und React übernimmt die effiziente Aktualisierung des DOM bei Zustandsänderungen (Virtual DOM / Reconciliation).

Mit der Einführung von **React Hooks** (ab React 16.8) wurde das funktionale Programmiermodell gestärkt: Hooks wie `useState` und `useEffect` ermöglichen die Verwaltung von Zustand und Seiteneffekten in funktionalen Komponenten, ohne auf Klassenkomponenten zurückgreifen zu müssen. **Custom Hooks** erlauben die Extraktion und Wiederverwendung zustandsbehafteter Logik über Komponentengrenzen hinweg.

### 3.7.3 Single-Page Applications

**Single-Page Applications (SPAs)** laden die gesamte Anwendungslogik beim initialen Seitenaufruf und aktualisieren die Darstellung anschließend dynamisch über JavaScript, ohne vollständige Seitenneuladen. Dieses Modell ermöglicht flüssige Benutzerinteraktionen und reduziert die Server-Last, da nur Daten (typischerweise JSON über REST-APIs) und keine vollständigen HTML-Seiten übertragen werden. SPAs eignen sich insbesondere für interaktive Werkzeuge mit häufigen Zustandsänderungen — wie Redaktionsoberflächen oder Echtzeit-Dashboards.

Die konkrete Frontend-Architektur des vorliegenden Systems wird in Kapitel 4.6 beschrieben.

---

## 3.8 Deployment und Containerisierung

### 3.8.1 Containerisierung

**Containerisierung** ermöglicht die Paketierung einer Anwendung mitsamt ihrer Laufzeitumgebung, Abhängigkeiten und Konfiguration in eine portable, isolierte Einheit. **Docker** (Merkel 2014) hat sich als De-facto-Standard für Containerisierung etabliert. Ein Docker-Image definiert den vollständigen Zustand einer Anwendungsumgebung; aus diesem Image lassen sich beliebig viele identische Container instanziieren. Die zentrale Eigenschaft ist **Reproduzierbarkeit**: Dieselbe Anwendung verhält sich auf der lokalen Entwicklungsmaschine identisch zur Produktionsumgebung.

### 3.8.2 Platform-as-a-Service (PaaS)

**Platform-as-a-Service (PaaS)**-Anbieter abstrahieren die Infrastrukturverwaltung (Server-Provisionierung, Netzwerk, Skalierung) und ermöglichen Entwicklern, Anwendungen direkt aus Quellcode oder Container-Images zu deployen. Anbieter wie Render, Heroku, Railway oder Fly.io übernehmen Build-Prozesse, TLS-Terminierung, Logging und Restart-Strategien. Für kleine Teams ohne dedizierte DevOps-Kapazitäten reduziert PaaS den operativen Aufwand erheblich.

### 3.8.3 Stateless Design und Skalierung

PaaS-Plattformen setzen typischerweise ein **Stateless-Design** voraus: Jede Instanz einer Anwendung ist austauschbar und speichert keinen sitzungsbezogenen Zustand im Arbeitsspeicher. Persistente Daten werden in externe Dienste (Datenbanken, Object Storage) ausgelagert. Dieses Entwurfsmuster ermöglicht **horizontale Skalierung** — bei erhöhter Last können zusätzliche Instanzen gestartet werden, ohne Zustandskonsistenz zwischen ihnen sicherstellen zu müssen.

Die konkrete Deployment-Architektur des vorliegenden Systems wird in Kapitel 4.7.4 beschrieben.

---

## 3.9 Synthese: Technologische Konsequenzen für das Systemdesign

Der Stand der Technik zeigt, dass für das vorliegende System kein einzelnes Werkzeug ausreicht, sondern ein abgestimmtes Zusammenspiel mehrerer Technologieschichten notwendig ist. Kompakte Sprachmodelle mit Few-Shot-Prompting (Kap. 3.1–3.2) liefern die erforderliche Textqualität bei vertretbarer Latenz und ohne ressourcenintensives Fine-tuning; der hybride NLG-Ansatz mit menschlicher Kontrollinstanz (Kap. 3.3) adressiert das systemimmanente Halluzinationsproblem von LLMs im journalistischen Kontext. Die Kombination aus REST-Polling für reguläre Spieldaten und WebSocket für Echtzeit-Medienereignisse (Kap. 3.4) optimiert den Trade-off zwischen Implementierungseinfachheit und Latenztauglichkeit — ein Hybridmuster, das Single-Stream-Lösungen in diesem Anwendungskontext überlegen ist. n8n als Low-Code-Orchestrierungsplattform (Kap. 3.5) entkoppelt die ETL-Komplexität vom Anwendungskern und ermöglicht eine schnelle Anpassung von Datenquellen unabhängig von Backend-Deployment-Zyklen. FastAPI auf ASGI-Basis (Kap. 3.6), React mit TypeScript (Kap. 3.7) und Docker-basiertes PaaS-Deployment (Kap. 3.8) vervollständigen einen Stack, der Produktionsfähigkeit, Wartbarkeit und Skalierbarkeit im ressourcenbeschränkten Vereinsumfeld vereint. Diese Erkenntnisse bilden die technologische Grundlage für die Systemkonzeption in Kapitel 4.
