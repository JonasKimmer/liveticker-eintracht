"""
SQLAlchemy Model für UserFavorites (Favoriten-Teams).
"""

from sqlalchemy import Column, Integer, ForeignKey, DateTime, func, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


class UserFavorite(Base):
    """User-Favoriten-Teams."""

    __tablename__ = "user_favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)  # Später: ForeignKey("users.id")
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Unique: Ein User kann ein Team nur einmal favorisieren
    __table_args__ = (
        UniqueConstraint("user_id", "team_id", name="unique_user_team_favorite"),
    )

    # Relationships
    team = relationship("Team", backref="favorited_by")

    def __repr__(self):
        return f"<UserFavorite(user={self.user_id}, team={self.team_id})>"
