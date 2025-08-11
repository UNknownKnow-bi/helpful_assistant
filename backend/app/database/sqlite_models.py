from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON, ForeignKey
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
    active_ai_provider_id = Column(Integer, ForeignKey("ai_providers.id"), nullable=True)

    # Relationships
    ai_providers = relationship("AIProvider", back_populates="user", foreign_keys="AIProvider.user_id")
    active_ai_provider = relationship("AIProvider", foreign_keys=[active_ai_provider_id])
    tasks = relationship("Task", back_populates="user")
    chat_sessions = relationship("ChatSession", back_populates="user")

class AIProvider(Base):
    __tablename__ = "ai_providers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    provider_type = Column(String(50), nullable=False)  # "openai", "deepseek", etc.
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
    content = Column(Text, nullable=False)
    deadline = Column(DateTime, nullable=True)
    assignee = Column(String(100), nullable=True)
    priority = Column(String(20), default="medium")  # "low", "medium", "high"
    difficulty = Column(Integer, default=5)  # 1-10 scale
    source = Column(String(20), default="manual")  # "manual", "extension"
    status = Column(String(20), default="pending")  # "pending", "in_progress", "completed"
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

    # Relationships
    session = relationship("ChatSession", back_populates="messages")

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    personality_assessment = Column(JSON, nullable=True)
    work_context = Column(JSON, nullable=True)
    ai_analysis = Column(Text, nullable=True)
    knowledge_base = Column(JSON, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User")