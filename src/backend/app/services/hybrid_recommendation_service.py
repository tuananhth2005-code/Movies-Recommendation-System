"""
Hybrid Recommendation Service

Kết hợp nhiều thuật toán:
- Matrix Factorization (MF): học latent features từ rating matrix
- Collaborative Filtering (CF): user-user similarity
- Watched-based (item-based): gợi ý phim tương tự với phim đã xem
- Content-based: fallback cold-start

Chiến lược kết hợp (weighted ensemble):
    final_score = w_mf * mf_score + w_cf * cf_score + w_watch * watched_score
"""

from typing import List, Dict, Tuple, Optional
import uuid
import numpy as np
from collections import defaultdict
from sqlalchemy.orm import Session

from app.models import Movie, Genre, Rating, UserInteraction, User
from app.models.associations import MovieGenre
from app.models.enums import ActionEnum
from app.api.lib.collaborative_filtering import CF
from app.api.lib.matrixfactorization import MF
from app.services.recommendation_adapter import (
    RecommendationDataBuilder,
    RecommendationResultMapper,
)
from app.services.content_based_service import (
    get_cold_start_recommendations_content_based,
    get_genre_similarity_matrix,
)


# ─── CẤU HÌNH ────────────────────────────────────────────────────────────────
class HybridConfig:
    """Trọng số ensemble cho hybrid recommendation."""
    # Trọng số mặc định khi user có cả ratings và watch history
    W_MF = 0.45
    W_CF = 0.30
    W_WATCH = 0.25

    # MF hyperparameters
    MF_K = 5                # số latent features
    MF_LAM = 0.1            # regularization
    MF_LR = 0.5             # learning rate
    MF_MAX_ITER = 30        # iterations (nhỏ để API response nhanh)
    MF_MAX_ITEMS = 5000     # giới hạn số items để tránh MF chạy quá lâu

    # CF hyperparameters
    CF_K_NEIGHBORS = 10

    # Watched-based: số top phim đã xem dùng làm seed
    WATCHED_SEED_SIZE = 10


# ─── 1. WATCHED-BASED RECOMMENDATIONS ────────────────────────────────────────
def get_watched_based_recommendations(
    db: Session,
    user_id: uuid.UUID,
    top_n: int = 10,
    exclude_movie_ids: Optional[List[int]] = None,
) -> List[Dict]:
    """
    Gợi ý phim dựa trên các phim user đã xem (watch history) hoặc đã rate cao.

    Logic:
    1. Lấy watched movies của user (từ UserInteraction với action=watch)
       + các phim đã rate >= 3.5 (coi như đã xem & thích)
    2. Với mỗi phim trong seed, tìm các phim tương tự (theo genre similarity)
    3. Tổng hợp điểm: score = sum(similarity * weight) cho mỗi candidate
    4. Loại bỏ phim đã xem/rate, sắp xếp giảm dần theo điểm

    Trả về list dict: [{movie_id, title, poster_path, vote_average, predicted_score}]
    """
    if exclude_movie_ids is None:
        exclude_movie_ids = []

    # ── Lấy seed: watched + highly-rated ─────────────────────────────────
    watched_ids = {
        row[0] for row in db.query(UserInteraction.movie_id)
        .filter(
            UserInteraction.user_id == user_id,
            UserInteraction.action_type == ActionEnum.watch,
        ).all()
    }

    # Phim đã rate cao cũng coi là seed (user thích)
    high_rated = db.query(Rating.movie_id, Rating.rating_score).filter(
        Rating.user_id == user_id,
        Rating.rating_score >= 3.5,
    ).all()
    rated_ids = {r[0] for r in high_rated}

    seed_ids = list(watched_ids | rated_ids)
    if not seed_ids:
        return []

    # Giới hạn seed size để tránh tính toán quá lớn
    seed_ids = seed_ids[: HybridConfig.WATCHED_SEED_SIZE]

    # ── Lấy genres của seed movies ───────────────────────────────────────
    seed_genre_rows = db.query(MovieGenre.movie_id, MovieGenre.genre_id).filter(
        MovieGenre.movie_id.in_(seed_ids)
    ).all()

    seed_movie_genres: Dict[int, set] = defaultdict(set)
    seed_genre_pool: set = set()
    for movie_id, genre_id in seed_genre_rows:
        seed_movie_genres[movie_id].add(genre_id)
        seed_genre_pool.add(genre_id)

    if not seed_genre_pool:
        return []

    # ── Tìm candidate movies có genre overlap ────────────────────────────
    excluded_set = set(exclude_movie_ids) | watched_ids | rated_ids

    candidate_rows = db.query(MovieGenre.movie_id, MovieGenre.genre_id).filter(
        MovieGenre.genre_id.in_(seed_genre_pool),
        MovieGenre.movie_id.notin_(excluded_set) if excluded_set else True,
    ).all()

    candidate_genres: Dict[int, set] = defaultdict(set)
    for movie_id, genre_id in candidate_rows:
        if movie_id in excluded_set:
            continue
        candidate_genres[movie_id].add(genre_id)

    if not candidate_genres:
        return []

    # ── Tính điểm tương đồng (Jaccard similarity trên genres) ────────────
    candidate_scores: Dict[int, float] = defaultdict(float)
    for cand_id, cand_genres in candidate_genres.items():
        for seed_id, sg in seed_movie_genres.items():
            inter = len(cand_genres & sg)
            union = len(cand_genres | sg)
            if union == 0:
                continue
            jaccard = inter / union
            candidate_scores[cand_id] += jaccard

    # Chuẩn hóa: chia cho số seed
    n_seed = max(len(seed_movie_genres), 1)
    for cid in candidate_scores:
        candidate_scores[cid] /= n_seed

    # ── Lấy top candidates và load thông tin movie ───────────────────────
    sorted_candidates = sorted(
        candidate_scores.items(), key=lambda x: x[1], reverse=True
    )[: top_n * 3]  # lấy nhiều hơn để boost theo popularity

    candidate_ids = [c[0] for c in sorted_candidates]
    movies = db.query(Movie).filter(Movie.id.in_(candidate_ids)).all()
    movie_map = {m.id: m for m in movies}

    # ── Boost điểm theo popularity (vote_average) ────────────────────────
    result = []
    for cid, sim_score in sorted_candidates:
        movie = movie_map.get(cid)
        if not movie:
            continue
        vote_avg = float(movie.vote_average) if movie.vote_average else 0.0
        # final = similarity * 0.7 + (vote_avg/5) * 0.3
        final_score = sim_score * 0.7 + (vote_avg / 5.0) * 0.3
        result.append({
            "movie_id": movie.id,
            "title": movie.title,
            "poster_path": movie.poster_path,
            "vote_average": vote_avg if vote_avg > 0 else None,
            "predicted_score": float(final_score),
        })

    # Sắp xếp lại theo final_score
    result.sort(key=lambda x: x["predicted_score"], reverse=True)
    return result[:top_n]


