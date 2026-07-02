import type {
  AdminChunkScore,
  AdminDocument,
  AdminFeedbackStats,
  AdminGovernanceFlag,
  AdminJobStatus,
  AdminMessage,
  AdminSession,
  AdminUser,
  ChatMessageResponse,
  CreateSessionRequest,
  DocumentRecord,
  FeedbackRequest,
  FeedbackResponse,
  SendMessageRequest,
  SendMessageResponse,
  SessionResponse,
  SignInRequest,
  SignUpRequest,
  TokenResponse,
  UploadResponse,
  UserResponse,
} from '../types/api'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function getToken(): string | null {
  return localStorage.getItem('access_token')
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail ?? detail
    } catch {
      // ignore parse failure
    }
    throw new ApiError(res.status, detail)
  }

  if (res.status === 204) {
    return undefined as T
  }

  return res.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const authApi = {
  signup(body: SignUpRequest): Promise<{ message: string; status: string }> {
    return request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  signin(body: SignInRequest): Promise<TokenResponse> {
    return request('/auth/signin', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  signout(): Promise<void> {
    return request('/auth/signout', { method: 'POST' })
  },

  me(): Promise<UserResponse> {
    return request('/auth/me')
  },
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export const sessionsApi = {
  list(): Promise<SessionResponse[]> {
    return request('/sessions')
  },

  create(body: CreateSessionRequest): Promise<SessionResponse> {
    return request('/sessions', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  delete(sessionId: string): Promise<void> {
    return request(`/sessions/${sessionId}`, { method: 'DELETE' })
  },

  terminate(sessionId: string): Promise<void> {
    return request(`/sessions/${sessionId}/terminate`, { method: 'POST' })
  },
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export type StreamEvent =
  | ({ type: 'user_message' } & ChatMessageResponse)
  | { type: 'token'; content: string }
  | { type: 'status'; content: string }
  | { type: 'clarification'; content: string }   // deep mode: graph paused, asking user to clarify
  | ({ type: 'done' } & ChatMessageResponse)
  | { type: 'error'; detail: string }

export const chatApi = {
  getMessages(sessionId: string): Promise<ChatMessageResponse[]> {
    return request(`/sessions/${sessionId}/messages`)
  },

  sendMessage(sessionId: string, body: SendMessageRequest): Promise<SendMessageResponse> {
    return request(`/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  submitFeedback(sessionId: string, chatId: string, body: FeedbackRequest): Promise<FeedbackResponse> {
    return request(`/sessions/${sessionId}/messages/${chatId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  async *streamMessage(sessionId: string, body: SendMessageRequest): AsyncGenerator<StreamEvent> {
    const token = getToken()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(`${BASE_URL}/sessions/${sessionId}/messages/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      let detail = res.statusText
      try {
        const errBody = await res.json()
        detail = errBody.detail ?? detail
      } catch { /* ignore */ }
      throw new ApiError(res.status, detail)
    }

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      // SSE events are separated by double newlines
      const parts = buffer.split('\n\n')
      buffer = parts.pop() ?? ''

      for (const part of parts) {
        const line = part.trim()
        if (line.startsWith('data: ')) {
          try {
            yield JSON.parse(line.slice(6)) as StreamEvent
          } catch { /* skip malformed lines */ }
        }
      }
    }
  },
}

// ---------------------------------------------------------------------------
// Documents (upload + listing)
// ---------------------------------------------------------------------------

export const documentsApi = {
  /**
   * Upload a PDF or DOCX file to a session.
   * Uses FormData so the browser sets the correct multipart Content-Type.
   */
  upload(
    sessionId: string,
    file: File,
    fileDescription: string = '',
  ): Promise<UploadResponse> {
    const token = getToken()
    const form = new FormData()
    form.append('file', file)
    form.append('file_description', fileDescription)

    return fetch(`${BASE_URL}/sessions/${sessionId}/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(async (res) => {
      if (!res.ok) {
        let detail = res.statusText
        try {
          const body = await res.json()
          detail = body.detail ?? detail
        } catch { /* ignore */ }
        throw new ApiError(res.status, detail)
      }
      return res.json() as Promise<UploadResponse>
    })
  },

  list(sessionId: string): Promise<DocumentRecord[]> {
    return request(`/sessions/${sessionId}/documents`)
  },
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const adminApi = {
  overview(): Promise<{ stats: ReturnType<typeof Object>; recent_activity: ReturnType<typeof Array> }> {
    return request('/admin/overview')
  },

  listUsers(search?: string): Promise<AdminUser[]> {
    const q = search ? `?search=${encodeURIComponent(search)}` : ''
    return request(`/admin/users${q}`)
  },

  listPendingUsers(): Promise<AdminUser[]> {
    return request('/admin/users/pending')
  },

  approveUser(userId: string): Promise<void> {
    return request(`/admin/users/${userId}/approve`, { method: 'POST' })
  },

  rejectUser(userId: string): Promise<void> {
    return request(`/admin/users/${userId}/reject`, { method: 'POST' })
  },

  listSessions(search?: string): Promise<AdminSession[]> {
    const q = search ? `?search=${encodeURIComponent(search)}` : ''
    return request(`/admin/conversations${q}`)
  },

  getSessionMessages(sessionId: string): Promise<AdminMessage[]> {
    return request(`/admin/conversations/${sessionId}`)
  },

  getSessionSummaries(): Promise<unknown[]> {
    return request('/admin/conversations/summaries')
  },

  getFeedback(): Promise<{ stats: AdminFeedbackStats; chunk_scores: AdminChunkScore[] }> {
    return request('/admin/feedback')
  },

  getGovernance(flaggedOnly = false): Promise<AdminGovernanceFlag[]> {
    return request(`/admin/governance?flagged_only=${flaggedOnly}`)
  },

  getJobs(): Promise<AdminJobStatus[]> {
    return request('/admin/jobs')
  },

  listDocuments(): Promise<AdminDocument[]> {
    return request('/admin/knowledge-base')
  },

  deleteDocument(filename: string): Promise<void> {
    return request(`/admin/knowledge-base/${encodeURIComponent(filename)}`, { method: 'DELETE' })
  },
}

export { ApiError }
