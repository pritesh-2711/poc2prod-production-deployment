import { create } from 'zustand'
import { chatApi, sessionsApi } from '../api/client'
import type { ChatMessageResponse, SessionResponse } from '../types/api'

type FeedbackRating = 'up' | 'down'

interface ChatState {
  sessions: SessionResponse[]
  activeSessionId: string | null
  messages: ChatMessageResponse[]
  sending: boolean
  streamingContent: string | null  // accumulates in-flight assistant tokens
  statusContent: string | null     // current node status (deep mode only)
  loadingSessions: boolean
  loadingMessages: boolean
  error: string | null
  selectedCategory: 'workflow' | 'agent'
  selectedVariant: 'fast' | 'deep' | 'single_rag_agent' | 'supervisor_orchestration_agent'
  feedbackState: Record<string, FeedbackRating>  // chatId → rating

  loadSessions: () => Promise<void>
  selectSession: (sessionId: string) => Promise<void>
  createSession: (name: string) => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  terminateSession: (sessionId: string) => Promise<void>
  sendMessage: (
    text: string,
    category?: 'workflow' | 'agent',
    variant?: 'fast' | 'deep' | 'single_rag_agent' | 'supervisor_orchestration_agent',
  ) => Promise<void>
  setExecutionMode: (
    category: 'workflow' | 'agent',
    variant: 'fast' | 'deep' | 'single_rag_agent' | 'supervisor_orchestration_agent',
  ) => void
  clearError: () => void
  reset: () => void
  submitFeedback: (sessionId: string, chatId: string, rating: FeedbackRating, comment?: string) => Promise<void>
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  messages: [],
  sending: false,
  streamingContent: null,
  statusContent: null,
  loadingSessions: false,
  loadingMessages: false,
  error: null,
  selectedCategory: 'workflow',
  selectedVariant: 'fast',
  feedbackState: {},

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      sessions: [],
      activeSessionId: null,
      messages: [],
      sending: false,
      streamingContent: null,
      statusContent: null,
      error: null,
      selectedCategory: 'workflow',
      selectedVariant: 'fast',
      feedbackState: {},
    }),

  submitFeedback: async (sessionId, chatId, rating, comment) => {
    // Optimistically update UI before the request completes
    set((state) => ({
      feedbackState: { ...state.feedbackState, [chatId]: rating },
    }))
    try {
      await chatApi.submitFeedback(sessionId, chatId, { rating, comment })
    } catch {
      // Revert optimistic update on failure
      set((state) => {
        const next = { ...state.feedbackState }
        delete next[chatId]
        return { feedbackState: next }
      })
    }
  },

  setExecutionMode: (category, variant) =>
    set({
      selectedCategory: category,
      selectedVariant: variant,
    }),

  loadSessions: async () => {
    set({ loadingSessions: true, error: null })
    try {
      const sessions = await sessionsApi.list()
      set({ sessions, loadingSessions: false })

      // Auto-select the most recent active session; do NOT create one here.
      // Session creation is an explicit user action to avoid the double-POST bug.
      const active = sessions.find((s) => s.is_active)
      if (active && !get().activeSessionId) {
        await get().selectSession(active.session_id)
      }
    } catch (e) {
      set({ loadingSessions: false, error: (e as Error).message })
    }
  },

  selectSession: async (sessionId) => {
    set({ activeSessionId: sessionId, loadingMessages: true, error: null })
    try {
      const messages = await chatApi.getMessages(sessionId)
      set({ messages, loadingMessages: false })
    } catch (e) {
      set({ loadingMessages: false, error: (e as Error).message })
    }
  },

  createSession: async (name) => {
    set({ error: null })
    try {
      const session = await sessionsApi.create({ session_name: name })
      set((state) => ({ sessions: [session, ...state.sessions] }))
      await get().selectSession(session.session_id)
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  deleteSession: async (sessionId) => {
    try {
      await sessionsApi.delete(sessionId)
      const remaining = get().sessions.filter((s) => s.session_id !== sessionId)
      set({ sessions: remaining })
      if (get().activeSessionId === sessionId) {
        const next = remaining.find((s) => s.is_active)
        if (next) {
          await get().selectSession(next.session_id)
        } else {
          set({ activeSessionId: null, messages: [] })
        }
      }
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  terminateSession: async (sessionId) => {
    try {
      await sessionsApi.terminate(sessionId)
      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.session_id === sessionId ? { ...s, is_active: false } : s,
        ),
      }))
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  sendMessage: async (text, category, variant) => {
    const { activeSessionId, selectedCategory, selectedVariant } = get()
    if (!activeSessionId || !text.trim()) return
    const effectiveCategory = category ?? selectedCategory
    const effectiveVariant = variant ?? selectedVariant

    // Optimistically show user message immediately
    const optimisticId = `optimistic-${Date.now()}`
    const optimisticUserMsg: ChatMessageResponse = {
      chat_id: optimisticId,
      session_id: activeSessionId,
      sender: 'user',
      message: text,
      created_at: new Date().toISOString(),
    }

    set((state) => ({
      messages: [...state.messages, optimisticUserMsg],
      sending: true,
      streamingContent: '',
      statusContent: null,
      error: null,
    }))

    try {
      for await (const event of chatApi.streamMessage(activeSessionId, {
        message: text,
        category: effectiveCategory,
        variant: effectiveVariant,
      })) {
        if (event.type === 'user_message') {
          // Replace optimistic message with the persisted one from the backend
          set((state) => ({
            messages: state.messages.map((m) =>
              m.chat_id === optimisticId ? event : m,
            ),
          }))
        } else if (event.type === 'token') {
          set((state) => ({
            streamingContent: (state.streamingContent ?? '') + event.content,
          }))
        } else if (event.type === 'done') {
          set((state) => ({
            messages: [...state.messages, event],
            streamingContent: null,
            statusContent: null,
            sending: false,
          }))
        } else if (event.type === 'clarification') {
          // Deep mode paused for clarification — the backend persists the question
          // as an assistant message; the 'done' event will follow immediately.
          set((state) => ({
            streamingContent: (state.streamingContent ?? '') + event.content,
            statusContent: null,
          }))
        } else if (event.type === 'status') {
          set({ statusContent: event.content })
        } else if (event.type === 'error') {
          throw new Error(event.detail)
        }
      }
    } catch (e) {
      // Remove optimistic message on failure
      set((state) => ({
        messages: state.messages.filter((m) => m.chat_id !== optimisticId),
        sending: false,
        streamingContent: null,
        statusContent: null,
        error: (e as Error).message,
      }))
    }
  },
}))
