from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class MovieBrief(BaseModel):
    id: int
    title: str
    poster_path: Optional[str] = None
    vote_average: Optional[float] = None
    genres: List[str] = []


class ChatMessageResponse(BaseModel):
    id: int
    sender_type: str
    content: str
    recommended_movies: List[int] = []
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionResponse(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    created_at: datetime
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None

    class Config:
        from_attributes = True


# Request
class ChatRequest(BaseModel):
    # [CHANGED] Cho phép session_id optional để backend có thể tự tạo session mới khi thiếu
    session_id: Optional[UUID] = None
    message: str = Field(..., min_length=1, max_length=500)


# Response — không có field `intent`
class ChatResponse(BaseModel):
    user_message: ChatMessageResponse
    bot_response: ChatMessageResponse
    recommended_movies: List[MovieBrief] = []
