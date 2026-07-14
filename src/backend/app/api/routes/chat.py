import time
from collections import defaultdict
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.api.schemas.chat import (
    ChatRequest,
    ChatResponse,
    ChatSessionResponse,
    ChatMessageResponse,
)
from app.services import chat_service
from app.models import User

router = APIRouter(prefix="/chat", tags=["Chat"])


_rate_limits: dict = defaultdict(list)
_RATE_LIMIT = 20
_RATE_WINDOW = 60  


def _check_rate_limit(user_id: str):
    now = time.time()
    timestamps = _rate_limits[user_id]
    _rate_limits[user_id] = [t for t in timestamps if now - t < _RATE_WINDOW]
    if len(_rate_limits[user_id]) >= _RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail="Bạn gửi tin nhắn quá nhanh. Vui lòng đợi một chút.",
        )
    _rate_limits[user_id].append(now)


@router.post("/sessions", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return chat_service.create_chat_session(db, current_user.id)


@router.get("/sessions", response_model=list[ChatSessionResponse])
def get_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sessions = chat_service.get_user_chat_sessions(db, current_user.id)
    result = []
    for s in sessions:
        last_msg = None
        last_time = None
        if s.messages:
            latest = max(s.messages, key=lambda m: m.created_at)
            last_msg = latest.content[:100] if latest.content else None
            last_time = latest.created_at
        result.append(ChatSessionResponse(
            id=s.id,
            user_id=s.user_id,
            created_at=s.created_at,
            last_message=last_msg,
            last_message_time=last_time,
        ))
    return result


@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
def get_session(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """GET /chat/sessions/{session_id} — Lấy chi tiết session."""
    session = chat_service.get_chat_session(db, session_id)
    if not session or str(session.user_id) != str(current_user.id):
        raise HTTPException(status_code=404, detail="Session không tồn tại")
    return session


@router.get("/sessions/{session_id}/messages", response_model=list[ChatMessageResponse])
def get_session_messages(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """GET /chat/sessions/{session_id}/messages — Lấy danh sách messages của session."""
    session = chat_service.get_chat_session(db, session_id)
    if not session or str(session.user_id) != str(current_user.id):
        raise HTTPException(status_code=404, detail="Session không tồn tại")
    return chat_service.get_session_messages(db, session_id)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = chat_service.get_chat_session(db, session_id)
    if not session or str(session.user_id) != str(current_user.id):
        raise HTTPException(status_code=404, detail="Session không tồn tại")
    chat_service.delete_chat_session(db, session_id)


@router.post("/message", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_rate_limit(str(current_user.id))
    try:
        result = await chat_service.process_message(
            db=db,
            user=current_user,
            session_id=request.session_id,
            message=request.message,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
