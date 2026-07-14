from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user, get_admin_user
from app.api.schemas.auth import GenrePreferenceResponse
from app.api.schemas.movie import (
    MovieResponse,
    PaginatedMoviesResponse,
    MovieCreateRequest,
    MovieUpdateRequest,
    MovieDeleteResponse,
)
from app.api.schemas.interaction import WatchMovieResponse
from app.models import User, Genre
from app.services import movie_service, watchlist_service

router = APIRouter(prefix="/movies", tags=["Movies"])


@router.get("/genres")
def list_genres(db: Session = Depends(get_db)):
    """
    GET /movies/genres
    Return all genres for onboarding and filters.
    """
    genres = db.query(Genre).order_by(Genre.id.asc()).all()
    return {
        "genres": [GenrePreferenceResponse.model_validate(genre) for genre in genres],
    }


@router.get("", response_model=PaginatedMoviesResponse)
def list_movies(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    genre: Optional[int] = Query(None, description="Filter by genre ID"),
    db: Session = Depends(get_db),
):
    """
    GET /moviess
    """
    total, movies = movie_service.get_movies(db, limit=limit, offset=offset, genre_id=genre)
    return PaginatedMoviesResponse(
        total=total,
        limit=limit,
        offset=offset,
        items=[MovieResponse.model_validate(m) for m in movies],
    )


@router.get("/by-genre/{genre_id}", response_model=PaginatedMoviesResponse)
def get_movies_by_genre(
    genre_id: int,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """
    GET /movies/by-genre/{genre_id}
    """
    total, movies = movie_service.get_movies(db, limit=limit, offset=offset, genre_id=genre_id)
    if not movies and total == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No movies found for genre ID {genre_id}"
        )
    return PaginatedMoviesResponse(
        total=total,
        limit=limit,
        offset=offset,
        items=[MovieResponse.model_validate(m) for m in movies],
    )


@router.get("/genres/{genre_id}/movies", response_model=PaginatedMoviesResponse)
def get_all_movies_of_genre(
    genre_id: int,
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("rating", description="Sort by: rating, release_date, title"),
    db: Session = Depends(get_db),
):
    """
    GET /movies/genres/{genre_id}/movies
    """
    genre_exists = db.query(Genre.id).filter(Genre.id == genre_id).first()
    if not genre_exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Genre not found")

    total, movies = movie_service.get_movies_by_genre(
        db,
        genre_id=genre_id,
        limit=limit,
        offset=offset,
        sort_by=sort_by,
    )
    return PaginatedMoviesResponse(
        total=total,
        limit=limit,
        offset=offset,
        items=[MovieResponse.model_validate(m) for m in movies],
    )


@router.get("/all", response_model=PaginatedMoviesResponse)
def get_all_movies(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("rating", description="Sort by: rating, release_date, title"),
    db: Session = Depends(get_db),
):
    """
    GET /movies/all
    """
    total, movies = movie_service.get_all_movies(db, limit=limit, offset=offset, sort_by=sort_by)
    return PaginatedMoviesResponse(
        total=total,
        limit=limit,
        offset=offset,
        items=[MovieResponse.model_validate(m) for m in movies],
    )


@router.get("/search", response_model=PaginatedMoviesResponse)
def search_movies(
    q: str = Query(..., min_length=1, description="Search keyword"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """
    GET /movies/search?q=batman
    """
    total, movies = movie_service.search_movies(db, q=q, limit=limit, offset=offset)
    return PaginatedMoviesResponse(
        total=total,
        limit=limit,
        offset=offset,
        items=[MovieResponse.model_validate(m) for m in movies],
    )


@router.post("/{movie_id}/watch", response_model=WatchMovieResponse)
def watch_movie(
    movie_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    POST /movies/{movie_id}/watch
    """
    result = watchlist_service.watch_movie(db, user_id=current_user.id, movie_id=movie_id)
    return WatchMovieResponse(**result)


@router.get("/{movie_id}", response_model=MovieResponse)
def get_movie(movie_id: int, db: Session = Depends(get_db)):
    """
    GET /movies/{id}
    """
    movie = movie_service.get_movie_by_id(db, movie_id)
    if not movie:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movie not found")
    return MovieResponse.model_validate(movie)


# ── Admin CRUD ────────────────────────────────────────────────────────────────
@router.post("", response_model=MovieResponse, status_code=status.HTTP_201_CREATED)
def create_movie(
    payload: MovieCreateRequest,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """POST /movies — Admin creates a new movie."""
    movie = movie_service.create_movie(db, payload)
    return MovieResponse.model_validate(movie)


@router.put("/{movie_id}", response_model=MovieResponse)
def update_movie(
    movie_id: int,
    payload: MovieUpdateRequest,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """PUT /movies/{id} — Admin updates a movie."""
    movie = movie_service.update_movie(db, movie_id, payload)
    return MovieResponse.model_validate(movie)


@router.delete("/{movie_id}", response_model=MovieDeleteResponse)
def delete_movie(
    movie_id: int,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """DELETE /movies/{id} — Admin deletes a movie."""
    movie_service.delete_movie(db, movie_id)
    return MovieDeleteResponse(message="Movie deleted successfully", movie_id=movie_id)
