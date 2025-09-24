# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "智时助手 (Cortex Assistant)" - an AI-powered intelligent assistant for Chinese knowledge workers. The application provides AI-driven task management, configurable AI services, conversational AI interface, and personalized user profiling through psychology-based assessments.

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
- EasyOCR 1.7.2 for Chinese/English text extraction from images

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
│   │   │   ├── TaskCard.tsx         # Task display component with real-time countdown timer
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
│   │   │   ├── ai_service_sqlite.py # AI provider integration
│   │   │   └── ocr_service.py    # EasyOCR text extraction service
│   │   ├── data/                # SQLite database files
│   │   └── main.py              # FastAPI application entry
└── CLAUDE.md                     # Project documentation
```

## API Documentation

### Documentation Files
- **[Complete API Documentation](backend/API_DOCUMENTATION.md)** - Comprehensive guide with examples and workflows
- **[Auto-generated Endpoint Reference](backend/docs/api/endpoints.md)** - Complete endpoint documentation
- **[Data Models Reference](backend/docs/api/schemas.md)** - All API schemas and data structures
- **[API Documentation Index](backend/docs/api/README.md)** - Documentation overview and quick links
- **[OpenAPI Specification](backend/docs/api/openapi.json)** - Raw OpenAPI 3.0 JSON schema

### Interactive Documentation (Server Running)
- **[Swagger UI](http://localhost:8000/docs)** - Interactive API explorer and testing interface
- **[ReDoc](http://localhost:8000/redoc)** - Clean, responsive API documentation
- **[OpenAPI JSON Endpoint](http://localhost:8000/openapi.json)** - Live specification endpoint

### Documentation Tools
```bash
# Generate/update API documentation
cd backend && python3 generate_api_docs.py

