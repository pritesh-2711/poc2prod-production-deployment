export interface User {
  user_id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface Session {
  session_id: string;
  user_id: string;
  session_name: string;
  is_active: boolean;
  created_at: string;
  terminated_at?: string;
  preview?: string; // last message snippet for sidebar
}

export interface ChatMessage {
  chat_id: string;
  session_id: string;
  sender: 'user' | 'assistant';
  message: string;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
}

export interface ApiError {
  detail: string;
}
