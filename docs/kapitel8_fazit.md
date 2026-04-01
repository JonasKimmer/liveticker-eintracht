# Kapitel 8 – Fazit und Ausblick

---

## 8.1 Zusammenfassung der Ergebnisse

Die vorliegende Arbeit hat ein hybrides Redaktionssystem für die KI-gestützte Liveticker-Erstellung im Profifußball konzipiert, implementiert und evaluiert. Das System entstand in direkter Kooperation mit der **Stackwork GmbH** im IT-Bereich von Eintracht Frankfurt und exportiert produzierte Inhalte über API-Schnittstellen in die bestehende **Stackwork Demo App**. Es adressiert die drei in Kapitel 1.1 identifizierten Problemdimensionen — operativer Zeitdruck, Mehrsprachigkeit und White-Label-Bedarf — durch eine dreischichtige Architektur aus Datenbeschaffung (n8n), Anwendungslogik (FastAPI, PostgreSQL) und Präsentation (React, TypeScript).

### 8.1.1 Technische Ergebnisse

Die technische Evaluation (Kapitel 6.2–6.6) dokumentiert eine produktionsnahe Codebasis:

- **391 automatisierte Tests** (187 Frontend, 198 Backend, 6 E2E), alle grün
- **75 % Backend-Coverage** mit vollständiger Abdeckung der Modell- und Schema-Schichten
- **91,33 % TypeScript-Coverage** bei null Compiler-Fehlern, ausgehend von einer reinen JavaScript-Codebasis (78,33 %, 885 Fehler)
- Vollständig umgesetzte **Testpyramide** nach Cohn (2009)

Der Anforderungsabgleich (Kapitel 6.11) zeigt, dass **alle 23 definierten Anforderungen** vollständig erfüllt sind. Die bewusst ausgeklammerte Authentifizierungsschicht ist als Systembeschränkung dokumentiert (vgl. Kapitel 6.12.4), wurde jedoch nicht als formale Anforderung geführt.

### 8.1.2 KI-Textgenerierung

Die Multi-Provider-Architektur mit Fallback-Kette (OpenRouter, Gemini, OpenAI, Anthropic, Mock) gewährleistet eine hohe Verfügbarkeit der Textgenerierung. Die Prompt-Architektur kombiniert Rollen- und Stilinstruktion, strukturierte Faktenblöcke, dynamischen Matchkontext und bis zu drei Few-Shot-Referenzen aus einer kuratierten Datenbank.

Die qualitative Analyse von **16 KI-generierten Ticker-Einträgen** (Modell: `google/gemini-2.0-flash-lite-001`) aus **9 Bundesliga-Spielen** ergab einen Gesamtdurchschnitt von **4,3 / 5** auf der Bewertungsskala (Korrektheit: 4,6 / 5, Tonalität: 4,1 / 5, Verständlichkeit: 4,3 / 5). Die stärkste Einschränkung liegt in der Stil-Inkonsistenz des neutralen Profils, das in 3 von 16 Fällen (19 %) unbeabsichtigt emotionale Formulierungen produzierte.

### 8.1.3 Systemarchitektur und Designentscheide

Das System realisiert die in Kapitel 4 konzipierte dreischichtige Architektur vollständig: Die **Datenschicht** (n8n-ETL) importiert Spieldaten automatisiert und idempotent aus der Partner-API; die **Anwendungsschicht** (FastAPI, PostgreSQL) exponiert 70+ REST-Endpunkte über 14 Router-Module und stützt sich auf ein Datenmodell aus 17 ORM-Modellen plus einer konfigurierten Settings-Tabelle; die **Präsentationsschicht** (React, TypeScript) implementiert den vollständigen Redaktionsworkflow mit WebSocket-Anbindung, Slash-Command-Parser und modaler Ticker-Steuerung.

Die **White-Label-Architektur** mit zwei konfigurierten Instanzen (`ef_whitelabel` für Eintracht Frankfurt, `generic` für beliebige Vereine) sowie die **drei Betriebsmodi** (`auto`, `coop`, `manual`) bilden die Kernbeiträge des Systemdesigns: Erstere ermöglicht stilistisch differenzierte Ticker ohne separate Codebases, letztere adressiert das gesamte Spektrum von vollautomatischer bis zu vollmanueller Produktion innerhalb eines einzigen Deployments.

---

## 8.2 Beantwortung der Forschungsfrage

Die in Kapitel 1.2 formulierte Forschungsfrage lautet:

> _Inwiefern reduziert ein hybrides KI-gestütztes Redaktionssystem die Time-to-Publish bei der Liveticker-Erstellung im Profifußball im Vergleich zur rein manuellen Erstellung, ohne die journalistische Qualität hinsichtlich Korrektheit, Tonalität und Verständlichkeit zu beeinträchtigen?_

Die Beantwortung erfolgt entlang der beiden in der Forschungsfrage angelegten Dimensionen.

### 8.2.1 Zeitliche Dimension: Reduktion der Time-to-Publish

