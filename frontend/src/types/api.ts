// Mirrors src/api/schemas.py exactly

export interface UserResponse {
  user_id: string
  name: string
  email: string
  created_at: string
  is_admin: boolean
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface SessionResponse {
  session_id: string
  user_id: string
  session_name: string
  is_active: boolean
  created_at: string
  terminated_at: string | null
}

export interface ChatMessageResponse {
  chat_id: string
  session_id: string
  sender: 'user' | 'assistant'
  message: string
  created_at: string
  charts?: string[]   // base64 PNGs; only present on live responses, not history
}

export interface FeedbackRequest {
  rating: 'up' | 'down'
  comment?: string
}

export interface FeedbackResponse {
  feedback_id: string
  chat_id: string
  session_id: string
  rating: string
}

export interface SendMessageResponse {
  user_message: ChatMessageResponse
  assistant_message: ChatMessageResponse
}

export interface UploadResponse {
  session_id: string
  filename: string
  file_path: string
  size_bytes: number
  content_type: string
  file_description: string
  parent_chunks: number
  child_chunks: number
}

export interface DocumentRecord {
  filename: string
  file_description: string
  file_type: string
  parent_chunks: number
  child_chunks: number
  ingested_at: string
}

// ---------------------------------------------------------------------------
// Admin types
// ---------------------------------------------------------------------------

export interface AdminOverviewStats {
  pending_approvals: number
  flagged_responses: number
  active_users_7d: number
  job_failures_24h: number
}

export interface AdminActivityEvent {
  event_type: string
  detail: string | null
  occurred_at: string
}

export interface AdminUser {
  user_id: string
  name: string | null
  email: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  last_login_at: string | null
}

export interface AdminSession {
  session_id: string
  user_email: string
  session_name: string | null
  is_active: boolean
  created_at: string
  message_count: number
  last_mode: string | null
}

export interface AdminMessage {
  chat_id: string
  sender: 'user' | 'assistant'
  message: string
  created_at: string
  orchestrator_metadata: Record<string, unknown>
}

export interface AdminFeedbackStats {
  ratings_7d: number
  positive_rate: number
  rlhf_alpha: number
}

export interface AdminChunkScore {
  chunk_id: string
  filename: string
  positive_count: number
  negative_count: number
  score: number
}

export interface AdminGovernanceFlag {
  id: string
  chat_id: string
  session_id: string
  toxicity_score: number
  bias_score: number
  faithfulness_score: number | null
  flagged: boolean
  flag_reason: string | null
  created_at: string
}

export interface AdminJobStatus {
  job_id: string
  interval_hours: number | null
  next_run: string | null
  last_run: string | null
  status: 'succeeded' | 'failed' | 'skipped' | null
  detail: string | null
}

export interface AdminDocument {
  filename: string
  file_description: string
  file_type: string
  parent_chunks: number
  child_chunks: number
  ingested_at: string | null
}

// Request bodies
export interface SignUpRequest {
  name: string
  email: string
  password: string
}

export interface SignInRequest {
  email: string
  password: string
}

export interface CreateSessionRequest {
  session_name: string
}

export interface SendMessageRequest {
  message: string
  category?: 'workflow' | 'agent'
  variant?: 'fast' | 'deep' | 'single_rag_agent' | 'supervisor_orchestration_agent'
}
