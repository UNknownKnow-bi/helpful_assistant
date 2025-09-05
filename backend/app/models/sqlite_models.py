from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, Dict, Any, List
from datetime import datetime
import json

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
    active_text_provider_id: Optional[int] = None
    active_image_provider_id: Optional[int] = None

class UserResponse(UserBase):
    id: int
    created_at: datetime
    active_text_provider_id: Optional[int] = None
    active_image_provider_id: Optional[int] = None

# AI Provider Models
class AIProviderBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    provider_type: str = Field(..., min_length=1, max_length=50)
    category: str = Field(default="text", pattern="^(text|image)$")
    config: Dict[str, Any] = Field(default_factory=dict)

class AIProviderCreate(AIProviderBase):
    pass

class AIProviderUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    category: Optional[str] = Field(None, pattern="^(text|image)$")
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
    title: str = Field(..., min_length=1, max_length=200)  # Brief 8-word summary
    content: str = Field(..., min_length=1, max_length=1000)
    deadline: Optional[datetime] = None
    assignee: Optional[str] = None  # 提出人 (who assigned the task)
    participant: str = "你"  # 参与人 (who participates, default "你")
    urgency: str = "low"  # "low", "high" - 紧迫性
    importance: str = "low"  # "low", "high" - 重要性
    difficulty: int = Field(default=5, ge=1, le=10)

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1, max_length=1000)
    deadline: Optional[datetime] = None
    assignee: Optional[str] = None
    participant: Optional[str] = None
    urgency: Optional[str] = None
    importance: Optional[str] = None
    difficulty: Optional[int] = Field(None, ge=1, le=10)
    status: Optional[str] = None

class Task(TaskBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: int
    source: str = "manual"  # "manual", "extension"
    status: str = "pending"  # "pending", "in_progress", "completed"
    execution_procedures: Optional[List[Dict[str, Any]]] = None  # Task execution guidance from AI
    social_advice: Optional[List[Dict[str, Any]]] = None  # Social intelligence advice from AI
    created_at: datetime
    updated_at: datetime
    
    @field_validator('execution_procedures', mode='before')
    @classmethod
    def parse_execution_procedures(cls, v):
        """Parse execution_procedures from JSON string if needed (for SQLite compatibility)"""
        if v is None:
            return None
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return None
        return v
    
    @field_validator('social_advice', mode='before')
    @classmethod
    def parse_social_advice(cls, v):
        """Parse social_advice from JSON string if needed (for SQLite compatibility)"""
        if v is None:
            return None
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return None
        return v

class TaskResponse(TaskBase):
    id: int
    source: str
    status: str
    execution_procedures: Optional[List[Dict[str, Any]]] = None  # Task execution guidance from AI
    social_advice: Optional[List[Dict[str, Any]]] = None  # Social intelligence advice from AI
    created_at: datetime
    updated_at: datetime
    
    @field_validator('execution_procedures', mode='before')
    @classmethod
    def parse_execution_procedures(cls, v):
        """Parse execution_procedures from JSON string if needed (for SQLite compatibility)"""
        if v is None:
            return None
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return None
        return v
    
    @field_validator('social_advice', mode='before')
    @classmethod
    def parse_social_advice(cls, v):
        """Parse social_advice from JSON string if needed (for SQLite compatibility)"""
        if v is None:
            return None
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return None
        return v

# Task Preview Models for two-stage creation
class TaskPreview(TaskBase):
    """Task preview data returned by AI generation without database storage"""
    pass

class TaskPreviewResponse(BaseModel):
    """Response containing preview tasks that haven't been saved yet"""
    tasks: List[TaskPreview]
    message: str = "任务预览生成成功，请确认后保存"

class TaskConfirmRequest(BaseModel):
    """Request to confirm and save preview tasks"""
    tasks: List[TaskCreate]

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

# Work Relationship Models
class WorkRelationshipBase(BaseModel):
    coworker_name: str = Field(..., min_length=1, max_length=100)
    relationship_type: str = Field(..., pattern="^(下属|同级|上级|团队负责人|公司老板)$")
    
    # Extended colleague information
    work_nickname: Optional[str] = Field(None, max_length=100)  # 工作昵称
    job_type: Optional[str] = Field(None, max_length=200)  # 职位类型 (free text)
    job_level: Optional[str] = Field(None, pattern="^(实习|初级|中级|高级)$")  # 职位级别
    
    # Big Five Personality (tag arrays)
    personality_openness: Optional[List[str]] = Field(default_factory=list)  # 经验开放性
    personality_conscientiousness: Optional[List[str]] = Field(default_factory=list)  # 尽责性
    personality_extraversion: Optional[List[str]] = Field(default_factory=list)  # 外向性
    personality_agreeableness: Optional[List[str]] = Field(default_factory=list)  # 宜人性
    personality_neuroticism: Optional[List[str]] = Field(default_factory=list)  # 神经质

class WorkRelationshipCreate(WorkRelationshipBase):
    pass

class WorkRelationshipUpdate(BaseModel):
    coworker_name: Optional[str] = Field(None, min_length=1, max_length=100)
    relationship_type: Optional[str] = Field(None, pattern="^(下属|同级|上级|团队负责人|公司老板)$")
    
    # Extended colleague information
    work_nickname: Optional[str] = Field(None, max_length=100)
    job_type: Optional[str] = Field(None, max_length=200)
    job_level: Optional[str] = Field(None, pattern="^(实习|初级|中级|高级)$")
    
    # Big Five Personality (tag arrays)
    personality_openness: Optional[List[str]] = None
    personality_conscientiousness: Optional[List[str]] = None
    personality_extraversion: Optional[List[str]] = None
    personality_agreeableness: Optional[List[str]] = None
    personality_neuroticism: Optional[List[str]] = None

class WorkRelationship(WorkRelationshipBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_profile_id: int
    created_at: datetime
    updated_at: datetime

class WorkRelationshipResponse(WorkRelationshipBase):
    id: int
    created_at: datetime
    updated_at: datetime

# User Profile Models
class UserProfileBase(BaseModel):
    # Basic Info
    name: Optional[str] = Field(None, max_length=100)
    work_nickname: Optional[str] = Field(None, max_length=100)
    gender: Optional[str] = Field(None, max_length=50)
    job_type: Optional[str] = Field(None, max_length=200)  # Free text
    job_level: Optional[str] = Field(None, pattern="^(实习|初级|中级|高级)$")
    is_manager: Optional[bool] = False
    
    # Big Five Personality (tag arrays)
    personality_openness: Optional[List[str]] = Field(default_factory=list)  # 经验开放性
    personality_conscientiousness: Optional[List[str]] = Field(default_factory=list)  # 尽责性
    personality_extraversion: Optional[List[str]] = Field(default_factory=list)  # 外向性
    personality_agreeableness: Optional[List[str]] = Field(default_factory=list)  # 宜人性
    personality_neuroticism: Optional[List[str]] = Field(default_factory=list)  # 神经质
    
    # Legacy fields (for backward compatibility)
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
    created_at: datetime
    updated_at: datetime
    work_relationships: List[WorkRelationshipResponse] = Field(default_factory=list)

class UserProfileResponse(UserProfileBase):
    id: int
    created_at: datetime
    updated_at: datetime
    work_relationships: List[WorkRelationshipResponse] = Field(default_factory=list)

