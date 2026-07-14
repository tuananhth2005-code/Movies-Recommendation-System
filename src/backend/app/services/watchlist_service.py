from typing import List, Dict, Any
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
import uuid

from app.models import Watchlist, Movie
from app.models.interaction import UserInteraction
from app.models.enums import ActionEnum


def add_to_watchlist(db: Session, user_id: uuid.UUID, movie_id: int) -> Watchlist:
    
    # Verify movie exists
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Movie with id={movie_id} not found",
        )

    existing = (
        db.query(Watchlist)
        .filter(Watchlist.user_id == user_id, Watchlist.movie_id == movie_id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Movie is already in your watchlist",
        )

    item = Watchlist(user_id=user_id, movie_id=movie_id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def remove_from_watchlist(db: Session, user_id: uuid.UUID, movie_id: int) -> None:
    item = (
        db.query(Watchlist)
        .filter(Watchlist.user_id == user_id, Watchlist.movie_id == movie_id)
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Movie not found in your watchlist",
        )
    db.delete(item)
    db.commit()


def get_watchlist(db: Session, user_id: uuid.UUID) -> List[Watchlist]:

    return (
        db.query(Watchlist)
        .options(joinedload(Watchlist.movie))
        .filter(Watchlist.user_id == user_id)
        .order_by(Watchlist.added_at.desc())
        .all()
    )


def watch_movie(db: Session, user_id: uuid.UUID, movie_id: int) -> Dict[str, Any]:

    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Movie with id={movie_id} not found",
        )

    # Log interaction
    interaction = UserInteraction(
        user_id=user_id,
        movie_id=movie_id,
        action_type=ActionEnum.watch,
    )
    db.add(interaction)

    # Add to watchlist (idempotent – no error if already exists)
    existing = (
        db.query(Watchlist)
        .filter(Watchlist.user_id == user_id, Watchlist.movie_id == movie_id)
        .first()
    )
    if existing:
        added = False
        msg = "Movie was already in your watchlist"
    else:
        db.add(Watchlist(user_id=user_id, movie_id=movie_id))
        added = True
        msg = "Movie added to watchlist"

    db.commit()

    return {
        "movie_id": movie.id,
        "title": movie.title,
        "youtube_trailer_id": movie.youtube_trailer_id,
        "added_to_watchlist": added,
        "watchlist_message": msg,
    }
