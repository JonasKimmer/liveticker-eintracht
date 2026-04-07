# Fazit und Ausblick

---

## Zusammenfassung der Ergebnisse

Die vorliegende Arbeit hat ein hybrides Redaktionssystem für die KI-gestützte Liveticker-Erstellung im Profifußball konzipiert, implementiert und evaluiert. Das System entstand in direkter Kooperation mit der **Stackwork GmbH** im IT-Bereich von Eintracht Frankfurt und exportiert produzierte Inhalte über API-Schnittstellen in die bestehende **Stackwork Demo App**. Es adressiert die drei in Kapitel 1.1 identifizierten Problemdimensionen — operativer Zeitdruck, Mehrsprachigkeit und White-Label-Bedarf — durch eine dreischichtige Architektur aus Datenbeschaffung (n8n), Anwendungslogik (FastAPI, PostgreSQL) und Präsentation (React, TypeScript).

### Technische Ergebnisse

Die technische Evaluation (Kapitel 6.2) belegt eine produktionsnahe Codebasis mit vollständiger Testpyramide, hoher Typsicherheit und lückenloser Erfüllung aller 23 definierten Anforderungen (vgl. Kapitel 6.6). Die bewusst ausgeklammerte Authentifizierungsschicht ist als Systembeschränkung dokumentiert (vgl. Kapitel 6.7).

### KI-Textgenerierung

Die Multi-Provider-Architektur mit Prioritätskette gewährleistet eine hohe Verfügbarkeit der Textgenerierung. Die qualitative Bewertung (Abschnitt 6.3.6) zeigt durchgängig gute Ergebnisse über alle drei Qualitätsdimensionen; die stärkste Einschränkung liegt in der Stil-Inkonsistenz des neutralen Profils. Die quantitativen Einzelwerte und Latenzmetriken sind in Kapitel 6.3–6.5 vollständig dokumentiert.

### Systemarchitektur und Designentscheide

Das System realisiert die in Kapitel 4 konzipierte dreischichtige Architektur vollständig (Datenschicht via n8n-ETL, Anwendungsschicht via FastAPI/PostgreSQL, Präsentationsschicht via React/TypeScript). Die **White-Label-Architektur** und die **drei Betriebsmodi** bilden die Kernbeiträge des Systemdesigns (vgl. Kap. 4.3.3, 5.3.3).

---

## Beantwortung der Forschungsfrage

Die in Kapitel 1.2 formulierte Forschungsfrage lautet:

> _Inwiefern reduziert ein hybrides KI-gestütztes Redaktionssystem die Time-to-Publish bei der Liveticker-Erstellung im Profifußball im Vergleich zur rein manuellen Erstellung, ohne die journalistische Qualität hinsichtlich Korrektheit, Tonalität und Verständlichkeit zu beeinträchtigen?_

Die Beantwortung erfolgt entlang der beiden in der Forschungsfrage angelegten Dimensionen.

### Zeitliche Dimension: Reduktion der Time-to-Publish

Im `auto`-Modus (vollautonom) entfällt die manuelle Texterstellung vollständig — die geschätzte TTP beträgt **≈ 3,4–5,9 s** (erwarteter Median bis Worst Case, vgl. Abschnitt 6.4.2). Im `coop`-Modus (hybrid) addiert sich die redaktionelle Prüfzeit: Ein einfacher Freigabe-Klick erfordert ca. 5–10 s, ein bearbeiteter Entwurf ca. 15–30 s — die geschätzte TTP liegt damit bei **≈ 15–30 s**. Im `manual`-Modus (Status quo) muss der Redakteur den gesamten Text selbst verfassen; auf Basis der in Kapitel 2.1 beschriebenen Produktionsbedingungen wird die typische Texterstellungszeit unter Livebedingungen auf **30–120 s** geschätzt.

Da kein kontrolliertes Spielexperiment in allen drei Modi durchgeführt werden konnte, basiert der Vergleich auf gemessenen LLM-Latenzen und der implementierten Systemarchitektur (Abschnitt 6.4.2). Ein Cliff's-Delta-Test auf real gemessenen TTP-Paaren (auto vs. manual) wäre mit einem zukünftigen Live-Spieltest durchführbar; die TTP-Metrik und die Bulk-Evaluationsinfrastruktur (Abschnitte 6.3.1–6.3.2) sind dafür vorbereitet.

