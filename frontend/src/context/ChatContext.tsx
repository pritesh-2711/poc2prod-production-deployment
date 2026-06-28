import { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Session, ChatMessage } from '../types';
import {
  getSessions,
  createSession,
  deleteSession,
  getMessages,
  sendMessage,
} from '../services/api';
import { useAuth } from './AuthContext';
import { useDocumentsStore } from '../store/documentsStore';

interface ChatContextValue {
  sessions: Session[];
  activeSession: Session | null;
  messages: ChatMessage[];
  isLoadingSessions: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;
  loadSessions: () => Promise<void>;
  selectSession: (session: Session) => Promise<void>;
  startNewSession: () => Promise<void>;
  sendUserMessage: (text: string, mode?: 'fast' | 'deep') => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

function generateSessionName(): string {
  const now = new Date();
  return `Chat ${now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const loadDocuments = useDocumentsStore((s) => s.loadDocuments);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Track whether the current session has had any messages sent
  const sessionHasMessages = useRef(false);

  const loadSessions = useCallback(async () => {
    if (!user) return;
    setIsLoadingSessions(true);
    try {
      const data = await getSessions(user.user_id);
      setSessions(data);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [user]);

  const cleanupEmptySession = useCallback(async () => {
    if (activeSession && !sessionHasMessages.current) {
      await deleteSession(activeSession.session_id);
      setSessions(prev => prev.filter(s => s.session_id !== activeSession.session_id));
    }
  }, [activeSession]);

  const startNewSession = useCallback(async () => {
    if (!user) return;
    await cleanupEmptySession();

    const session = await createSession(user.user_id, generateSessionName());
    sessionHasMessages.current = false;
    setActiveSession(session);
    setMessages([]);
    setSessions(prev => [session, ...prev.filter(s => s.session_id !== session.session_id)]);
  }, [user, cleanupEmptySession]);

  const selectSession = useCallback(async (session: Session) => {
    if (activeSession?.session_id === session.session_id) return;
    await cleanupEmptySession();

    sessionHasMessages.current = true; // existing sessions always have messages
    setActiveSession(session);
    setMessages([]);
    setIsLoadingMessages(true);
    try {
      const msgs = await getMessages(session.session_id);
      setMessages(msgs);
    } finally {
      setIsLoadingMessages(false);
    }
    // Pre-load documents for the newly selected session
    void loadDocuments(session.session_id);
  }, [activeSession, cleanupEmptySession]);

  const sendUserMessage = useCallback(async (text: string, mode: 'fast' | 'deep' = 'fast') => {
    if (!activeSession || !text.trim()) return;
    setIsSending(true);
    sessionHasMessages.current = true;

    // Optimistic user message
    const optimisticUser: ChatMessage = {
      chat_id: `temp-${Date.now()}`,
      session_id: activeSession.session_id,
      sender: 'user',
      message: text.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticUser]);

    try {
      const { userMessage, assistantMessage } = await sendMessage(activeSession.session_id, text.trim(), mode);
      setMessages(prev => [
        ...prev.filter(m => m.chat_id !== optimisticUser.chat_id),
        userMessage,
        assistantMessage,
      ]);
      // Refresh sessions to update preview text
      if (user) {
        getSessions(user.user_id).then(setSessions).catch(() => null);
      }
    } catch (err) {
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.chat_id !== optimisticUser.chat_id));
      throw err;
    } finally {
      setIsSending(false);
    }
  }, [activeSession, user]);

  return (
    <ChatContext.Provider value={{
      sessions,
      activeSession,
      messages,
      isLoadingSessions,
      isLoadingMessages,
      isSending,
      loadSessions,
      selectSession,
      startNewSession,
      sendUserMessage,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