# Open documentation in browser
cd backend && python3 open_docs.py
```

## Core Features

### 1. AI Task Card Generation (任务卡片生成)
**Core Functionality:**
- Accept Chinese text input from users OR image uploads with OCR text extraction
- Use AI to parse and extract task information using **Eisenhower Matrix** evaluation with **user profile context**
- Generate structured task cards with enhanced JSON schema(single or multi-task)
- Enhanced task properties: title, content separation, urgency/importance matrix, participant tracking
- **User Profile Integration**: Leverages user profile and colleague relationships for intelligent task analysis
- **Personalized Difficulty Assessment**: Task complexity evaluation based on user's job type, level, and management status
- **Smart Assignee/Participant Recognition**: Automatic identification of colleagues from user's work relationships
- **Context-Aware Priority Assessment**: Importance evaluation considering user's career stage and role responsibilities
- **AI-Powered Time Estimation**: Intelligent cost time prediction in hours based on task complexity and user expertise level
- OCR Integration: EasyOCR-powered image text extraction with Chinese/English support

**Task Preview System:**
- **Interactive Preview Popup**: Full-screen popup with editable task cards
- **Comprehensive Editing**: Inline editing of all task fields with real-time updates
- **Visual Priority System**: Color-coded urgency/importance badges with dropdown selection
- **Difficulty Visualization**: Star-based difficulty display with interactive slider
- **Time Estimation Input**: Editable cost time field with decimal hour precision (0.5, 1.5, 2.0, etc.)
- **Date/Time Picker**: Integrated datetime-local input for deadline selection
- **Form Validation**: Real-time validation with disabled save for invalid tasks
- **Batch Operations**: Confirm and save multiple tasks simultaneously

**Enhanced AI Prompt System:**
- **User Context Integration**: Includes name, work nickname, job type, job level, management status
- **Colleague Recognition**: Utilizes work relationships database for assignee/participant identification  
- **Personalized Difficulty Scaling**: Adjusts task complexity based on user's professional experience
- **Role-Aware Importance Assessment**: Considers career impact and growth value for different job levels

**Real-Time Deadline Timer System:**
- **Dynamic Countdown Categories**: 5-category deadline tracking system with real-time updates
  - **进行中** - Tasks without deadlines or >5 days remaining
  - **仅剩X天** - Tasks with 1-5 days remaining (updates daily)
  - **仅剩X小时** - Tasks with ≤24 hours remaining (updates hourly)
  - **已过期** - Overdue tasks with "undo" status
  - **完成** - Tasks marked as "done"
- **Auto-Updating UI**: Timer updates every minute without page refresh
- **Two-State Status System**: Simple "undo" ↔ "done" toggle with visual feedback
- **Color-Coded Display**: Green (完成), Orange (仅剩), Red (已过期), Blue (进行中)
- **Smart Time Calculation**: Timezone-aware deadline parsing with accurate countdown

**Completed Tasks Archive System (已完成任务归档):**
- **Archive Box**: Dedicated "已完成任务" section at the bottom of Dashboard
- **Automatic Filtering**: Tasks with "done" status automatically move from Eisenhower Matrix to archive
- **Clean Interface**: Eisenhower Matrix shows only active tasks (status='undo'), completed tasks in separate archive section
- **Full Task Management**: Completed tasks retain all functionality - edit, delete, status toggle, execution guidance
- **Visual Design**: Green color theme with task count badge, scrollable container for many archived tasks
- **Status Restoration**: Users can toggle completed tasks back to "待办" status to return them to active matrix
- **Search Integration**: Search functionality works across both active and completed tasks

**API Reference:** See [Tasks API Documentation](backend/API_DOCUMENTATION.md#task-management-apis) for complete endpoint details, request/response schemas, usage examples, and two-stage workflow implementation.
### 2. AI Service Configuration (AI配置)

**ENHANCED: Model Categorization System (文本模型/图像模型)**

**Functionality:**
- Support multiple AI providers: DeepSeek, OpenAI-compatible APIs, **Image OCR providers**
- Built-in testing functionality with vision model testing for imageOCR providers
- Persistent configuration storage in SQLite database with auto-loading
- HTTPx-based direct AI provider integration for better performance
- **Complete CRUD Operations**: Create, read, update, and delete AI provider configurations
- **Parameter Validation**: Automatic max_tokens capping (≤8192) and parameter validation
- **Extended Timeouts**: 5-minute timeout support for reasoning models
- **Multi-Modal Support**: Vision model testing with sample image recognition for OCR providers
- **Model Categorization**: Automatic categorization into "文本模型" (text) and "图像模型" (image) categories
- **Multiple Active Models**: Support for MULTIPLE active models per category (multiple text models + multiple image models can all be active simultaneously)
- **Dynamic Model Selection**: Real-time model switching during chat conversations

**API Reference:** See [AI Providers API Documentation](backend/API_DOCUMENTATION.md#ai-provider-management-apis) for complete endpoint details, configuration schemas, and testing examples.
### 3. AI Chat Interface (AI问答界面)

**ENHANCED: Dynamic Model Selection**

**Functionality:**
- Independent chat interface as a separate page/module
- Full markdown support for rich text formatting
- Real-time thinking process visualization in collapsible UI blocks
- Support for both `<think>` tags and native reasoning content
- Persistent chat sessions stored in SQLite database
- Chat history storage and retrieval with full context
- Real-time streaming with optimized WebSocket performance
- **Background AI Response Persistence**: AI requests continue running in background even when WebSocket disconnects
- **Page Navigation Continuity**: Users can switch pages during AI responses without losing content
- **Intelligent Response Recovery**: Automatic detection and display of interrupted responses when returning to chat
- **Manual Stream Control**: Users can manually stop AI responses mid-stream with dedicated stop button
- **Dynamic Model Selection**: Real-time dropdown to switch between different text models during conversation
- **Model-specific WebSocket**: Support for `model_id` parameter in WebSocket messages

**API Reference:** See [Chat API Documentation](backend/API_DOCUMENTATION.md#chat-apis) for complete WebSocket usage, endpoint details, message schemas, and real-time streaming examples.

**Chat Session Management:**
- Auto-title generation triggered on first user message with AI-powered naming (≤10 characters)
- Right-click context menu for manual session renaming in frontend

**Background Task Management (后台任务管理):**
- **Persistent AI Responses**: AI API requests continue processing in background using `asyncio.create_task()`
- **Real-time Content Saving**: Each response chunk immediately saved to SQLite database
- **Connection Independence**: WebSocket disconnections don't interrupt AI processing
- **Automatic Recovery**: Interrupted responses detected and displayed when users return
- **Multi-Connection Support**: Multiple WebSocket connections can receive updates from same background task
- **Status Tracking**: Three message states: `streaming` (in progress), `completed` (finished), `interrupted` (disconnected)
- **Visual Indicators**: UI shows streaming status with animated indicators and interruption warnings


**🛑 Manual Stop Functionality (手动停止功能):**

**Backend Stop Processing:**
- **Task Cancellation**: `asyncio.Task.cancel()` gracefully stops AI processing
- **Database Updates**: Streaming messages marked as "interrupted" in SQLite
- **WebSocket Broadcast**: "stopped" message sent to all connected clients
- **Orphan Handling**: Detects and stops orphaned streaming messages

**Frontend Stop Handling:**
- **React State**: `isStreaming` state controls UI button switching
- **Error Recovery**: Proper fallback handling if stop request fails
- **Immediate Response**: UI updates instantly without waiting for server confirmation

### 3.1. AI Response Processing (AI响应处理)--for deepseek

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

**ENHANCED & FULLY IMPLEMENTED** - Complete user profiling system with comprehensive colleague management, Big Five personality model, and enterprise-grade form persistence.

**Core Functionality:**
- **Basic Information Management**: Name, work nickname, gender-inclusive options, job type/level, management role
- **Big Five Personality Model**: Interactive tag-based personality assessment with 5 psychological dimensions
- **Enhanced Work Relationship Management**: Comprehensive colleague profiling with extended information fields
- **Auto-Save Form Persistence**: Enterprise-grade form data protection with localStorage integration
- **Real-time Updates**: Immediate database persistence with optimistic UI updates

**Enhanced Colleague Management Features:**
- **Extended Colleague Information**:
  - 工作昵称 (Work Nickname): Optional friendly names for colleagues
  - 职位类型 (Job Type): Free-text job descriptions and roles
  - 职位级别 (Job Level): Structured levels (实习/初级/中级/高级)
  - Big Five Personality Tags: Complete personality profiling for each colleague

- **Auto-Save & Draft Management**:
  - **Real-time Form Persistence**: Automatic saving to localStorage while typing
  - **Page Navigation Safety**: Users can switch pages without losing input
  - **Draft Detection**: Visual indicators (检测到草稿) when drafts exist
  - **Automatic Restoration**: Seamless draft recovery with restoration notifications
  - **Individual Storage**: Separate drafts for new colleague and each edit session
  - **User Control**: Smart cancel options with draft preservation choices

- **Enhanced UI/UX**:
  - **Inline Editing**: Full edit functionality directly on colleague cards
  - **Dimension-specific Inputs**: Independent text boxes for each Big Five dimension
  - **Color-coded Personality Tags**: Visual organization by psychological dimensions
  - **Comprehensive Display**: Job information badges, personality traits, timestamps
  - **Edit Mode Indicators**: Clear visual feedback for editing states

**Database Schema Enhancements:**
- **Extended WorkRelationship Model**: Added work_nickname, job_type, job_level, Big Five personality arrays, updated_at
- **Migration Support**: Automated database migration with backward compatibility
- **JSON Storage**: Efficient storage of personality tag arrays

**API Enhancements:**
- **Full CRUD Operations**: Complete Create, Read, Update, Delete for colleague management
- **Enhanced Validation**: Job level patterns, personality dimension validation
- **Duplicate Prevention**: Intelligent colleague name checking with edit recommendations
- **Optimistic Updates**: Frontend state management with instant UI feedback

**API Reference:** See [User Profile API Documentation](backend/API_DOCUMENTATION.md#user-profile-apis) for complete endpoint details, Big Five personality schemas, and work relationship management examples.

**Frontend Components:**
- **Profile Page** (`/profile`): Tabbed interface with Basic Info, Personality, and Relationships
- **BasicInfoForm**: Gender-inclusive form with job classification
- **BigFivePersonality**: Interactive tag management system with color-coded dimensions
- **Enhanced WorkRelationshipCards**: 
  - Comprehensive colleague management with extended information fields
  - Inline editing with full form persistence
  - Auto-save functionality with draft management
  - Visual personality tag organization
  - Smart form cancellation with draft control

### 5. OCR Image-to-Task Generation (图片识别任务生成)

**FULLY IMPLEMENTED** - Complete OCR integration with dual-mode support: Local EasyOCR + Cloud AI OCR.

EasyOCR
- **Two-Step Workflow**: Upload → Preview extracted text → Generate tasks with user confirmation
- **Editable Preview**: Users can modify OCR results before task generation
- **OCR Method Display**: Shows which OCR method was used (AI OCR, EasyOCR, or fallback)
- **Error Handling**: Graceful handling of OCR failures, SSL issues, and automatic fallback mechanisms

**AI OCR Configuration:**
- **Provider Type**: `imageOCR` in AI providers configuration
- **Supported Models**: Vision-language models that support image input (qwen-vl-max, qwen-vl-ocr-latest, gpt-4v, etc.)
- **Base URL Example**: `https://dashscope.aliyuncs.com/compatible-mode/v1` (for Qwen)
- **Base64 Image Encoding**: Automatically converts uploaded images to base64 format for API compatibility
- **Message Format**: Multi-modal message format with proper `data:image/{format};base64,{base64_data}` URL structure

