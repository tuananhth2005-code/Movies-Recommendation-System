from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.api.schemas.interaction import WatchlistItemResponse
from app.models import User
from app.services import watchlist_service

router = APIRouter(prefix="/watchlist", tags=["Watchlist"])


@router.post("", status_code=status.HTTP_201_CREATED)
def add_to_watchlist(
    movie_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    POST /watchlist?movie_id=1
    """
    item = watchlist_service.add_to_watchlist(db, user_id=current_user.id, movie_id=movie_id)
    return {"message": "Movie added to watchlist", "movie_id": item.movie_id}


@router.delete("/{movie_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_watchlist(
    movie_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    DELETE /watchlist/{movie_id}
    """
    watchlist_service.remove_from_watchlist(db, user_id=current_user.id, movie_id=movie_id)


@router.get("", response_model=List[WatchlistItemResponse])
def get_watchlist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    GET /watchlist
    """
    items = watchlist_service.get_watchlist(db, user_id=current_user.id)
    result = []
    for item in items:
        result.append(
            WatchlistItemResponse(
                movie_id=item.movie_id,
                added_at=item.added_at,
                movie_title=item.movie.title if item.movie else None,
                poster_path=item.movie.poster_path if item.movie else None,
                vote_average=float(item.movie.vote_average) if item.movie and item.movie.vote_average else None,
            )
        )
    return result
