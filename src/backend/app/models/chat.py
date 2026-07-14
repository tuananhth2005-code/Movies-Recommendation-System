import uuid
from sqlalchemy import Column, Integer, BigInteger, Text, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import Base
from .enums import SenderEnum

class ChatSession(Base):
    __tablename__ = 'chat_sessions'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime, server_default=func.current_timestamp())

    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = 'chat_messages'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey('chat_sessions.id', ondelete='CASCADE'))
    sender_type = Column(Enum(SenderEnum, name='sender_enum', create_type=False))
    content = Column(Text, nullable=False)
    recommended_movies = Column(ARRAY(Integer))
    created_at = Column(DateTime, server_default=func.current_timestamp())

    session = relationship("ChatSession", back_populates="messages")