# ─── 2. MF-BASED RECOMMENDATIONS ─────────────────────────────────────────────
def get_mf_recommendations(
    Y_data: np.ndarray,
    user_idx: int,
    top_n: int = 10,
) -> List[Tuple[int, float]]:
    """
    Train MF model và gợi ý top_n items cho user_idx.
    Trả về list (movie_id, predicted_score).
    """
    if Y_data.shape[0] < 2:
        return []

    n_users = int(np.max(Y_data[:, 0])) + 1
    n_items = int(np.max(Y_data[:, 1])) + 1

    # Safety guard: nếu items quá nhiều (do bug hoặc dữ liệu bất thường) thì bỏ qua MF
    if n_items > HybridConfig.MF_MAX_ITEMS:
        print(f"[MF] Skipped: n_items={n_items} > MF_MAX_ITEMS={HybridConfig.MF_MAX_ITEMS}")
        return []

    # K không vượt quá min(n_users, n_items) - 1
    k = min(HybridConfig.MF_K, max(1, min(n_users, n_items) - 1))

    mf = MF(
        Y_data,
        K=k,
        lam=HybridConfig.MF_LAM,
        learning_rate=HybridConfig.MF_LR,
        max_iter=HybridConfig.MF_MAX_ITER,
        print_every=HybridConfig.MF_MAX_ITER + 1,  # tắt log
        user_based=1,
    )
    mf.fit()

    predictions = mf.pred_for_user(user_idx)
    # predictions: list of (item_id, score)
    predictions.sort(key=lambda x: x[1], reverse=True)

    # Chỉ giữ items thực sự xuất hiện trong dữ liệu (tránh ID ảo do range)
    valid_items = set(Y_data[:, 1].astype(int).tolist())
    filtered = [(int(i), float(s)) for i, s in predictions if int(i) in valid_items]

    return filtered[:top_n]


