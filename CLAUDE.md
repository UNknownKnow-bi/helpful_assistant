# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "智时助手 (Cortex Assistant)" - an AI-powered intelligent assistant for Chinese knowledge workers. The application provides AI-driven task management, configurable AI services, conversational AI interface, and personalized user profiling through psychology-based assessments.

## Architecture

The system follows a clean frontend/backend separation architecture:
- **Frontend**: React-based SPA providing intuitive Chinese UI
- **Backend**: FastAPI-based REST API server handling business logic
- **Database**: SQLite for local persistent storage of user data, tasks, and profiles
- **AI Integration**: Multi-provider support (DeepSeek, OpenAI-compatible APIs) via LangChain
- **Browser Extension**: Optional component for task capture from web pages

## Tech Stack

### Frontend
- React 18+ with TypeScript 5+
- Vite for build tooling and development
- Tailwind CSS 3+ for styling
- shadcn/ui component library
- Zustand for state management
- React Query for API data fetching

### Backend
- FastAPI (Python 3.11+) for REST API
- Pydantic for data validation and serialization
- SQLAlchemy ORM with async SQLite for database operations
- HTTPx for direct AI provider integration and streaming
- JWT for authentication
- WebSockets for real-time streaming

### Database
- SQLite for local relational database storage
- SQLAlchemy ORM for data modeling and migrations
- Persistent chat sessions and user data

### Tools
- pnpm as package manager
- ESLint + Prettier for code standards
- Black + isort for Python formatting
- GitHub Actions for CI/CD
- Context7 MCP for accessing latest documentation

## Project Structure

```
helpful-assistant/
├── frontend/                      # React SPA
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   │   └── ui/               # shadcn/ui components
│   │   ├── pages/               # Page components
│   │   │   ├── Dashboard.tsx     # Main dashboard
│   │   │   ├── Chat.tsx         # Real-time chat interface
│   │   │   ├── AIConfig.tsx     # AI provider configuration
│   │   │   ├── Login.tsx        # User authentication
│   │   │   └── Register.tsx     # User registration
│   │   ├── hooks/               # Custom React hooks
│   │   ├── services/            # API client functions
│   │   ├── stores/              # Zustand state management
│   │   ├── types/               # TypeScript definitions
│   │   └── lib/                 # Utility functions
├── backend/                       # FastAPI server
│   ├── app/
│   │   ├── api/                 # SQLite-based API routes
│   │   │   ├── auth_sqlite.py    # User authentication
│   │   │   ├── ai_providers_sqlite.py # AI provider management
│   │   │   └── chat_sqlite.py    # Real-time chat with WebSocket
│   │   ├── core/                # Core configurations
│   │   │   ├── auth_sqlite.py    # Authentication logic
│   │   │   ├── config.py        # Settings and configuration
│   │   │   └── security.py      # Security utilities
│   │   ├── database/            # SQLite database layer
│   │   │   ├── sqlite_connection.py # Database connection
│   │   │   └── sqlite_models.py  # SQLAlchemy ORM models
│   │   ├── models/              # Pydantic models
│   │   │   └── sqlite_models.py  # Request/response models
│   │   ├── services/            # Business logic services
│   │   │   └── ai_service_sqlite.py # AI provider integration
│   │   ├── data/                # SQLite database files
│   │   └── main.py              # FastAPI application entry
└── CLAUDE.md                     # Project documentation
```

## Core Features

### 1. AI Task Card Generation (任务卡片生成)

**Functionality:**
- Accept Chinese text input from users
- Use AI to parse and extract task information
- Generate structured task cards with predefined JSON schema
- Support task properties: content, deadline (DDL), assignee, priority, difficulty
- Controlled by specific prompts to ensure consistent JSON output format

**API Endpoints:**
- `POST /api/tasks/generate` - Generate task card from text
- `GET /api/tasks/{task_id}` - Retrieve specific task
- `PUT /api/tasks/{task_id}` - Update task information
- `DELETE /api/tasks/{task_id}` - Delete task

**JSON Schema:**
```json
{
  "content": "string",
  "deadline": "ISO datetime",
  "assignee": "string", 
  "priority": "low|medium|high",
  "difficulty": "number (1-10)",
  "source": "manual|extension",
  "status": "pending|in_progress|completed"
}
```

### 2. AI Service Configuration (AI配置)

**Functionality:**
- Support multiple AI providers: DeepSeek, OpenAI-compatible APIs
- User-friendly configuration interface for API keys and endpoints
- Configurable parameters: temperature, max_tokens, model selection
- Built-in testing functionality with simple "OK" response or ping tests
- Persistent configuration storage in SQLite database with auto-loading
- HTTPx-based direct AI provider integration for better performance
- DeepSeek reasoning model support with real-time thinking visualization

**API Endpoints:**
- `POST /api/ai-providers` - Add new AI provider configuration
- `GET /api/ai-providers` - List configured providers
- `PUT /api/ai-providers/{provider_id}` - Update provider config
- `POST /api/ai-providers/{provider_id}/test` - Test provider connection
- `GET /api/ai-providers/active` - Get active provider configuration

