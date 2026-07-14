from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from .base import Base

class UserGenre(Base):
    __tablename__ = 'user_genres'

    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    genre_id = Column(Integer, ForeignKey('genres.id', ondelete='CASCADE'), primary_key=True)

class MovieGenre(Base):
    __tablename__ = 'movie_genres'

    movie_id = Column(Integer, ForeignKey('movies.id', ondelete='CASCADE'), primary_key=True)
    genre_id = Column(Integer, ForeignKey('genres.id', ondelete='CASCADE'), primary_key=True)
