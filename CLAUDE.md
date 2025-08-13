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
- Use AI to parse and extract task information using **Eisenhower Matrix** evaluation
- Generate structured task cards with enhanced JSON schema
- Support both **single task** and **multi-task array** generation from complex text
- **Enhanced task properties**: title, content separation, urgency/importance matrix, participant tracking
- Controlled by specific prompts to ensure consistent JSON output format
- **Smart JSON parsing** with comment cleanup and error recovery
- **User configuration respect** for AI parameters (temperature, max_tokens, etc.)

**API Endpoints:**
- `POST /api/tasks/generate` - Generate task card(s) from text (supports multi-task)
- `GET /api/tasks` - List tasks with Eisenhower Matrix filtering
- `GET /api/tasks/stats` - Get task statistics with matrix distribution
- `GET /api/tasks/{task_id}` - Retrieve specific task
- `PUT /api/tasks/{task_id}` - Update task information
- `DELETE /api/tasks/{task_id}` - Delete task

**Enhanced JSON Schema (Eisenhower Matrix):**
```json
{
  "title": "string (max 8 chars)",           // Brief bold summary
  "content": "string",                      // Detailed task description
  "deadline": "ISO datetime",
  "assignee": "string",                     // 提出人 (who assigned the task)
  "participant": "string (default: '你')",   // 参与人 (who participates)
  "urgency": "low|high",                    // 紧迫性 (time-sensitive)
  "importance": "low|high",                 // 重要性 (goal contribution)
  "difficulty": "number (1-10)",
  "source": "manual|extension|ai_generated",
  "status": "pending|in_progress|completed"
}
```

**Eisenhower Matrix Categories:**
- **Urgent + Important**: Do First (immediate action)
- **Urgent + Not Important**: Schedule (time-sensitive but low impact)
- **Not Urgent + Important**: Delegate (important for long-term goals)
- **Not Urgent + Not Important**: Eliminate (low priority)

### 2. AI Service Configuration (AI配置)

**Functionality:**
- Support multiple AI providers: DeepSeek, OpenAI-compatible APIs
- User-friendly configuration interface for API keys and endpoints
- **Full parameter configuration**: temperature, max_tokens, top_p, frequency_penalty, presence_penalty
- Built-in testing functionality with simple "OK" response or ping tests
- Persistent configuration storage in SQLite database with auto-loading
- HTTPx-based direct AI provider integration for better performance
- DeepSeek reasoning model support with real-time thinking visualization
- **Complete CRUD Operations**: Create, read, update, and delete AI provider configurations
- **Edit Configuration**: Modify existing provider settings including API keys, models, and parameters
- **Delete Configuration**: Remove AI providers with automatic active provider cleanup
- **Parameter Validation**: Automatic max_tokens capping (≤8192) and parameter validation
- **Extended Timeouts**: 5-minute timeout support for reasoning models

**API Endpoints:**
- `POST /api/ai-providers` - Add new AI provider configuration
- `GET /api/ai-providers` - List configured providers
- `PUT /api/ai-providers/{provider_id}` - Update provider config
- **🆕 `DELETE /api/ai-providers/{provider_id}`** - Delete AI provider configuration
- `POST /api/ai-providers/{provider_id}/test` - Test provider connection
- `GET /api/ai-providers/active` - Get active provider configuration

**Enhanced Configuration Schema:**
```json
{
  "provider_name": "string",
  "api_key": "string",
  "base_url": "string",
  "model": "string",
  "temperature": "number (0-2)",
  "max_tokens": "number (auto-capped ≤8192)",
  "top_p": "number (0-1)",
  "frequency_penalty": "number (-2 to 2)",
  "presence_penalty": "number (-2 to 2)",
  "stream": "boolean",
  "is_active": "boolean"
}
```

**Parameter Handling:**
- **User Configuration Respect**: All AI services now use user's configured parameters instead of hardcoded values
- **Model-Specific Support**: DeepSeek reasoning models automatically exclude unsupported parameters
- **Validation & Safety**: Automatic parameter validation and API limit compliance


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
- **🆕 Background AI Response Persistence**: AI requests continue running in background even when WebSocket disconnects
- **🆕 Page Navigation Continuity**: Users can switch pages during AI responses without losing content
- **🆕 Intelligent Response Recovery**: Automatic detection and display of interrupted responses when returning to chat
- **🆕 Manual Stream Control**: Users can manually stop AI responses mid-stream with dedicated stop button

**API Endpoints:**
- `WebSocket /api/chat/ws/{session_id}` - Real-time chat streaming with background task management
- `POST /api/chat/sessions` - Create new chat session
- `GET /api/chat/sessions` - List user's chat sessions
- `GET /api/chat/sessions/{session_id}/messages` - Get chat history
- `DELETE /api/chat/sessions/{session_id}` - Delete chat session
- `POST /api/chat/sessions/{session_id}/generate-title` - Auto-generate session title from first message
- `PUT /api/chat/sessions/{session_id}/title` - Manual session renaming
- **🆕 `GET /api/chat/sessions/{session_id}/status`** - Check session streaming status and background tasks
- **🆕 `POST /api/chat/sessions/{session_id}/stop`** - Manually stop ongoing AI streaming responses

