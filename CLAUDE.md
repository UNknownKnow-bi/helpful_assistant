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
- 🆕 EasyOCR 1.7.2 for Chinese/English text extraction from images

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
│   │   │   ├── ai_service_sqlite.py # AI provider integration
│   │   │   └── ocr_service.py    # 🆕 EasyOCR text extraction service
│   │   ├── data/                # SQLite database files
│   │   └── main.py              # FastAPI application entry
└── CLAUDE.md                     # Project documentation
```

## API Documentation

### 📖 Documentation Files
- **[Complete API Documentation](backend/API_DOCUMENTATION.md)** - Comprehensive guide with examples and workflows
- **[Auto-generated Endpoint Reference](backend/docs/api/endpoints.md)** - Complete endpoint documentation
- **[Data Models Reference](backend/docs/api/schemas.md)** - All API schemas and data structures
- **[API Documentation Index](backend/docs/api/README.md)** - Documentation overview and quick links
- **[OpenAPI Specification](backend/docs/api/openapi.json)** - Raw OpenAPI 3.0 JSON schema

### 🌐 Interactive Documentation (Server Running)
- **[Swagger UI](http://localhost:8000/docs)** - Interactive API explorer and testing interface
- **[ReDoc](http://localhost:8000/redoc)** - Clean, responsive API documentation
- **[OpenAPI JSON Endpoint](http://localhost:8000/openapi.json)** - Live specification endpoint

### 🛠️ Documentation Tools
```bash
# Generate/update API documentation
cd backend && python3 generate_api_docs.py

