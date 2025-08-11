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
- SQLAlchemy with async SQLite for database operations
- LangChain for AI provider abstraction and streaming
- JWT for authentication
- WebSockets for real-time streaming

### Database
- SQLite for local relational database storage
- File-based session management (optional Redis for caching)

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
│   │   │   ├── TaskCard/         # Task card display components
│   │   │   ├── Chat/            # AI chat interface
│   │   │   ├── Settings/        # AI configuration components
│   │   │   └── Profile/         # User profiling components
│   │   ├── pages/               # Page components
│   │   │   ├── TaskGenerator/   # Task generation interface
│   │   │   ├── AIConfig/        # AI service configuration
│   │   │   ├── ChatInterface/   # Independent chat interface
│   │   │   └── ProfileSetup/    # User personality assessment
│   │   ├── hooks/               # Custom React hooks
│   │   ├── services/            # API client functions
│   │   ├── stores/              # Zustand state management
│   │   ├── types/               # TypeScript definitions
│   │   └── utils/               # Utility functions
├── backend/                       # FastAPI server
│   ├── app/
│   │   ├── api/                 # API route handlers
│   │   │   ├── tasks/           # Task-related endpoints
│   │   │   ├── ai_config/       # AI configuration endpoints
│   │   │   ├── chat/            # Chat streaming endpoints
│   │   │   └── profile/         # User profiling endpoints
│   │   ├── core/                # Core configurations
│   │   ├── models/              # Pydantic models
│   │   ├── services/            # Business logic services
│   │   │   ├── ai_service.py    # AI provider management
│   │   │   ├── task_service.py  # Task processing
│   │   │   └── profile_service.py # User profiling
│   │   ├── schemas/             # Request/response schemas
│   │   └── database/            # Database models and connections
├── extension/                     # Browser extension (optional)
└── docs/                         # API documentation
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
- Persistent configuration storage in database with auto-loading
- LangChain integration for provider abstraction and streaming

**API Endpoints:**
- `POST /api/ai-config/providers` - Add new AI provider configuration
- `GET /api/ai-config/providers` - List configured providers
- `PUT /api/ai-config/providers/{provider_id}` - Update provider config
- `POST /api/ai-config/test/{provider_id}` - Test provider connection
- `GET /api/ai-config/active` - Get active provider configuration

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
- Special handling for reasoning models with `<think>` tags
- Collapsible gray-colored thinking blocks that users can toggle
- Persistent chat sessions that survive page navigation
- Chat history storage and retrieval
- Export chat conversations

**API Endpoints:**
- `WebSocket /ws/chat/{session_id}` - Real-time chat streaming
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
- **AI Integration**: LangChain for provider abstraction and streaming capabilities
- **API Documentation**: Auto-generated OpenAPI/Swagger documentation
- **Type Safety**: Full TypeScript for frontend, Pydantic for backend validation

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

**Complete SQLite Migration & Chat Implementation:**
1. **Database Migration from MongoDB to SQLite**
   - Migrated all data models to SQLite using SQLAlchemy ORM
   - Updated connection management with proper session handling
   - Maintained data integrity during migration process

2. **AI Service Architecture Overhaul**
   - Replaced LangChain with direct HTTPx implementation for better control
   - Improved streaming performance and error handling
   - Added support for reasoning model thinking blocks (<think> tags)
   - Enhanced provider configuration and testing

3. **Chat Interface Full Implementation**
   - Complete WebSocket-based real-time chat functionality
   - SQLite-backed persistent chat sessions and message history
   - Integrated AI provider selection and configuration
   - Support for markdown rendering and thinking blocks display

4. **API Route Architecture**
   - Created separate SQLite-specific API modules (auth_sqlite, ai_providers_sqlite, chat_sqlite)
   - Proper dependency injection for database sessions
   - Comprehensive error handling and validation

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
   - HTTPx-based AI provider abstraction (migrated from LangChain to SQLite)
   - Support for multiple providers (OpenAI, DeepSeek) with SQLite storage
   - Streaming responses via WebSocket connections using httpx streaming
   - Configurable AI parameters (temperature, max_tokens, model selection)
   - Connection testing functionality with proper error handling
   - Thinking blocks support for reasoning models (<think> tags)

5. **AI Chat Interface**
   - Real-time WebSocket streaming chat implementation with SQLite backend
   - Session management with persistent chat history in SQLite
   - Full integration with configured AI providers via SQLite
   - Support for reasoning model thinking blocks display
   - Complete CRUD operations for chat sessions and messages

6. **Task Generation & Management**
   - Basic task structure implemented in SQLite models
   - Task API endpoints defined but not yet connected to main routes
   - Manual task creation framework ready for implementation
   - Task filtering and search framework ready for implementation

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
3. **Task Generation** (Week 3): 🔄 **IN PROGRESS** - Task models ready, API routing pending
4. **Chat Interface** (Week 4): ✅ **COMPLETED** - Real-time chat, WebSocket streaming, thinking blocks, SQLite persistence
5. **User Profiling** (Week 5): ⏳ **PENDING** - Questionnaire system, analysis engine, difficulty estimation
6. **Frontend Integration** (Week 6): 🔄 **PARTIALLY COMPLETED** - Basic UI ready, chat integration complete
7. **Testing & Polish** (Week 7-8): ⏳ **PENDING** - End-to-end testing, performance optimization, deployment

## Performance Targets

- API response time < 300ms (non-streaming) ✅ **ACHIEVED**
- Chat streaming latency < 100ms first token ✅ **ACHIEVED**
- Task generation accuracy > 90% ⏳ **PENDING** (task generation not yet implemented)
- Frontend bundle size < 500KB gzipped 🔄 **IN PROGRESS**
- Database query optimization for < 50ms average response ✅ **ACHIEVED** with SQLite

## Next Priority Tasks

1. **Task Management Implementation**
   - Connect task_sqlite.py to main router
   - Implement AI-powered task parsing from Chinese text
   - Add task CRUD operations to frontend

2. **User Profiling System**
   - Design psychology-based questionnaire system
   - Implement user work style analysis
   - Create difficulty estimation algorithm

3. **Frontend Polish**
   - Implement task management UI components
   - Add user profiling interface
   - Improve responsive design and accessibility