**Enhanced Message Schema:**
```json
{
  "role": "user|assistant",
  "content": "string",
  "thinking": "string|null",
  "timestamp": "ISO datetime",
  "token_usage": "object",
  "streaming_status": "streaming|completed|interrupted"
}
```

**Chat Session Management:**
- `POST /api/chat/sessions/{session_id}/generate-title` - Auto-generate session title from first message
- `PUT /api/chat/sessions/{session_id}/title` - Manual session renaming
- Auto-title generation triggered on first user message with AI-powered naming (≤10 characters)
- Right-click context menu for manual session renaming in frontend

**🆕 Background Task Management (后台任务管理):**
- **Persistent AI Responses**: AI API requests continue processing in background using `asyncio.create_task()`
- **Real-time Content Saving**: Each response chunk immediately saved to SQLite database
- **Connection Independence**: WebSocket disconnections don't interrupt AI processing
- **Automatic Recovery**: Interrupted responses detected and displayed when users return
- **Multi-Connection Support**: Multiple WebSocket connections can receive updates from same background task
- **Status Tracking**: Three message states: `streaming` (in progress), `completed` (finished), `interrupted` (disconnected)
- **Visual Indicators**: UI shows streaming status with animated indicators and interruption warnings

**🔧 Technical Implementation:**
```python
# Backend: Background Chat Service (app/services/background_chat_service.py)
class BackgroundChatService:
    # Tracks running AI tasks per session
    running_tasks: Dict[int, asyncio.Task] = {}
    # Tracks active WebSocket connections per session
    active_connections: Dict[int, Set] = {}
    
    async def start_background_chat():
        # Creates background task that persists beyond WebSocket lifecycle
        task = asyncio.create_task(self._background_chat_worker())
        
    async def stop_session_task(session_id: int):
        # Manually cancel running AI task for a session
        # Updates database to mark messages as interrupted
        # Broadcasts stop notification to all connected clients
        
    async def _background_chat_worker():
        # Processes AI responses and saves to SQLite in real-time
        # Broadcasts to all active connections via WebSocket
        # Continues running even when connections disconnect
        # Handles cancellation gracefully with proper cleanup
```

**🛑 Manual Stop Functionality (手动停止功能):**

**Two Interrupt Scenarios:**
1. **Automatic Interruption**: Page shutdown, navigation, or WebSocket disconnection
2. **🆕 Manual User Stop**: User clicks stop button during AI response streaming

**Stop Button Implementation:**
- **UI Behavior**: Send button transforms into red stop button during streaming
- **Input State**: Shows "AI正在回复中..." placeholder and disables input
- **Visual Feedback**: Immediate UI response when stop button clicked
- **Status Display**: Messages show "响应已中断" after stopping

**Backend Stop Processing:**
- **Task Cancellation**: `asyncio.Task.cancel()` gracefully stops AI processing
- **Database Updates**: Streaming messages marked as "interrupted" in SQLite
- **WebSocket Broadcast**: "stopped" message sent to all connected clients
- **Orphan Handling**: Detects and stops orphaned streaming messages

**Frontend Stop Handling:**
- **React State**: `isStreaming` state controls UI button switching
- **API Integration**: `POST /api/chat/sessions/{id}/stop` endpoint
- **Error Recovery**: Proper fallback handling if stop request fails
- **Immediate Response**: UI updates instantly without waiting for server confirmation

### 3.1. AI Response Processing (AI响应处理)

**Functionality:**
The system handles both regular AI models and reasoning models (DeepSeek-R1) with different response formats:

**Regular Models Response Format:**
```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Final answer content"
    },
    "finish_reason": "stop"
  }]
}
```

**Reasoning Models (DeepSeek-R1) Response Format:**
```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Final answer content",
      "reasoning_content": "Step-by-step thinking process"
    },
    "finish_reason": "stop"
  }]
}
```

**Implementation Guidelines:**

1. **Streaming Chat (WebSocket)**:
   - `content` field contains the final answer for both model types
   - `reasoning_content` contains thinking process for reasoning models only
   - Display `reasoning_content` in collapsible "思考过程" blocks in frontend
   - Never include `reasoning_content` in conversation history context

2. **Non-Streaming Requests (Title Generation)**:
   - Use `content` field for final answer (both model types)
   - Ignore `reasoning_content` for title generation (thinking ≠ answer)
   - Set `max_tokens: 3000` to allow full reasoning process completion
   - Set `timeout: 60.0` seconds for reasoning model processing time
   - Ensure `stream: false` for simple response parsing

3. **Error Handling**:
   - Monitor `finish_reason` for token limit issues ("length" vs "stop")
   - Implement proper timeout handling for reasoning models
   - Graceful fallback to default values when AI generation fails

