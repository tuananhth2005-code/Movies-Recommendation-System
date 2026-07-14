import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import chatApi from '../api/chatApi';

const ChatContext = createContext(null);

const ACTIVE_SESSION_KEY = 'chat_active_session_id';

export function ChatProvider({ children }) {
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState(null);

  // Conversation history (list of past sessions)
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const persistActiveSession = useCallback((session) => {
    if (session?.id) {
      localStorage.setItem(ACTIVE_SESSION_KEY, session.id);
    } else {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  }, []);

  const loadSessionMessages = useCallback(async (sessionId) => {
    try {
      const data = await chatApi.getSessionMessages(sessionId);
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[ChatContext] loadSessionMessages failed:', err);
      setMessages([]);
    }
  }, []);

  // Restore the last active session on mount so the conversation survives reloads.
  useEffect(() => {
    const savedId = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!savedId) return;
    let cancelled = false;
    (async () => {
      try {
        const session = await chatApi.getSession(savedId);
        if (cancelled) return;
        setActiveSession(session);
        await loadSessionMessages(savedId);
      } catch {
        // Session no longer exists / not accessible — forget it.
        localStorage.removeItem(ACTIVE_SESSION_KEY);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadSessionMessages]);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await chatApi.getSessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[ChatContext] loadSessions failed:', err);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const createSession = useCallback(async () => {
    try {
      const data = await chatApi.createSession();
      setActiveSession(data);
      persistActiveSession(data);
      setMessages([]);
      setError(null);
      setSessions((prev) => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('[ChatContext] createSession failed:', err);
      setError('Không thể tạo phiên chat mới');
      throw err;
    }
  }, [persistActiveSession]);

  const switchSession = useCallback(
    async (sessionId) => {
      if (!sessionId || sessionId === activeSession?.id) return;
      setActiveSession({ id: sessionId });
      persistActiveSession({ id: sessionId });
      setError(null);
      setMessages([]);
      await loadSessionMessages(sessionId);
    },
    [activeSession, loadSessionMessages, persistActiveSession]
  );

  const removeSession = useCallback(
    async (sessionId) => {
      try {
        await chatApi.deleteSession(sessionId);
      } catch (err) {
        console.error('[ChatContext] deleteSession failed:', err);
      }
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (sessionId === activeSession?.id) {
        setActiveSession(null);
        setMessages([]);
        persistActiveSession(null);
      }
    },
    [activeSession, persistActiveSession]
  );

  const sendMessage = useCallback(
    async (text) => {
      setError(null);

      // Auto-create a session if none is active yet.
      let session = activeSession;
      if (!session) {
        try {
          session = await createSession();
        } catch {
          return;
        }
      }

      const tempUserMsg = {
        id: `temp-${Date.now()}`,
        sender_type: 'user',
        content: text,
        recommended_movies: [],
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);
      setIsLoading(true);

      try {
        const data = await chatApi.sendMessage(session.id, text);
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsg.id),
          data.user_message,
          { ...data.bot_response, recommended_movies_data: data.recommended_movies },
        ]);
        return data;
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
        setError('Có lỗi xảy ra, thử lại nhé');
        console.error('[ChatContext] sendMessage failed:', err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [activeSession, createSession]
  );

  const clearError = useCallback(() => setError(null), []);

  return (
    <ChatContext.Provider value={{
      activeSession, messages, isLoading, isOpen, error,
      sessions, sessionsLoading,
      setIsOpen, createSession, sendMessage, loadSessionMessages,
      loadSessions, switchSession, removeSession, clearError,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside ChatProvider');
  return ctx;
}