Die strukturellen Daten bestätigen die Hypothese, dass ein hybrides System die Publikationslatenz signifikant reduziert: Die geschätzte TTP-Reduktion im `auto`-Modus gegenüber `manual` beträgt eine Größenordnung (Faktor 5–35× je nach Event-Typ und Redakteurserfahrung).

### Qualitative Dimension: Journalistische Qualität

Die journalistische Qualität wurde entlang der drei in der Forschungsfrage definierten Kriterien operationalisiert:

1. **Korrektheit**: Die generierten Texte erreichen einen Ø-Wert von **4,6 / 5**. In 15 von 16 bewerteten Einträgen (94 %) wurden alle verfügbaren Fakten (Spieler, Team, Minute, Ergebnis) korrekt wiedergegeben (Hauptevaluation, N = 16, deutschsprachig). Die ergänzende Evaluation mit synthetischem Kontext (N = 9) bestätigt diesen Befund und erweitert ihn um bislang fehlende Event-Typen (Rote Karte, Phasen-Events). Die Pre-Match-Schutzregel verhindert zuverlässig die Erfindung von Live-Spielszenen; eine Wettempfehlung (1 von 16 Einträgen, 6 %) stellt eine inhaltliche Halluzination geringerer Schwere dar. Die Qualitätsbewertung basiert ausschließlich auf deutschsprachigen Ausgaben; die Texte in anderen Sprachen (Englisch, Japanisch) wurden nicht separat evaluiert.

2. **Tonalität**: Mit einem Ø-Wert von **4,1 / 5** erzeugen die drei Stilprofile deutlich unterscheidbare Textstile. Der euphorische Modus — primär für vereinsnahe Liveticker wie die `ef_whitelabel`-Instanz konzipiert — erzielt die stärksten qualitativen Ergebnisse: Die Beispieltexte in Abschnitt 6.3.6 zeigen, dass emotionale Stilmittel des Liveticker-Genres (Wiederholungen, Ausrufe, szenische Abschlüsse) vom Modell zuverlässig umgesetzt werden. Das neutrale Profil zeigt die größte Inkonsistenz (19 % der Einträge zu emotional formuliert), bedingt durch die starken euphorischen Few-Shot-Referenzen.

3. **Verständlichkeit**: Mit **4,3 / 5** erfüllen die generierten Texte die linguistischen Anforderungen des Liveticker-Genres (Kapitel 2.5) zuverlässig: kurze Satzkonstruktionen, Präsenskonstruktionen, idiomatische Ausrufe und konzeptionelle Mündlichkeit sind durchgehend vorhanden. Kein Eintrag überschritt die genretypische Kürze.

Die qualitative Dimension der Bewertung basiert auf der in Abschnitt 6.3.6 dokumentierten Selbstevaluation, ergänzt durch das Experteninterview mit einem professionellen Sportredakteur von Eintracht Frankfurt (vgl. Abschnitt 6.3.6).

### Synthese

Die Forschungsfrage verknüpft zwei Dimensionen durch ein „ohne": eine TTP-Reduktion soll erreicht werden, _ohne_ die journalistische Qualität zu beeinträchtigen. Aus der Zusammenschau der Ergebnisse lässt sich eine modus-spezifische Antwort ableiten.

Im `auto`-Modus ist die TTP-Reduktion maximal — das System operiert ohne menschliche Latenz. Zugleich sind die Qualitätsrisiken in diesem Modus nicht abgefangen: Die 19%ige Stil-Inkonsistenz im neutralen Profil und die 6%ige Rate inhaltlicher Halluzinationen würden ohne redaktionelle Filterung direkt publiziert. Die Bedingung „ohne Beeinträchtigung der Qualität" ist im vollautonomen Betrieb damit nur dann erfüllt, wenn ausschließlich das euphorische Profil (das konsistenteste der drei) verwendet wird — also im vereinsspezifischen `ef_whitelabel`-Kontext.