**Image Processing Pipeline:**
1. **File Upload**: Accept JPG, PNG, JPEG, BMP, TIFF, WEBP, HEIC formats (max 10MB)
2. **Format Detection**: Use PIL/Pillow to detect actual image format
3. **Base64 Conversion**: Convert image bytes to base64 string
4. **Content-Type Mapping**: Map format to proper MIME type (image/jpeg, image/png, etc.)
5. **API Call**: Send formatted data URL to vision-language model

**API Reference:** See [OCR API Documentation](backend/API_DOCUMENTATION.md#ocr-image-to-task-generation) for complete image processing endpoints, OCR configuration, and dual-mode extraction examples.

### 6. AI Task Execution & Social Intelligence System (AI任务执行与社交智能系统)

**FULLY IMPLEMENTED** - Complete 3-step AI workflow for automatic task execution guidance and social intelligence advice generation.

**Architecture Overview:**
The feature implements a sophisticated **3-step AI workflow** that automatically generates comprehensive task guidance:
1. **Step 1**: Task Creation (existing functionality)
2. **Step 2**: AI-powered Execution Guidance Generation (project management procedures)
3. **Step 3**: AI-powered Social Intelligence Advice Generation (organizational psychology insights)

**Core Functionality:**
- **Dual AI Generation**: Every task gets both execution procedures AND social intelligence advice automatically
- **User Context Integration**: Leverages user profile and colleague relationships for personalized guidance
- **Professional Methodologies**: Project management (SMART/RACI) + organizational psychology (Big Five)
- **Background Processing**: Non-blocking AI generation using asyncio.create_task() with proper database session management
- **Multiple Integration Points**: Works with manual tasks, AI-generated tasks, and image-to-task workflows
- **Social Intelligence**: Personality-aware communication strategies for workplace interactions

**API Reference:** See [Tasks API Documentation](backend/API_DOCUMENTATION.md#task-management-apis) for complete endpoint details and [Social Intelligence API](backend/API_DOCUMENTATION.md) for execution procedures and social advice endpoints.

**Enhanced Execution Workflow:**
1. **Task Creation**: User creates task (manual/AI/image)
2. **Context Gathering**: System retrieves user profile and colleague information
3. **AI Analysis (Step 2)**: Project management AI generates structured execution steps
4. **Database Storage**: Procedures stored as JSON in SQLite
5. **AI Psychology Analysis (Step 3)**: Organizational psychology AI generates social advice
6. **Social Database Storage**: Social advice stored as JSON in SQLite
7. **API Access**: Both procedures and social advice available via dedicated endpoints
8. **Manual Override**: Users can regenerate both procedures and social advice independently

**Technical Implementation:**
- **Enhanced AI Service**: `generate_task_execution_guidance()` and `generate_social_advice()` methods
- **Background Processing**: Proper asyncio.create_task() with database session management
- **Database Session Fix**: Individual SessionLocal() instances for background tasks to prevent session conflicts
- **Dual AI Analysis**: Sequential execution procedures → social advice generation workflow
- **Error Handling**: Graceful fallbacks when AI provider unavailable with comprehensive logging
- **JSON Serialization**: Proper handling of dual JSON data structures in SQLite TEXT columns
- **Frontend Integration**: TaskProcedurePopup component with tabbed interface for procedures + social advice

**Interactive Procedure Management:**
- **Completion Tracking**: Individual checkbox for each procedure step (步骤一, 步骤二) with real-time status updates
- **✏️ Inline Editing**: Direct editing of procedure content and key results with save/cancel functionality
- **Delete Operations**: Remove individual procedures with automatic step renumbering
- **Fold/Expand Controls**: Collapsible procedure cards showing only step titles when folded
- **Auto-Fold on Completion**: Procedures automatically fold when marked as complete to reduce visual clutter
- **Real-time Persistence**: All changes immediately saved to database with optimistic UI updates

**Integration Points:**
- **Manual Task Creation**: Both procedures and social advice generated after task save
- **AI Task Generation**: Each generated task gets both execution procedures and social advice
- **Image-to-Task**: OCR-based tasks include both execution guidance and social intelligence
- **All workflows**: Seamless 3-step AI integration across all task creation methods
- **Frontend UI**: "执行指导" button opens popup with dual tabs for procedures + social advice

### 7. AI-Powered Calendar & Task Scheduling System (AI智能日程安排系统)

**FULLY IMPLEMENTED** - Comprehensive calendar system with AI-driven task scheduling and intelligent time management.

**Core Functionality:**
- **AI-Driven Task Scheduling**: Intelligent arrangement of undone tasks based on Eisenhower Matrix, deadlines, difficulty, and user profile
- **Personalized Time Management**: User-aware scheduling considering job type, level, and management status
- **Smart Work Hours Configuration**: Customizable work periods with break time management
- **Interactive Calendar Interface**: Visual task timeline with priority-coded displays
- **Real-time Schedule Management**: Dynamic event creation, updating, and deletion capabilities

**AI Scheduling Intelligence:**
- **Multi-Factor Analysis**: Considers urgency, importance, difficulty, estimated time, and deadlines
- **User Context Integration**: Leverages user profile and colleague relationships for personalized scheduling
- **Execution Procedures Integration**: AI considers detailed task execution steps when scheduling
- **Current Time Awareness**: Real-time timezone detection and current time context prevents past scheduling
- **Large Task Chunking**: Automatically splits tasks over 4 hours into multiple manageable time blocks across different days
- **Energy Management**: Schedules high-concentration tasks during optimal time periods
- **Time Buffer Management**: Automatic break time allocation between tasks
- **Weekend Flexibility**: Optional weekend scheduling based on user preferences

**Calendar Features:**
- **Persistent Settings**: User preferences automatically saved and restored (work hours, break time, weekend inclusion)
- **Task Chunk Visualization**: Multi-part tasks display "第1/3部分" indicators beneath task titles
- **Enhanced Event Details**: Comprehensive popup with editable time fields and task information
- **Event Deletion**: Delete button in event detail popup with confirmation dialog
- **Schedule Parameters**: Configurable date ranges, work hours, break duration, and weekend inclusion
- **FullCalendar Integration**: Real calendar view with month/week/day perspectives using FullCalendar.js
- **Colored Dot Priority System**: Clean event display with priority-coded dots instead of full backgrounds
  - 🔴 **红点** (red-500): 高紧急性 + 高重要性 - 项目启动会议、季度规划复盘
  - 🟠 **橙点** (orange-400): 低紧急性 + 高重要性 - 游戏数据统计、长期规划
  - 🔵 **蓝点** (blue-500): 高紧急性 + 低重要性 - 提交周度报告、日常事务
  - ⚫ **灰点** (gray-400): 低紧急性 + 低重要性 - 市场沟通、假期提醒
- **Today Indicator**: Target icon (🎯) before today's column/cell across all calendar views
- **Minimalist Event Display**: Task titles truncated with chunk information display
- **Interactive Event Management**: Click to view details, drag to move, resize to adjust duration
- **AI Reasoning Display**: Comprehensive scheduling explanations with chunk progress indicators
- **Batch Operations**: Clear all events or generate new schedules with single-click operations
- **Drag & Drop Support**: Move events by dragging to new time slots with automatic API updates
- **Event Resizing**: Adjust event duration by dragging edges with real-time persistence
- **Multi-View Support**: Month grid, week timeline, and day detail views with Chinese localization

**Technical Implementation:**
- **CalendarSettings Database**: Persistent user preferences with automatic silent saving and loading
- **Timezone Integration**: Real-time timezone detection (`Intl.DateTimeFormat().resolvedOptions().timeZone`) with UTC to local time conversion
- **Enhanced AI Prompts**: Execution procedures integration, current time context, and large task chunking strategies
- **Task Chunking System**: AI automatically splits 4+ hour tasks into 2-3 hour manageable blocks across multiple days
- **Database Models**: CalendarEvent and CalendarSettings models with task relationships and AI reasoning storage
- **API Endpoints**: Complete CRUD operations for calendar events, settings, and AI scheduling requests
- **FullCalendar Frontend**: React-based calendar using @fullcalendar/react with time grid and day grid plugins
- **Minimalist UI Design**: 
  - Transparent event and calendar backgrounds using CSS `!important` overrides
  - Colored dot system (8px dots) with priority-based colors from Tailwind palette
  - Chunk indicators ("第1/3部分") beneath task titles for multi-part tasks
  - Target emoji (🎯) for today identification across all views
- **Event Content Optimization**: Smart title truncation with chunk information display
- **CSS Architecture**: Comprehensive FullCalendar style overrides for transparent design
- **Real-time Updates**: React Query integration with optimistic UI updates and automatic settings persistence
- **AI Service Integration**: Enhanced ai_service_sqlite.py with execution procedures, timezone context, and chunking logic
- **Authentication Security**: Proper JWT token handling and protected route implementation
- **Error Handling**: Graceful fallbacks with deadline-priority based scheduling when AI fails and event reversion on API failures
- **Interactive Features**: Event detail popup with editable times, delete functionality, and comprehensive task information display

**Implementation Details:**
- **Frontend Calendar Page**: `/calendar` route with "智能日程" navigation menu item
- **Scheduling Parameters**: Configurable date ranges, work hours (09:00-18:00), break duration (15min), weekend inclusion
- **AI Scheduling Method**: `_build_calendar_scheduling_prompt()` with multi-factor analysis and user context integration
- **Database Session**: Consistent SessionLocal usage with custom get_db() dependency for authentication compatibility
- **Visual Interface**: Color-coded priority system, task duration display, AI reasoning explanations
- **Real-time Updates**: React Query integration with automatic cache invalidation and optimistic updates

**API Reference:** Full calendar API documentation available in backend API docs with scheduling endpoints and event management operations.

**Enhanced Execution Workflow:**
1. **Task Creation**: User creates task (manual/AI/image)
2. **Context Gathering**: System retrieves user profile and colleague information
3. **AI Analysis (Step 2)**: Project management AI generates structured execution steps
4. **Database Storage**: Procedures stored as JSON in SQLite
5. **AI Psychology Analysis (Step 3)**: Organizational psychology AI generates social advice
6. **Social Database Storage**: Social advice stored as JSON in SQLite
7. **API Access**: Both procedures and social advice available via dedicated endpoints
8. **Manual Override**: Users can regenerate both procedures and social advice independently

**Technical Implementation:**
- **Enhanced AI Service**: `generate_task_execution_guidance()` and `generate_social_advice()` methods
- **Background Processing**: Proper asyncio.create_task() with database session management
- **Database Session Fix**: Individual SessionLocal() instances for background tasks to prevent session conflicts
- **Dual AI Analysis**: Sequential execution procedures → social advice generation workflow
- **Error Handling**: Graceful fallbacks when AI provider unavailable with comprehensive logging
- **JSON Serialization**: Proper handling of dual JSON data structures in SQLite TEXT columns
- **Frontend Integration**: TaskProcedurePopup component with tabbed interface for procedures + social advice

**Interactive Procedure Management:**
- **Completion Tracking**: Individual checkbox for each procedure step (步骤一, 步骤二) with real-time status updates
- **✏️ Inline Editing**: Direct editing of procedure content and key results with save/cancel functionality
- **Delete Operations**: Remove individual procedures with automatic step renumbering
- **Fold/Expand Controls**: Collapsible procedure cards showing only step titles when folded
- **Auto-Fold on Completion**: Procedures automatically fold when marked as complete to reduce visual clutter
- **Real-time Persistence**: All changes immediately saved to database with optimistic UI updates

**Integration Points:**
- **Manual Task Creation**: Both procedures and social advice generated after task save
- **AI Task Generation**: Each generated task gets both execution procedures and social advice
- **Image-to-Task**: OCR-based tasks include both execution guidance and social intelligence
- **All workflows**: Seamless 3-step AI integration across all task creation methods
- **Frontend UI**: "执行指导" button opens popup with dual tabs for procedures + social advice

## UI/UX Refactoring & Enhancement (智时助手界面重构)

**COMPLETED** - Comprehensive UI redesign implementing modern design principles with sophisticated color theming and enhanced user experience.

### **Color System Overhaul**
**Primary Color Palette:**
- **Main Color**: `#2c3e50` (Sophisticated dark blue-gray)
- **Supporting Shades**: 
  - `primary-100`: #e8eaed (Light blue-gray backgrounds)
  - `primary-300`: #7c8791 (Medium blue-gray accents)
  - `primary-500`: #2c3e50 (Primary brand color)
  - `primary-600`: #233242 (Darker interaction states)

**Neutral System:**
- **Background**: #F8FAFC (Slate-50 - soft page background)
- **Cards**: #FFFFFF (Pure white for content areas)
- **Borders**: #E2E8F0 (Slate-200 - subtle divisions)
- **Text**: #0F172A primary, #64748B secondary

**Priority Tag Logic:**
| Urgency + Importance | Tag | Color | Quadrant |
|---------------------|-----|--------|----------|
| High + High | 高优先级 | Red-100/700 | Q1: Do First |
| Low + High | 重要 | Orange-100/700 | Q2: Schedule |
| High + Low | 紧急 | Blue-100/700 | Q3: Delegate |
| Low + Low | 低优先级 | Gray-100/700 | Q4: Don't Do |

### **Technical Implementation**
**CSS & Styling:**
- **CSS Custom Properties**: Updated root variables for consistent theming
- **Tailwind Configuration**: Extended color palette with sophisticated blue-gray system
- **Component Refactoring**: Complete overhaul of Dashboard, TaskCard, and Layout components
- **Responsive Design**: Maintained mobile-friendly grid layouts with improved breakpoints

**State Management:**
- **Edit Modal State**: `showEditForm` and `editingTask` state variables
- **Form Handling**: `handleEditTask()` and `handleEditSubmit()` functions
- **API Integration**: Enhanced mutation handling with success/error feedback
- **Real-time Updates**: Optimistic UI updates with automatic data refresh

## Data Models

**🗂️ Schema Reference:** See [Data Models Documentation](backend/docs/api/schemas.md) for complete schema definitions and [API Documentation](backend/API_DOCUMENTATION.md) for detailed model descriptions with examples.

**Key Models:**
- **User & Authentication Models**: User registration, login, and profile management
- **Task Models**: Task creation, Eisenhower Matrix classification, and CRUD operations
- **AI Provider Models**: Multi-category provider configuration (text/image models)
- **Chat Models**: Real-time messaging, session management, and WebSocket communication
- **Enhanced User Profile Models**: 
  - Big Five personality assessment and comprehensive work relationship tracking
  - Extended WorkRelationship schema with work_nickname, job_type, job_level, and personality dimensions
  - Auto-save form state models with localStorage persistence schemas

## AI Service Architecture Refactoring

**COMPLETED** - Comprehensive refactoring of `ai_service_sqlite.py` following professional software architecture principles with 5-step orchestrator pattern.

### **Core Improvements**

**Service Abstractions:**
- **`_make_ai_request()`** - Unified AI API interface with dynamic timeout configuration based on model type
- **`_extract_and_clean_json()`** - Smart JSON parsing with markdown code block detection and JavaScript comment cleanup
- **`_build_user_context_string()`** - Standardized user context formatting for consistent AI prompt integration
- **`_handle_ai_error()`** - Unified error handling with graceful fallbacks across all AI operations
- **`_get_timeout_config()`** - Dynamic timeout selection (2-5 minutes) based on reasoning vs regular models

**Prompt Engineering Separation:**
- **`_build_task_extraction_prompt()`** - Eisenhower Matrix task generation with user profile context
- **`_build_title_generation_prompt()`** - Session title generation with 10-character limit
- **`_build_execution_guidance_prompt()`** - SMART/RACI methodology for task procedures
- **`_build_social_advice_prompt()`** - Big Five personality-based social intelligence advice
- **`_build_ocr_prompt()`** - Chinese/English text extraction from images

### **Orchestrator Pattern Implementation**

**Method Transformation:**
- **`generate_task_from_text()`** - Refactored to 7-step orchestrator: Provider → Context → Prompt → Request → Parse → Validate → Return
- **`generate_session_title()`** - Streamlined to 4-step pattern: Provider → Prompt → Request → Clean
- **Clear Separation**: Data gathering → Prompt building → AI request → Response processing

### 8. Deadline Alarm System (截止日期提醒系统)

**FULLY IMPLEMENTED** - Comprehensive notification system for task deadline alerts with browser notifications and Feishu webhook integration.

**Core Functionality:**
- **Dual Notification System**: Browser notifications for personal alerts AND Feishu webhook notifications for enterprise integration
- **Three-Tier Alert System**: Strategic notification timing for optimal task management
  - **2 Days Before Deadline** - Early warning notification for planning
  - **24 Hours Before Deadline** - Urgent reminder for immediate action
  - **Deadline Arrived** - Critical alert for overdue tasks
- **Smart Integration**: Merged with existing TaskCard countdown system (runs every minute)
- **Duplicate Prevention**: Intelligent tracking prevents repeated notifications for same deadline stage

**Browser Notification Features:**
- **Auto Permission Request**: Non-intrusive permission request 3 seconds after app load
- **Rich Notification Content**: Contextual Chinese messages with task details and time remaining
- **Testing Functionality**: Built-in notification testing for user verification
- **Visual Status Indicators**: Real-time notification status display in UI

**Feishu Webhook Integration:**
- **Enterprise-Ready**: Direct webhook notifications to Feishu automation workflows for workplace task management
- **Settings Integration**: Dedicated Feishu webhook section in the Settings page with visual status indicators
- **URL Validation**: Real-time validation of Feishu webhook URL format with helpful error messaging
- **Test Functionality**: Built-in test message feature to verify webhook configuration before activation
- **Enable/Disable Toggle**: Users can easily turn webhook notifications on/off without losing configuration
- **Copy-Paste Configuration**: Ready-to-use JSON configuration that users copy directly into Feishu workflows

**Feishu Integration Workflow:**
- **JSON Parameter Specification**: Provides exact JSON configuration for Feishu webhook parameter setup
- **Rich Notification Content**: Sends structured task data including title, content, deadline, and urgency status
- **Three-Tier Delivery**: Matches browser notification timing (2 days before, 24 hours before, deadline arrived)
- **Automatic Formatting**: Smart message formatting optimized for Feishu's automation platform consumption
- **Step-by-Step Guidance**: Clear instructions for setting up Feishu automation workflows
- **Parameter Documentation**: Complete specification of JSON fields that Feishu workflows can consume
- **Visual Configuration**: Blue-highlighted JSON configuration box with one-click copy functionality

**Technical Architecture:**
- **Notification Service** (`notificationService.ts`): Permission management and rich notification content
- **Deadline Checker** (`deadlineChecker.ts`): Smart deadline analysis with three trigger points
- **Webhook Service**: HTTPx-based async webhook delivery with enterprise-grade reliability
- **Integrated Timer System**: Leverages existing TaskCard countdown for efficiency (no separate scheduler)
- **Persistent Tracking**: Maintains notification history to prevent duplicate alerts
- **Error Handling**: Graceful fallback when webhook delivery fails, with detailed logging
- **Database Persistence**: User webhook settings stored securely with enable/disable state management

The system transforms 智时助手 from a personal productivity tool into an enterprise-integrated solution that delivers task alerts through both personal browser notifications and corporate Feishu workflows.

### 9. Settings Page System (系统设置页面)

**FULLY IMPLEMENTED** - Dedicated settings management interface with organized configuration panels.

**Core Functionality:**
- **Centralized Settings Hub**: Unified location for all application preferences and configurations
- **Notification Management**: Complete deadline alarm system control and testing interface
- **Feishu Webhook Configuration**: Comprehensive Feishu integration setup and management
- **Organized Layout**: Category-based settings with visual status indicators and expandable sections
- **Future-Ready Architecture**: Extensible design for additional settings categories

**Settings Architecture:**
- **Dedicated Route**: `/settings` page accessible via sidebar navigation with Settings icon
- **Component Integration**: Reusable NotificationSettings and FeishuWebhookSettings components
- **Status Visualization**: Real-time display of notification permission and webhook configuration status
- **User Control Interface**: Enable/disable toggles, test functions, and reset capabilities

**UI/UX Design:**
- **Clean Organization**: Card-based layout with color-coded status indicators and left border accents
- **Progressive Disclosure**: Collapsible sections and status badges for optimal information hierarchy
- **Contextual Help**: Inline guidance for browser permissions and Feishu webhook troubleshooting
- **Future Categories**: Placeholder sections for user preferences, privacy settings, and security options

**Implementation Details:**
- **Removed from Dashboard**: Clean separation of concerns by moving settings out of task management interface
- **Simplified Components**: Streamlined settings components without redundant UI elements
- **Navigation Integration**: Added to sidebar navigation and routing system with proper authentication protection
- **State Management**: Persistent notification and webhook preferences with real-time status updates

**Feishu Webhook Management:**
- **Dedicated Webhook Section**: Complete Feishu webhook configuration interface within settings
- **Real-time Status Indicators**: Visual display of webhook configuration and connection status
- **Interactive Configuration**: Copy-paste JSON configuration with one-click copy functionality
- **Integrated Testing**: Built-in webhook testing without leaving the settings interface

### 10. Procedure Memorandum System (步骤备忘录系统)

**FULLY IMPLEMENTED** - Interactive hover-based memorandum system for task execution procedures with auto-save functionality.

**Core Functionality:**
- **Hover-Activated Interface**: Hover over any procedure card to instantly display memorandum box on the right side
- **Real-time Text Editing**: Direct typing in textarea with immediate visual feedback
- **Auto-Save on Exit**: Content automatically saves when mouse leaves hover box, no manual save required
- **Smart Content Management**: Empty memorandums are automatically deleted to keep database clean
- **Persistent Storage**: All memorandums stored in dedicated database table with user association

**User Experience:**
- **Seamless Integration**: Hover boxes appear positioned intelligently on the right side of procedure cards
- **No Click Required**: Pure hover interaction - just hover and start typing
- **Auto-Fold Behavior**: Completed procedures automatically fold on popup reopening to reduce visual clutter
- **Clean Interface**: No visual indicators or icons on procedure titles, maintaining clean design
- **Responsive Positioning**: Smart boundary detection prevents hover boxes from going off-screen

**Technical Implementation:**
- **Database Layer**: New ProcedureMemorandum table with proper user/task/procedure relationships
- **API Integration**: Complete CRUD operations for memorandum management
- **Frontend State**: React state management with real-time updates and change tracking
- **Auto-Save Logic**: Intelligent save triggering only when content changes, with empty content cleanup

The system transforms procedure execution from static instructions into interactive, personalized workflows where users can add contextual notes and reminders directly to each execution step.

## Next Priority Tasks

**Current Focus:**

1. **Prompt Engineering Optimization**
   - Fine-tune AI prompts for better calendar scheduling decisions
   - Enhance social intelligence accuracy with more nuanced Big Five integration
   - Optimize reasoning model prompt strategies for DeepSeek-R1
   - Improve calendar scheduling prompts for better time management

2. **UI/UX Enhancement**
   - Implement modern UI framework upgrade (shadcn/ui v2 or similar)
   - Enhance visual design consistency across all components
   - Improve responsive design for mobile/tablet experiences
   - Add progressive web app (PWA) capabilities
   - Calendar interface improvements and mobile optimization

3. **Performance & Scalability**
   - Database query optimization for large dataset handling
   - AI request caching strategies for frequently used operations
   - WebSocket connection pooling and management improvements
   - Calendar event indexing and performance optimization
- to
- to
- to