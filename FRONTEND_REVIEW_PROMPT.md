Du bist ein Senior-Frontend-Architekt. Analysiere das React-Frontend in `frontend/src/` gründlich und erstelle einen priorisierten Bericht. Fokus: Ordnerstruktur, Code-Qualität, DRY-Verstöße, unnötige/fehlende Abstraktionen.

---

## Kontext

- React 18 + TypeScript (CRA-basiert, kein Vite)
- Einzige Route: `LiveTicker` — Echtzeit-Fußball-Liveticker mit KI-Textgenerierung
- State-Management: React Context (`TickerDataContext`, `TickerActionsContext`)
- 112 Dateien, 19 Ordner, größte Datei: `LiveTicker.css` (3.658 Zeilen)
- Type-Coverage: 95.84%, 0 TS-Fehler, 187 Tests grün
- Ziel: Bachelorarbeit (Note 1.0) — Clean Code ist Bewertungskriterium

---

## Ordnerstruktur (aktuell)

```
src/
  api/              # 1 Datei — API-Client
  assets/           # 1 Datei — Bilder
  components/
    LiveTicker/
      components/   # 24 flat + 5 Subordner:
        dropdown/   # 4 — CountryDropdown, Dropdown, DropdownList, dropdownStyles
        entry/      # 6 — AIDraft, EntryEditor, EventCard, PublishedEntry + Tests
        media/      # — MediaPickerPanel, Publish-Modals, Thumbnails
        social/     # 5 — TwitterPanel, InstagramPanel, YouTubePanel, SocialPanelShell, SocialPublishModal
        summary/    # 4 — SummaryDraftCard, SummaryRow, SummarySection, PublishedSummarySection
      hooks/        # 9 — useTicker, useSocialPanel, useMediaPublishForm, useLiveMinuteEditor, …
      panels/       # 3 — LeftPanel, CenterPanel, RightPanel
      utils/        # 3 — parseCommand, publishPayload, parseCommand.test
    LiveTicker.tsx  # 438 Zeilen — Haupt-Orchestrator
    LiveTicker.css  # 3.658 Zeilen — EINE riesige CSS-Datei
  config/           # 1 Datei
  context/          # 3 Dateien — TickerDataContext, TickerActionsContext, TickerModeContext
  hooks/            # 23 Dateien — globale Hooks (useMatchCore, useApiStatus, …)
  types/            # 1 Datei — index.ts mit allen Interfaces
  utils/            # 7 Dateien — matchStatus, isOurTeamMatch, resolvePollingInterval, …
  constants.ts      # Domain-Konstanten (MODES, MATCH_PHASES, …)
```

---

## Prüfe folgende Punkte und berichte Findings + Fixes

### 1. DRY-Verstöße (Duplikate, Copy-Paste-Code)

Bekannte Verdachtsfälle:

- **MediaPublishModal (493Z) vs ClipPublishModal (260Z) vs SocialPublishModal**: Drei Publish-Modals — gemeinsame Basis möglich?
- **SummarySection vs PublishedSummarySection**: Edit vs Read-Only — shared logic?
- **Collapsible.tsx vs CollapsibleSection.tsx**: Überlappung oder klar getrennt?
- Suche nach weiteren duplizierten Patterns (z.B. gleiche `useEffect`-Muster, duplizierte Styles, wiederholte State-Logik).

### 2. Unnötige Dateien / Dead Code

- Gibt es Komponenten oder Hooks die nirgends importiert werden?
- Gibt es exportierte Funktionen/Konstanten die nie benutzt werden?
- Gibt es auskommentierte Code-Blöcke (> 5 Zeilen) die gelöscht werden sollten?

### 3. Fehlende Abstraktionen

- Gibt es Inline-Logik in Komponenten (> 15 Zeilen in einem Handler/useEffect) die in einen Hook extrahiert werden sollte?
- Gibt es wiederholte UI-Patterns (z.B. Panel-Header, Badge, Loading-State) die eine gemeinsame Komponente brauchen?
- StylePickerDropdown.tsx liegt außerhalb von `dropdown/` — gehört es rein?

### 4. Ordnerstruktur-Probleme

- Sind die 24 Dateien im flachen `components/`-Ordner korrekt dort oder gehören manche in Subordner?
- Passen die 23 globalen Hooks alle in `src/hooks/` oder sind manche LiveTicker-spezifisch?
- 5 Hooks heißen `useMatch*` — ist die Aufteilung sinnvoll oder Überfragmentierung?
- `constants.ts` existiert in `src/` UND `LiveTicker/` — Überlappung? Klare Trennung?

### 5. Große Dateien (Top 10 nach Zeilenzahl)

```
3.658  LiveTicker.css
  629  YouTubePanel.tsx
  537  MediaPickerPanel.tsx
  493  MediaPublishModal.tsx
  491  RightPanel.tsx
  468  PublishedEntry.tsx
  438  LiveTicker.tsx
  416  parseCommand.ts
  402  EntryEditor.tsx
```

- Welche davon sollten aufgeteilt werden und wie?
- `LiveTicker.css` (3.658Z) — CSS-Module pro Komponente oder andere Strategie?

### 6. TypeScript-Qualität

- Wo stehen noch `any`-Typen die einfach zu fixen wären?
- Fehlen Props-Interfaces?
- Werden Union Types / Generics sinnvoll eingesetzt?

---

## Ausgabeformat

Erstelle eine priorisierte Liste:

**P0 — Muss gefixt werden** (Dead Code, echte DRY-Verstöße, Layer-Violations)
**P1 — Sollte gefixt werden** (fehlende Abstraktionen, große Dateien aufteilen)
**P2 — Nice-to-have** (Ordnerstruktur-Optimierungen, Namenskonventionen)

Pro Finding:

- **Was:** Kurze Beschreibung
- **Wo:** Dateipfad(e)
- **Warum:** Was ist das Problem?
- **Fix:** Konkreter Vorschlag (max 2-3 Sätze)
- **Aufwand:** S/M/L
