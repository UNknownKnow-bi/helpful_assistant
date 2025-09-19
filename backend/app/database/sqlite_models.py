from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON, ForeignKey, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(128), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    active_text_provider_id = Column(Integer, ForeignKey("ai_providers.id"), nullable=True)
    active_image_provider_id = Column(Integer, ForeignKey("ai_providers.id"), nullable=True)

    # Relationships
    ai_providers = relationship("AIProvider", back_populates="user", foreign_keys="AIProvider.user_id")
    active_text_provider = relationship("AIProvider", foreign_keys=[active_text_provider_id])
    active_image_provider = relationship("AIProvider", foreign_keys=[active_image_provider_id])
    tasks = relationship("Task", back_populates="user")
    chat_sessions = relationship("ChatSession", back_populates="user")

class AIProvider(Base):
    __tablename__ = "ai_providers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    provider_type = Column(String(50), nullable=False)  # "openai", "deepseek", "imageOCR"
    category = Column(String(20), nullable=False, default="text")  # "text" or "image"
    config = Column(JSON, nullable=False)
    is_active = Column(Boolean, default=False)
    last_tested = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="ai_providers", foreign_keys=[user_id])

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)  # Brief 8-word summary
    content = Column(Text, nullable=False)
    deadline = Column(DateTime, nullable=True)
    assignee = Column(String(100), nullable=True)  # 提出人 (who assigned the task)
    participant = Column(String(100), default="你")  # 参与人 (who participates, default "你")
    urgency = Column(String(20), default="low")  # "low", "high" - 紧迫性
    importance = Column(String(20), default="low")  # "low", "high" - 重要性
    difficulty = Column(Integer, default=5)  # 1-10 scale
    cost_time_hours = Column(Float, default=2.0)  # Estimated time in hours (supports decimals like 0.5, 1.5, 2.5)
    source = Column(String(20), default="manual")  # "manual", "extension"
    status = Column(String(20), default="undo")  # "undo", "done"
    execution_procedures = Column(Text, nullable=True)  # Task execution guidance from AI (JSON string)
    social_advice = Column(Text, nullable=True)  # Social intelligence advice from AI (JSON string)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="tasks")

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), default="New Chat")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    message_count = Column(Integer, default=0)

    # Relationships
    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    role = Column(String(20), nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    thinking = Column(Text, nullable=True)  # For reasoning models
    timestamp = Column(DateTime, default=datetime.utcnow)
    token_usage = Column(JSON, nullable=True)
    streaming_status = Column(String(20), default="completed")  # "streaming", "completed", "interrupted"

    # Relationships
    session = relationship("ChatSession", back_populates="messages")

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    
    # Basic Info
    name = Column(String(100), nullable=True)
    work_nickname = Column(String(100), nullable=True)
    gender = Column(String(20), nullable=True)  # 男|女|无性别|其他性别
    job_type = Column(String(200), nullable=True)  # Free text like '产品运营', '数据分析师'
    job_level = Column(String(20), nullable=True)  # 实习|初级|中级|高级
    is_manager = Column(Boolean, default=False)
    
    # Big Five Personality (JSON arrays for tags)
    personality_openness = Column(JSON, default=list)  # 经验开放性 tags
    personality_conscientiousness = Column(JSON, default=list)  # 尽责性 tags
    personality_extraversion = Column(JSON, default=list)  # 外向性 tags
    personality_agreeableness = Column(JSON, default=list)  # 宜人性 tags
    personality_neuroticism = Column(JSON, default=list)  # 神经质 tags
    
    # Legacy fields (keeping for backward compatibility)
    personality_assessment = Column(JSON, nullable=True)
    work_context = Column(JSON, nullable=True)
    ai_analysis = Column(Text, nullable=True)
    knowledge_base = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User")
    work_relationships = relationship("WorkRelationship", back_populates="user_profile", cascade="all, delete-orphan")

class WorkRelationship(Base):
    __tablename__ = "work_relationships"

    id = Column(Integer, primary_key=True, index=True)
    user_profile_id = Column(Integer, ForeignKey("user_profiles.id"), nullable=False)
    coworker_name = Column(String(100), nullable=False)
    relationship_type = Column(String(50), nullable=False)  # 下属|同级|上级|团队负责人|公司老板
    
    # Extended colleague information
    work_nickname = Column(String(100), nullable=True)  # 工作昵称
    job_type = Column(String(200), nullable=True)  # 职位类型 (free text)
    job_level = Column(String(20), nullable=True)  # 职位级别: 实习|初级|中级|高级
    
    # Big Five Personality (JSON arrays for tags)
    personality_openness = Column(JSON, default=list)  # 经验开放性 tags
    personality_conscientiousness = Column(JSON, default=list)  # 尽责性 tags
    personality_extraversion = Column(JSON, default=list)  # 外向性 tags
    personality_agreeableness = Column(JSON, default=list)  # 宜人性 tags
    personality_neuroticism = Column(JSON, default=list)  # 神经质 tags
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user_profile = relationship("UserProfile", back_populates="work_relationships")

class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    scheduled_start_time = Column(DateTime, nullable=False)  # When to start the task
    scheduled_end_time = Column(DateTime, nullable=False)    # When to end the task
    event_type = Column(String(20), default="work")  # "work", "break", "meeting"
    ai_reasoning = Column(Text, nullable=True)  # AI explanation for the scheduling decision
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User")
    task = relationship("Task")