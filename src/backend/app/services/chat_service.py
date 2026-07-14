"""
Chat Service — quản lý session/message và gọi agent.

Toàn bộ logic phân loại intent và generate response được delegate cho agent.
"""

import logging
from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models import User
from app.models.chat import ChatMessage, ChatSession
from app.models.enums import SenderEnum
from app.services.chat_agent import run_agent


logger = logging.getLogger(__name__)

# [CHANGED] Sliding window + content truncation config cho conversation memory.
HISTORY_WINDOW_SIZE = 10
MAX_HISTORY_MESSAGE_CHARS = 500
TRUNCATION_SUFFIX = "... [truncated]"


# --- Session Management ---

def create_chat_session(db: Session, user_id: UUID) -> ChatSession:
    """Tạo chat session mới cho user."""
    session = ChatSession(user_id=user_id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_user_chat_sessions(db: Session, user_id: UUID) -> List[ChatSession]:
    """Lấy danh sách session của user."""
    return (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user_id)
        .order_by(ChatSession.created_at.desc())
        .all()
    )


def get_chat_session(db: Session, session_id: UUID) -> Optional[ChatSession]:
    """Lấy session theo ID."""
    return db.query(ChatSession).filter(ChatSession.id == session_id).first()


def delete_chat_session(db: Session, session_id: UUID) -> bool:
    """Xóa session nếu tồn tại."""
    session = get_chat_session(db, session_id)
    if not session:
        return False
    db.delete(session)
    db.commit()
    return True


# --- Message Management ---

def save_message(
    db: Session,
    session_id: UUID,
    sender_type: SenderEnum,
    content: str,
    recommended_movie_ids: Optional[List[int]] = None,
    commit: bool = True,
) -> ChatMessage:
    """Lưu một message vào DB."""
    msg = ChatMessage(
        session_id=session_id,
        sender_type=sender_type,
        content=content,
        recommended_movies=recommended_movie_ids or [],
    )
    db.add(msg)
    if commit:
        db.commit()
        db.refresh(msg)
    return msg


def save_turn_messages(
    db: Session,
    session_id: UUID,
    user_content: str,
    assistant_content: str,
    recommended_movie_ids: Optional[List[int]] = None,
) -> tuple[ChatMessage, ChatMessage]:
    """[NEW] Lưu cả user message và assistant message trong cùng một transaction."""
    user_msg = save_message(
        db,
        session_id,
        SenderEnum.user,
        user_content,
        commit=False,
    )
    bot_msg = save_message(
        db,
        session_id,
        SenderEnum.bot,
        assistant_content,
        recommended_movie_ids,
        commit=False,
    )
    db.commit()
    db.refresh(user_msg)
    db.refresh(bot_msg)
    return user_msg, bot_msg


def get_session_messages(db: Session, session_id: UUID) -> List[ChatMessage]:
    """Lấy toàn bộ messages của một session theo thứ tự thời gian."""
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc(), ChatMessage.id.asc())
        .all()
    )


def get_recent_session_messages(
    db: Session,
    user_id: UUID,
    session_id: Optional[UUID],
    limit: int = HISTORY_WINDOW_SIZE,
) -> List[ChatMessage]:
    """[NEW] Lấy N messages gần nhất, ưu tiên scope theo session_id."""
    query = db.query(ChatMessage)

    if session_id is not None:
        query = query.filter(ChatMessage.session_id == session_id)
    else:
        query = (
            query.join(ChatSession, ChatSession.id == ChatMessage.session_id)
            .filter(ChatSession.user_id == user_id)
        )

    recent_messages = (
        query.order_by(ChatMessage.created_at.desc(), ChatMessage.id.desc())
        .limit(limit)
        .all()
    )
    return list(reversed(recent_messages))


def _truncate_content(content: str, max_chars: int = MAX_HISTORY_MESSAGE_CHARS) -> str:
    """[NEW] Truncate content để không làm phình token budget."""
    normalized = (content or "").strip()
    if len(normalized) <= max_chars:
        return normalized

    keep_length = max_chars - len(TRUNCATION_SUFFIX)
    if keep_length <= 0:
        return TRUNCATION_SUFFIX[:max_chars]
    return f"{normalized[:keep_length]}{TRUNCATION_SUFFIX}"


def _to_langchain_message(message: ChatMessage) -> BaseMessage:
    """[NEW] Chuyển DB message sang LangChain message object."""
    truncated_content = _truncate_content(message.content)
    if message.sender_type == SenderEnum.user:
        return HumanMessage(content=truncated_content)
    return AIMessage(content=truncated_content)


