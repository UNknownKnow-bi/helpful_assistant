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
│   │   │   ├── BasicInfoForm.tsx    # User basic information form
│   │   │   ├── BigFivePersonality.tsx # Big Five personality tag management
│   │   │   ├── WorkRelationshipCards.tsx # Work relationship card interface
│   │   │   ├── TaskCard.tsx         # Task display component
│   │   │   ├── TaskGenerationForm.tsx # Task generation interface
│   │   │   ├── Layout.tsx           # Main application layout
│   │   │   └── ui/                  # shadcn/ui components
│   │   ├── pages/               # Page components
│   │   │   ├── Dashboard.tsx     # Main dashboard
│   │   │   ├── Chat.tsx         # Real-time chat interface
│   │   │   ├── AIConfig.tsx     # AI provider configuration
│   │   │   ├── Profile.tsx      # User profile management
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
│   │   │   ├── chat_sqlite.py    # Real-time chat with WebSocket
│   │   │   ├── task_sqlite.py    # Task management with Eisenhower Matrix
│   │   │   └── user_profile_sqlite.py # User profile and relationship management
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
- Generate structured task cards with enhanced JSON schema(single or multi-task)
- Enhanced task properties: title, content separation, urgency/importance matrix, participant tracking
- Controlled by specific prompts to ensure consistent JSON output format

**API Endpoints:**
- `POST /api/tasks/generate` - Generate task card(s) from text (supports multi-task)
- `GET /api/tasks` - List tasks with Eisenhower Matrix filtering
- `GET /api/tasks/stats` - Get task statistics with matrix distribution
- `GET /api/tasks/{task_id}` - Retrieve specific task
- `PUT /api/tasks/{task_id}` - Update task information
- `DELETE /api/tasks/{task_id}` - Delete task

**JSON Schema:**
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
- **Full parameter configuration**: temperature, max_tokens, top_p, frequency_penalty, presence_penalty
- Built-in testing functionality with simple "OK" response or ping tests
- Persistent configuration storage in SQLite database with auto-loading
- HTTPx-based direct AI provider integration for better performance
- **Complete CRUD Operations**: Create, read, update, and delete AI provider configurations
- **Parameter Validation**: Automatic max_tokens capping (≤8192) and parameter validation
- **Extended Timeouts**: 5-minute timeout support for reasoning models

**API Endpoints:**
- `POST /api/ai-providers` - Add new AI provider configuration
- `GET /api/ai-providers` - List configured providers
- `PUT /api/ai-providers/{provider_id}` - Update provider config
- `DELETE /api/ai-providers/{provider_id}` - Delete AI provider configuration
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
- Full markdown support for rich text formatting
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

**Message Schema:**
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
   - Ensure `stream: false` for simple response parsing

**Code Example:**
```python
# Correct parsing for both model types
message = response_data["choices"][0]["message"]
final_answer = message.get("content", "").strip()  # Always use content
thinking_process = message.get("reasoning_content", "")  # Optional reasoning

# For title generation - only use content, never reasoning_content
title = final_answer.strip('"').strip("'").strip()
```

### 4. User Profile Management System (用户个人资料管理系统)

**✅ FULLY IMPLEMENTED** - Complete user profiling system with Big Five personality model and work relationship management.

**Core Functionality:**
- **Basic Information Management**: Name, work nickname, gender-inclusive options, job type/level, management role
- **Big Five Personality Model**: Interactive tag-based personality assessment with 5 psychological dimensions
- **Work Relationship Management**: Dynamic colleague relationship tracking with hierarchical roles
- **Profile Summary**: Structured overview of user characteristics for AI personalization
- **Real-time Updates**: Immediate database persistence with optimistic UI updates

**Big Five Personality Dimensions (大五人格模型):**
1. **经验开放性 (Openness)**: 对新事物、新想法的好奇心和想象力
2. **尽责性 (Conscientiousness)**: 自律、有条理、可靠的程度 (最可靠的工作绩效指标)
3. **外向性 (Extraversion)**: 从社交中获取能量的程度，热情、健谈
4. **宜人性 (Agreeableness)**: 对他人友好、合作、有同情心的程度
5. **神经质 (Neuroticism)**: 情绪的稳定性，感受负面情绪的倾向

**Work Relationship Types:**
- **下属** (Subordinate): Direct reports
- **同级** (Peer): Colleagues at same level
- **上级** (Superior): Direct manager/supervisor
- **团队负责人** (Team Leader): Team lead or project manager
- **公司老板** (Company Boss): Executive leadership

