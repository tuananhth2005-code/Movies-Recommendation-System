from sqlalchemy import Column, Integer, String, Text, Date, Numeric
from sqlalchemy.dialects.postgresql import ARRAY, DOUBLE_PRECISION
from sqlalchemy.orm import relationship
from .base import Base

class Genre(Base):
    __tablename__ = 'genres'

    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)

    users = relationship("User", secondary="user_genres", back_populates="preferred_genres")
    movies = relationship("Movie", secondary="movie_genres", back_populates="genres")

class Movie(Base):
    __tablename__ = 'movies'

    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    overview = Column(Text)
    release_date = Column(Date)
    poster_path = Column(String(255))
    youtube_trailer_id = Column(String(50))
    vote_average = Column(Numeric(3, 1), default=0.0)
    vote_count = Column(Integer, default=0)
    
    # Trả lại ARRAY(DOUBLE_PRECISION) cho PostgreSQL
    embedding = Column(ARRAY(DOUBLE_PRECISION))

    genres = relationship("Genre", secondary="movie_genres", back_populates="movies")
    ratings = relationship("Rating", back_populates="movie", cascade="all, delete-orphan")
    watchlists = relationship("Watchlist", back_populates="movie", cascade="all, delete-orphan")
    interactions = relationship("UserInteraction", back_populates="movie", cascade="all, delete-orphan")
