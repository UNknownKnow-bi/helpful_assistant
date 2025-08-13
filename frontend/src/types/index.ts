export interface User {
  id: number
  username: string
  created_at: string
  active_ai_provider_id?: number
}

export interface Task {
  id: number
  title: string
  content: string
  deadline?: string
  assignee?: string  // 提出人 (who assigned the task)
  participant: string  // 参与人 (who participates, default "你")
  urgency: 'low' | 'high'  // 紧迫性
  importance: 'low' | 'high'  // 重要性
  difficulty: number
  source: 'manual' | 'extension' | 'ai_generated'
  status: 'pending' | 'in_progress' | 'completed'
  created_at: string
  updated_at: string
}

export interface TaskCreate {
  title: string
  content: string
  deadline?: string
  assignee?: string
  participant?: string
  urgency?: 'low' | 'high'
  importance?: 'low' | 'high'
  difficulty?: number
}

export interface TaskUpdate {
  title?: string
  content?: string
  deadline?: string
  assignee?: string
  participant?: string
  urgency?: 'low' | 'high'
  importance?: 'low' | 'high'
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
  streaming_status?: 'streaming' | 'completed' | 'interrupted'
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