**Code Example:**
```python
# Correct parsing for both model types
message = response_data["choices"][0]["message"]
final_answer = message.get("content", "").strip()  # Always use content
thinking_process = message.get("reasoning_content", "")  # Optional reasoning

# For title generation - only use content, never reasoning_content
title = final_answer.strip('"').strip("'").strip()
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

### Tasks (Enhanced with Eisenhower Matrix)
```python
class Task(BaseModel):
    id: int
    user_id: int
    title: str                    # Brief 8-word summary (bold display)
    content: str                  # Detailed task description
    deadline: datetime | None
    assignee: str | None          # 提出人 (who assigned the task)
    participant: str = "你"       # 参与人 (who participates)
    urgency: str                  # "low" | "high" - 紧迫性 (time-sensitive)
    importance: str               # "low" | "high" - 重要性 (goal contribution)
    difficulty: int               # 1-10 scale
    source: str                   # "manual" | "extension" | "ai_generated"
    status: str                   # "pending" | "in_progress" | "completed"
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

### ✅ Latest Updates (January 2025)

**🆕 Eisenhower Matrix Task Management System (January 13, 2025):**
1. **Task Schema Enhancement**
   - Added `title` field for 8-character bold task summaries
   - Replaced `priority` with `urgency` and `importance` (Eisenhower Matrix)
   - Added `participant` field (default: "你") alongside `assignee` (提出人)
   - Enhanced multi-task generation from complex Chinese text input
   - Database migration script with automatic data conversion

2. **AI Service Improvements**
   - **User Configuration Respect**: Fixed hardcoded parameters to use user's AI provider settings
   - **Smart JSON Parsing**: Added JavaScript comment cleanup and error recovery
   - **Extended Timeouts**: 5-minute timeout support for complex AI reasoning
   - **Parameter Validation**: Automatic max_tokens capping at API limits (≤8192)
   - **Model-Specific Handling**: DeepSeek reasoning model parameter optimization

3. **Enhanced API Endpoints**
   - `GET /api/tasks/stats` now returns Eisenhower Matrix distribution
   - `GET /api/tasks?urgency=high&importance=high` filtering support
   - Multi-task array generation from single text input
   - Robust error handling with intelligent fallback mechanisms

4. **Frontend Enhancements**
   - **Bold title display** prominently above task content
   - Separate urgency (green/red) and importance (blue/purple) badges
   - Updated Chinese field labels (提出人, 参与人)
   - Enhanced task generation hints with Eisenhower Matrix guidance

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
   - Delete API Endpoint: `DELETE /api/ai-providers/{provider_id}` with smart active provider cleanup

3. **Chat Interface Full Implementation**
   - Complete WebSocket-based real-time chat functionality
   - SQLite-backed persistent chat sessions and message history
   - Integrated AI provider selection and configuration
   - Support for markdown rendering and thinking blocks display
   - **AI-powered session title generation** with automatic naming from first message
   - **Manual session renaming** with right-click context menu interface
   - **Multi-model AI response handling** supporting both regular and reasoning models
   - **🆕 Background AI Task Management** with `asyncio.create_task()` for persistent responses
   - **🆕 Page Navigation Resilience** - AI responses continue when users switch pages
   - **🆕 Intelligent Response Recovery** - Automatic detection and restoration of interrupted chats

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
   - **🆕 Complete AI Provider CRUD**: Added DELETE endpoint and enhanced frontend API service with `aiProvidersApi.delete()`


### 🔄 Current Architecture
All core foundation components are operational with:
- FastAPI backend serving REST APIs and WebSocket connections
- React frontend with complete authentication flow
- SQLite database with proper relational data models (fully migrated from MongoDB)
- HTTPx-based AI service integration (migrated from LangChain for better control)
- WebSocket streaming for real-time chat functionality with SQLite persistence

## Development Phases

1. **Foundation Setup** (Week 1): ✅ **COMPLETED** - FastAPI backend setup, database models, authentication
2. **AI Service Layer** (Week 2): ✅ **COMPLETED** - HTTPx integration, provider management, streaming, SQLite migration, full CRUD operations
3. **Task Generation** (Week 3): ✅ **COMPLETED** - Full AI-powered multi-task generation, CRUD operations, UI integration
4. **Chat Interface** (Week 4): ✅ **COMPLETED** - Real-time chat, WebSocket streaming, thinking blocks, SQLite persistence
5. **User Profiling** (Week 5): ⏳ **PENDING** - Questionnaire system, analysis engine, difficulty estimation
6. **Frontend Integration** (Week 6): ✅ **COMPLETED** - Complete UI with task management, chat integration, responsive design
7. **Testing & Polish** (Week 7-8): ⏳ **PENDING** - End-to-end testing, performance optimization, deployment

## Next Priority Tasks

**✅ Recently Completed (January 13, 2025):**
- ✅ **Enhanced Task Schema**: Eisenhower Matrix implementation with title/content separation
- ✅ **AI Service Optimization**: User configuration respect and parameter validation
- ✅ **Multi-task Generation**: Complex text parsing with robust error handling
- ✅ **Database Migration**: Complete schema update with backward compatibility

**🔄 Current Focus:**

1. **User Profiling System** (Next Priority)
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