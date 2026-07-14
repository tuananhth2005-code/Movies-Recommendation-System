import React from 'react';
import MovieRecommendationCarousel from './MovieRecommendationCarousel';
import MarkdownLite from './markdownLite';

function formatTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatMessage({ message }) {
  const isUser = message.sender_type === 'user';
  const movies = message.recommended_movies_data || [];
  const time = formatTime(message.created_at);

  return (
    <div className={`mb-3 flex max-w-full flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[85%] break-words px-3.5 py-2.5 text-[0.9rem] leading-6 text-white ${isUser ? 'whitespace-pre-wrap rounded-[16px_16px_4px_16px] bg-[linear-gradient(135deg,var(--primary,#6366f1),#4f46e5)]' : 'rounded-[16px_16px_16px_4px] bg-white/10'}`}
      >
        {isUser ? message.content : <MarkdownLite text={message.content} />}
      </div>

      {time && (
        <span className={`mt-1 px-1 text-[0.65rem] text-white/35 ${isUser ? 'text-right' : 'text-left'}`}>
          {time}
        </span>
      )}

      {movies.length > 0 && (
        <div className="mt-2 w-full">
          <MovieRecommendationCarousel movies={movies} />
        </div>
      )}
    </div>
  );
}
