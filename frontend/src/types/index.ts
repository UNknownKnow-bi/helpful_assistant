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
  category: 'text' | 'image'
  config: Record<string, any>
  is_active: boolean
  last_tested?: string
  created_at: string
}

export interface AIProviderCreate {
  name: string
  provider_type: string
  category: 'text' | 'image'
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

// User Profile Types
export interface WorkRelationship {
  id: number
  coworker_name: string
  relationship_type: '下属' | '同级' | '上级' | '团队负责人' | '公司老板'
  created_at: string
}

export interface WorkRelationshipCreate {
  coworker_name: string
  relationship_type: '下属' | '同级' | '上级' | '团队负责人' | '公司老板'
}

export interface WorkRelationshipUpdate {
  coworker_name?: string
  relationship_type?: '下属' | '同级' | '上级' | '团队负责人' | '公司老板'
}

export interface BigFivePersonality {
  openness: string[]        // 经验开放性
  conscientiousness: string[] // 尽责性
  extraversion: string[]     // 外向性
  agreeableness: string[]    // 宜人性
  neuroticism: string[]      // 神经质
}

export interface UserProfile {
  id: number
  user_id: number
  
  // Basic Info
  name?: string
  work_nickname?: string
  gender?: '男' | '女' | '无性别' | '其他性别'
  job_type?: string
  job_level?: '实习' | '初级' | '中级' | '高级'
  is_manager?: boolean
  
  // Big Five Personality
  personality_openness?: string[]
  personality_conscientiousness?: string[]
  personality_extraversion?: string[]
  personality_agreeableness?: string[]
  personality_neuroticism?: string[]
  
  created_at: string
  updated_at: string
  work_relationships: WorkRelationship[]
}

export interface UserProfileCreate {
  name?: string
  work_nickname?: string
  gender?: '男' | '女' | '无性别' | '其他性别'
  job_type?: string
  job_level?: '实习' | '初级' | '中级' | '高级'
  is_manager?: boolean
  
  personality_openness?: string[]
  personality_conscientiousness?: string[]
  personality_extraversion?: string[]
  personality_agreeableness?: string[]
  personality_neuroticism?: string[]
}

export interface UserProfileUpdate extends UserProfileCreate {}

