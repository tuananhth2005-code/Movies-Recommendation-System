"""
Content-Based Filtering Service

For cold-start (new users without ratings/watch history):
- Recommend movies similar to preferred genres
- Rank by popularity (vote_average)
- Optional: semantic similarity using embeddings
"""

from typing import List, Dict, Optional
import numpy as np
from sqlalchemy.orm import Session

from app.models import Movie, Genre
from app.models.associations import MovieGenre


def get_cold_start_recommendations_content_based(
    db: Session,
    preferred_genre_ids: List[int],
    exclude_movie_ids: List[int] = None,
    top_n: int = 5,
) -> List[Dict]:
    if exclude_movie_ids is None:
        exclude_movie_ids = []

    if not preferred_genre_ids:
        
        return get_top_rated_movies(db, exclude_movie_ids, top_n)

    query = (
        db.query(Movie)
        .join(MovieGenre, Movie.id == MovieGenre.movie_id)
        .filter(MovieGenre.genre_id.in_(preferred_genre_ids))
    )

    # Exclude watched/rated
    if exclude_movie_ids:
        query = query.filter(Movie.id.notin_(exclude_movie_ids))

    movies = (
        query
        .order_by(Movie.vote_average.desc(), Movie.vote_count.desc())
        .limit(top_n * 2)  # Fetch extra for diversity
        .all()
    )

    
    result = []
    genre_counts = {}

    for movie in movies:
        # Count genres in result so far
        movie_genres = [g.id for g in movie.genres]
        has_dominant_genre = False

        for genre_id in movie_genres:
            count = genre_counts.get(genre_id, 0)
            if count >= 2:  
                has_dominant_genre = True
                break

        # Add movie if it adds diversity
        if not has_dominant_genre or len(result) < top_n:
            result.append({
                "movie_id": movie.id,
                "title": movie.title,
                "poster_path": movie.poster_path,
                "vote_average": float(movie.vote_average) if movie.vote_average else None,
                "predicted_score": None,  
            })

            # Update genre counts
            for genre_id in movie_genres:
                genre_counts[genre_id] = genre_counts.get(genre_id, 0) + 1

        if len(result) >= top_n:
            break

    return result


def get_top_rated_movies(
    db: Session,
    exclude_movie_ids: List[int] = None,
    top_n: int = 5,
) -> List[Dict]:
    if exclude_movie_ids is None:
        exclude_movie_ids = []

    query = db.query(Movie)
    if exclude_movie_ids:
        query = query.filter(Movie.id.notin_(exclude_movie_ids))

    movies = (
        query
        .order_by(Movie.vote_average.desc(), Movie.vote_count.desc())
        .limit(top_n)
        .all()
    )

    return [
        {
            "movie_id": m.id,
            "title": m.title,
            "poster_path": m.poster_path,
            "vote_average": float(m.vote_average) if m.vote_average else None,
            "predicted_score": None,
        }
        for m in movies
    ]


def get_genre_similarity_matrix(db: Session) -> np.ndarray:
    movies = db.query(Movie).order_by(Movie.id.asc()).all()
    n_movies = len(movies)

    # Build one-hot genre vectors
    all_genres = db.query(Genre).all()
    genre_id_to_idx = {g.id: i for i, g in enumerate(all_genres)}
    n_genres = len(all_genres)

    genre_vectors = []
    for movie in movies:
        vec = np.zeros(n_genres)
        for genre in movie.genres:
            vec[genre_id_to_idx[genre.id]] = 1.0
        genre_vectors.append(vec)

    genre_vectors = np.array(genre_vectors)

    # Compute cosine similarity
    from sklearn.metrics.pairwise import cosine_similarity
    similarity = cosine_similarity(genre_vectors)

    return similarity


def get_similar_movies(
    db: Session,
    movie_id: int,
    similarity_matrix: np.ndarray,
    top_n: int = 5,
) -> List[Dict]:

    movies = db.query(Movie).order_by(Movie.id.asc()).all()
    movie_idx_map = {m.id: i for i, m in enumerate(movies)}

    if movie_id not in movie_idx_map:
        return []

    idx = movie_idx_map[movie_id]
    similarities = similarity_matrix[idx]

    # Get top similar (exclude self)
    similar_indices = np.argsort(-similarities)[1:top_n + 1]

    result = []
    for sim_idx in similar_indices:
        similar_movie = movies[sim_idx]
        result.append({
            "movie_id": similar_movie.id,
            "title": similar_movie.title,
            "poster_path": similar_movie.poster_path,
            "vote_average": float(similar_movie.vote_average) if similar_movie.vote_average else None,
            "similarity_score": float(similarities[sim_idx]),
        })

    return result
