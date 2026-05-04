# Bachelorarbeit LaTeX-Konvertierung — Setup & Kompilation

## Status

✅ **Kapitel 1 (Einleitung):** Vollständig konvertiert → `Bachelorarbeit_Kapitel1.tex`

📋 **Kapitel 2–8:** Quellen liegen als Markdown vor
📋 **Frontmatter (Abstract, TOC):** Generiert in `Bachelorarbeit_Main.tex`

## Anleitung zur Konvertierung aller Kapitel

### Option 1: Automatische Konvertierung mit Pandoc (Empfohlen)

Aus dem Projektverzeichnis ausführen:

```bash
cd /Users/jonaskimmer/Desktop/liveticker-eintracht

# Pandoc installieren (falls nicht vorhanden)
# macOS: brew install pandoc

# Alle Kapitel 2–8 konvertieren
pandoc docs_short/kapitel2.md -t latex -o Bachelorarbeit_Kapitel2.tex
pandoc docs_short/kapitel3_StandDerTechnik.md -t latex -o Bachelorarbeit_Kapitel3.tex
pandoc docs_short/kapitel4_systemkonzeption.md -t latex -o Bachelorarbeit_Kapitel4.tex
pandoc docs_short/kapitel5_implementierung.md -t latex -o Bachelorarbeit_Kapitel5.tex
pandoc docs_short/kapitel6_evaluation.md -t latex -o Bachelorarbeit_Kapitel6.tex
pandoc docs_short/kapitel7_diskussion.md -t latex -o Bachelorarbeit_Kapitel7.tex
pandoc docs_short/kapitel8_fazit.md -t latex -o Bachelorarbeit_Kapitel8.tex
pandoc docs_short/interviewleitfaden.md -t latex -o Bachelorarbeit_Appendix.tex
```

### Option 2: Python-basierte Batch-Konvertierung

Erstelle ein Script `convert_chapters.py`:

```python
#!/usr/bin/env python3
import subprocess
import sys

chapters = [
    ("docs_short/kapitel2.md", "Bachelorarbeit_Kapitel2.tex"),
    ("docs_short/kapitel3_StandDerTechnik.md", "Bachelorarbeit_Kapitel3.tex"),
    ("docs_short/kapitel4_systemkonzeption.md", "Bachelorarbeit_Kapitel4.tex"),
    ("docs_short/kapitel5_implementierung.md", "Bachelorarbeit_Kapitel5.tex"),
    ("docs_short/kapitel6_evaluation.md", "Bachelorarbeit_Kapitel6.tex"),
    ("docs_short/kapitel7_diskussion.md", "Bachelorarbeit_Kapitel7.tex"),
    ("docs_short/kapitel8_fazit.md", "Bachelorarbeit_Kapitel8.tex"),
    ("docs_short/interviewleitfaden.md", "Bachelorarbeit_Appendix.tex"),
]

for md_file, tex_file in chapters:
    print(f"Converting {md_file} → {tex_file}...")
    result = subprocess.run(
        ["pandoc", md_file, "-t", "latex", "-o", tex_file],
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        print(f"ERROR: {result.stderr}")
        sys.exit(1)
    print(f"  ✅ {tex_file}")

print("\n✅ All chapters converted successfully!")
```

Ausführen:

```bash
python3 convert_chapters.py
```

## Nächste Schritte nach Konvertierung

### 1. Nachbearbeitung der LaTeX-Dateien

Die Pandoc-Konvertierung erstellt valide LaTeX, benötigt aber ggf. Anpassungen für akademisches Formatting:

```bash
# Beispiel: Titelseite für Kapitel 2 hinzufügen
# In Bachelorarbeit_Kapitel2.tex:
# \chapter{Motivation und Anforderungen}
```

### 2. Aktualisierung von `Bachelorarbeit_Main.tex`

Nach Konvertierung alle Kapitel einbinden. Datei anpassen:

```tex
% IMPORT ALL CHAPTER FILES
\input{Bachelorarbeit_Kapitel1}
\input{Bachelorarbeit_Kapitel2}
\input{Bachelorarbeit_Kapitel3}
\input{Bachelorarbeit_Kapitel4}
\input{Bachelorarbeit_Kapitel5}
\input{Bachelorarbeit_Kapitel6}
\input{Bachelorarbeit_Kapitel7}
\input{Bachelorarbeit_Kapitel8}

% APPENDIX
\appendix
\input{Bachelorarbeit_Appendix}
```

### 3. Literaturverzeichnis konfigurieren

Falls Sie BibTeX verwenden, erstellen Sie `references.bib` und ergänzen Sie in der Präambel:

```tex
\usepackage{biblatex}
\addbibresource{references.bib}
```

### 4. Kompilation

Mit `pdflatex` oder `xelatex`:

```bash
# Mit pdflatex
pdflatex Bachelorarbeit_Main.tex
pdflatex Bachelorarbeit_Main.tex  # Zweimal für TOC & Cross-Refs
makeindex Bachelorarbeit_Main
pdflatex Bachelorarbeit_Main.tex

# Oder mit xelatex (besser für Umlaute)
xelatex Bachelorarbeit_Main.tex
xelatex Bachelorarbeit_Main.tex

# Oder mit latexmk (automatisch)
latexmk -pdf Bachelorarbeit_Main.tex
```

### 5. PDF-Ausgabe

Nach erfolgreicher Kompilation:

```
Bachelorarbeit_Main.pdf  ← Fertige Bachelorarbeit
```

## Vollständige Struktur nach Setup

```
/Users/jonaskimmer/Desktop/liveticker-eintracht/
├── Bachelorarbeit_Main.tex          ← Hauptdatei
├── Bachelorarbeit_Kapitel1.tex      ← ✅ Fertig
├── Bachelorarbeit_Kapitel2.tex      ← Nach Konvertierung
├── Bachelorarbeit_Kapitel3.tex
├── Bachelorarbeit_Kapitel4.tex
├── Bachelorarbeit_Kapitel5.tex
├── Bachelorarbeit_Kapitel6.tex
├── Bachelorarbeit_Kapitel7.tex
├── Bachelorarbeit_Kapitel8.tex
├── Bachelorarbeit_Appendix.tex      ← Interviewleitfaden
├── references.bib                   ← (Literaturverzeichnis)
├── LATEX_SETUP.md                   ← Diese Datei
└── docs_short/                      ← Markdown-Quellen
    ├── kapitel2.md
    ├── kapitel3_StandDerTechnik.md
    ├── kapitel4_systemkonzeption.md
    ├── kapitel5_implementierung.md
    ├── kapitel6_evaluation.md
    ├── kapitel7_diskussion.md
    ├── kapitel8_fazit.md
    ├── interviewleitfaden.md
    └── abstract.md
```

## Tipps für Hochschul-Submission

1. **Formatvorgaben überprüfen**: Viele Hochschulen haben spezifische LaTeX-Templates mit vordefinierten Seitengröße, Schriftype, Ränder
2. **Literaturverzeichnis**: Falls Sie nicht BibTeX nutzen, können Referenzen manuell mit `thebibliography`-Umgebung formatiert werden
3. **Eidesstattliche Erklärung**: Falls erforderlich, als Kapitel vor oder nach dem Titelblatt einfügen
4. **Prüfung auf PDF-Compliance**: Hochschulen benötigen oft PDF/A-1b — mit `--enable-write18` und pdfx-Package
5. **Finale Syntax-Validation**: `pdflatex -halt-on-error` stoppt bei Fehlern

## Troubleshooting

| Problem                     | Lösung                                                             |
| --------------------------- | ------------------------------------------------------------------ |
| `pandoc: command not found` | Pandoc installieren: `brew install pandoc`                         |
| LaTeX-Compile-Fehler        | Prüfe Umlaute & Sonderzeichen — verwende utf8-Package              |
| TOC-Nummerierung falsch     | `pdflatex` dreimal ausführen                                       |
| Bilder nicht eingebunden    | Prüfe Pfade in `\includegraphics{}`                                |
| Bibliography ausstehend     | Ausführen: `bibtex Bachelorarbeit_Main` (zwischen pdflatex-Läufen) |

## Status-Check

Nach Setup sollte folgendes erfolgreich sein:

```bash
# All .tex files exist and are valid
ls -la Bachelorarbeit_*.tex

# Compile cleanly (no errors)
pdflatex -halt-on-error Bachelorarbeit_Main.tex >/dev/null && echo "✅ Compilation successful"

# PDF created
ls -lh Bachelorarbeit_Main.pdf
```

---

## Weitere Ressourcen

- **Pandoc Markdown to LaTeX**: https://pandoc.org/MANUAL.html#converting-markdown
- **KOMA-Script Guide**: https://komascript.de/ (für deutschsprachige Akademisches Schreiben)
- **LaTeX German Typography**: https://en.wikibooks.org/wiki/LaTeX/Localisation#German
- **Overleaf Templates**: https://www.overleaf.com/latex/templates

---

**Letzte Aktualisierung:** April 2026
**Dokumentversion:** 1.0
