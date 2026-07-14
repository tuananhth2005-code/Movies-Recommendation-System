"""
Agent Tools — wrap existing services thành LangChain tools cho chatbot agent.

Mỗi tool được inject db session + user object qua closure (build_tools_with_context).
LLM dùng docstring để quyết định khi nào gọi tool nào.
"""

import time

from langchain_core.tools import tool
from sqlalchemy.orm import Session

from app.models import User
from app.models.interaction import Watchlist


# Simple TTL cache for trending (not user-specific)
_trending_cache = {"data": None, "expires": 0}


def build_tools_with_context(db: Session, user: User):
    """
    Tạo tools với db session và user object được inject qua closure.
    Gọi hàm này mỗi lần xử lý request để đảm bảo mỗi request có db session riêng.
    """

    @tool
    def search_movies(query: str) -> list[dict]:
        """Tìm kiếm phim theo tên hoặc từ khóa mô tả.
        Dùng khi user hỏi về một bộ phim cụ thể theo tên,
        hoặc muốn tìm phim theo mô tả chủ đề cụ thể.
        Ví dụ: 'tìm phim Inception', 'phim về du hành thời gian'.
        """
        from app.services.movie_service import search_movies as svc_search
        _total, results = svc_search(db, q=query, limit=5)
        return [_serialize_movie(m) for m in results]

    @tool
    def get_recommendations(context: str) -> list[dict]:
        """Gợi ý phim cá nhân hóa dựa trên sở thích và lịch sử xem của người dùng.
        Dùng khi user muốn xem gì tiếp theo, hoặc gợi ý theo tâm trạng/thể loại.
        context: mô tả thêm về mong muốn của user, ví dụ 'phim hành động',
        'tâm trạng buồn cần phim nhẹ nhàng', 'phim khoa học viễn tưởng hay'.
        """
        from app.services.hybrid_recommendation_service import get_hybrid_recommendations
        result = get_hybrid_recommendations(db, user=user, top_n=5)
        recs = result.get("recommendations", [])
        # recs là list[dict] với keys: movie_id, title, poster_path, vote_average, predicted_score
        return [_serialize_recommendation(r) for r in recs[:5]]

    @tool
    def get_movie_detail(movie_title: str, task: str) -> dict:
        """Lấy thông tin chi tiết về một bộ phim để thực hiện các tác vụ phân tích.

        task nhận các giá trị:
        - 'summarize': tóm tắt nội dung phim (không spoil)
        - 'explain_ending': giải thích cái kết hoặc plot twist
        - 'trivia': các chi tiết ẩn, easter egg thú vị
        - 'compare': lấy metadata để so sánh với phim khác

        Dùng khi user hỏi 'phim X nói về gì', 'giải thích cái kết của X',
        'so sánh phim A với phim B' (gọi tool này 2 lần cho 2 phim).
        """
        from app.services.movie_service import search_movies as svc_search
        _total, results = svc_search(db, q=movie_title, limit=1)
        if not results:
            return {"error": f"Không tìm thấy phim '{movie_title}'"}
        movie = results[0]
        return {
            "id": movie.id,
            "title": movie.title,
            "overview": movie.overview,
            "genres": [g.name for g in movie.genres],
            "vote_average": float(movie.vote_average) if movie.vote_average else None,
            "vote_count": movie.vote_count,
            "release_date": str(movie.release_date) if movie.release_date else None,
            "poster_path": movie.poster_path,
            "task": task,
        }

    @tool
    def get_trending(limit: int = 5) -> list[dict]:
        """Lấy danh sách phim đang thịnh hành, được đánh giá cao nhất hiện tại.
        Dùng khi user hỏi 'phim hot', 'phim trending', 'nên xem gì',
        hoặc không có yêu cầu cụ thể về thể loại.
        """
        now = time.time()
        if _trending_cache["data"] and _trending_cache["expires"] > now:
            return _trending_cache["data"][:limit]

        from app.services.movie_service import get_all_movies
        _total, results = get_all_movies(db, sort_by="rating", limit=10)
        cached = [_serialize_movie(m) for m in results]
        _trending_cache["data"] = cached
        _trending_cache["expires"] = now + 300  # 5 phút
        return cached[:limit]

    @tool
    def get_user_history(limit: int = 10) -> list[dict]:
        """Lấy danh sách phim user hiện tại đã xem gần đây.
        Dùng khi user hỏi 'tôi đã xem phim gì', 'lịch sử xem của tôi',
        hoặc khi cần context để đưa ra gợi ý không trùng phim đã xem.
        """
        from app.models.interaction import UserInteraction, Watchlist
        from app.models.movie import Movie
        from app.models.enums import ActionEnum
        from sqlalchemy.orm import joinedload

        # Lấy phim đã watch từ UserInteraction
        interactions = (
            db.query(UserInteraction)
            .filter(
                UserInteraction.user_id == user.id,
                UserInteraction.action_type == ActionEnum.watch,
            )
            .order_by(UserInteraction.created_at.desc())
            .limit(limit)
            .all()
        )

        movie_ids = [i.movie_id for i in interactions]
        if not movie_ids:
            # Fallback: lấy từ watchlist
            watchlist_items = (
                db.query(Watchlist)
                .options(joinedload(Watchlist.movie))
                .filter(Watchlist.user_id == user.id)
                .order_by(Watchlist.added_at.desc())
                .limit(limit)
                .all()
            )
            return [_serialize_movie(w.movie) for w in watchlist_items if w.movie]

        movies = (
            db.query(Movie)
            .options(joinedload(Movie.genres))
            .filter(Movie.id.in_(movie_ids))
            .all()
        )
        movie_map = {m.id: m for m in movies}
        return [_serialize_movie(movie_map[mid]) for mid in movie_ids if mid in movie_map]

    @tool
    def add_to_watchlist(movie_title: str) -> dict:
        """Thêm một bộ phim vào danh sách xem (watchlist) của người dùng hiện tại.
        Dùng khi user yêu cầu 'thêm phim X vào danh sách', 'lưu phim X lại',
        'để dành phim X xem sau'. Tìm phim theo tên rồi thêm vào watchlist.
        """
        from app.services.movie_service import search_movies as svc_search
        from app.services import watchlist_service

        _total, results = svc_search(db, q=movie_title, limit=1)
        if not results:
            return {"success": False, "message": f"Không tìm thấy phim '{movie_title}'."}

        movie = results[0]
        existing = (
            db.query(Watchlist)
            .filter(Watchlist.user_id == user.id, Watchlist.movie_id == movie.id)
            .first()
        )
        if existing:
            return {
                "success": True,
                "already_in_watchlist": True,
                "movie": _serialize_movie(movie),
                "message": f"'{movie.title}' đã có sẵn trong danh sách xem của bạn.",
            }

        db.add(Watchlist(user_id=user.id, movie_id=movie.id))
        db.commit()
        return {
            "success": True,
            "already_in_watchlist": False,
            "movie": _serialize_movie(movie),
            "message": f"Đã thêm '{movie.title}' vào danh sách xem.",
        }

    @tool
    def get_movie_reviews(movie_title: str) -> dict:
        """Lấy đánh giá (review) và điểm trung bình của người xem cho một bộ phim.
        Dùng khi user hỏi 'phim X được đánh giá thế nào', 'mọi người nghĩ gì về phim X',
        'phim X có hay không', 'review phim X'. Trả về điểm trung bình và vài nhận xét gần đây.
        """
        from app.services.movie_service import search_movies as svc_search
        from app.services import rating_service

        _total, results = svc_search(db, q=movie_title, limit=1)
        if not results:
            return {"error": f"Không tìm thấy phim '{movie_title}'."}

        movie = results[0]
        total, reviews, avg_score = rating_service.get_movie_reviews(
            db, movie_id=movie.id, limit=5, offset=0
        )
        return {
            "id": movie.id,
            "title": movie.title,
            "average_score": round(avg_score, 1) if avg_score is not None else None,
            "total_reviews": total,
            "reviews": [
                {
                    "user_name": r["user_name"],
                    "rating_score": r["rating_score"],
                    "review_text": (r["review_text"] or "").strip()[:300],
                }
                for r in reviews
                if (r["review_text"] or "").strip()
            ],
        }

    return [
        search_movies,
        get_recommendations,
        get_movie_detail,
        get_trending,
        get_user_history,
        add_to_watchlist,
        get_movie_reviews,
    ]


def _serialize_movie(movie) -> dict:
    """Serialize movie ORM object thành dict gọn nhẹ để không vượt token budget."""
    return {
        "id": movie.id,
        "title": movie.title,
        "poster_path": movie.poster_path,
        "vote_average": float(movie.vote_average) if movie.vote_average else None,
        "genres": [g.name for g in getattr(movie, "genres", [])],
    }


def _serialize_recommendation(rec: dict) -> dict:
    """Serialize recommendation dict (từ hybrid service) thành format chuẩn."""
    return {
        "id": rec.get("movie_id"),
        "title": rec.get("title"),
        "poster_path": rec.get("poster_path"),
        "vote_average": rec.get("vote_average"),
        "genres": rec.get("genres", []),
    }
