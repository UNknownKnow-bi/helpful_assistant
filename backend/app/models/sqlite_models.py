from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime

# User Models
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    username: str
    password: str

class User(UserBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    password_hash: str
    created_at: datetime
    active_ai_provider_id: Optional[int] = None

class UserResponse(UserBase):
    id: int
    created_at: datetime
    active_ai_provider_id: Optional[int] = None

# AI Provider Models
class AIProviderBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    provider_type: str = Field(..., min_length=1, max_length=50)
    config: Dict[str, Any] = Field(default_factory=dict)

class AIProviderCreate(AIProviderBase):
    pass

class AIProviderUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class AIProvider(AIProviderBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: int
    is_active: bool = False
    last_tested: Optional[datetime] = None
    created_at: datetime

class AIProviderResponse(AIProviderBase):
    id: int
    is_active: bool
    last_tested: Optional[datetime] = None
    created_at: datetime

# Task Models
class TaskBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)
    deadline: Optional[datetime] = None
    assignee: Optional[str] = None
    priority: str = "medium"  # "low", "medium", "high"
    difficulty: int = Field(default=5, ge=1, le=10)

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    content: Optional[str] = Field(None, min_length=1, max_length=1000)
    deadline: Optional[datetime] = None
    assignee: Optional[str] = None
    priority: Optional[str] = None
    difficulty: Optional[int] = Field(None, ge=1, le=10)
    status: Optional[str] = None

class Task(TaskBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: int
    source: str = "manual"  # "manual", "extension"
    status: str = "pending"  # "pending", "in_progress", "completed"
    created_at: datetime
    updated_at: datetime

class TaskResponse(TaskBase):
    id: int
    source: str
    status: str
    created_at: datetime
    updated_at: datetime

# Chat Models
class ChatSessionBase(BaseModel):
    title: str = "New Chat"

class ChatSessionCreate(ChatSessionBase):
    pass

class ChatSession(ChatSessionBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

class ChatSessionResponse(ChatSessionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    message_count: int

class ChatMessageBase(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str
    thinking: Optional[str] = None

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessage(ChatMessageBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    session_id: int
    timestamp: datetime
    token_usage: Optional[Dict[str, Any]] = None

class ChatMessageResponse(ChatMessageBase):
    id: int
    timestamp: datetime
    token_usage: Optional[Dict[str, Any]] = None

# User Profile Models
class UserProfileBase(BaseModel):
    personality_assessment: Optional[Dict[str, Any]] = None
    work_context: Optional[Dict[str, Any]] = None
    ai_analysis: Optional[str] = None
    knowledge_base: Optional[List[Dict[str, Any]]] = None

class UserProfileCreate(UserProfileBase):
    pass

class UserProfileUpdate(UserProfileBase):
    pass

class UserProfile(UserProfileBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: int
    updated_at: datetime