**Configuration Schema:**
```json
{
  "provider_name": "string",
  "api_key": "string",
  "base_url": "string",
  "model": "string",
  "temperature": "number (0-2)",
  "max_tokens": "number",
  "stream": "boolean",
  "is_active": "boolean"
}
```

### 3. AI Chat Interface (AI问答界面)

**Functionality:**
- Independent chat interface as a separate page/module
- Real-time streaming responses using WebSockets
- Full markdown support for rich text formatting
- DeepSeek reasoning model support with `reasoning_content` field
- Real-time thinking process visualization in collapsible UI blocks
- Support for both `<think>` tags and native reasoning content
- Persistent chat sessions stored in SQLite database
- Chat history storage and retrieval with full context
- Real-time streaming with optimized WebSocket performance

**API Endpoints:**
- `WebSocket /api/chat/ws/{session_id}` - Real-time chat streaming
- `POST /api/chat/sessions` - Create new chat session
- `GET /api/chat/sessions` - List user's chat sessions
- `GET /api/chat/sessions/{session_id}/messages` - Get chat history
- `DELETE /api/chat/sessions/{session_id}` - Delete chat session

**Message Schema:**
```json
{
  "role": "user|assistant",
  "content": "string",
  "thinking": "string|null",
  "timestamp": "ISO datetime",
  "token_usage": "object"
}
```

### 4. User Personality Learning (用户个性学习)

**Functionality:**
- Psychology-based questionnaire system for work habit assessment
- User profiling including: personality type, work style, collaboration preferences
- Work type classification (Development, Product, Operations, etc.)
- Team dynamics assessment (colleague personalities and interaction patterns)
- Task difficulty evaluation based on user profile and context
- Knowledge base storage of user insights and AI analysis
- Continuous learning from user interactions and feedback

**Components:**
- **Questionnaire Engine**: Configurable psychology assessment forms
- **Profile Analysis**: AI-powered analysis of questionnaire results
- **Knowledge Base**: Structured storage of user characteristics and insights
- **Task Difficulty Estimator**: Context-aware task complexity evaluation

**API Endpoints:**
- `POST /api/profile/questionnaire` - Submit questionnaire responses
- `GET /api/profile/questionnaire/templates` - Available questionnaire templates
- `GET /api/profile/analysis` - Get user personality analysis
- `PUT /api/profile/work-context` - Update work environment information
- `POST /api/profile/task-difficulty` - Estimate task difficulty for user

**Profile Schema:**
```json
{
  "personality_type": "string",
  "work_style": "object",
  "collaboration_preferences": "array",
  "work_type": "development|product|operations|management",
  "team_context": "object",
  "difficulty_factors": "object",
  "learning_insights": "array"
}
```

## Development Tools

- **Context7 MCP**: Access to latest FastAPI documentation and best practices
- **AI Integration**: HTTPx-based direct provider integration for optimal performance
- **API Documentation**: Auto-generated OpenAPI/Swagger documentation
- **Type Safety**: Full TypeScript for frontend, Pydantic for backend validation
- **Database**: SQLAlchemy ORM with async SQLite for data persistence

## Data Models

### Users
```python
class User(BaseModel):
    id: int
    email: str
    username: str
    created_at: datetime
    profile_setup_completed: bool = False
    active_ai_provider_id: int | None = None
```

### Tasks
```python
class Task(BaseModel):
    id: int
    user_id: int
    content: str
    deadline: datetime | None
    assignee: str | None
    priority: TaskPriority
    difficulty: int  # 1-10 scale
    source: TaskSource
    status: TaskStatus
    created_at: datetime
    updated_at: datetime
```

### AI Providers
```python
class AIProvider(BaseModel):
    id: int
    user_id: int
    name: str
    provider_type: str  # "openai", "deepseek", etc.
    config: Dict[str, Any]
    is_active: bool
    last_tested: datetime | None
```

### User Profiles
```python
class UserProfile(BaseModel):
    id: int
    user_id: int
    personality_assessment: Dict[str, Any]
    work_context: Dict[str, Any]
    ai_analysis: str
    knowledge_base: List[Dict[str, Any]]
    updated_at: datetime
```

## Implementation Status

### ✅ Recent Updates (January 2025)

**Complete SQLite Migration & Task Management Implementation:**
1. **Database Migration from MongoDB to SQLite**
   - Migrated all data models to SQLite using SQLAlchemy ORM
   - Updated connection management with proper session handling
   - Maintained data integrity during migration process

2. **AI Service Architecture Overhaul**
   - Replaced LangChain with direct HTTPx implementation for better control
   - Improved streaming performance and error handling
   - Added DeepSeek reasoning model support with `reasoning_content` field
   - Enhanced provider configuration and testing with SQLite persistence

3. **Chat Interface Full Implementation**
   - Complete WebSocket-based real-time chat functionality
   - SQLite-backed persistent chat sessions and message history
   - Integrated AI provider selection and configuration
   - Support for markdown rendering and thinking blocks display

4. **Complete Task Management System Implementation**
   - AI-powered task extraction from Chinese text with multi-task support
   - Advanced JSON parsing supporting both single tasks and task arrays
   - Intelligent task parsing with deadline interpretation, assignee detection, priority inference
   - Complete task CRUD operations with filtering and search
   - Task card UI components with shadcn/ui integration
   - Real-time task generation with immediate database persistence

