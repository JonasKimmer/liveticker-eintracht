# Kapitel 7 – Diskussion

---

## 7.1 Einordnung in den Stand der Technik

### 7.1.1 Abgrenzung zu bestehenden Systemen

Das in dieser Arbeit entwickelte System unterscheidet sich von bestehenden Ansätzen der automatisierten Sportberichterstattung (Kapitel 3.3) in mehreren Aspekten:

**Gegenüber templatebasierten Systemen** (z. B. Retresco, vgl. Beils 2023, S. 207) bietet der LLM-basierte Ansatz eine höhere sprachliche Varianz und Anpassungsfähigkeit an unterschiedliche Stilprofile. Templatebasierte Systeme erzeugen deterministische, aber oft formelhaft wirkende Texte; LLM-generierte Texte sind sprachlich natürlicher, dafür nicht-deterministisch.

**Gegenüber vollautonomen KI-Systemen** betont die vorliegende Arbeit bewusst den hybriden Ansatz mit Human-in-the-Loop-Kontrolle. Dies begründet sich durch die in Kapitel 3.1 beschriebene Halluzinationsproblematik, die im journalistischen Kontext besonders kritisch ist (Bluhm & Schäfer 2023, S. 33). Der `coop`-Modus repräsentiert damit einen Mittelweg, der die Effizienzgewinne der Automatisierung nutzt, ohne die publizistische Verantwortung an die KI zu delegieren.

**Gegenüber reinen Übersetzungslösungen** für Mehrsprachigkeit bietet das System eine nativ multilinguale Generierung, bei der die Zielsprache als Prompt-Parameter übergeben wird. Die zusätzliche Batch-Übersetzungsfunktion mit reduzierter Temperatur (0,1) ergänzt dies für nachträgliche Lokalisierung bestehender Einträge.

### 7.1.2 Beitrag zur Forschung

Die Arbeit leistet drei Beiträge zum aktuellen Forschungsstand:

1. **Architektonischer Beitrag**: Das System demonstriert eine produktionsnahe Referenzarchitektur für KI-gestützte Echtzeit-Textgenerierung mit modularer Provider-Abstraktion, Few-Shot-Prompting aus einer kuratierten Stilreferenz-Datenbank und dreistufigem Betriebsmodus-Konzept.

2. **Methodischer Beitrag**: Die Evaluationsinfrastruktur mit Bulk-Generierungsendpunkt, Provider-Override und statistischen Vergleichsmetriken (Cliff's Delta, Bootstrap-CI, Cohen's Kappa) ermöglicht systematische, reproduzierbare Modellvergleiche.

3. **Praktischer Beitrag**: Die White-Label-Architektur mit instanzspezifischer Stilsteuerung adressiert den in Kapitel 2.3 beschriebenen Bedarf von Vereinen als eigenständige Medienproduzenten.

---

## 7.2 Kritische Reflexion

Die in Kapitel 6.12 dokumentierten Limitationen werden im Folgenden hinsichtlich ihrer Implikationen eingeordnet.

### 7.2.1 Methodische Einordnung

Die zentrale methodische Einschränkung betrifft die Selbstbewertung der Textqualität (vgl. Kapitel 6.12.1). Im Design Science Research ist die Evaluation durch den Entwickler ein verbreitetes Vorgehen bei initialen Artefaktiterationen (Hevner et al. 2004), begrenzt jedoch die externe Validität der qualitativen Ergebnisse. Die implementierte Cohen's-Kappa-Metrik ist bewusst als Infrastruktur für eine Folgestudie mit externen Ratern angelegt.

Die eingeschränkte Stichprobengröße (vgl. Kapitel 6.12.2) relativiert die Generalisierbarkeit der quantitativen Ergebnisse. Insbesondere Randsituationen — torloses Unentschieden, Elfmeterschießen, Spielabbrüche — sind in der Datenbasis vermutlich unterrepräsentiert. Die Bulk-Evaluationsinfrastruktur ermöglicht jedoch eine systematische Erweiterung der Datenbasis ohne Codeänderung.

### 7.2.2 Technische Einordnung

Das Polling-Modell (vgl. Kapitel 6.12.6) stellt für den Einzelbetrieb keine Einschränkung dar, würde aber bei steigender Nutzerzahl (>50 gleichzeitige Clients) zu einer relevanten Serverlast führen. Die bestehende WebSocket-Infrastruktur für den Media-Kanal zeigt, dass eine Umstellung auf Server-Sent Events für den Ticker-Datenfluss technisch machbar ist.