Im `coop`-Modus hingegen werden beide Bedingungen der Forschungsfrage simultan erfüllt: Die KI-Generierung reduziert die Texterstellungszeit auf 3,4–5,9 s; die redaktionelle Prüfung (5–30 s) filtert Qualitätsrisiken heraus, bevor ein Eintrag publiziert wird. Die resultierende TTP liegt bei 15–30 s — erheblich unter der manuellen Baseline von 30–120 s und dennoch qualitätsgesichert. Das Human-in-the-Loop-Design löst damit den klassischen Speed-Quality-Trade-off nicht durch Kompromiss, sondern durch Aufgabenteilung: Die Maschine übernimmt die zeitkritische Textproduktion, der Mensch die publizistische Verantwortung.

Die Antwort auf die Forschungsfrage lautet daher zustimmend, aber mit einer Qualifikation: **Ein hybrides KI-gestütztes Redaktionssystem reduziert die TTP signifikant, ohne die journalistische Qualität zu beeinträchtigen — vorausgesetzt, es wird im `coop`-Modus betrieben.** Der `auto`-Modus maximiert die Geschwindigkeit auf Kosten der Qualitätssicherung und eignet sich für Kontexte mit geringem Qualitätsrisiko (euphorisches Profil, vereinseigener Kanal); der `manual`-Modus bietet volle redaktionelle Kontrolle ohne Zeitgewinn. Der `coop`-Modus realisiert den in Kapitel 1.1 formulierten Zielzustand eines Systems, in dem KI-Geschwindigkeit und menschliche Urteilskraft gemeinsam wirken.

---

## Ausblick

### Kurzfristige Erweiterungen

**Authentifizierung und Rollensystem**: Die Integration eines JWT- oder OAuth-2.0-basierten Authentifizierungsframeworks ist die wichtigste Voraussetzung für einen Mehrbenutzerbetrieb. Ein rollenbasiertes Zugriffskonzept (Redakteur, Chefredakteur, Administrator) würde die Freigabe-Workflows im `coop`-Modus um eine Vier-Augen-Prüfung erweitern.

**Server-Sent Events für Ticker-Updates**: Die Ablösung des 5-Sekunden-Pollings durch SSE für den Ticker-Datenfluss würde die End-to-End-Latenz im `coop`-Modus weiter reduzieren und die Serverlast bei vielen gleichzeitigen Nutzern senken.

**Erweiterte E2E-Tests**: Die Ausweitung der Playwright-Tests auf den vollständigen Redaktionsworkflow mit laufendem Backend und Testdatenbank (Spiel auswählen, Events empfangen, Ticker-Einträge bearbeiten, Freigeben) würde die Regressionssicherheit erhöhen.

**n8n-Workflow-Tests**: Die 15 n8n-Workflows (vgl. Kapitel 6.7) sind derzeit ausschließlich manuell verifiziert. Integrationstests gegen eine Staging-Datenbank würden die Zuverlässigkeit der Datenversorgungspipeline absichern.

**Few-Shot-Kontextualisierung in n8n-Workflows**: Die n8n-Workflows für Halbzeit- und Abpfiff-Zusammenfassungen (Workflow 13) rufen OpenRouter direkt auf, ohne Stilreferenzen aus der `style_references`-Tabelle einzubinden. Eine Erweiterung dieser Workflows um einen SQL-Schritt zur Referenzabfrage würde die stilistische Kohärenz zwischen Backend-generierten und n8n-generierten Einträgen herstellen.

