from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional
from datetime import datetime
from enum import Enum
from bson import ObjectId
from app.models.user import PyObjectId

class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class TaskSource(str, Enum):
    MANUAL = "manual"
    EXTENSION = "extension"

class Task(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    content: str = Field(..., min_length=1, max_length=1000)
    deadline: Optional[datetime] = None
    assignee: Optional[str] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    difficulty: int = Field(default=5, ge=1, le=10)
    source: TaskSource = TaskSource.MANUAL
    status: TaskStatus = TaskStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator('id', 'user_id', mode='before')
    @classmethod
    def validate_object_id(cls, v):
        if v is None:
            return v
        if isinstance(v, ObjectId):
            return v
        if isinstance(v, str) and ObjectId.is_valid(v):
            return ObjectId(v)
        raise ValueError('Invalid ObjectId')

class TaskCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)
    deadline: Optional[datetime] = None
    assignee: Optional[str] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    difficulty: int = Field(default=5, ge=1, le=10)

class TaskUpdate(BaseModel):
    content: Optional[str] = Field(None, min_length=1, max_length=1000)
    deadline: Optional[datetime] = None
    assignee: Optional[str] = None
    priority: Optional[TaskPriority] = None
    difficulty: Optional[int] = Field(None, ge=1, le=10)
    status: Optional[TaskStatus] = None

class TaskResponse(BaseModel):
    id: str
    content: str
    deadline: Optional[datetime] = None
    assignee: Optional[str] = None
    priority: TaskPriority
    difficulty: int
    source: TaskSource
    status: TaskStatus
    created_at: datetime
    updated_at: datetime