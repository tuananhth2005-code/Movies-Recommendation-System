from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
import uuid

from app.models import Rating, Movie, User
from app.api.schemas.interaction import RatingRequest


def upsert_rating(db: Session, user_id: uuid.UUID, payload: RatingRequest) -> Rating:
    """
    Upsert logic:
    - If the user already rated this movie → UPDATE rating_score.
    - Otherwise → INSERT new rating.
    """
    # Verify movie exists
    movie = db.query(Movie).filter(Movie.id == payload.movie_id).first()
    if not movie:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Movie with id={payload.movie_id} not found",
        )

    existing = (
        db.query(Rating)
        .filter(Rating.user_id == user_id, Rating.movie_id == payload.movie_id)
        .first()
    )

    if existing:
        # UPDATE
        existing.rating_score = payload.rating_score
        if payload.review_text is not None:
            existing.review_text = payload.review_text
        db.commit()
        db.refresh(existing)
        return existing
    else:
        # INSERT
        new_rating = Rating(
            user_id=user_id,
            movie_id=payload.movie_id,
            rating_score=payload.rating_score,
            review_text=payload.review_text,
        )
        db.add(new_rating)
        db.commit()
        db.refresh(new_rating)
        return new_rating


def get_movie_reviews(
    db: Session,
    movie_id: int,
    limit: int = 20,
    offset: int = 0,
) -> tuple:
    """Return (total, reviews, average_score) for a movie, enriched with author info."""
    query = (
        db.query(Rating, User)
        .join(User, Rating.user_id == User.id)
        .filter(Rating.movie_id == movie_id)
        .order_by(Rating.created_at.desc())
    )

    total = query.count()

    avg_score = (
        db.query(func.avg(Rating.rating_score))
        .filter(Rating.movie_id == movie_id)
        .scalar()
    )

    results = query.offset(offset).limit(limit).all()

    reviews = []
    for rating, user in results:
        reviews.append({
            "id": rating.id,
            "movie_id": rating.movie_id,
            "rating_score": float(rating.rating_score),
            "review_text": rating.review_text,
            "created_at": rating.created_at,
            "updated_at": getattr(rating, "updated_at", None),
            "user_id": str(user.id),
            "user_name": user.full_name or user.email.split("@")[0],
            "user_email": user.email,
        })

    return total, reviews, float(avg_score) if avg_score is not None else None


def delete_review(db: Session, user_id: uuid.UUID, rating_id: int) -> None:
    """Delete a review. A user can only delete their own review."""
    rating = db.query(Rating).filter(Rating.id == rating_id).first()
    if not rating:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    if str(rating.user_id) != str(user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own review",
        )
    db.delete(rating)
    db.commit()


def get_user_rating_for_movie(db: Session, user_id: uuid.UUID, movie_id: int):
    """Return the current user's rating/review for a specific movie, if any."""
    return (
        db.query(Rating)
        .filter(Rating.user_id == user_id, Rating.movie_id == movie_id)
        .first()
    )
