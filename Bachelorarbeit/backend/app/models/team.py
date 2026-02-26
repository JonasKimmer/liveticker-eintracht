# app/models/team.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from app.core.database import Base


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(Integer, nullable=True, index=True, unique=True)
    name = Column(String(100), nullable=False)
    short_name = Column(String(50), nullable=True)  # "Eintracht" / "shortName"
    code = Column(String(10), nullable=True)  # "EIN" / "MUN"
    logo_url = Column(String(255), nullable=True)
    country = Column(String(100), nullable=True)
    founded = Column(Integer, nullable=True)
    venue_name = Column(String(100), nullable=True)
    venue_capacity = Column(Integer, nullable=True)
    is_partner = Column(Boolean, default=False)  # Tenant-Kennzeichnung
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<Team(id={self.id}, name='{self.name}')>"