def _build_agent_messages(
    db: Session,
    user_id: UUID,
    session_id: Optional[UUID],
    user_message: str,
    history_limit: int = HISTORY_WINDOW_SIZE,
) -> List[BaseMessage]:
    """[CHANGED] Build message history cho agent, fallback an toàn nếu DB lỗi."""
    try:
        history = get_recent_session_messages(db, user_id, session_id, limit=history_limit)
        formatted_history = [_to_langchain_message(msg) for msg in history]
    except SQLAlchemyError as exc:
        logger.exception("[chat_service] Failed to load conversation history: %s", exc)
        db.rollback()
        formatted_history = []

    formatted_history.append(HumanMessage(content=_truncate_content(user_message)))
    return formatted_history


def _validate_session_ownership(db: Session, user: User, session_id: UUID) -> ChatSession:
    """[NEW] Validate session thuộc về current user."""
    session = get_chat_session(db, session_id)
    if not session or str(session.user_id) != str(user.id):
        raise ValueError("Session không tồn tại hoặc không có quyền truy cập")
    return session


def _resolve_session_for_turn(
    db: Session,
    user: User,
    session_id: Optional[UUID],
) -> ChatSession:
    """[NEW] Resolve current session hoặc tự tạo session mới nếu request chưa có session_id."""
    if session_id is None:
        return create_chat_session(db, user.id)
    return _validate_session_ownership(db, user, session_id)


def _build_transient_message_response(
    sender_type: SenderEnum,
    content: str,
    recommended_movie_ids: Optional[List[int]] = None,
) -> dict[str, Any]:
    """[NEW] Tạo payload response khi DB save lỗi nhưng API vẫn cần trả dữ liệu hợp lệ."""
    return {
        "id": 0,
        "sender_type": sender_type.value,
        "content": content,
        "recommended_movies": recommended_movie_ids or [],
        "created_at": datetime.utcnow(),
    }


def _extract_movie_ids(recommended_movies: Any) -> List[int]:
    """[NEW] Trích xuất movie IDs an toàn từ agent result."""
    if not isinstance(recommended_movies, list):
        return []
    return [
        movie["id"]
        for movie in recommended_movies
        if isinstance(movie, dict) and "id" in movie
    ]


# --- Agent Invocation ---

async def process_message(
    db: Session,
    user: User,
    session_id: Optional[UUID],
    message: str,
) -> dict[str, Any]:
    """[CHANGED] Xử lý message mới với short-term conversation memory."""
    normalized_message = _truncate_content(message)
    if not normalized_message:
        raise ValueError("Message không được để trống")

    try:
        session = _resolve_session_for_turn(db, user, session_id)
    except SQLAlchemyError as exc:
        logger.exception("[chat_service] Failed to validate chat session: %s", exc)
        db.rollback()

        fallback_agent_result = await run_agent(
            db,
            user,
            [HumanMessage(content=normalized_message)],
        )
        fallback_movies = fallback_agent_result.get("recommended_movies", [])
        fallback_movie_ids = _extract_movie_ids(fallback_movies)
        return {
            "user_message": _build_transient_message_response(
                SenderEnum.user,
                normalized_message,
            ),
            "bot_response": _build_transient_message_response(
                SenderEnum.bot,
                str(fallback_agent_result.get("text", "")),
                fallback_movie_ids,
            ),
            "recommended_movies": fallback_movies,
        }

    agent_messages = _build_agent_messages(
        db=db,
        user_id=user.id,
        session_id=session.id,
        user_message=normalized_message,
        history_limit=HISTORY_WINDOW_SIZE,
    )

    agent_result = await run_agent(db, user, agent_messages)
    assistant_text = str(agent_result.get("text", ""))
    recommended_movies = agent_result.get("recommended_movies", [])
    movie_ids = _extract_movie_ids(recommended_movies)

    try:
        user_msg, bot_msg = save_turn_messages(
            db=db,
            session_id=session.id,
            user_content=normalized_message,
            assistant_content=assistant_text,
            recommended_movie_ids=movie_ids,
        )
    except SQLAlchemyError as exc:
        logger.exception("[chat_service] Failed to persist chat turn: %s", exc)
        db.rollback()
        user_msg = _build_transient_message_response(SenderEnum.user, normalized_message)
        bot_msg = _build_transient_message_response(SenderEnum.bot, assistant_text, movie_ids)

    return {
        "user_message": user_msg,
        "bot_response": bot_msg,
        "recommended_movies": recommended_movies if isinstance(recommended_movies, list) else [],
    }
