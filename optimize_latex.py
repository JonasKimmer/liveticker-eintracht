#!/usr/bin/env python3
"""
Optimize Pandoc-generated LaTeX for Overleaf compilation.
- Remove minted/highlighting environments
- Remove shaded blocks
- Replace with simple verbatim
"""

import sys
import re
from pathlib import Path


def optimize_latex(content):
    """Remove heavy Pandoc packages and replace with simpler alternatives."""

    # Remove minted environments and replace with verbatim
    content = re.sub(
        r"\\begin\{minted\}(\[.*?\])?\{.*?\}", r"\\begin{verbatim}", content
    )
    content = content.replace(r"\end{minted}", r"\end{verbatim}")

    # Remove Highlighting environments
    content = re.sub(
        r"\\begin\{Highlighting\}(\[.*?\])?", r"\\begin{verbatim}", content
    )
    content = content.replace(r"\end{Highlighting}", r"\end{verbatim}")

    # Remove Shaded blocks (keep only text, remove formatting)
    content = re.sub(
        r"\\begin\{Shaded\}.*?\\end\{Shaded\}", "", content, flags=re.DOTALL
    )

    # Remove tightlist commands
    content = content.replace(r"\tightlist", "")

    # Simplify code formatting - replace lstinline with texttt
    content = re.sub(r"\\lstinline\{(.*?)\}", r"\\texttt{\1}", content)

    # Remove hyperref (just keep link text)
    content = re.sub(r"\\href\{(.*?)\}\{(.*?)\}", r"\2", content)

    return content


def main():
    project_dir = Path("/Users/jonaskimmer/Desktop/liveticker-eintracht")

    files_to_optimize = list(project_dir.glob("Bachelorarbeit_Kapitel*.tex")) + list(
        project_dir.glob("Bachelorarbeit_Appendix.tex")
    )

    for filepath in sorted(files_to_optimize):
        print(f"Optimizing: {filepath.name}")

        content = filepath.read_text(encoding="utf-8")
        optimized = optimize_latex(content)

        filepath.write_text(optimized, encoding="utf-8")

        # Statistics
        orig_lines = content.count("\n")
        opt_lines = optimized.count("\n")
        reduction = (
            ((orig_lines - opt_lines) / orig_lines * 100) if orig_lines > 0 else 0
        )

        print(
            f"  ✅ {filepath.name}: {orig_lines} → {opt_lines} lines (-{reduction:.1f}%)"
        )

    print("\n✅ All files optimized!")


if __name__ == "__main__":
    main()
