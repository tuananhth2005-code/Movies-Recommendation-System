from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime


class GenreResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class MovieResponse(BaseModel):
    id: int
    title: str
    overview: Optional[str]
    release_date: Optional[date]
    poster_path: Optional[str]
    youtube_trailer_id: Optional[str]
    vote_average: Optional[float]
    vote_count: Optional[int]
    genres: List[GenreResponse] = []

    class Config:
        from_attributes = True


class PaginatedMoviesResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: List[MovieResponse]


class MovieCreateRequest(BaseModel):
    """Schema for creating a new movie (admin only)."""
    title: str = Field(..., min_length=1, max_length=255)
    overview: Optional[str] = None
    release_date: Optional[date] = None
    poster_path: Optional[str] = None
    youtube_trailer_id: Optional[str] = None
    vote_average: Optional[float] = Field(default=0.0, ge=0.0, le=10.0)
    vote_count: Optional[int] = Field(default=0, ge=0)
    genre_ids: List[int] = Field(default_factory=list)


class MovieUpdateRequest(BaseModel):
    """Schema for partial update of a movie (admin only)."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    overview: Optional[str] = None
    release_date: Optional[date] = None
    poster_path: Optional[str] = None
    youtube_trailer_id: Optional[str] = None
    vote_average: Optional[float] = Field(None, ge=0.0, le=10.0)
    vote_count: Optional[int] = Field(None, ge=0)
    genre_ids: Optional[List[int]] = None


class MovieDeleteResponse(BaseModel):
    message: str
    movie_id: int