# Open documentation in browser
cd backend && python3 open_docs.py
```

## Core Features

### 1. AI Task Card Generation (任务卡片生成)

**✅ ENHANCED: Two-Stage Task Preview & Confirmation System**

**🆕 Two-Stage Workflow (Latest Update):**
- **Stage 1: Preview Generation** - AI generates task data without database save, displayed in interactive popup
- **Stage 2: Task Confirmation** - User reviews, edits, and confirms tasks before saving to database
- **Full Editing Capability** - All task properties (title, content, deadline, assignee, participant, urgency, importance, difficulty) editable in preview mode
- **Real-time Validation** - Visual feedback with priority badges, difficulty sliders, and form validation
- **No Database Pollution** - Failed or unwanted generations don't create database entries

**Core Functionality:**
- Accept Chinese text input from users OR image uploads with OCR text extraction
- Use AI to parse and extract task information using **Eisenhower Matrix** evaluation with **user profile context**
- Generate structured task cards with enhanced JSON schema(single or multi-task)
- Enhanced task properties: title, content separation, urgency/importance matrix, participant tracking
- **🆕 User Profile Integration**: Leverages user profile and colleague relationships for intelligent task analysis
- **🆕 Personalized Difficulty Assessment**: Task complexity evaluation based on user's job type, level, and management status
- **🆕 Smart Assignee/Participant Recognition**: Automatic identification of colleagues from user's work relationships
- **🆕 Context-Aware Priority Assessment**: Importance evaluation considering user's career stage and role responsibilities
- OCR Integration: EasyOCR-powered image text extraction with Chinese/English support

**🆕 Task Preview System:**
- **Interactive Preview Popup**: Full-screen popup with editable task cards
- **Comprehensive Editing**: Inline editing of all task fields with real-time updates
- **Visual Priority System**: Color-coded urgency/importance badges with dropdown selection
- **Difficulty Visualization**: Star-based difficulty display with interactive slider
- **Date/Time Picker**: Integrated datetime-local input for deadline selection
- **Form Validation**: Real-time validation with disabled save for invalid tasks
- **Batch Operations**: Confirm and save multiple tasks simultaneously

**🧠 Enhanced AI Prompt System:**
- **User Context Integration**: Includes name, work nickname, job type, job level, management status
- **Colleague Recognition**: Utilizes work relationships database for assignee/participant identification  
- **Personalized Difficulty Scaling**: Adjusts task complexity based on user's professional experience
- **Role-Aware Importance Assessment**: Considers career impact and growth value for different job levels

**📋 API Reference:** See [Tasks API Documentation](backend/API_DOCUMENTATION.md#task-management-apis) for complete endpoint details, request/response schemas, usage examples, and two-stage workflow implementation.
### 2. AI Service Configuration (AI配置)

**✅ ENHANCED: Model Categorization System (文本模型/图像模型)**

**Functionality:**
- Support multiple AI providers: DeepSeek, OpenAI-compatible APIs, **🆕 Image OCR providers**
- Built-in testing functionality with vision model testing for imageOCR providers
- Persistent configuration storage in SQLite database with auto-loading
- HTTPx-based direct AI provider integration for better performance
- **Complete CRUD Operations**: Create, read, update, and delete AI provider configurations
- **Parameter Validation**: Automatic max_tokens capping (≤8192) and parameter validation
- **Extended Timeouts**: 5-minute timeout support for reasoning models
- **Multi-Modal Support**: Vision model testing with sample image recognition for OCR providers
- **🆕 Model Categorization**: Automatic categorization into "文本模型" (text) and "图像模型" (image) categories
- **🆕 Multiple Active Models**: Support for MULTIPLE active models per category (multiple text models + multiple image models can all be active simultaneously)
- **🆕 Dynamic Model Selection**: Real-time model switching during chat conversations

**🤖 API Reference:** See [AI Providers API Documentation](backend/API_DOCUMENTATION.md#ai-provider-management-apis) for complete endpoint details, configuration schemas, and testing examples.
### 3. AI Chat Interface (AI问答界面)

**✅ ENHANCED: Dynamic Model Selection**

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
- **🆕 Dynamic Model Selection**: Real-time dropdown to switch between different text models during conversation
- **🆕 Model-specific WebSocket**: Support for `model_id` parameter in WebSocket messages

**💬 API Reference:** See [Chat API Documentation](backend/API_DOCUMENTATION.md#chat-apis) for complete WebSocket usage, endpoint details, message schemas, and real-time streaming examples.

**Chat Session Management:**
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


**🛑 Manual Stop Functionality (手动停止功能):**

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

**✅ ENHANCED & FULLY IMPLEMENTED** - Complete user profiling system with comprehensive colleague management, Big Five personality model, and enterprise-grade form persistence.

**Core Functionality:**
- **Basic Information Management**: Name, work nickname, gender-inclusive options, job type/level, management role
- **Big Five Personality Model**: Interactive tag-based personality assessment with 5 psychological dimensions
- **🆕 Enhanced Work Relationship Management**: Comprehensive colleague profiling with extended information fields
- **🆕 Auto-Save Form Persistence**: Enterprise-grade form data protection with localStorage integration
- **Real-time Updates**: Immediate database persistence with optimistic UI updates

**🆕 Enhanced Colleague Management Features:**
- **Extended Colleague Information**:
  - 工作昵称 (Work Nickname): Optional friendly names for colleagues
  - 职位类型 (Job Type): Free-text job descriptions and roles
  - 职位级别 (Job Level): Structured levels (实习/初级/中级/高级)
  - Big Five Personality Tags: Complete personality profiling for each colleague

- **💾 Auto-Save & Draft Management**:
  - **Real-time Form Persistence**: Automatic saving to localStorage while typing
  - **Page Navigation Safety**: Users can switch pages without losing input
  - **Draft Detection**: Visual indicators (📝 检测到草稿) when drafts exist
  - **Automatic Restoration**: Seamless draft recovery with restoration notifications
  - **Individual Storage**: Separate drafts for new colleague and each edit session
  - **User Control**: Smart cancel options with draft preservation choices

- **🎨 Enhanced UI/UX**:
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

**👤 API Reference:** See [User Profile API Documentation](backend/API_DOCUMENTATION.md#user-profile-apis) for complete endpoint details, Big Five personality schemas, and work relationship management examples.

**Frontend Components:**
- **Profile Page** (`/profile`): Tabbed interface with Basic Info, Personality, and Relationships
- **BasicInfoForm**: Gender-inclusive form with job classification
- **BigFivePersonality**: Interactive tag management system with color-coded dimensions
- **🆕 Enhanced WorkRelationshipCards**: 
  - Comprehensive colleague management with extended information fields
  - Inline editing with full form persistence
  - Auto-save functionality with draft management
  - Visual personality tag organization
  - Smart form cancellation with draft control

### 5. 🆕 OCR Image-to-Task Generation (图片识别任务生成)

**✅ FULLY IMPLEMENTED** - Complete OCR integration with dual-mode support: Local EasyOCR + Cloud AI OCR.

EasyOCR
- **Two-Step Workflow**: Upload → Preview extracted text → Generate tasks with user confirmation
- **Editable Preview**: Users can modify OCR results before task generation
- **🆕 OCR Method Display**: Shows which OCR method was used (AI OCR, EasyOCR, or fallback)
- **Error Handling**: Graceful handling of OCR failures, SSL issues, and automatic fallback mechanisms

**🆕 AI OCR Configuration:**
- **Provider Type**: `imageOCR` in AI providers configuration
- **Supported Models**: Vision-language models that support image input (qwen-vl-max, qwen-vl-ocr-latest, gpt-4v, etc.)
- **Base URL Example**: `https://dashscope.aliyuncs.com/compatible-mode/v1` (for Qwen)
- **✅ Base64 Image Encoding**: Automatically converts uploaded images to base64 format for API compatibility
- **Message Format**: Multi-modal message format with proper `data:image/{format};base64,{base64_data}` URL structure

