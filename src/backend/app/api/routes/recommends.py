from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models import User, Rating, UserInteraction
from app.services.recommendation_adapter import RecommendationDataBuilder, RecommendationResultMapper
from app.services.content_based_service import get_cold_start_recommendations_content_based
from app.services.hybrid_recommendation_service import (
    get_hybrid_recommendations,
    get_watched_based_recommendations,
)

router = APIRouter(prefix="/recommends", tags=["Recommendations"])


class RecommendationResponse:
    """Simple recommendation response model"""
    def __init__(self, movie_id: int, title: str, poster_path: str = None, 
                 vote_average: float = None, predicted_score: float = None):
        self.movie_id = movie_id
        self.title = title
        self.poster_path = poster_path
        self.vote_average = vote_average
        self.predicted_score = predicted_score


@router.get("/me")
def get_recommendations(
    top_n: int = Query(10, ge=1, le=30),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    GET /recommends/me?top_n=10

    """
    try:
        return get_hybrid_recommendations(db, current_user, top_n=top_n)
    except Exception as e:
        print(f"[recommendation] Hybrid pipeline failed: {e}")
        return _get_cold_start_recommendations(db, current_user, top_n)


@router.get("/similar-to-watched")
def get_similar_to_watched(
    top_n: int = Query(10, ge=1, le=30),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    GET /recommends/similar-to-watched?top_n=10

    """
    # Loại bỏ phim đã xem/đánh giá
    watched = db.query(UserInteraction.movie_id).filter(
        UserInteraction.user_id == current_user.id
    ).all()
    rated = db.query(Rating.movie_id).filter(
        Rating.user_id == current_user.id
    ).all()
    excluded = list({w[0] for w in watched} | {r[0] for r in rated})

    recs = get_watched_based_recommendations(
        db, current_user.id, top_n=top_n, exclude_movie_ids=excluded
    )

    # Fallback to cold-start nếu user chưa có watch history
    if not recs:
        preferred_genre_ids = [g.id for g in current_user.preferred_genres]
        recs = get_cold_start_recommendations_content_based(
            db, preferred_genre_ids, exclude_movie_ids=excluded, top_n=top_n
        )
        return {
            "recommendations": recs,
            "strategy": "cold_start",
            "reason": "User has no watch history yet",
        }

    return {
        "recommendations": recs,
        "strategy": "watched_based",
        "seed_count": len(set(w[0] for w in watched) | {r[0] for r in rated}),
    }


def _get_cold_start_recommendations(db: Session, user: User, top_n: int) -> dict:
    preferred_genre_ids = [g.id for g in user.preferred_genres]

    watched = db.query(UserInteraction.movie_id).filter(
        UserInteraction.user_id == user.id
    ).all()
    rated = db.query(Rating.movie_id).filter(
        Rating.user_id == user.id
    ).all()
    excluded_movie_ids = [w[0] for w in watched] + [r[0] for r in rated]

    recommendations = get_cold_start_recommendations_content_based(
        db,
        preferred_genre_ids,
        exclude_movie_ids=excluded_movie_ids,
        top_n=top_n,
    )
    return {"recommendations": recommendations, "strategy": "cold_start"}
