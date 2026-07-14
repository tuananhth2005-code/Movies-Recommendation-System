import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '../../context/ChatContext';
import ChatMessage from './ChatMessage';
import QuickActions from './QuickActions';

const FOLLOW_UPS = [
  'Gợi ý thêm phim tương tự',
  'Phim này được đánh giá thế nào?',
  'Thêm phim vào danh sách xem',
  'Phim nào đang hot?',
];

function formatSessionTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
}

export default function ChatWindow({ onClose }) {
  const {
    messages, isLoading, error, sendMessage, createSession, clearError,
    sessions, sessionsLoading, activeSession,
    loadSessions, switchSession, removeSession,
  } = useChat();

  const [input, setInput] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [atBottom, setAtBottom] = useState(true);

  const messagesEndRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    if (atBottom) scrollToBottom();
  }, [messages, isLoading, atBottom, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setAtBottom(nearBottom);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    setAtBottom(true);
    try {
      await sendMessage(text);
    } catch {}
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = async () => {
    setShowHistory(false);
    try {
      await createSession();
      inputRef.current?.focus();
    } catch {}
  };

  const handleQuickAction = (message) => {
    setAtBottom(true);
    sendMessage(message).catch(() => {});
  };

  const openHistory = () => {
    setShowHistory((v) => !v);
    if (!showHistory) loadSessions();
  };

  const handlePickSession = async (id) => {
    setShowHistory(false);
    await switchSession(id);
  };

  const lastMessage = messages[messages.length - 1];
  const showFollowUps =
    !isLoading && lastMessage && lastMessage.sender_type === 'bot';

  return (
    <div
      className={`relative flex max-h-[85vh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#1a1a2e_0%,#16213e_100%)] shadow-[0_20px_60px_rgba(0,0,0,0.5)] transition-all duration-300 ${
        expanded ? 'h-[640px] w-[calc(100vw-2rem)] sm:w-[460px]' : 'h-[550px] w-[calc(100vw-2rem)] sm:w-[380px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--primary),var(--secondary))] text-xs font-bold text-black">AI</span>
          <span className="text-[0.95rem] font-semibold text-white">Movie Assistant</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={openHistory} title="Lịch sử trò chuyện"
            className={`rounded-md px-2 py-1 text-sm transition hover:bg-white/10 ${showHistory ? 'text-white' : 'text-white/60 hover:text-white'}`}>
            ☰
          </button>
          <button onClick={handleNewChat} title="Cuộc trò chuyện mới"
            className="rounded-md px-2 py-1 text-sm text-white/60 transition hover:bg-white/10 hover:text-white">
            ＋
          </button>
          <button onClick={() => setExpanded((v) => !v)} title={expanded ? 'Thu nhỏ' : 'Phóng to'}
            className="hidden rounded-md px-2 py-1 text-sm text-white/60 transition hover:bg-white/10 hover:text-white sm:block">
            {expanded ? '⤡' : '⤢'}
          </button>
          <button onClick={onClose} title="Đóng"
            className="rounded-md px-2 py-1 text-base text-white/60 transition hover:bg-white/10 hover:text-white">
            ✕
          </button>
        </div>
      </div>

      {/* History drawer */}
      {showHistory && (
        <div className="absolute inset-x-0 top-[57px] bottom-0 z-20 flex flex-col bg-[#16213e] animate-[fadeIn_0.15s_ease]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
            <span className="text-sm font-semibold text-white">Lịch sử trò chuyện</span>
            <button onClick={handleNewChat} className="rounded-full bg-[var(--primary,#6366f1)] px-3 py-1 text-xs font-semibold text-black">
              ＋ Mới
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2 [scrollbar-width:thin]">
            {sessionsLoading ? (
              <p className="px-3 py-4 text-sm text-white/50">Đang tải…</p>
            ) : sessions.length === 0 ? (
              <p className="px-3 py-4 text-sm text-white/50">Chưa có cuộc trò chuyện nào.</p>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  className={`group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 transition hover:bg-white/10 ${s.id === activeSession?.id ? 'bg-white/10' : ''}`}
                  onClick={() => handlePickSession(s.id)}
                >
                  <span className="text-white/40">💬</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-white">
                      {s.last_message || 'Cuộc trò chuyện mới'}
                    </div>
                    <div className="text-[0.7rem] text-white/40">
                      {formatSessionTime(s.last_message_time || s.created_at)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeSession(s.id); }}
                    title="Xóa"
                    className="shrink-0 rounded px-1.5 py-1 text-white/30 opacity-0 transition hover:bg-red-500/20 hover:text-red-300 group-hover:opacity-100"
                  >
                    🗑
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-[14px] py-3 [scrollbar-color:rgba(255,255,255,0.15)_transparent] [scrollbar-width:thin]"
      >
        {messages.length === 0 && !isLoading && (
          <QuickActions onSend={handleQuickAction} />
        )}

        {messages.map((msg, idx) => (
          <ChatMessage key={msg.id || idx} message={msg} />
        ))}

        {isLoading && (
          <div className="mb-3 flex items-start">
            <div className="rounded-[16px_16px_16px_4px] bg-white/10 px-4 py-2.5">
              <div className="flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i}
                    className={`inline-block h-[7px] w-[7px] rounded-full bg-white/60 animate-pulse ${i === 1 ? '[animation-delay:150ms]' : i === 2 ? '[animation-delay:300ms]' : ''}`} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Follow-up suggestion chips */}
        {showFollowUps && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {FOLLOW_UPS.map((f) => (
              <button
                key={f}
                onClick={() => handleQuickAction(f)}
                className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[0.75rem] text-white/80 transition hover:border-white/30 hover:bg-white/10"
              >
                {f}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll-to-bottom button */}
      {!atBottom && (
        <button
          onClick={() => { setAtBottom(true); scrollToBottom(); }}
          title="Xuống cuối"
          className="absolute bottom-[78px] right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#1a1a2e] text-white/80 shadow-lg transition hover:text-white"
        >
          ↓
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between bg-red-500/15 px-[14px] py-1.5 text-[0.8rem] text-red-300">
          <span>{error}</span>
          <button onClick={clearError} className="bg-transparent text-[0.9rem] text-red-300">✕</button>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-white/10 bg-white/[0.02] px-[14px] py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Hỏi gì đó về phim..."
            rows={1}
            className="max-h-20 flex-1 resize-none rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-[0.88rem] leading-[1.4] text-white outline-none transition placeholder:text-white/45 focus:border-[rgba(0,210,253,0.35)] focus:ring-2 focus:ring-[rgba(0,210,253,0.15)]"
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px';
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] text-sm text-white transition ${input.trim() && !isLoading ? 'cursor-pointer bg-[var(--primary,#6366f1)] hover:brightness-110' : 'cursor-default bg-white/10 text-white/50'}`}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