**Größere Evaluationsstichprobe**: Die Hauptevaluation umfasst 16 Einträge aus 9 Spielen — eine für explorative Erkenntnisse ausreichende, für statistisch belastbare Aussagen jedoch zu kleine Datenbasis. Eine Folgestudie mit ≥ 100 Einträgen aus verschiedenen Wettbewerben, Ligen und Spielsituationen würde die Generalisierbarkeit der Ergebnisse stärken und den Einsatz der implementierten nicht-parametrischen Verfahren (Cliff's Delta, Bootstrap-CI) rechtfertigen.

**Langzeitbetrieb**: Das System wurde nicht über einen längeren Zeitraum evaluiert. Aspekte wie Drift der Textqualität über die Zeit, kumulative API-Kosten im Saison-Betrieb und Rate-Limit-Häufigkeit unter realer Dauerlast sind nicht erfasst. Eine Saisonbegleitung über mindestens 34 Bundesliga-Spieltage würde hier belastbare Betriebsdaten liefern.

### Mittelfristige Erweiterungen

**Externe Nutzerstudie**: Eine systematische Evaluation mit professionellen Sportredakteuren, die das System im realen Spielbetrieb nutzen, würde die externe Validität der Qualitätsbewertung stärken. Das implementierte Evaluationsframework (TTP, Cliff's Delta, Cohen's Kappa) ist dafür vorbereitet.

**Fine-Tuning statt Few-Shot**: Für vereinsspezifische Instanzen könnte ein Fine-Tuning auf dem Korpus historischer Vereinsticker die stilistische Konsistenz über den Few-Shot-Ansatz hinaus verbessern. Die `style_references`-Tabelle bildet bereits eine kuratierte Datenbasis, die als Ausgangspunkt für ein Fine-Tuning-Dataset dienen könnte.

**Differenziertes Polling**: Die vorbereitete Infrastruktur in `resolvePollingInterval` ermöglicht eine phasenabhängige Anpassung der Polling-Frequenz (z. B. 30 Sekunden im PreMatch, 5 Sekunden während Live). Dies würde die Serverlast im Ruhezustand reduzieren.

**Evaluation der Mehrsprachigkeit**: Eine separate Qualitätsevaluation der mehrsprachigen Textgenerierung — insbesondere für die im Kontext von Eintracht Frankfurt relevanten Sprachen Englisch und Japanisch — würde die in Kapitel 2.2 motivierte Internationalisierungsanforderung empirisch absichern.

### Langfristige Perspektiven

**Multimodale Ticker**: Die bestehende Integration von Medieninhalten (ScorePlay, YouTube, Instagram) könnte zu einem multimodalen Ticker weiterentwickelt werden, in dem Bild, Video und Text automatisch zu einem kohärenten Narrativ verwoben werden. Vision-Language-Modelle könnten dabei Spielszenen aus Bildern beschreiben und in den Tickertext integrieren.

**Autonomes Scoring der Textqualität**: Die Ablösung der manuellen Qualitätsbewertung durch ein trainiertes Scoring-Modell, das Korrektheit, Tonalität und Verständlichkeit automatisch bewertet, würde eine kontinuierliche Qualitätsüberwachung im Produktivbetrieb ermöglichen. Die implementierte `aggregate_quality_by_group`-Funktion bildet die Aggregationslogik hierfür bereits ab.

**Generalisierung über den Fußball hinaus**: Die Provider-agnostische LLM-Architektur und das Event-basierte Generierungsmodell sind nicht fußballspezifisch. Eine Erweiterung auf andere Sportarten (Handball, Basketball, Eishockey) erforderte primär die Anpassung der Event-Typ-Mappings, der Phasendefinitionen und der Kontextbuilder — die Kernarchitektur bliebe unverändert.

---

## Schlusswort

Die vorliegende Arbeit zeigt, dass ein hybrides KI-gestütztes Redaktionssystem den operativen Zeitdruck bei der Liveticker-Erstellung adressieren kann, ohne die redaktionelle Kontrolle aufzugeben. Der `coop`-Modus realisiert das in Kapitel 1.1 formulierte Zielbild eines Systems, in dem „die finale Entscheidungshoheit und publizistische Verantwortung beim Menschen verbleiben".

Die technische Reife des Systems (vgl. Kap. 6.2) sowie die Erfüllung aller definierten Anforderungen dokumentieren die Tragfähigkeit des Architekturansatzes. Die in Kapitel 7 diskutierten Limitationen markieren klare Erweiterungspfade, stellen aber die grundsätzliche Funktionalität nicht in Frage.

Die KI-gestützte Liveticker-Generierung ersetzt den Redakteur nicht — sie gibt ihm die Zeit zurück, die er braucht, um seiner eigentlichen Aufgabe nachzukommen: Journalismus.