Die fehlende Authentifizierung (vgl. Kapitel 6.12.4) ist im Kontext eines internen Redaktionswerkzeugs vertretbar, schließt aber einen offenen Mehrbenutzerbetrieb ohne Netzwerkabsicherung aus. Die Architektur ist durch die saubere Middleware-Schichtung (FastAPI Dependencies) für eine nachträgliche JWT-Integration vorbereitet.

### 7.2.3 Inhaltliche Reflexion

Die in Kapitel 2.5 hergeleiteten linguistischen Anforderungen an Liveticker — Ellipsen, konzeptionelle Mündlichkeit, Graphostilistik (z. B. „TOOOOR!") — stellen besondere Anforderungen an die Prompt-Gestaltung. Die Erfahrung zeigt, dass LLMs dazu neigen, in einem formelleren Register zu schreiben als es das Genre Liveticker erfordert. Die Few-Shot-Referenzen aus der `style_references`-Tabelle sind das primäre Mittel, um diese stilistische Lücke zu schließen. [TODO: Einschätzung basierend auf den konkreten Evaluationsergebnissen, ob dies gelungen ist.]

Der in Kapitel 3.1 beschriebene Halluzinationseffekt ist im Kontext von Livetickern besonders kritisch, da fehlerhafte Fakten (falscher Torschütze, falsches Ergebnis) unmittelbar die Glaubwürdigkeit zerstören. Die explizite Schutzregel für Pre-Match-Prompts und die niedrige Temperatur (0,3) sind Gegenmaßnahmen, deren Wirksamkeit jedoch nur im `coop`-Modus durch die redaktionelle Kontrolle vollständig abgesichert ist. Im `auto`-Modus verbleibt ein Restrisiko fehlerhafter Veröffentlichungen.

---

## 7.3 Diskussion der Betriebsmodi

Die drei Betriebsmodi (`auto`, `coop`, `manual`) wurden in Kapitel 4.3.3 konzipiert und in Kapitel 6.9 evaluiert. Im Folgenden werden die Implikationen der Evaluationsergebnisse für den praktischen Einsatz diskutiert.

### 7.3.1 Auto-Modus: Geschwindigkeit auf Kosten der Kontrolle

Der `auto`-Modus eliminiert die menschliche Latenz vollständig — Einträge werden direkt mit Status `published` erstellt. Die Stärke dieses Modus liegt in der Geschwindigkeit: [TODO: Ø TTP auto]. Das Risiko besteht in unkontrollierten Halluzinationen, die ohne redaktionelle Prüfung veröffentlicht werden. Im journalistischen Kontext, in dem Glaubwürdigkeit eine zentrale Ressource darstellt (Beils 2023, S. 57), ist dieser Modus daher nur für unkritische Event-Typen (z. B. Phasenwechsel wie „Anpfiff" oder „Halbzeit") vertretbar.

### 7.3.2 Coop-Modus: Der intendierte Produktivbetrieb

Der `coop`-Modus bildet den Kern der Arbeit ab: Die KI liefert Entwürfe, der Redakteur gibt frei, bearbeitet oder verwirft. Dieses Human-in-the-Loop-Design balanciert zwei gegenläufige Anforderungen: Die kognitive Last des Textverfassens entfällt, während jeder Eintrag vor der Veröffentlichung eine redaktionelle Kontrolle durchläuft. Im Optimalfall reduziert sich die Redakteursarbeit auf einen Tastendruck (TAB zur Freigabe).

[TODO: Wurden im Evaluationszeitraum Einträge im Coop-Modus retrahiert oder bearbeitet? Wenn ja: Anteil und typische Korrekturgründe.]

### 7.3.3 Implikationen für die Praxis

Die Koexistenz aller drei Modi in einem System — umschaltbar zur Laufzeit per API-Call — ermöglicht eine schrittweise Einführung in Redaktionen: Neue Nutzer können im `manual`-Modus beginnen, über den `coop`-Modus Vertrauen in die KI-Qualität aufbauen und für unkritische Standardereignisse schließlich den `auto`-Modus aktivieren. Diese Graduierung adressiert den in Kapitel 2.1 beschriebenen Akzeptanzbedarf bei der Einführung KI-gestützter Werkzeuge in redaktionelle Workflows.

---

## 7.4 Diskussion der Prompt-Architektur

### 7.4.1 Few-Shot-Prompting als Stilsteuerung

Die dynamische Einbindung von bis zu drei Stilreferenzen aus der `style_references`-Datenbanktabelle stellt einen zentralen Designentscheid dar. Im Vergleich zu einem statischen System-Prompt bietet dieser Ansatz zwei Vorteile:

1. **Anpassbarkeit ohne Codeänderung**: Neue Stilbeispiele können über die Datenbank hinzugefügt werden, ohne den Prompt-Code zu modifizieren.
2. **Instanzspezifik**: Die Filterung nach Event-Typ und Instanz (`ef_whitelabel` vs. `generic`) ermöglicht unterschiedliche Stilprofile für verschiedene Einsatzkontexte.

[TODO: Vergleich der Textqualität mit und ohne Few-Shot-Referenzen aus der Evaluation (Kapitel 6.7.5). Ist der Effekt messbar?]

### 7.4.2 Temperatur und Determinismus

Die gewählte Temperatur von 0,3 für die Textgenerierung und 0,1 für Übersetzungen ist ein Kompromiss zwischen sprachlicher Varianz und Vorhersagbarkeit. Eine niedrigere Temperatur würde die Halluzinationsrate weiter senken, aber die Texte formelhafter machen — ein Zielkonflikt, der im Genre Liveticker (das von Überraschung und sprachlicher Kreativität lebt) besonders relevant ist.

### 7.4.3 Kontext-Aufbereitung

Die sechs spezialisierten Context-Builder (`ctx_injuries`, `ctx_prediction`, `ctx_h2h`, `ctx_team_stats`, `ctx_standings`, `ctx_live_stats`) strukturieren die Fakten vor der Übergabe an das LLM. Diese Vorverarbeitung reduziert die Wahrscheinlichkeit von Halluzinationen, da das Modell nicht aus unstrukturierten Rohdaten extrahieren muss, sondern bereits aufbereitete Faktenblöcke erhält. Die Wirksamkeit dieses Ansatzes zeigt sich insbesondere bei Pre-Match-Einträgen, wo die Faktengrundlage (z. B. Verletzungslisten, H2H-Statistiken) klar abgegrenzt ist.

---

## 7.5 Implikationen für den Sportjournalismus

### 7.5.1 Veränderung der Redakteursrolle

Das hybride System verschiebt die Rolle des Liveticker-Redakteurs von der **Textproduktion** zur **Textredaktion**: Statt unter Zeitdruck zu formulieren, prüft, editiert und kuratiert der Redakteur KI-generierte Vorschläge. Diese Verschiebung entspricht dem von Bluhm und Schäfer (2023, S. 35) beschriebenen Wandel hin zu einer „augmented authorship", bei der menschliche Expertise und maschinelle Effizienz komplementär zusammenwirken.

### 7.5.2 Skalierbarkeit und White-Label

Die White-Label-Architektur (`ef_whitelabel` vs. `generic`) adressiert den in Kapitel 2.3 beschriebenen strukturellen Wandel der Vereine zu eigenständigen Medienproduzenten. Ein einzelnes System kann — durch Instanzkonfiguration, Stilprofile und Few-Shot-Referenzen — verschiedene redaktionelle Stimmen bedienen, ohne separate Codebases zu erfordern. Für Vereine mit begrenzten Redaktionsressourcen senkt dies die Einstiegshürde in eine professionelle Liveticker-Berichterstattung.

### 7.5.3 Ethische Überlegungen

Die automatisierte Generierung journalistischer Texte wirft die Frage der Transparenz auf: Sollten Leser wissen, ob ein Ticker-Eintrag von einem Menschen oder einer KI verfasst wurde? Das System speichert die Herkunft jedes Eintrags im Feld `source` (`"ai"`, `"manual"`, `"hybrid"`), legt die Kennzeichnung gegenüber dem Endnutzer aber nicht offen. Für einen produktiven Einsatz wäre eine Kennzeichnungspflicht — etwa durch ein dezentes Label wie „KI-unterstützt" — zu diskutieren, insbesondere im Kontext der EU-KI-Verordnung (AI Act), die ab 2026 Transparenzpflichten für KI-generierte Inhalte vorsieht.
