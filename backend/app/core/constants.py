"""
Domain Constants
================
Single source of truth for phase mappings used across the application.
"""

from typing import Optional

# Maps synthetic event type strings to their corresponding ticker phase.
# Must be kept in sync with SyntheticEvent types produced by n8n workflows.
SYNTHETIC_EVENT_PHASE_MAP: dict[str, str] = {
    "match_kickoff":        "FirstHalf",
    "match_halftime":       "FirstHalfBreak",
    "match_second_half":    "SecondHalf",
    "match_fulltime":       "After",
    "match_extra_kickoff":  "ExtraFirstHalf",
    "match_extra_halftime": "ExtraBreak",
    "match_penalties":      "PenaltyShootout",
    "match_fulltime_aet":   "After",
    "match_fulltime_pen":   "After",
}


# Maps Football-API live status codes (short) to internal ticker phase names.
FOOTBALL_API_PHASE_MAP: dict[str, str] = {
    "1H":  "FirstHalf",
    "2H":  "SecondHalf",
    "HT":  "FirstHalfBreak",
    "ET":  "SecondHalf",      # extra time – treat as second half for display
    "BT":  "FirstHalfBreak",  # break before extra time
    "P":   "SecondHalf",
    "FT":  "FullTime",
    "AET": "FullTime",
    "PEN": "FullTime",
}


def resolve_phase(event_type: str) -> Optional[str]:
    """Resolve a synthetic event type string to its ticker phase.

    Args:
        event_type: The synthetic event type (e.g. "match_kickoff", "pre_match_info").

    Returns:
        The corresponding phase string, or None if the event type is unknown.
    """
    if event_type.startswith("pre_match"):
        return "Before"
    if event_type.startswith("post_match"):
        return "After"
    return SYNTHETIC_EVENT_PHASE_MAP.get(event_type)
