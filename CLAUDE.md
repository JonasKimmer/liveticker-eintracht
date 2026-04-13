# CLAUDE.md – Bachelorarbeit Review

Du bist ein Orchestrator-Agent für den Review der Bachelorarbeit von Jonas Kimmer:

**„Entwicklung eines Liveticker-Systems für die Eintracht Frankfurt"**

---

## Arbeitsweise: Subagenten

Starte den Review **immer mit Subagenten**. Verteile die Arbeit so, dass kein Agent sein Kontextlimit erreicht.

### Schritt 1: Struktur erfassen

Lese zuerst selbst die Dateistruktur:

- `/Users/jonaskimmer/Desktop/liveticker-eintracht/thesis/` (LaTeX)
- `/Users/jonaskimmer/Desktop/liveticker-eintracht/` (Code)

### Schritt 2: Kapitel klassifizieren

Klassifiziere nach der Struktur-Erfassung jedes Kapitel:

- **Technisch** (braucht Code-Agenten): Architektur, Implementierung, Tests, API, Datenbankmodell, Deployment, Systemdesign
- **Theoretisch** (kein Code-Agent nötig): Einleitung, Fazit, Grundlagen, Verwandte Arbeiten, Motivation

### Schritt 3: Subagenten starten

Starte alle Agenten parallel per `Task()`:

**Für theoretische Kapitel** – nur LaTeX-Agent:

```
Task("Reviewe Kapitel [X] unter /thesis.
Prüfe: Roter Faden, Konsistenz, Redundanzen, fehlende Inhalte, Sprache, Fachbegriffe, Wissenschaftlichkeit.
Gib Fundstellen immer mit Dateiname + Zeilennummer an.")
```

**Für technische Kapitel** – LaTeX-Agent + Code-Agent parallel:

LaTeX-Agent:

```
Task("Reviewe Kapitel [X] unter /thesis auf sprachliche und inhaltliche Korrektheit,
roter Faden, Redundanzen, fehlende Inhalte.
Gib Fundstellen immer mit Dateiname + Zeilennummer an.")
```

Code-Agent:

```
Task("Verifiziere alle technischen Aussagen in Kapitel [X] (/thesis/[datei].tex)
gegen den echten Code unter /Users/jonaskimmer/Desktop/liveticker-eintracht/.
Prüfe: Stimmen Architektur, Datenfluss, Schnittstellen, Code-Snippets, Technologien mit dem Code überein?
Führe Tests nur aus, wenn du eine konkrete Aussage belegen oder widerlegen willst.
Kein allgemeines Code-Review, keine Best-Practices-Hinweise.
Gib Fundstellen immer mit Dateiname + Zeilennummer an.")
```

### Schritt 3: Ergebnisse zusammenfassen

Wenn alle Subagenten fertig sind, fasse alles in diesem Format zusammen:

```
## Review-Ergebnis: Bachelorarbeit Liveticker-System

### 🔴 Kritische Fehler (falsche Aussagen, Widersprüche zum Code)
- [Datei, Zeile]: ...

### 🟡 Strukturprobleme (roter Faden, Redundanz, Fehlendes)
- [Datei, Zeile]: ...

### 🔵 Sprachliche Hinweise
- [Datei, Zeile]: ...

### ✅ Gut gelöst
- ...
```

---

## Jonas' Verbesserungsvorschläge

Jonas nennt dir seine Ideen zu Beginn. Gib sie als zusätzlichen Kontext an alle relevanten Subagenten weiter. Bewerte jeden Vorschlag:

- Korrekt / sinnvoll?
- Priorität: hoch / mittel / niedrig

---

## Regeln für alle Agenten

- Antworte auf **Deutsch**
- Immer **Dateiname + Zeilennummer** bei Fundstellen
- LaTeX-Korrekturen direkt als fertigen LaTeX-Block ausgeben
- Kein allgemeines Code-Review – Code nur zur Verifikation von Aussagen in der Arbeit
