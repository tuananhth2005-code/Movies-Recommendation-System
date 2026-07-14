from typing import Optional, List, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from fastapi import HTTPException, status

from app.models import Movie, Genre
from app.models.associations import MovieGenre
from app.api.schemas.movie import MovieCreateRequest, MovieUpdateRequest


def get_all_movies(
    db: Session,
    limit: int = 20,
    offset: int = 0,
    sort_by: str = "rating",
) -> Tuple[int, List[Movie]]:
   
    query = db.query(Movie).options(joinedload(Movie.genres))
    
    if sort_by == "release_date":
        query = query.order_by(Movie.release_date.desc())
    elif sort_by == "title":
        query = query.order_by(Movie.title.asc())
    else: 
        query = query.order_by(Movie.vote_average.desc())
    
    total = query.count()
    movies = query.offset(offset).limit(limit).all()
    return total, movies


def get_movies_by_genre(
    db: Session,
    genre_id: int,
    limit: int = 20,
    offset: int = 0,
    sort_by: str = "rating",
) -> Tuple[int, List[Movie]]:
    query = (
        db.query(Movie)
        .options(joinedload(Movie.genres))
        .join(MovieGenre, Movie.id == MovieGenre.movie_id)
        .filter(MovieGenre.genre_id == genre_id)
    )

    if sort_by == "release_date":
        query = query.order_by(Movie.release_date.desc())
    elif sort_by == "title":
        query = query.order_by(Movie.title.asc())
    else:
        query = query.order_by(Movie.vote_average.desc())

    total = query.count()
    movies = query.offset(offset).limit(limit).all()
    return total, movies


def get_movies(
    db: Session,
    limit: int = 20,
    offset: int = 0,
    genre_id: Optional[int] = None,
) -> Tuple[int, List[Movie]]:
    query = db.query(Movie).options(joinedload(Movie.genres))

    if genre_id is not None:
        query = query.join(MovieGenre, Movie.id == MovieGenre.movie_id).filter(
            MovieGenre.genre_id == genre_id
        )

    total = query.count()
    movies = query.order_by(Movie.vote_average.desc()).offset(offset).limit(limit).all()
    return total, movies


def _next_movie_id(db: Session) -> int:
    """Compute the next movie id. Movies use TMDB-style integer ids without
    a DB sequence, so we derive the next id from the current max."""
    max_id = db.query(func.max(Movie.id)).scalar()
    return (max_id or 0) + 1


def create_movie(db: Session, data: MovieCreateRequest) -> Movie:
    """Create a new movie and attach genres (admin only)."""
    movie = Movie(
        id=_next_movie_id(db),
        title=data.title,
        overview=data.overview,
        release_date=data.release_date,
        poster_path=data.poster_path,
        youtube_trailer_id=data.youtube_trailer_id,
        vote_average=data.vote_average,
        vote_count=data.vote_count,
    )
    db.add(movie)
    db.flush()  # ensure movie.id is settled before linking genres

    if data.genre_ids:
        genres = db.query(Genre).filter(Genre.id.in_(data.genre_ids)).all()
        movie.genres = genres

    db.commit()
    db.refresh(movie)
    return movie


def update_movie(db: Session, movie_id: int, data: MovieUpdateRequest) -> Movie:
    """Partial update of a movie (admin only)."""
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movie not found")

    update_data = data.model_dump(exclude_unset=True)
    genre_ids = update_data.pop("genre_ids", None)

    for field, value in update_data.items():
        setattr(movie, field, value)

    if genre_ids is not None:
        genres = db.query(Genre).filter(Genre.id.in_(genre_ids)).all()
        movie.genres = genres

    db.commit()
    db.refresh(movie)
    return movie


def delete_movie(db: Session, movie_id: int) -> None:
    """Delete a movie by id (admin only)."""
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movie not found")
    db.delete(movie)
    db.commit()


def get_movie_by_id(db: Session, movie_id: int) -> Optional[Movie]:
    return (
        db.query(Movie)
        .options(joinedload(Movie.genres))
        .filter(Movie.id == movie_id)
        .first()
    )


def search_movies(
    db: Session,
    q: str,
    limit: int = 20,
    offset: int = 0,
) -> Tuple[int, List[Movie]]:
    query = (
        db.query(Movie)
        .options(joinedload(Movie.genres))
        .filter(Movie.title.ilike(f"%{q}%"))
    )
    total = query.count()
    movies = query.order_by(Movie.vote_average.desc()).offset(offset).limit(limit).all()
    return total, movies
