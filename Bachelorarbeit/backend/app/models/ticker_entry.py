# ----------------------------------------
# app/models/ticker_entry.py
# ----------------------------------------
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class TickerEntry(Base):
    __tablename__ = "ticker_entries"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(
        Integer,
        ForeignKey("matches.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_id = Column(
        Integer, ForeignKey("events.id", ondelete="SET NULL"), nullable=True
    )
    synthetic_event_id = Column(
        Integer, ForeignKey("synthetic_events.id", ondelete="SET NULL"), nullable=True
    )
    minute = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    icon = Column(String(10), nullable=True)
    status = Column(String(20), default="draft", nullable=False)  # draft | published
    mode = Column(String(20), nullable=False)
    style = Column(String(20), nullable=True)
    language = Column(String(5), default="de")
    llm_model = Column(String(50), nullable=True)
    prompt_used = Column(Text, nullable=True)
    approved_by = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    published_at = Column(DateTime(timezone=True), nullable=True)

    match = relationship("Match", backref="ticker_entries")
    event = relationship("Event", backref="ticker_entries")
    synthetic_event = relationship("SyntheticEvent", backref="ticker_entries")

    def __repr__(self):
        return (
            f"<TickerEntry(id={self.id}, status='{self.status}', minute={self.minute})>"
        )