# ─── 3. CF-BASED RECOMMENDATIONS ─────────────────────────────────────────────
def get_cf_recommendations(
    Y_data: np.ndarray,
    user_idx: int,
    n_users: int,
    top_n: int = 10,
) -> List[Tuple[int, float]]:
    """Train CF model (user-user) và trả về top_n recommendations."""
    if Y_data.shape[0] < 2 or n_users < 2:
        return []

    # Safety guard: tránh tạo sparse matrix khổng lồ nếu movie_id chưa được remap
    n_items_raw = int(np.max(Y_data[:, 1])) + 1
    if n_items_raw > HybridConfig.MF_MAX_ITEMS:
        print(f"[CF] Skipped: n_items={n_items_raw} > MF_MAX_ITEMS={HybridConfig.MF_MAX_ITEMS}")
        return []

    k = min(HybridConfig.CF_K_NEIGHBORS, max(1, n_users - 1))
    cf = CF(Y_data, k=k, uuCF=1)
    cf.fit()
    return cf.recommend(user_idx, top_n=top_n)


# ─── 4. ENSEMBLE: Kết hợp các nguồn ─────────────────────────────────────────
def _normalize_scores(items: List[Tuple[int, float]]) -> Dict[int, float]:
    """Chuẩn hóa scores về [0, 1] bằng min-max."""
    if not items:
        return {}
    scores = [s for _, s in items]
    s_min, s_max = min(scores), max(scores)
    if s_max - s_min < 1e-9:
        return {mid: 0.5 for mid, _ in items}
    return {mid: (s - s_min) / (s_max - s_min) for mid, s in items}


def ensemble_recommendations(
    mf_recs: List[Tuple[int, float]],
    cf_recs: List[Tuple[int, float]],
    watched_recs: List[Dict],
    top_n: int = 10,
    weights: Tuple[float, float, float] = None,
) -> List[Tuple[int, float]]:
    """
    Kết hợp 3 nguồn recommendations với weighted average.
    Trả về list (movie_id, ensemble_score) sắp xếp giảm dần.
    """
    if weights is None:
        w_mf, w_cf, w_watch = HybridConfig.W_MF, HybridConfig.W_CF, HybridConfig.W_WATCH
    else:
        w_mf, w_cf, w_watch = weights

    # Chuẩn hóa scores
    mf_norm = _normalize_scores(mf_recs)
    cf_norm = _normalize_scores(cf_recs)
    watch_pairs = [(int(r["movie_id"]), float(r["predicted_score"] or 0)) for r in watched_recs]
    watch_norm = _normalize_scores(watch_pairs)

    # Tổng hợp: union all candidates
    all_ids = set(mf_norm) | set(cf_norm) | set(watch_norm)

    ensemble: Dict[int, float] = {}
    for mid in all_ids:
        score = (
            w_mf * mf_norm.get(mid, 0.0)
            + w_cf * cf_norm.get(mid, 0.0)
            + w_watch * watch_norm.get(mid, 0.0)
        )
        ensemble[mid] = score

    sorted_items = sorted(ensemble.items(), key=lambda x: x[1], reverse=True)
    return [(mid, score) for mid, score in sorted_items[:top_n]]