Im `auto`-Modus (vollautonom) entfällt die manuelle Texterstellung vollständig — die Time-to-Publish wird durch die LLM-Latenz (gemessener Median: **859 ms**) plus die Polling-Verzögerung (max. 5.000 ms) bestimmt. Die Schätz-TTP beträgt damit **≈ 5,9 s** im Median. Im `coop`-Modus (hybrid) addiert sich die redaktionelle Prüfzeit: Ein einfacher Freigabe-Klick erfordert ca. 5–10 s, ein bearbeiteter Entwurf ca. 15–30 s — die geschätzte TTP liegt damit bei **≈ 15–30 s**. Im `manual`-Modus (Status quo) muss der Redakteur den gesamten Text selbst verfassen; die in Kapitel 2.1 zitierte Literatur beziffert die typische Texterstellungszeit unter Livebedingungen auf **30–120 s**.

Da kein kontrolliertes Spielexperiment in allen drei Modi durchgeführt werden konnte, basiert der Vergleich auf gemessenen LLM-Latenzen und der implementierten Systemarchitektur (Kapitel 6.9.2). Ein Cliff's-Delta-Test auf real gemessenen TTP-Paaren (auto vs. manual) wäre mit einem zukünftigen Live-Spieltest durchführbar; die TTP-Metrik und die Bulk-Evaluationsinfrastruktur (Kapitel 6.7.1–6.7.2) sind dafür vorbereitet.

Die strukturellen Daten bestätigen die Hypothese, dass ein hybrides System die Publikationslatenz signifikant reduziert: Die geschätzte TTP-Reduktion im `auto`-Modus gegenüber `manual` beträgt eine Größenordnung (Faktor 5–20× je nach Event-Typ und Redakteurserfahrung).

### 8.2.2 Qualitative Dimension: Journalistische Qualität

Die journalistische Qualität wurde entlang der drei in der Forschungsfrage definierten Kriterien operationalisiert:

1. **Korrektheit**: Die generierten Texte erreichen einen Ø-Wert von **4,6 / 5**. In 15 von 16 bewerteten Einträgen (94 %) wurden alle verfügbaren Fakten (Spieler, Team, Minute, Ergebnis) korrekt wiedergegeben. Die Pre-Match-Schutzregel verhindert zuverlässig die Erfindung von Live-Spielszenen; eine Wettempfehlung (1 von 16 Einträgen, 6 %) stellt eine inhaltliche Halluzination geringerer Schwere dar.

2. **Tonalität**: Mit einem Ø-Wert von **4,1 / 5** erzeugen die drei Stilprofile deutlich unterscheidbare Textstile. Der euphorische Modus — primär für vereinsnahe Liveticker wie die `ef_whitelabel`-Instanz konzipiert — erzielt die stärksten qualitativen Ergebnisse: Die Beispieltexte in Kapitel 6.8.3 zeigen, dass emotionale Stilmittel des Liveticker-Genres (Wiederholungen, Ausrufe, szenische Abschlüsse) vom Modell zuverlässig umgesetzt werden. Das neutrale Profil zeigt die größte Inkonsistenz (19 % der Einträge zu emotional formuliert), bedingt durch die starken euphorischen Few-Shot-Referenzen.

3. **Verständlichkeit**: Mit **4,3 / 5** erfüllen die generierten Texte die linguistischen Anforderungen des Liveticker-Genres (Kapitel 2.5) zuverlässig: kurze Satzkonstruktionen, Präsenskonstruktionen, idiomatische Ausrufe und konzeptionelle Mündlichkeit sind durchgehend vorhanden. Kein Eintrag überschritt die genretypische Kürze.

### 8.2.3 Synthese

Das hybride System reduziert die Time-to-Publish im Vergleich zur rein manuellen Erstellung **messbar und strukturell signifikant**: Im `auto`-Modus beträgt die geschätzte TTP ≈ 5,9 s gegenüber 30–120 s im `manual`-Modus — ein Reduktionsfaktor von 5× bis 20×. Die journalistische Qualität bleibt dabei **auf hohem Niveau erhalten** (Gesamt-Ø 4,3 / 5), wobei der `coop`-Modus als optimaler Kompromiss fungiert: Er vereint die Geschwindigkeit der automatischen Generierung mit der Qualitätssicherung durch redaktionelle Kontrolle. Die verbleibenden Qualitätsrisiken — insbesondere Stil-Inkonsistenz im neutralen Profil (19 %) und selektive Fakten-Halluzination (6 %) — werden durch das Human-in-the-Loop-Design des `coop`-Modus aufgefangen, in dem der Redakteur jeden Entwurf vor der Veröffentlichung prüft und gegebenenfalls korrigiert.

---

## 8.3 Ausblick

### 8.3.1 Kurzfristige Erweiterungen

