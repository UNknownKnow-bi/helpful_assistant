export interface User {
  id: number
  username: string
  created_at: string
  active_ai_provider_id?: number
}

export interface Task {
  id: number
  content: string
  deadline?: string
  assignee?: string
  priority: 'low' | 'medium' | 'high'
  difficulty: number
  source: 'manual' | 'extension'
  status: 'pending' | 'in_progress' | 'completed'
  created_at: string
  updated_at: string
}

export interface TaskCreate {
  content: string
  deadline?: string
  assignee?: string
  priority?: 'low' | 'medium' | 'high'
  difficulty?: number
}

export interface TaskUpdate {
  content?: string
  deadline?: string
  assignee?: string
  priority?: 'low' | 'medium' | 'high'
  difficulty?: number
  status?: 'pending' | 'in_progress' | 'completed'
}

export interface AIProvider {
  id: number
  name: string
  provider_type: string
  config: Record<string, any>
  is_active: boolean
  last_tested?: string
  created_at: string
}

export interface AIProviderCreate {
  name: string
  provider_type: string
  config: Record<string, any>
}

export interface ChatSession {
  id: number
  title: string
  created_at: string
  updated_at: string
  message_count: number
}

export interface ChatMessage {
  id: number | string
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  timestamp: string
  token_usage?: Record<string, any>
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  message: string
}