# ─── 5. MAIN HYBRID PIPELINE ─────────────────────────────────────────────────
def get_hybrid_recommendations(
    db: Session,
    user: User,
    top_n: int = 10,
) -> Dict:
    """
    Pipeline chính kết hợp MF + CF + Watched-based + Content-based fallback.

    Trả về: {
        "recommendations": [...],
        "strategy": "hybrid" | "watched_only" | "cold_start",
        "sources": {"mf": int, "cf": int, "watched": int}
    }
    """
    # ── Step 1: Build rating matrix từ DB ────────────────────────────────
    builder = RecommendationDataBuilder(db)
    Y_data, n_users, n_items = builder.build_combined_matrix()
    user_idx = builder.get_user_index(user.id)

    # ── Step 2: Lấy excluded movies (đã xem/rate) ────────────────────────
    watched_ids = [
        r[0] for r in db.query(UserInteraction.movie_id)
        .filter(UserInteraction.user_id == user.id).all()
    ]
    rated_ids = [
        r[0] for r in db.query(Rating.movie_id)
        .filter(Rating.user_id == user.id).all()
    ]
    excluded = list(set(watched_ids) | set(rated_ids))

    # ── Step 3: Cold-start nếu user không có dữ liệu nào ─────────────────
    if user_idx is None and not watched_ids and not rated_ids:
        preferred_genre_ids = [g.id for g in user.preferred_genres]
        cold_recs = get_cold_start_recommendations_content_based(
            db, preferred_genre_ids, exclude_movie_ids=excluded, top_n=top_n
        )
        return {
            "recommendations": cold_recs,
            "strategy": "cold_start",
            "sources": {"mf": 0, "cf": 0, "watched": 0, "content": len(cold_recs)},
        }

    # ── Step 4: Watched-based luôn chạy nếu user có watch/rate ──────────
    watched_recs = get_watched_based_recommendations(
        db, user.id, top_n=top_n * 2, exclude_movie_ids=excluded
    )

    # ── Step 5: MF + CF chỉ chạy khi đủ dữ liệu global ──────────────────
    mf_recs: List[Tuple[int, float]] = []
    cf_recs: List[Tuple[int, float]] = []

    # Yêu cầu dữ liệu tối thiểu hợp lý:
    # - >= 2 users, >= 2 items
    # - >= 5 ratings tổng (tránh chạy MF/CF khi quá ít data)
    can_run_cf_mf = (
        user_idx is not None
        and Y_data.shape[0] >= 5
        and n_users >= 2
        and n_items >= 2
    )

    excluded_set = set(excluded)

    if can_run_cf_mf:
        # MF (Y_data dùng movie_idx nên kết quả cần map idx -> movie_id)
        try:
            mf_recs_raw = get_mf_recommendations(Y_data, user_idx, top_n=top_n * 2)
            mf_recs = []
            for movie_idx, s in mf_recs_raw:
                real_id = builder.get_movie_id(int(movie_idx))
                if real_id is not None and real_id not in excluded_set:
                    mf_recs.append((real_id, float(s)))
        except Exception as e:
            print(f"[hybrid] MF failed: {e}")

        # CF (cũng dùng movie_idx)
        try:
            cf_recs_raw = get_cf_recommendations(Y_data, user_idx, n_users, top_n=top_n * 2)
            cf_recs = []
            for movie_idx, s in cf_recs_raw:
                real_id = builder.get_movie_id(int(movie_idx))
                if real_id is not None and real_id not in excluded_set:
                    cf_recs.append((real_id, float(s)))
        except Exception as e:
            print(f"[hybrid] CF failed: {e}")

    # ── Step 6: Ensemble ────────────────────────────────────────────────
    if mf_recs or cf_recs or watched_recs:
        # Điều chỉnh trọng số theo dữ liệu có sẵn
        weights = _adjust_weights(bool(mf_recs), bool(cf_recs), bool(watched_recs))

        ensemble = ensemble_recommendations(
            mf_recs, cf_recs, watched_recs, top_n=top_n, weights=weights
        )

        # Convert (movie_id, score) → dict với thông tin phim
        mapper = RecommendationResultMapper(builder.user_idx_to_uuid, db)
        result = mapper.map_recommendations(ensemble)

        # Bù thêm cold-start nếu thiếu
        if len(result) < top_n:
            preferred_genre_ids = [g.id for g in user.preferred_genres]
            already = {r["movie_id"] for r in result}
            cold_recs = get_cold_start_recommendations_content_based(
                db, preferred_genre_ids,
                exclude_movie_ids=excluded + list(already),
                top_n=top_n - len(result),
            )
            result.extend(cold_recs)

        strategy = "hybrid" if (mf_recs and cf_recs) else (
            "watched_only" if not (mf_recs or cf_recs) else "partial_hybrid"
        )

        return {
            "recommendations": result[:top_n],
            "strategy": strategy,
            "sources": {
                "mf": len(mf_recs),
                "cf": len(cf_recs),
                "watched": len(watched_recs),
            },
        }

    # ── Step 7: Fallback cuối cùng ──────────────────────────────────────
    preferred_genre_ids = [g.id for g in user.preferred_genres]
    cold_recs = get_cold_start_recommendations_content_based(
        db, preferred_genre_ids, exclude_movie_ids=excluded, top_n=top_n
    )
    return {
        "recommendations": cold_recs,
        "strategy": "cold_start",
        "sources": {"mf": 0, "cf": 0, "watched": 0, "content": len(cold_recs)},
    }


def _adjust_weights(has_mf: bool, has_cf: bool, has_watched: bool) -> Tuple[float, float, float]:
    """Điều chỉnh trọng số ensemble dựa trên các nguồn có sẵn."""
    sources = []
    if has_mf:
        sources.append("mf")
    if has_cf:
        sources.append("cf")
    if has_watched:
        sources.append("watched")

    if len(sources) == 1:
        # Chỉ có 1 nguồn → 100% trọng số cho nó
        return (
            1.0 if has_mf else 0.0,
            1.0 if has_cf and not has_mf else 0.0,
            1.0 if has_watched and not (has_mf or has_cf) else 0.0,
        )
    if len(sources) == 2:
        # 2 nguồn: chia đều 50/50
        if has_mf and has_cf:
            return (0.6, 0.4, 0.0)
        if has_mf and has_watched:
            return (0.6, 0.0, 0.4)
        if has_cf and has_watched:
            return (0.0, 0.55, 0.45)

    # Đủ 3 nguồn → dùng default
    return (HybridConfig.W_MF, HybridConfig.W_CF, HybridConfig.W_WATCH)
