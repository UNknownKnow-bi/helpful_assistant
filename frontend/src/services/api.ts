import axios from 'axios'
import type { 
  User, 
  Task, 
  TaskCreate, 
  TaskUpdate, 
  TaskPreview,
  TaskPreviewResponse,
  TaskConfirmRequest,
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
  WorkRelationship,
  WorkRelationshipCreate,
  WorkRelationshipUpdate,
  CalendarEvent,
  TaskScheduleRequest,
  TaskScheduleResponse,
  CalendarSettings,
  CalendarSettingsUpdate,
  ProcedureMemorandum,
  ProcedureMemorandumCreate,
  ProcedureMemorandumUpdate
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

// Response interceptor to handle auth errors with token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    // Handle 401/403 unauthorized errors with token refresh
    // Skip refresh for login and register endpoints
    if ((error.response?.status === 401 || error.response?.status === 403) && 
        !originalRequest._retry && 
        !originalRequest.url?.includes('/auth/login') && 
        !originalRequest.url?.includes('/auth/register')) {
      originalRequest._retry = true
      
      try {
        // Try to refresh token (backend now accepts expired tokens)
        const refreshResponse = await api.post('/auth/refresh')
        const newToken = refreshResponse.data.access_token
        
        // Update stored token
        localStorage.setItem('access_token', newToken)
        
        // Update the original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        
        console.log('Token refreshed successfully, retrying original request')
        
        // Retry the original request
        return api(originalRequest)
      } catch (refreshError) {
        // If refresh fails, force logout
        console.log('Token refresh failed, logging out user')
        localStorage.removeItem('access_token')
        
        // Clear auth state from store
        try {
          const { useAuthStore } = await import('@/stores/authStore')
          useAuthStore.getState().logout()
        } catch (error) {
          console.warn('Failed to clear auth store state:', error)
        }
        
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }
    
    // For other 401 errors after retry or non-auth errors
    // Skip logout redirect for login and register endpoints
    if (error.response?.status === 401 && 
        !originalRequest.url?.includes('/auth/login') && 
        !originalRequest.url?.includes('/auth/register')) {
      console.log('Authentication failed, logging out user')
      localStorage.removeItem('access_token')
      
      // Clear auth state from store
      try {
        const { useAuthStore } = await import('@/stores/authStore')
        useAuthStore.getState().logout()
      } catch (error) {
        console.warn('Failed to clear auth store state:', error)
      }
      
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
    console.log('🔐 Login request data:', data)
    try {
      const response = await api.post('/auth/login', data)
      console.log('✅ Login response:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Login error:', error)
      throw error
    }
  },
  
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me')
    return response.data
  },
  
  refreshToken: async (): Promise<AuthResponse> => {
    const response = await api.post('/auth/refresh')
    return response.data
  },
}

