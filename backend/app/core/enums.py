"""
Domain Enumerations
===================
Zentrale Enums für Ticker-Einträge – werden in Models und Schemas gemeinsam genutzt.
Separation verhindert zirkuläre Imports zwischen models/ und schemas/.
"""

from enum import Enum


class TickerStatus(str, Enum):
    draft = "draft"
    published = "published"
    rejected = "rejected"
    deleted = "deleted"


class TickerSource(str, Enum):
    ai = "ai"
    manual = "manual"


class MediaQueueStatus(str, Enum):
    pending = "pending"
    published = "published"
