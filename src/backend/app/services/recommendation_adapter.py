"""
Recommendation Adapter Service

Bridges the gap between:
- Database (UUID users, int movie_ids)
- Recommendation models (integer-indexed users, int movie_ids)

Provides automatic mapping: UUID ↔ user_index, and collects ratings/interactions
into numpy format suitable for CF/MF models.
"""

from typing import List, Tuple, Optional, Dict
import uuid
import numpy as np
from sqlalchemy.orm import Session

from app.models import Rating, UserInteraction, Watchlist, Movie, User
from app.models.enums import ActionEnum


class RecommendationDataBuilder:
    """
    Builds recommendation data from the database with automatic UUID → index mapping.

    QUAN TRỌNG: Cũng remap movie_id (có thể rất lớn, vd 525662) về dense index 0..N-1
    để MF/CF không phải tạo ma trận khổng lồ.
    """

    def __init__(self, db: Session):
        self.db = db
        self.user_uuid_to_idx: Dict[uuid.UUID, int] = {}
        self.user_idx_to_uuid: Dict[int, uuid.UUID] = {}
        self.movie_id_to_idx: Dict[int, int] = {}
        self.movie_idx_to_id: Dict[int, int] = {}
        self.all_movie_ids: set = set()
        self.next_user_idx = 0
        self.next_movie_idx = 0

    def _register_user(self, user_uuid: uuid.UUID) -> int:
        """Register a UUID user and return its internal index."""
        if user_uuid not in self.user_uuid_to_idx:
            idx = self.next_user_idx
            self.user_uuid_to_idx[user_uuid] = idx
            self.user_idx_to_uuid[idx] = user_uuid
            self.next_user_idx += 1
        return self.user_uuid_to_idx[user_uuid]

    def _register_movie(self, movie_id: int) -> int:
        """Register a movie_id and return its dense internal index."""
        if movie_id not in self.movie_id_to_idx:
            idx = self.next_movie_idx
            self.movie_id_to_idx[movie_id] = idx
            self.movie_idx_to_id[idx] = movie_id
            self.next_movie_idx += 1
        return self.movie_id_to_idx[movie_id]

    def build_rating_matrix(self) -> Tuple[np.ndarray, int, int]:
        """
        Build Y_data from ratings table.
        Returns: (Y_data, n_users, n_items)
        where Y_data shape = (n_ratings, 3) with columns [user_idx, movie_id, rating_score]
        """
        ratings = self.db.query(Rating).all()
        rows = []

        for rating in ratings:
            user_idx = self._register_user(rating.user_id)
            movie_idx = self._register_movie(rating.movie_id)
            self.all_movie_ids.add(rating.movie_id)
            rows.append([user_idx, movie_idx, float(rating.rating_score)])

        if not rows:
            return np.array([]), 0, 0

        Y_data = np.array(rows)
        n_users = len(self.user_uuid_to_idx)
        n_items = len(self.movie_id_to_idx)

        return Y_data, n_users, n_items

    def build_interaction_matrix(self) -> Tuple[np.ndarray, int, int]:
        """
        Build Y_data from UserInteraction (watch events).
        Each watch is treated as an implicit rating (1.0).
        Returns: (Y_data, n_users, n_items)
        """
        interactions = self.db.query(UserInteraction).filter(
            UserInteraction.action_type == ActionEnum.watch
        ).all()
        rows = []

        for interaction in interactions:
            user_idx = self._register_user(interaction.user_id)
            movie_idx = self._register_movie(interaction.movie_id)
            self.all_movie_ids.add(interaction.movie_id)
            # Implicit rating: watch = 1.0
            rows.append([user_idx, movie_idx, 1.0])

        if not rows:
            return np.array([]), 0, 0

        Y_data = np.array(rows)
        n_users = len(self.user_uuid_to_idx)
        n_items = len(self.movie_id_to_idx)

        return Y_data, n_users, n_items

    def build_combined_matrix(self) -> Tuple[np.ndarray, int, int]:
        """
        Combine both ratings and interactions (watch events).
        Ratings have higher weight (use as-is, 0.5-5.0).
        Interactions are implicit (1.0).
        Returns: (Y_data, n_users, n_items)
        """
        rows = []

        # Collect ratings
        seen_pairs = set()
        ratings = self.db.query(Rating).all()
        for rating in ratings:
            user_idx = self._register_user(rating.user_id)
            movie_idx = self._register_movie(rating.movie_id)
            self.all_movie_ids.add(rating.movie_id)
            rows.append([user_idx, movie_idx, float(rating.rating_score)])
            seen_pairs.add((user_idx, movie_idx))

        # Collect interactions (watches)
        interactions = self.db.query(UserInteraction).filter(
            UserInteraction.action_type == ActionEnum.watch
        ).all()
        for interaction in interactions:
            user_idx = self._register_user(interaction.user_id)
            movie_idx = self._register_movie(interaction.movie_id)
            self.all_movie_ids.add(interaction.movie_id)
            # O(1) duplicate check thay vì O(n) any()
            if (user_idx, movie_idx) not in seen_pairs:
                rows.append([user_idx, movie_idx, 1.0])
                seen_pairs.add((user_idx, movie_idx))

        if not rows:
            return np.array([]), 0, 0

        Y_data = np.array(rows)
        n_users = len(self.user_uuid_to_idx)
        n_items = len(self.movie_id_to_idx)

        return Y_data, n_users, n_items

    def get_movie_id(self, movie_idx: int) -> Optional[int]:
        """Get the original movie_id from internal dense index."""
        return self.movie_idx_to_id.get(movie_idx)

    def get_movie_idx(self, movie_id: int) -> Optional[int]:
        """Get the internal dense index for a movie_id."""
        return self.movie_id_to_idx.get(movie_id)

    def get_user_index(self, user_uuid: uuid.UUID) -> Optional[int]:
        """Get the internal index for a UUID user, or None if not found."""
        return self.user_uuid_to_idx.get(user_uuid)

    def get_user_uuid(self, user_idx: int) -> Optional[uuid.UUID]:
        """Get the UUID for an internal user index, or None if not found."""
        return self.user_idx_to_uuid.get(user_idx)