// Tasks API
export const tasksApi = {
  generateFromText: async (text: string): Promise<Task[]> => {
    const response = await api.post('/tasks/generate', { text })
    return response.data
  },

  generatePreview: async (text: string): Promise<TaskPreviewResponse> => {
    const response = await api.post('/tasks/generate-preview', { text })
    return response.data
  },

  confirmTasks: async (tasks: TaskCreate[]): Promise<Task[]> => {
    const response = await api.post('/tasks/confirm-tasks', { tasks })
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
  
  updateStatus: async (id: number, status: 'undo' | 'done'): Promise<Task> => {
    const response = await api.patch(`/tasks/${id}/status`, { status })
    return response.data
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/tasks/${id}`)
  },
  
  getExecutionProcedures: async (id: number): Promise<{
    task_id: number
    execution_procedures: Array<{
      procedure_number: number
      procedure_content: string
      key_result: string
    }>
    has_procedures: boolean
  }> => {
    const response = await api.get(`/tasks/${id}/execution-procedures`)
    return response.data
  },
  
  getSocialAdvice: async (id: number): Promise<{
    task_id: number
    social_advice: Array<{
      procedure_number: number
      procedure_content: string
      social_advice: string | null
    }>
    has_advice: boolean
  }> => {
    const response = await api.get(`/tasks/${id}/social-advice`)
    return response.data
  },
  
  generateSocialAdvice: async (id: number): Promise<{
    task_id: number
    social_advice: Array<{
      procedure_number: number
      procedure_content: string
      social_advice: string | null
    }>
    message: string
  }> => {
    const response = await api.post(`/tasks/${id}/generate-social-advice`)
    return response.data
  },

  regenerateExecutionProcedures: async (id: number): Promise<{
    task_id: number
    execution_procedures: Array<{
      procedure_number: number
      procedure_content: string
      key_result: string
      completed: boolean
    }>
    message: string
  }> => {
    const response = await api.post(`/tasks/${id}/regenerate-execution-procedures`)
    return response.data
  },
  
  updateExecutionProcedure: async (
    taskId: number, 
    procedureNumber: number, 
    updates: {
      completed?: boolean
      procedure_content?: string
      key_result?: string
    }
  ): Promise<{
    task_id: number
    procedure_number: number
    message: string
    updated_procedure: {
      procedure_number: number
      procedure_content: string
      key_result: string
      completed?: boolean
    }
  }> => {
    const response = await api.patch(`/tasks/${taskId}/execution-procedures/${procedureNumber}`, updates)
    return response.data
  },
  
  deleteExecutionProcedure: async (taskId: number, procedureNumber: number): Promise<{
    task_id: number
    deleted_procedure_number: number
    remaining_procedures: number
    message: string
  }> => {
    const response = await api.delete(`/tasks/${taskId}/execution-procedures/${procedureNumber}`)
    return response.data
  },

  // Procedure Memorandum APIs
  getProcedureMemorandum: async (taskId: number, procedureNumber: number): Promise<ProcedureMemorandum> => {
    const response = await api.get(`/tasks/${taskId}/procedures/${procedureNumber}/memorandum`)
    return response.data
  },

  createProcedureMemorandum: async (taskId: number, procedureNumber: number, memorandumText: string): Promise<ProcedureMemorandum> => {
    const response = await api.post(`/tasks/${taskId}/procedures/${procedureNumber}/memorandum`, {
      task_id: taskId,
      procedure_number: procedureNumber,
      memorandum_text: memorandumText
    })
    return response.data
  },

  updateProcedureMemorandum: async (taskId: number, procedureNumber: number, memorandumText: string): Promise<ProcedureMemorandum> => {
    const response = await api.put(`/tasks/${taskId}/procedures/${procedureNumber}/memorandum`, {
      memorandum_text: memorandumText
    })
    return response.data
  },

  deleteProcedureMemorandum: async (taskId: number, procedureNumber: number): Promise<{
    task_id: number
    procedure_number: number
    message: string
  }> => {
    const response = await api.delete(`/tasks/${taskId}/procedures/${procedureNumber}/memorandum`)
    return response.data
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
    const response = await api.get('/profile/')
    return response.data
  },
  
  createOrUpdate: async (data: UserProfileCreate): Promise<UserProfile> => {
    const response = await api.post('/profile/', data)
    return response.data
  },
  
  update: async (data: UserProfileUpdate): Promise<UserProfile> => {
    const response = await api.put('/profile/', data)
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

// Calendar API
export const calendarApi = {
  scheduleTasksWithAI: async (request: TaskScheduleRequest): Promise<TaskScheduleResponse> => {
    const response = await api.post('/calendar/schedule-tasks', request)
    return response.data
  },

  getEvents: async (startDate?: string, endDate?: string): Promise<CalendarEvent[]> => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    
    const response = await api.get(`/calendar/events?${params}`)
    return response.data
  },

  clearEvents: async (startDate?: string, endDate?: string): Promise<{ message: string }> => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    
    const response = await api.delete(`/calendar/events?${params}`)
    return response.data
  },

  updateEvent: async (id: number, data: Partial<CalendarEvent>): Promise<CalendarEvent> => {
    const response = await api.put(`/calendar/events/${id}`, data)
    return response.data
  },

  deleteEvent: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/calendar/events/${id}`)
    return response.data
  },

  // Calendar Settings
  getSettings: async (): Promise<CalendarSettings> => {
    const response = await api.get('/calendar/settings')
    return response.data
  },

  updateSettings: async (data: CalendarSettingsUpdate): Promise<CalendarSettings> => {
    const response = await api.put('/calendar/settings', data)
    return response.data
  },
}

// Feishu Webhook API
export const feishuWebhookApi = {
  getSettings: async () => {
    const response = await api.get('/feishu-webhook')
    return response.data
  },

  createSettings: async (settings: any) => {
    const response = await api.post('/feishu-webhook', settings)
    return response.data
  },

  updateSettings: async (settings: any) => {
    const response = await api.put('/feishu-webhook', settings)
    return response.data
  },

  deleteSettings: async () => {
    const response = await api.delete('/feishu-webhook')
    return response.data
  },

  testWebhook: async (testRequest?: any) => {
    const response = await api.post('/feishu-webhook/test', testRequest || {})
    return response.data
  },

  sendNotification: async (notificationData: any) => {
    const response = await api.post('/feishu-webhook/send-notification', notificationData)
    return response.data
  }
}