5. **API Route Architecture**
   - Created separate SQLite-specific API modules (auth_sqlite, ai_providers_sqlite, chat_sqlite, task_sqlite)
   - Proper dependency injection for database sessions
   - Comprehensive error handling and validation
   - Multi-task generation endpoint with batch processing

### ✅ Completed Foundation Setup (Week 1)
The basic foundation has been fully implemented:

1. **FastAPI Backend Structure**
   - Complete backend setup with proper project structure
   - CORS configuration for frontend integration
   - Environment configuration with Pydantic settings
   - SQLite database setup with async SQLAlchemy ORM

2. **Database Models**
   - User model with JWT authentication support
   - Task model with priority, status, and difficulty tracking
   - AI Provider model for multi-provider configuration
   - Chat Session model for conversation management

3. **Authentication System** 
   - Simple username/password registration and login
   - JWT token-based authentication with secure password hashing
   - Proper token validation and user session management

4. **AI Service Integration**
   - HTTPx-based AI provider abstraction with SQLite persistence
   - Support for multiple providers (OpenAI, DeepSeek) with database storage
   - Real-time streaming responses via WebSocket connections
   - Configurable AI parameters (temperature, max_tokens, model selection)
   - Connection testing functionality with proper error handling
   - DeepSeek reasoning model support with `reasoning_content` visualization

5. **AI Chat Interface**
   - Real-time WebSocket streaming chat implementation with SQLite backend
   - Session management with persistent chat history in SQLite
   - Full integration with configured AI providers via SQLite
   - Support for reasoning model thinking blocks display
   - Complete CRUD operations for chat sessions and messages

6. **Task Generation & Management**
   - Complete task structure implemented in SQLite models
   - Full task API endpoints connected to main routes with multi-task support
   - AI-powered task generation from Chinese text with intelligent parsing
   - Manual task creation with complete CRUD operations
   - Task filtering and search with status and priority filters
   - Advanced task card UI with priority visualization and difficulty indicators

7. **Modern Frontend**
   - React 18 with TypeScript and Vite setup
   - Tailwind CSS styling with responsive design
   - Zustand state management for authentication
   - React Query for efficient API data fetching
   - Complete UI for all implemented features

### 🔄 Current Architecture
All core foundation components are operational with:
- FastAPI backend serving REST APIs and WebSocket connections
- React frontend with complete authentication flow
- SQLite database with proper relational data models (fully migrated from MongoDB)
- HTTPx-based AI service integration (migrated from LangChain for better control)
- WebSocket streaming for real-time chat functionality with SQLite persistence

## Development Phases

1. **Foundation Setup** (Week 1): ✅ **COMPLETED** - FastAPI backend setup, database models, authentication
2. **AI Service Layer** (Week 2): ✅ **COMPLETED** - HTTPx integration, provider management, streaming, SQLite migration
3. **Task Generation** (Week 3): ✅ **COMPLETED** - Full AI-powered multi-task generation, CRUD operations, UI integration
4. **Chat Interface** (Week 4): ✅ **COMPLETED** - Real-time chat, WebSocket streaming, thinking blocks, SQLite persistence
5. **User Profiling** (Week 5): ⏳ **PENDING** - Questionnaire system, analysis engine, difficulty estimation
6. **Frontend Integration** (Week 6): ✅ **COMPLETED** - Complete UI with task management, chat integration, responsive design
7. **Testing & Polish** (Week 7-8): ⏳ **PENDING** - End-to-end testing, performance optimization, deployment

## Next Priority Tasks

1. **User Profiling System** (Week 5 Priority)
   - Design psychology-based questionnaire system for work style assessment
   - Implement AI-powered user analysis based on questionnaire responses
   - Create task difficulty estimation algorithm based on user profiles
   - Add team dynamics assessment and collaboration preferences
   - Integrate profiling results into task generation for personalized difficulty scoring

2. **Advanced Task Features** 
   - Task dependencies and subtask management
   - Task templates and recurring task patterns
   - Task performance analytics and completion tracking
   - Integration with calendar systems for deadline management

3. **System Polish & Optimization**
   - Comprehensive end-to-end testing across all features
   - Performance optimization for large-scale task management
   - Enhanced error handling and user feedback systems
   - Deployment preparation and production optimization

## Major Accomplishments Summary

**✅ Fully Operational Core System:**
- Complete user authentication and AI provider configuration
- Real-time chat interface with DeepSeek reasoning model support
- **Advanced multi-task generation from Chinese text with intelligent parsing**
- Full task lifecycle management (create, read, update, delete)
- Responsive frontend with modern UI components
- SQLite-based data persistence with proper database architecture

**🎯 Current System Capabilities:**
- Extract multiple tasks from complex Chinese conversations
- Automatically parse deadlines, assignees, priorities, and difficulty levels
- Support both single and multi-task generation in one API call
- Real-time AI chat with thinking process visualization
- Complete task management dashboard with filtering and search
- Seamless integration between AI services and task management