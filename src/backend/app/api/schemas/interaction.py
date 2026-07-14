from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime



class WatchMovieResponse(BaseModel):
    movie_id: int
    title: str
    youtube_trailer_id: Optional[str]
    added_to_watchlist: bool
    watchlist_message: str

    class Config:
        from_attributes = True


class RatingRequest(BaseModel):
    movie_id: int
    rating_score: float = Field(..., ge=0.5, le=5.0)
    review_text: Optional[str] = Field(None, max_length=2000)


class RatingResponse(BaseModel):
    id: int
    movie_id: int
    rating_score: float
    review_text: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReviewResponse(BaseModel):
    """A review enriched with the author's public info."""
    id: int
    movie_id: int
    rating_score: float
    review_text: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    user_id: str
    user_name: str
    user_email: str

    class Config:
        from_attributes = True


class PaginatedReviewsResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: List[ReviewResponse]
    average_score: Optional[float] = None



class WatchlistItemResponse(BaseModel):
    movie_id: int
    added_at: datetime

    # Nested movie details
    movie_title: Optional[str] = None
    poster_path: Optional[str] = None
    vote_average: Optional[float] = None

    class Config:
        from_attributes = True
