from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.api.schemas.interaction import (
    RatingRequest,
    RatingResponse,
    PaginatedReviewsResponse,
)
from app.models import User
from app.services import rating_service

router = APIRouter(prefix="/ratings", tags=["Ratings"])


@router.post("", response_model=RatingResponse, status_code=200)
def rate_movie(
    payload: RatingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    POST /ratings
    """
    rating = rating_service.upsert_rating(db, user_id=current_user.id, payload=payload)
    return RatingResponse.model_validate(rating)


@router.get("/movie/{movie_id}", response_model=PaginatedReviewsResponse)
def get_movie_reviews(
    movie_id: int,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """GET /ratings/movie/{movie_id} — Public list of reviews for a movie."""
    total, reviews, avg_score = rating_service.get_movie_reviews(db, movie_id, limit, offset)
    return PaginatedReviewsResponse(
        total=total,
        limit=limit,
        offset=offset,
        items=reviews,
        average_score=avg_score,
    )


@router.get("/movie/{movie_id}/me", response_model=RatingResponse)
def get_my_review(
    movie_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """GET /ratings/movie/{movie_id}/me — Current user's review for a movie."""
    rating = rating_service.get_user_rating_for_movie(db, current_user.id, movie_id)
    if not rating:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You have not reviewed this movie yet",
        )
    return RatingResponse.model_validate(rating)


@router.delete("/{rating_id}", status_code=200)
def delete_review(
    rating_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """DELETE /ratings/{id} — User deletes their own review."""
    rating_service.delete_review(db, current_user.id, rating_id)
    return {"message": "Review deleted successfully"}
