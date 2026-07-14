from sqlalchemy import Column, Integer, BigInteger, Numeric, DateTime, Text, ForeignKey, Enum, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import Base
from .enums import ActionEnum

class Rating(Base):
    __tablename__ = 'ratings'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'))
    movie_id = Column(Integer, ForeignKey('movies.id', ondelete='CASCADE'))
    rating_score = Column(Numeric(2, 1))
    review_text = Column(Text, nullable=True)
    updated_at = Column(DateTime, onupdate=func.current_timestamp())
    created_at = Column(DateTime, server_default=func.current_timestamp())

    __table_args__ = (
        UniqueConstraint('user_id', 'movie_id', name='uq_user_movie_rating'),
        CheckConstraint('rating_score >= 0.5 AND rating_score <= 5.0', name='chk_rating_score')
    )

    user = relationship("User", back_populates="ratings")
    movie = relationship("Movie", back_populates="ratings")

class Watchlist(Base):
    __tablename__ = 'watchlists'

    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    movie_id = Column(Integer, ForeignKey('movies.id', ondelete='CASCADE'), primary_key=True)
    added_at = Column(DateTime, server_default=func.current_timestamp())

    user = relationship("User", back_populates="watchlists")
    movie = relationship("Movie", back_populates="watchlists")

class UserInteraction(Base):
    __tablename__ = 'user_interactions'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'))
    movie_id = Column(Integer, ForeignKey('movies.id', ondelete='CASCADE'))
    action_type = Column(Enum(ActionEnum, name='action_enum', create_type=False))
    created_at = Column(DateTime, server_default=func.current_timestamp())

    user = relationship("User", back_populates="interactions")
    movie = relationship("Movie", back_populates="interactions")
