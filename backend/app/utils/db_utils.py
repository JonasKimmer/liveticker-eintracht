"""
Gemeinsame Hilfsfunktionen für Repository-Schichten.
"""


def str_or_none(value: object) -> str | None:
    """Konvertiert einen Wert zu str oder gibt None zurück wenn falsy."""
    return str(value) if value else None
