import axios from 'axios'
import type { 
  User, 
  Task, 
  TaskCreate, 
  TaskUpdate, 
  AIProvider, 
  AIProviderCreate, 
  ChatSession, 
  ChatMessage,
  LoginRequest, 
  RegisterRequest, 
  AuthResponse,
  UserProfile,
  UserProfileCreate,
  UserProfileUpdate,
  UserProfileSummary,
  WorkRelationship,
  WorkRelationshipCreate,
  WorkRelationshipUpdate
} from '@/types'

const API_BASE_URL = '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', data)
    return response.data
  },
  
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data)
    return response.data
  },
  
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me')
    return response.data
  },
}

// Tasks API
export const tasksApi = {
  generateFromText: async (text: string): Promise<Task[]> => {
    const response = await api.post('/tasks/generate', { text })
    return response.data
  },
  
  extractTextFromImage: async (file: File): Promise<{
    success: boolean
    extracted_text: string
    message: string
    ocr_method?: string
  }> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/tasks/extract-text-from-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
  
  generateFromImage: async (file: File): Promise<Task[]> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/tasks/generate-from-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
  
  create: async (task: TaskCreate): Promise<Task> => {
    const response = await api.post('/tasks', task)
    return response.data
  },
  
  getAll: async (params?: {
    status?: string
    priority?: string
    skip?: number
    limit?: number
  }): Promise<Task[]> => {
    const response = await api.get('/tasks', { params })
    return response.data
  },
  
  getById: async (id: number): Promise<Task> => {
    const response = await api.get(`/tasks/${id}`)
    return response.data
  },
  
  update: async (id: number, task: TaskUpdate): Promise<Task> => {
    const response = await api.put(`/tasks/${id}`, task)
    return response.data
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/tasks/${id}`)
  },
}

// AI Providers API
export const aiProvidersApi = {
  create: async (provider: AIProviderCreate): Promise<AIProvider> => {
    const response = await api.post('/ai-providers', provider)
    return response.data
  },
  
  getAll: async (): Promise<AIProvider[]> => {
    const response = await api.get('/ai-providers')
    return response.data
  },
  
  update: async (id: number, data: Partial<AIProvider>): Promise<AIProvider> => {
    const response = await api.put(`/ai-providers/${id}`, data)
    return response.data
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/ai-providers/${id}`)
  },
  
  test: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/ai-providers/${id}/test`)
    return response.data
  },
  
  getActive: async (): Promise<AIProvider> => {
    const response = await api.get('/ai-providers/active')
    return response.data
  },
  
  getTextModels: async (): Promise<AIProvider[]> => {
    const response = await api.get('/ai-providers/text-models')
    return response.data
  },
}

// Chat API
export const chatApi = {
  createSession: async (title?: string): Promise<ChatSession> => {
    const response = await api.post('/chat/sessions', { title })
    return response.data
  },
  
  getSessions: async (): Promise<ChatSession[]> => {
    const response = await api.get('/chat/sessions')
    return response.data
  },
  
  getMessages: async (sessionId: number): Promise<ChatMessage[]> => {
    const response = await api.get(`/chat/sessions/${sessionId}/messages`)
    return response.data
  },
  
  deleteSession: async (sessionId: number): Promise<void> => {
    await api.delete(`/chat/sessions/${sessionId}`)
  },
  
  generateTitle: async (sessionId: number, firstMessage: string): Promise<{ title: string }> => {
    const response = await api.post(`/chat/sessions/${sessionId}/generate-title`, { first_message: firstMessage })
    return response.data
  },
  
  renameSession: async (sessionId: number, title: string): Promise<{ title: string }> => {
    const response = await api.put(`/chat/sessions/${sessionId}/title`, { title })
    return response.data
  },
  
  getSessionStatus: async (sessionId: number): Promise<{
    session_id: number
    has_streaming: boolean
    has_interrupted: boolean
    streaming_message?: { id: number; content: string; thinking?: string }
    interrupted_message?: { id: number; content: string; thinking?: string }
    updated_at: string
  }> => {
    const response = await api.get(`/chat/sessions/${sessionId}/status`)
    return response.data
  },
  
  stopChatStream: async (sessionId: number): Promise<{ message: string }> => {
    const response = await api.post(`/chat/sessions/${sessionId}/stop`)
    return response.data
  },
}

// User Profile API
export const userProfileApi = {
  get: async (): Promise<UserProfile> => {
    const response = await api.get('/profile')
    return response.data
  },
  
  createOrUpdate: async (data: UserProfileCreate): Promise<UserProfile> => {
    const response = await api.post('/profile', data)
    return response.data
  },
  
  update: async (data: UserProfileUpdate): Promise<UserProfile> => {
    const response = await api.put('/profile', data)
    return response.data
  },
  
  getSummary: async (): Promise<UserProfileSummary> => {
    const response = await api.get('/profile/summary')
    return response.data
  },
  
  updatePersonalityDimension: async (dimension: string, tags: string[]): Promise<UserProfile> => {
    const response = await api.put(`/profile/personality/${dimension}`, tags)
    return response.data
  },
}

// Work Relationships API
export const workRelationshipsApi = {
  getAll: async (): Promise<WorkRelationship[]> => {
    const response = await api.get('/profile/relationships')
    return response.data
  },
  
  create: async (data: WorkRelationshipCreate): Promise<WorkRelationship> => {
    const response = await api.post('/profile/relationships', data)
    return response.data
  },
  
  update: async (id: number, data: WorkRelationshipUpdate): Promise<WorkRelationship> => {
    const response = await api.put(`/profile/relationships/${id}`, data)
    return response.data
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/profile/relationships/${id}`)
  },
}