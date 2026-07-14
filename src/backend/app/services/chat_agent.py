"""
Chat Agent — LangGraph ReAct Agent sử dụng Google Gemini.

Agent tự quyết định gọi tool nào dựa trên nội dung tin nhắn.
Không hardcode if/else keyword matching.
"""

import asyncio
import json
import logging
from typing import Any, Sequence

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.prebuilt import create_react_agent
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import User
from app.services.agent_tools import build_tools_with_context


logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """Bạn là trợ lý AI chuyên về phim, hỗ trợ người dùng tìm kiếm và khám phá phim.

Nguyên tắc làm việc:
1. Luôn dùng tools để lấy dữ liệu thực từ hệ thống thay vì trả lời từ kiến thức chung
2. Khi gợi ý phim, ưu tiên gọi get_recommendations trước (cá nhân hóa cho user)
3. Khi user hỏi về nội dung/so sánh phim, gọi get_movie_detail với task phù hợp
4. Nếu cần so sánh 2 phim, gọi get_movie_detail 2 lần cho từng phim
5. Khi user hỏi phim được đánh giá thế nào / có hay không, gọi get_movie_reviews
6. Khi user muốn lưu/để dành một phim, gọi add_to_watchlist
7. Trả lời bằng tiếng Việt, thân thiện và súc tích
8. Khi trả về danh sách phim, giới thiệu ngắn gọn 1-2 câu cho mỗi phim
9. Dùng Markdown để trình bày: **in đậm** tên phim, dùng gạch đầu dòng cho danh sách
10. Kết thúc câu trả lời bằng 1 câu hỏi gợi mở ngắn để khuyến khích user tiếp tục trò chuyện

Bạn có thể giúp user:
- Tìm phim theo tên hoặc mô tả
- Gợi ý phim cá nhân hóa theo sở thích/tâm trạng/thể loại
- Tóm tắt nội dung phim, giải thích cái kết, chia sẻ easter eggs
- So sánh 2 bộ phim
- Xem đánh giá/điểm số của người xem cho một phim
- Thêm phim vào danh sách xem (watchlist)
- Xem phim đang hot/trending
- Tra cứu lịch sử xem
"""


MAX_RETRIES = 3
RETRY_BASE_DELAY = 5


def get_llm() -> ChatGoogleGenerativeAI:
    """Khởi tạo Gemini model cho ReAct agent."""
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=settings.GOOGLE_API_KEY,
        temperature=0.7,
        max_output_tokens=1000,
        max_retries=2,
    )


def _sanitize_history(messages: Sequence[BaseMessage]) -> list[BaseMessage]:
    """[NEW] Lọc và chuẩn hóa history trước khi gửi vào LangGraph."""
    sanitized_messages: list[BaseMessage] = []

    for message in messages:
        if isinstance(message, (HumanMessage, AIMessage)):
            sanitized_messages.append(message)

    return sanitized_messages


async def run_agent(db: Session, user: User, messages: Sequence[BaseMessage]) -> dict[str, Any]:
    """[CHANGED] Chạy agent với full message history cho multi-turn conversation."""
    llm = get_llm()
    tools = build_tools_with_context(db, user)
    agent = create_react_agent(llm, tools, prompt=SYSTEM_PROMPT)
    sanitized_messages = _sanitize_history(messages)

    if not sanitized_messages:
        sanitized_messages = [HumanMessage(content="Xin hãy hỗ trợ tôi tìm phim phù hợp.")]

    last_error: Exception | None = None

    for attempt in range(MAX_RETRIES):
        try:
            result = await agent.ainvoke({
                "messages": sanitized_messages,
            })

            result_messages = result.get("messages", [])
            raw_content = result_messages[-1].content if result_messages else ""
            response_text = _normalize_content(raw_content)
            recommended_movies = _extract_movies_from_tool_results(result_messages)

            return {
                "text": response_text,
                "recommended_movies": recommended_movies,
            }

        except Exception as exc:
            last_error = exc
            error_str = str(exc).lower()
            is_rate_limit = (
                "429" in error_str
                or "resource_exhausted" in error_str
                or "quota" in error_str
            )

            if is_rate_limit and attempt < MAX_RETRIES - 1:
                delay = RETRY_BASE_DELAY * (2 ** attempt)
                logger.warning(
                    "[chat_agent] Rate limited (attempt %s/%s), retrying in %ss",
                    attempt + 1,
                    MAX_RETRIES,
                    delay,
                )
                await asyncio.sleep(delay)
                continue

            logger.exception("[chat_agent] Agent execution failed on attempt %s", attempt + 1)
            break

    error_msg = str(last_error).lower() if last_error else ""
    if "429" in error_msg or "resource_exhausted" in error_msg or "quota" in error_msg:
        return {
            "text": "Hệ thống đang tải cao, vui lòng thử lại sau 30 giây.",
            "recommended_movies": [],
        }

    return {
        "text": "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.",
        "recommended_movies": [],
    }


def _normalize_content(content: Any) -> str:
    """[CHANGED] Normalize Gemini content về plain text string."""
    if isinstance(content, str):
        return content

    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, dict):
                parts.append(item.get("text", ""))
            elif isinstance(item, str):
                parts.append(item)
        return "".join(parts).strip()

    return str(content).strip()


def _extract_movies_from_tool_results(messages: list) -> list[dict]:
    """
    Duyệt qua messages để tìm ToolMessage chứa danh sách phim.
    Trả về list movie objects để frontend render carousel.
    """
    movies = []
    seen_ids = set()

    for msg in messages:
        if not hasattr(msg, "content"):
            continue

        content = msg.content
        if not isinstance(content, str):
            continue

        try:
            data = json.loads(content)
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, dict) and "id" in item and "title" in item:
                        if item["id"] not in seen_ids:
                            movies.append(item)
                            seen_ids.add(item["id"])
        except (json.JSONDecodeError, TypeError):
            continue

    return movies