class RecommendationResultMapper:
    """
    Convert recommendation results back from internal indices to UUIDs and movie_ids.
    """

    def __init__(self, user_idx_to_uuid: Dict[int, uuid.UUID], db: Session):
        self.user_idx_to_uuid = user_idx_to_uuid
        self.db = db
        self._movie_cache: Dict[int, dict] = {}

    def _get_movie_details(self, movie_id: int) -> Optional[dict]:
        """Get movie details (title, poster, etc.) with caching."""
        if movie_id not in self._movie_cache:
            movie = self.db.query(Movie).filter(Movie.id == movie_id).first()
            if movie:
                self._movie_cache[movie_id] = {
                    "id": movie.id,
                    "title": movie.title,
                    "poster_path": movie.poster_path,
                    "vote_average": float(movie.vote_average) if movie.vote_average else None,
                }
            else:
                self._movie_cache[movie_id] = None
        return self._movie_cache[movie_id]

    def map_recommendations(
        self, recommendations: List[Tuple[int, float]]
    ) -> List[Dict]:
        if not recommendations:
            return []

        # Batch load tất cả movies trong 1 query
        movie_ids = [int(mid) for mid, _ in recommendations]
        missing_ids = [mid for mid in movie_ids if mid not in self._movie_cache]
        if missing_ids:
            movies = self.db.query(Movie).filter(Movie.id.in_(missing_ids)).all()
            for m in movies:
                self._movie_cache[m.id] = {
                    "id": m.id,
                    "title": m.title,
                    "poster_path": m.poster_path,
                    "vote_average": float(m.vote_average) if m.vote_average else None,
                }
            for mid in missing_ids:
                self._movie_cache.setdefault(mid, None)

        result = []
        for movie_id, score in recommendations:
            details = self._movie_cache.get(int(movie_id))
            if details:
                result.append({
                    "movie_id": details["id"],
                    "title": details["title"],
                    "poster_path": details["poster_path"],
                    "vote_average": details["vote_average"],
                    "predicted_score": float(score),
                })
        return result
