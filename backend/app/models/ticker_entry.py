from sqlalchemy import Column, Enum as SAEnum, Index, Integer, String, Text, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.core.enums import TickerSource, TickerStatus


class TickerEntry(Base):
    __tablename__ = "ticker_entries"

    id = Column(Integer, primary_key=True)
    match_id = Column(
        Integer, ForeignKey("matches.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_id = Column(
        Integer, ForeignKey("events.id", ondelete="SET NULL"), nullable=True
    )
    synthetic_event_id = Column(
        Integer, ForeignKey("synthetic_events.id", ondelete="SET NULL"), nullable=True
    )
    text = Column(Text, nullable=False)
    style = Column(String(50), nullable=True)
    icon = Column(String(50), nullable=True)
    llm_model = Column(String(100), nullable=True)
    status = Column(
        SAEnum(TickerStatus, name="ticker_status", native_enum=False),
        nullable=False,
        default=TickerStatus.draft,
    )
    source = Column(
        SAEnum(TickerSource, name="ticker_source", native_enum=False),
        nullable=False,
        default=TickerSource.ai,
    )
    minute = Column(Integer, nullable=True)
    phase = Column(String(50), nullable=True)
    image_url = Column(Text, nullable=True)
    video_url = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    match = relationship("Match", back_populates="ticker_entries")
    event = relationship("Event", back_populates="ticker_entries")

    __table_args__ = (
        # Häufigste Query: alle publizierten Einträge eines Spiels
        Index("ix_ticker_match_status", "match_id", "status"),
        # Phase-Filter (get_by_phase, Dedup-Check)
        Index("ix_ticker_match_phase", "match_id", "phase"),
        # Lookup per Event-ID (generate_for_event dedup-check)
        Index("ix_ticker_event_id", "event_id"),
    )