**🆕 Image Processing Pipeline:**
1. **File Upload**: Accept JPG, PNG, JPEG, BMP, TIFF, WEBP, HEIC formats (max 10MB)
2. **Format Detection**: Use PIL/Pillow to detect actual image format
3. **Base64 Conversion**: Convert image bytes to base64 string
4. **Content-Type Mapping**: Map format to proper MIME type (image/jpeg, image/png, etc.)
5. **API Call**: Send formatted data URL to vision-language model

**🖼️ API Reference:** See [OCR API Documentation](backend/API_DOCUMENTATION.md#ocr-image-to-task-generation) for complete image processing endpoints, OCR configuration, and dual-mode extraction examples.

### 6. 🆕 AI Task Execution & Social Intelligence System (AI任务执行与社交智能系统)

**✅ FULLY IMPLEMENTED** - Complete 3-step AI workflow for automatic task execution guidance and social intelligence advice generation.

**🏗️ Architecture Overview:**
The feature implements a sophisticated **3-step AI workflow** that automatically generates comprehensive task guidance:
1. **Step 1**: Task Creation (existing functionality)
2. **Step 2**: AI-powered Execution Guidance Generation (project management procedures)
3. **Step 3**: AI-powered Social Intelligence Advice Generation (organizational psychology insights)

**🤖 Core Functionality:**
- **Dual AI Generation**: Every task gets both execution procedures AND social intelligence advice automatically
- **User Context Integration**: Leverages user profile and colleague relationships for personalized guidance
- **Professional Methodologies**: Project management (SMART/RACI) + organizational psychology (Big Five)
- **Background Processing**: Non-blocking AI generation using asyncio.create_task() with proper database session management
- **Multiple Integration Points**: Works with manual tasks, AI-generated tasks, and image-to-task workflows
- **🆕 Social Intelligence**: Personality-aware communication strategies for workplace interactions

**🧠 Dual AI Prompt Systems:**

**Execution Procedures AI:**
- **Professional Role**: Project management expert with SMART/RACI methodology expertise
- **Objective Focus**: 100% task-oriented breakdown, ignoring soft interpersonal factors
- **User Context Aware**: Integrates name, job type, level, management status, and colleague relationships
- **Structured Methodology**: Breaks complex tasks into logical phases with actionable steps
- **Key Results Oriented**: Each step includes specific deliverable outcomes

**🆕 Social Intelligence AI:**
- **Professional Role**: Top organizational psychologist and workplace EQ coach with Big Five expertise
- **Psychology Focus**: Analyzes colleague personalities and predicts interpersonal dynamics
- **Communication Strategy**: Provides specific wording, channels, and approach recommendations
- **Risk Assessment**: Identifies potential social traps and relationship obstacles
- **Context Integration**: Considers user's career stage, management status, and team relationships

**📋 API Reference:** See [Tasks API Documentation](backend/API_DOCUMENTATION.md#task-management-apis) for complete endpoint details and [Social Intelligence API](backend/API_DOCUMENTATION.md) for execution procedures and social advice endpoints.

**🗄️ Database Integration:**
- **Dual Columns**: Added `execution_procedures` and `social_advice` TEXT columns to tasks table
- **JSON Storage**: Stores structured arrays as JSON strings (SQLite compatibility)
- **Migration Support**: Automated database migration scripts
- **Pydantic Validation**: Automatic JSON parsing and validation in response models
- **🆕 Social Advice Schema**: Stores procedure-linked social intelligence recommendations

**⚡ Enhanced Execution Workflow:**
1. **Task Creation**: User creates task (manual/AI/image)
2. **Context Gathering**: System retrieves user profile and colleague information
3. **AI Analysis (Step 2)**: Project management AI generates structured execution steps
4. **Database Storage**: Procedures stored as JSON in SQLite
5. **🆕 AI Psychology Analysis (Step 3)**: Organizational psychology AI generates social advice
6. **🆕 Social Database Storage**: Social advice stored as JSON in SQLite
7. **API Access**: Both procedures and social advice available via dedicated endpoints
8. **Manual Override**: Users can regenerate both procedures and social advice independently

**🔧 Technical Implementation:**
- **Enhanced AI Service**: `generate_task_execution_guidance()` and `generate_social_advice()` methods
- **Background Processing**: Proper asyncio.create_task() with database session management
- **Database Session Fix**: Individual SessionLocal() instances for background tasks to prevent session conflicts
- **Dual AI Analysis**: Sequential execution procedures → social advice generation workflow
- **Error Handling**: Graceful fallbacks when AI provider unavailable with comprehensive logging
- **JSON Serialization**: Proper handling of dual JSON data structures in SQLite TEXT columns
- **🆕 Frontend Integration**: TaskProcedurePopup component with tabbed interface for procedures + social advice

**✅ Integration Points:**
- **Manual Task Creation**: Both procedures and social advice generated after task save
- **AI Task Generation**: Each generated task gets both execution procedures and social advice
- **Image-to-Task**: OCR-based tasks include both execution guidance and social intelligence
- **All workflows**: Seamless 3-step AI integration across all task creation methods
- **🆕 Frontend UI**: "执行指导" button opens popup with dual tabs for procedures + social advice

**📊 Enhanced Benefits:**
- **Dual Intelligence**: Users get both operational procedures AND social intelligence guidance
- **Context Awareness**: Procedures and advice tailored to user's role, relationships, and colleague personalities
- **Professional Quality**: Project management (SMART/RACI) + organizational psychology best practices
- **🆕 Social Success**: Maximizes workplace collaboration success through personality-aware communication strategies
- **Time Saving**: Eliminates both manual task planning AND social strategy development effort
- **Risk Mitigation**: Proactively identifies and prevents interpersonal obstacles
- **Consistency**: Standardized approach across all tasks with comprehensive guidance

## Data Models

**🗂️ Schema Reference:** See [Data Models Documentation](backend/docs/api/schemas.md) for complete schema definitions and [API Documentation](backend/API_DOCUMENTATION.md) for detailed model descriptions with examples.

**Key Models:**
- **User & Authentication Models**: User registration, login, and profile management
- **Task Models**: Task creation, Eisenhower Matrix classification, and CRUD operations
- **AI Provider Models**: Multi-category provider configuration (text/image models)
- **Chat Models**: Real-time messaging, session management, and WebSocket communication
- **🆕 Enhanced User Profile Models**: 
  - Big Five personality assessment and comprehensive work relationship tracking
  - Extended WorkRelationship schema with work_nickname, job_type, job_level, and personality dimensions
  - Auto-save form state models with localStorage persistence schemas
## Development Phases

1. **Foundation Setup** (Week 1): ✅ **COMPLETED** - FastAPI backend setup, database models, authentication
2. **AI Service Layer** (Week 2): ✅ **COMPLETED** - HTTPx integration, provider management, streaming, SQLite migration, full CRUD operations, **✅ Model categorization system**
3. **Task Generation** (Week 3): ✅ **COMPLETED** - Full AI-powered multi-task generation, CRUD operations, UI integration, **🆕 EasyOCR image support**
4. **Chat Interface** (Week 4): ✅ **COMPLETED** - Real-time chat, WebSocket streaming, thinking blocks, SQLite persistence, **✅ Dynamic model selection**
5. **User Profiling** (Week 5): ✅ **ENHANCED & COMPLETED** - **🆕 Comprehensive colleague management system**, Big Five personality assessment, enhanced work relationship tracking, enterprise-grade form persistence
6. **Frontend Integration** (Week 6): ✅ **COMPLETED** - Complete UI with task management, chat integration, responsive design, **✅ Categorized AI Config interface**
7. **Task Execution Guidance** (Week 7): ✅ **ENHANCED & COMPLETED** - **🆕 3-Step AI Workflow**: Task Execution Procedures + Social Intelligence Advice System, automatic dual AI generation, user context integration, background processing with database session management
8. **Testing & Polish** (Week 8-9): ⏳ **IN PROGRESS** - Social intelligence system testing, performance optimization, deployment preparation

## Next Priority Tasks

**🔄 Current Focus:**

1.Prompt polish
 - mostly used user's personality in working;
2.UI polish
 - get new UI framework and frontend display;