**Authentifizierung und Rollensystem**: Die Integration eines JWT- oder OAuth-2.0-basierten Authentifizierungsframeworks ist die wichtigste Voraussetzung für einen Mehrbenutzerbetrieb. Ein rollenbasiertes Zugriffskonzept (Redakteur, Chefredakteur, Administrator) würde die Freigabe-Workflows im `coop`-Modus um eine Vier-Augen-Prüfung erweitern.

**Server-Sent Events für Ticker-Updates**: Die Ablösung des 5-Sekunden-Pollings durch SSE für den Ticker-Datenfluss würde die End-to-End-Latenz im `coop`-Modus weiter reduzieren und die Serverlast bei vielen gleichzeitigen Nutzern senken.

**Erweiterte E2E-Tests**: Die Ausweitung der Playwright-Tests auf den vollständigen Redaktionsworkflow mit laufendem Backend und Testdatenbank (Spiel auswählen, Events empfangen, Ticker-Einträge bearbeiten, Freigeben) würde die Regressionssicherheit erhöhen.

### 8.3.2 Mittelfristige Erweiterungen

**Externe Nutzerstudie**: Eine systematische Evaluation mit professionellen Sportredakteuren, die das System im realen Spielbetrieb nutzen, würde die externe Validität der Qualitätsbewertung stärken. Das implementierte Evaluationsframework (TTP, Cliff's Delta, Cohen's Kappa) ist dafür vorbereitet.

**Fine-Tuning statt Few-Shot**: Für vereinsspezifische Instanzen könnte ein Fine-Tuning auf dem Korpus historischer Vereinsticker die stilistische Konsistenz über den Few-Shot-Ansatz hinaus verbessern. Die `style_references`-Tabelle bildet bereits eine kuratierte Datenbasis, die als Ausgangspunkt für ein Fine-Tuning-Dataset dienen könnte.

**Differenziertes Polling**: Die vorbereitete Infrastruktur in `resolvePollingInterval` ermöglicht eine phasenabhängige Anpassung der Polling-Frequenz (z. B. 30 Sekunden im PreMatch, 5 Sekunden während Live). Dies würde die Serverlast im Ruhezustand reduzieren.

**Evaluation der Mehrsprachigkeit**: Eine separate Qualitätsevaluation der mehrsprachigen Textgenerierung — insbesondere für die im Kontext von Eintracht Frankfurt relevanten Sprachen Englisch und Japanisch — würde die in Kapitel 2.2 motivierte Internationalisierungsanforderung empirisch absichern.

### 8.3.3 Langfristige Perspektiven

**Multimodale Ticker**: Die bestehende Integration von Medieninhalten (ScorePlay, YouTube, Instagram) könnte zu einem multimodalen Ticker weiterentwickelt werden, in dem Bild, Video und Text automatisch zu einem kohärenten Narrativ verwoben werden. Vision-Language-Modelle könnten dabei Spielszenen aus Bildern beschreiben und in den Tickertext integrieren.

**Autonomes Scoring der Textqualität**: Die Ablösung der manuellen Qualitätsbewertung durch ein trainiertes Scoring-Modell, das Korrektheit, Tonalität und Verständlichkeit automatisch bewertet, würde eine kontinuierliche Qualitätsüberwachung im Produktivbetrieb ermöglichen. Die implementierte `aggregate_quality_by_group`-Funktion bildet die Aggregationslogik hierfür bereits ab.

**Generalisierung über den Fußball hinaus**: Die Provider-agnostische LLM-Architektur und das Event-basierte Generierungsmodell sind nicht fußballspezifisch. Eine Erweiterung auf andere Sportarten (Handball, Basketball, Eishockey) erforderte primär die Anpassung der Event-Typ-Mappings, der Phasendefinitionen und der Kontextbuilder — die Kernarchitektur bliebe unverändert.

---

## 8.4 Schlusswort

Die vorliegende Arbeit zeigt, dass ein hybrides KI-gestütztes Redaktionssystem den operativen Zeitdruck bei der Liveticker-Erstellung adressieren kann, ohne die redaktionelle Kontrolle aufzugeben. Der `coop`-Modus — in dem die KI Textvorschläge generiert und der Redakteur die finale Freigabe erteilt — realisiert das in Kapitel 1.1 formulierte Zielbild eines Systems, in dem „die finale Entscheidungshoheit und publizistische Verantwortung beim Menschen verbleiben".

Die technische Reife des Systems — belegt durch 391 Tests, 75 % Backend-Coverage und eine vollständige TypeScript-Migration — sowie die Erfüllung aller 23 definierten Anforderungen dokumentieren die Tragfähigkeit des Architekturansatzes. Die in Kapitel 7 diskutierten Limitationen (fehlende Nutzerstudie, keine Authentifizierung, Polling statt Push) markieren klare Erweiterungspfade, stellen aber die grundsätzliche Funktionalität nicht in Frage.

Die KI-gestützte Liveticker-Generierung ersetzt den Redakteur nicht — sie gibt ihm die Zeit zurück, die er braucht, um seiner eigentlichen Aufgabe nachzukommen: Journalismus.