**API Endpoints:**

*User Profile Management:*
- `GET /api/profile` - Get current user's profile
- `POST /api/profile` - Create or update user profile
- `PUT /api/profile` - Update user profile
- `GET /api/profile/summary` - Get structured profile summary
- `PUT /api/profile/personality/{dimension}` - Update specific Big Five dimension tags

*Work Relationship Management:*
- `GET /api/profile/relationships` - Get all work relationships
- `POST /api/profile/relationships` - Create new work relationship
- `PUT /api/profile/relationships/{id}` - Update work relationship
- `DELETE /api/profile/relationships/{id}` - Delete work relationship

**Profile Schema:**
```json
{
  "id": "int",
  "user_id": "int",
  
  // Basic Information
  "name": "string (optional)",
  "work_nickname": "string (optional)", 
  "gender": "男|女|无性别|其他性别 (inclusive options)",
  "job_type": "string (free text: '产品运营', '数据分析师')",
  "job_level": "实习|初级|中级|高级",
  "is_manager": "boolean",
  
  // Big Five Personality (tag arrays for each dimension)
  "personality_openness": "string[] (经验开放性 tags)",
  "personality_conscientiousness": "string[] (尽责性 tags)",
  "personality_extraversion": "string[] (外向性 tags)", 
  "personality_agreeableness": "string[] (宜人性 tags)",
  "personality_neuroticism": "string[] (神经质 tags)",
  
  // Relationships
  "work_relationships": "WorkRelationship[]",
  
  "created_at": "datetime",
  "updated_at": "datetime"
}
```
**Work Relationship Schema:**
```json
{
  "id": "int",
  "user_profile_id": "int (foreign key)",
  "coworker_name": "string",
  "relationship_type": "下属|同级|上级|团队负责人|公司老板",
  "created_at": "datetime"
}
```

**Frontend Components:**
- **Profile Page** (`/profile`): Tabbed interface with Basic Info, Personality, and Relationships
- **BasicInfoForm**: Gender-inclusive form with job classification
- **BigFivePersonality**: Interactive tag management system with color-coded dimensions
- **WorkRelationshipCards**: Dynamic card-based colleague management with statistics

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

### User Profiles (Enhanced with Big Five Personality Model)
```python
class UserProfile(BaseModel):
    id: int
    user_id: int
    
    # Basic Information
    name: str | None = None
    work_nickname: str | None = None
    gender: str | None = None  # 男|女|无性别|其他性别
    job_type: str | None = None  # Free text like '产品运营', '数据分析师'
    job_level: str | None = None  # 实习|初级|中级|高级
    is_manager: bool = False
    
    # Big Five Personality Model (tag arrays)
    personality_openness: List[str] = []          # 经验开放性 tags
    personality_conscientiousness: List[str] = [] # 尽责性 tags
    personality_extraversion: List[str] = []      # 外向性 tags
    personality_agreeableness: List[str] = []     # 宜人性 tags
    personality_neuroticism: List[str] = []       # 神经质 tags
    
    # Work Relationships
    work_relationships: List[WorkRelationship] = []
    
    # Legacy fields (for backward compatibility)
    personality_assessment: Dict[str, Any] | None = None
    work_context: Dict[str, Any] | None = None
    ai_analysis: str | None = None
    knowledge_base: List[Dict[str, Any]] | None = None
    
    created_at: datetime
    updated_at: datetime

class WorkRelationship(BaseModel):
    id: int
    user_profile_id: int
    coworker_name: str                  # Colleague's name
    relationship_type: str              # 下属|同级|上级|团队负责人|公司老板
    created_at: datetime
```

## Implementation Status

### ✅ Latest Updates (January 2025)


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

**🔄 Current Focus:**

1. **AI Integration with User Profiles** (Next Priority)
   - Integrate user profile data into task generation prompts
   - Personalized task difficulty estimation based on Big Five traits
   - find out what is the most fit prompt to make ai answer with social sense
   - Context-aware task assignment using work relationships
   - Team dynamics consideration in task complexity assessment

2. **Advanced Task Features** 
   - Task dependencies and subtask management
   - Task excution advice from AI with personalize information
   - Integration with calendar systems for deadline management

3. **System Polish & Optimization**
   - Comprehensive end-to-end testing across all features
   - Performance optimization for large-scale task management
   - Enhanced error handling and user feedback systems
   - Deployment preparation and production optimization
- to memorize