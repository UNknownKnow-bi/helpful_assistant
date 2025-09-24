# Cortex Assistant API Documentation

## Overview

This is the comprehensive API documentation for "智时助手 (Cortex Assistant)" - an AI-powered intelligent assistant for Chinese knowledge workers. The API provides endpoints for task management, AI configuration, real-time chat, user profiling, OCR-based image processing, **🆕 AI-powered task execution procedures**, **🆕 AI-powered social intelligence advice**, **🆕 two-stage task preview & confirmation system**, **🆕 real-time deadline timer system**, **🆕 AI-powered time estimation with user expertise integration**, **✨ interactive procedure management with completion tracking and inline editing**, **📅 AI-powered calendar & task scheduling system**, **🚨 deadline alarm notification system**, and **🎨 sophisticated Eisenhower Matrix-based UI integration**.

## Base URL
```
http://localhost:8000
```

## Authentication

The API uses JWT (JSON Web Token) authentication with 24-hour token validity. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

**Token Management:**
- Token validity: 24 hours (1440 minutes)
- Automatic refresh: Frontend handles token renewal transparently
- Manual refresh: Use `POST /api/auth/refresh` endpoint
- Session continuity: Users stay logged in without interruption

---

## API Endpoints Overview

### 🔐 Authentication APIs
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token
- `GET /api/auth/me` - Get current user info

### 🤖 AI Provider Management APIs
- `POST /api/ai-providers` - Create AI provider configuration
- `GET /api/ai-providers` - List all AI providers
- `PUT /api/ai-providers/{provider_id}` - Update AI provider
- `DELETE /api/ai-providers/{provider_id}` - Delete AI provider
- `POST /api/ai-providers/{provider_id}/test` - Test AI provider connection
- `GET /api/ai-providers/active/{category}` - Get active providers by category
- `GET /api/ai-providers/text-models` - Get active text models for chat

### 📋 Task Management APIs
- `POST /api/tasks` - Create task manually (auto-generates procedures + social advice)
- `POST /api/tasks/generate` - Generate tasks from text using AI (auto-generates procedures + social advice)
- **🆕 `POST /api/tasks/generate-preview`** - Generate task preview without database save (Two-Stage Workflow)
- **🆕 `POST /api/tasks/confirm-tasks`** - Confirm and save preview tasks to database
- `POST /api/tasks/extract-text-from-image` - Extract text from image using OCR
- `POST /api/tasks/generate-from-image` - Generate tasks from image (auto-generates procedures + social advice)
- `GET /api/tasks` - List tasks with filtering
- `GET /api/tasks/stats` - Get task statistics
- `GET /api/tasks/{task_id}` - Get specific task
- `PUT /api/tasks/{task_id}` - Update task
- **🆕 `PATCH /api/tasks/{task_id}/status`** - Update task status (undo/done) with real-time deadline calculation
- `DELETE /api/tasks/{task_id}` - Delete task
- `GET /api/tasks/{task_id}/execution-procedures` - Get task execution procedures
- `POST /api/tasks/{task_id}/regenerate-execution-procedures` - Regenerate execution procedures
- **🆕 `PATCH /api/tasks/{task_id}/execution-procedures/{procedure_number}`** - Update individual procedure (content, completion status)
- **🆕 `DELETE /api/tasks/{task_id}/execution-procedures/{procedure_number}`** - Delete individual procedure with auto-renumbering
- **🆕 `GET /api/tasks/{task_id}/social-advice`** - Get AI-powered social intelligence advice
- **🆕 `POST /api/tasks/{task_id}/generate-social-advice`** - Generate social intelligence advice
- **🆕 `GET /api/tasks/{task_id}/procedures/{procedure_number}/memorandum`** - Get memorandum for specific procedure step
- **🆕 `POST /api/tasks/{task_id}/procedures/{procedure_number}/memorandum`** - Create/update memorandum for procedure step
- **🆕 `PUT /api/tasks/{task_id}/procedures/{procedure_number}/memorandum`** - Update existing memorandum
- **🆕 `DELETE /api/tasks/{task_id}/procedures/{procedure_number}/memorandum`** - Delete procedure memorandum

### 💬 Chat APIs
- `WebSocket /api/chat/ws/{session_id}` - Real-time chat streaming
- `POST /api/chat/sessions` - Create chat session
- `GET /api/chat/sessions` - List chat sessions
- `GET /api/chat/sessions/{session_id}/messages` - Get chat history
- `DELETE /api/chat/sessions/{session_id}` - Delete chat session
- `POST /api/chat/sessions/{session_id}/generate-title` - Auto-generate session title
- `PUT /api/chat/sessions/{session_id}/title` - Update session title
- `GET /api/chat/sessions/{session_id}/status` - Check session status
- `POST /api/chat/sessions/{session_id}/stop` - Stop ongoing AI response

### 👤 User Profile APIs
- `GET /api/profile` - Get user profile
- `POST /api/profile` - Create/update user profile
- `PUT /api/profile` - Update user profile
- `PUT /api/profile/personality/{dimension}` - Update personality dimension
- `GET /api/profile/relationships` - Get work relationships
- `POST /api/profile/relationships` - Create work relationship
- `PUT /api/profile/relationships/{id}` - Update work relationship
- `DELETE /api/profile/relationships/{id}` - Delete work relationship

### 📅 Calendar & Task Scheduling APIs
- `POST /api/calendar/schedule-tasks` - AI-powered intelligent task scheduling
- `GET /api/calendar/events` - Get calendar events within date range
- `PUT /api/calendar/events/{event_id}` - Update calendar event
- `DELETE /api/calendar/events/{event_id}` - Delete calendar event
- `DELETE /api/calendar/events` - Clear calendar events within date range

### 🚨 Deadline Alarm System
- **Frontend-Only Implementation** - Browser notification system integrated with existing APIs
- **Three-Tier Alert System** - 2 days, 24 hours, and deadline arrived notifications
- **No Additional Backend APIs** - Leverages existing task management endpoints
- **Real-Time Integration** - Works with existing countdown timer and task status updates

---

## 🚨 Deadline Alarm System Implementation

### **Overview**
The deadline alarm system provides **browser-based push notifications** to alert users about approaching task deadlines. This system is **entirely frontend-implemented** and integrates seamlessly with existing task management APIs without requiring additional backend endpoints.

### **Core Features**

#### **📢 Three-Tier Notification System**
- **📅 2 Days Before Deadline**: Early warning notification
  - Title: "📅 任务提醒 - 还有2天"
  - Message: "任务「{task_title}」将在 {formatted_date} 到期"
  - Purpose: Allows planning and preparation time

- **⏰ 24 Hours Before Deadline**: Urgent reminder  
  - Title: "⏰ 紧急任务提醒 - 还有24小时"
  - Message: "任务「{task_title}」将在 {formatted_date} 到期，请尽快完成！"
  - Purpose: Immediate action required

- **🚨 Deadline Arrived**: Critical alert
  - Title: "🚨 任务截止提醒"  
  - Message: "任务「{task_title}」现在已到期！"
  - Purpose: Overdue task notification

#### **🔧 Technical Integration**

**Existing API Utilization:**
- Uses `GET /api/tasks` to fetch task data
- Integrates with existing `deadline` field in task responses
- Works with `status` field to filter only active tasks (`status: 'undo'`)
- No additional API endpoints required

**Frontend Architecture:**
- **NotificationService** (`notificationService.ts`): Handles Web Push API integration
- **DeadlineChecker** (`deadlineChecker.ts`): Analyzes deadlines and triggers alerts
- **TaskCard Integration**: Merged with existing countdown timer (runs every minute)
- **Settings Management**: Dedicated `/settings` page for notification control

#### **⚡ Performance Optimizations**

**Unified Timer System:**
- Integrates with existing TaskCard countdown timer
- Single minute-based interval handles both UI updates and notification checking
- No separate scheduling system needed
- Resource-efficient implementation

**Duplicate Prevention:**
- Tracks sent notifications per task and deadline stage
- Prevents spam notifications for same deadline threshold
- Automatic cleanup when tasks are completed or deadlines updated

#### **🎛️ User Experience**

**Permission Management:**
- Auto-requests browser notification permission (3 seconds after app load)
- Non-intrusive permission handling with fallback messages
- Clear status indicators in Settings page

**Settings Interface:**
- Dedicated Settings page (`/settings`) with notification controls
- Real-time status display (enabled/disabled/permission status)
- Test notification functionality
- Reset notification tracking capability

**Rich Notifications:**
- Chinese-localized messages with contextual information
- Formatted deadline dates and times
- Task title integration
- Auto-close timers (except for critical deadline arrived notifications)

#### **🔄 Integration with Existing Systems**

**Task Management Integration:**
- Works with existing task creation, editing, and status updates
- Automatically adjusts to deadline changes
- Respects task completion status
- Integrates with Eisenhower Matrix categorization

**Real-Time Updates:**
- Synchronized with existing countdown timer system
- Updates alongside deadline category calculations
- Maintains consistency with UI deadline displays
- No additional API calls required for notification functionality

### **Usage Notes**

**Browser Compatibility:**
- Requires modern browsers with Web Push API support
- Graceful fallback for unsupported browsers
- Clear messaging for permission-denied scenarios

**Data Privacy:**
- All notification logic runs in frontend
- No additional data stored on backend
- Uses existing task data only
- User notification preferences stored locally

**Settings Management:**
- Accessible via sidebar navigation
- Visual status indicators for notification system state
- Test functionality for user verification
- Independent control without affecting task management

---

## 🎨 UI/UX Integration Features

The API now provides full integration with a sophisticated **Eisenhower Matrix-based dashboard** that transforms task management through strategic prioritization and modern design principles.

### **🎯 Eisenhower Matrix Dashboard**
- **Automatic Task Categorization**: Tasks are automatically organized into four strategic quadrants based on urgency and importance
- **Real-time Repositioning**: API changes to task priority instantly move tasks between quadrants
- **Visual Priority System**: Color-coded quadrants with distinct styling for immediate recognition
- **Smart Tag Generation**: Dynamic priority tags based on urgency/importance combinations

### **💳 Enhanced Task Card Design**  
- **Professional Aesthetics**: Modern dark blue-gray theme (#2c3e50) with sophisticated color palette
- **Comprehensive Information Display**: Deadline, assignee, participants, and visual difficulty indicators
- **Interactive Elements**: Icon-based action buttons with hover tooltips and smooth transitions
- **Priority Tag Logic**: Automatic tag assignment (高优先级, 重要, 紧急, 低优先级) based on matrix positioning

### **✏️ Complete Edit Functionality**
- **Full Modal Integration**: Professional edit dialog with pre-populated fields
- **Real-time Validation**: Form validation with proper data type handling and error feedback
- **Seamless API Integration**: Direct connection to `PUT /api/tasks/{task_id}` endpoint
- **Automatic Updates**: Immediate UI refresh and quadrant repositioning after successful updates

### **🎛️ Modern Navigation & Interface**
- **Sophisticated Sidebar**: Professional navigation with Lucide React icons and elegant activation states
- **Clean Information Architecture**: Streamlined interface with reduced cognitive load
- **Responsive Design**: Mobile-friendly layouts with improved breakpoints
- **Accessibility Features**: High contrast ratios, clear visual hierarchy, and intuitive interactions

---

## Detailed API Specifications

### Authentication APIs

#### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "string",
  "created_at": "2025-01-01T00:00:00Z",
  "profile_setup_completed": false
}
```

#### POST /api/auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "string"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "string"
  }
}
```

#### POST /api/auth/refresh
Refresh the current user's JWT token to extend session validity.

**Headers:**
```
Authorization: Bearer <current_jwt_token>
```

**Request Body:**
None required - uses current authenticated user

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "message": "Token refreshed successfully"
}
```

**Error Responses:**
- `401 Unauthorized`: Current token is invalid or expired
- `500 Internal Server Error`: Token refresh failed

**Notes:**
- Token validity extended to 24 hours (1440 minutes)
- Frontend automatically calls this endpoint when receiving 401 errors
- Used for maintaining user sessions without requiring re-login

### AI Provider Management APIs

#### POST /api/ai-providers
Create a new AI provider configuration.

**Request Body:**
```json
{
  "provider_name": "DeepSeek API",
  "provider_type": "deepseek",
  "api_key": "your_api_key",
  "base_url": "https://api.deepseek.com/v1",
  "model": "deepseek-chat",
  "temperature": 0.7,
  "max_tokens": 4096,
  "top_p": 0.9,
  "frequency_penalty": 0.0,
  "presence_penalty": 0.0,
  "stream": true,
  "is_active": true
}
```

**Response:**
```json
{
  "id": 1,
  "provider_name": "DeepSeek API",
  "provider_type": "deepseek",
  "category": "text",
  "config": {
    "api_key": "your_api_key",
    "base_url": "https://api.deepseek.com/v1",
    "model": "deepseek-chat",
    "temperature": 0.7,
    "max_tokens": 4096,
    "top_p": 0.9,
    "frequency_penalty": 0.0,
    "presence_penalty": 0.0,
    "stream": true
  },
  "is_active": true,
  "last_tested": null,
  "created_at": "2025-01-01T00:00:00Z"
}
```

#### GET /api/ai-providers
List all configured AI providers for the authenticated user.

**Query Parameters:**
- `category` (optional): Filter by category ("text" or "image")
- `is_active` (optional): Filter by active status (true/false)

**Response:**
```json
[
  {
    "id": 1,
    "provider_name": "DeepSeek API",
    "provider_type": "deepseek",
    "category": "text",
    "is_active": true,
    "last_tested": "2025-01-01T00:00:00Z",
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```

#### POST /api/ai-providers/{provider_id}/test
Test AI provider connection and functionality.

**Response:**
```json
{
  "success": true,
  "message": "AI provider test successful",
  "response_time": 1.23,
  "model_info": {
    "model": "deepseek-chat",
    "provider_type": "deepseek"
  }
}
```

### Task Management APIs

#### POST /api/tasks
Create a new task manually with automatic execution procedure and social intelligence advice generation.

**🆕 Enhanced with Dual AI Generation**: This endpoint now automatically generates both AI-powered execution guidance AND social intelligence advice after task creation using a sophisticated 3-step AI workflow.

**Request Body:**
```json
{
  "title": "产品需求分析报告",
  "content": "完成一个新的产品需求分析报告，需要在本周五之前提交给产品经理张三，涉及用户调研、竞品分析和技术可行性评估",
  "deadline": "2025-01-05T17:00:00Z",
  "assignee": "产品经理张三",
  "participant": "你",
  "urgency": "high",
  "importance": "high",
  "difficulty": 7,
  "cost_time_hours": 8.5
}
```

**Response:**
```json
{
  "id": 13,
  "title": "产品需求分析报告",
  "content": "完成一个新的产品需求分析报告，需要在本周五之前提交给产品经理张三，涉及用户调研、竞品分析和技术可行性评估",
  "deadline": "2025-01-05T17:00:00Z",
  "assignee": "产品经理张三",
  "participant": "你",
  "urgency": "high",
  "importance": "high",
  "difficulty": 7,
  "cost_time_hours": 8.5,
  "source": "manual",
  "status": "undo",
  "deadline_category": "仅剩2天",
  "execution_procedures": [
    {
      "procedure_number": 1,
      "procedure_content": "收集和整理用户调研数据，分析用户需求和痛点",
      "key_result": "完成用户调研数据分析报告",
      "completed": false
    },
    {
      "procedure_number": 2,
      "procedure_content": "进行竞品分析，识别市场空白和机会点",
      "key_result": "完成竞品对比分析报告",
      "completed": false
    }
  ],
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

**⚡ Automatic Execution Procedures Generation:**
- Procedures are generated in background after task creation
- If no execution procedures appear immediately, they may still be generating
- Use `GET /api/tasks/{task_id}/execution-procedures` to check generation status
- Fallback procedures created if AI service unavailable

#### POST /api/tasks/generate
Generate structured task cards from text input using AI with automatic execution procedures.

**Request Body:**
```json
{
  "text": "明天需要完成季度报告，下周三要参加项目评审会议，还要安排团队培训"
}
```

**Response:**
```json
{
  "tasks": [
    {
      "id": 1,
      "title": "完成季度报告",
      "content": "准备和完成本季度的工作报告，包括数据分析和总结",
      "deadline": "2025-01-02T23:59:59Z",
      "assignee": "老板",
      "participant": "你",
      "urgency": "high",
      "importance": "high",
      "difficulty": 7,
      "cost_time_hours": 6.0,
      "source": "ai_generated",
      "status": "undo",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ],
  "total_generated": 3
}
```

**🆕 Enhanced with Execution Procedures**: Each generated task automatically includes AI-powered execution guidance. Procedures are generated in background and can be retrieved via `GET /api/tasks/{task_id}/execution-procedures`.
```

### 🆕 Two-Stage Task Preview System

#### POST /api/tasks/generate-preview
Generate task preview from text input using AI **without saving to database**. Part of the two-stage workflow for user review and editing before confirmation.

**🎯 Workflow Stage**: **Stage 1** - Preview Generation (no database save)

**Request Body:**
```json
{
  "text": "明天需要完成季度报告，下周三要参加项目评审会议，还要安排团队培训"
}
```

**Response:**
```json
{
  "tasks": [
    {
      "title": "完成季度报告",
      "content": "准备和完成本季度的工作报告，包括数据分析和总结",
      "deadline": "2025-01-02T23:59:59Z",
      "assignee": null,
      "participant": "你",
      "urgency": "high",
      "importance": "high",
      "difficulty": 7,
      "cost_time_hours": 6.0
    },
    {
      "title": "参加项目评审会议",
      "content": "参加下周三的项目评审会议，准备相关材料",
      "deadline": "2025-01-08T14:00:00Z",
      "assignee": null,
      "participant": "你",
      "urgency": "high",
      "importance": "high",
      "difficulty": 4,
      "cost_time_hours": 2.5
    }
  ],
  "message": "已生成 2 个任务预览，请确认后保存"
}
```

**Key Features:**
- **No Database Operations**: Tasks are not saved until user confirms
- **Full AI Analysis**: Uses same AI intelligence as regular generation
- **User Context Integration**: Leverages user profile and colleague relationships
- **Editable Preview**: All task properties can be modified in frontend popup

**Error Responses:**
```json
{
  "detail": "Text input is required"
}
```

#### POST /api/tasks/confirm-tasks
Confirm and save preview tasks to database with automatic execution procedure and social intelligence advice generation.

**🎯 Workflow Stage**: **Stage 2** - Task Confirmation (database save + AI guidance)

**Request Body:**
```json
{
  "tasks": [
    {
      "title": "完成季度报告",
      "content": "准备和完成本季度的工作报告，包括数据分析和总结",
      "deadline": "2025-01-02T23:59:59Z",
      "assignee": null,
      "participant": "你",
      "urgency": "high",
      "importance": "high",
      "difficulty": 7,
      "cost_time_hours": 6.0
    },
    {
      "title": "参加项目评审会议",
      "content": "参加下周三的项目评审会议，准备相关材料",
      "deadline": "2025-01-08T14:00:00Z",
      "assignee": "项目经理",
      "participant": "你",
      "urgency": "high",
      "importance": "high",
      "difficulty": 4,
      "cost_time_hours": 2.5
    }
  ]
}
```

**Response:**
```json
[
  {
    "id": 25,
    "title": "完成季度报告",
    "content": "准备和完成本季度的工作报告，包括数据分析和总结",
    "deadline": "2025-01-02T23:59:59Z",
    "assignee": null,
    "participant": "你",
    "urgency": "high",
    "importance": "high",
    "difficulty": 7,
    "cost_time_hours": 6.0,
    "source": "ai_generated",
    "status": "undo",
    "deadline_category": "进行中",
    "execution_procedures": null,
    "social_advice": null,
    "created_at": "2025-09-05T08:30:00Z",
    "updated_at": "2025-09-05T08:30:00Z"
  },
  {
    "id": 26,
    "title": "参加项目评审会议",
    "content": "参加下周三的项目评审会议，准备相关材料",
    "deadline": "2025-01-08T14:00:00Z",
    "assignee": "项目经理",
    "participant": "你",
    "urgency": "high",
    "importance": "high",
    "difficulty": 4,
    "cost_time_hours": 2.5,
    "source": "ai_generated",
    "status": "undo",
    "deadline_category": "进行中",
    "execution_procedures": null,
    "social_advice": null,
    "created_at": "2025-09-05T08:30:00Z",
    "updated_at": "2025-09-05T08:30:00Z"
  }
]
```

**Background Processing:**
- **Execution Procedures**: Generated automatically for each confirmed task
- **Social Intelligence Advice**: Generated after execution procedures complete
- **3-Step AI Workflow**: Task creation → Execution procedures → Social advice
- **Retrieval**: Use `GET /api/tasks/{task_id}/execution-procedures` and `GET /api/tasks/{task_id}/social-advice`

**Two-Stage Workflow Benefits:**
- **User Control**: Review and edit AI-generated tasks before saving
- **No Database Pollution**: Failed generations don't create database entries
- **Enhanced Accuracy**: Correct AI interpretations before storage
- **Visual Feedback**: Priority badges, difficulty sliders, validation in frontend
- **Batch Operations**: Confirm multiple tasks with individual editing

**Error Responses:**
```json
{
  "detail": "No tasks provided for confirmation"
}
```

### OCR Image-to-Task Generation

#### POST /api/tasks/extract-text-from-image
Extract text from uploaded image using dual-mode OCR (AI OCR + EasyOCR fallback).

**👁️ Preview Step**: This endpoint extracts text for preview before task generation. Use `POST /api/tasks/generate` with the extracted text to create tasks with execution procedures.

**🆕 Dual-Mode OCR System:**
- **Primary**: AI OCR using configured vision-language models (qwen-vl-max, gpt-4v, etc.)
- **Fallback**: Local EasyOCR for Chinese/English text extraction
- **Automatic Fallback**: Falls back to EasyOCR if AI OCR fails or is unavailable

**Request:**
- **Content-Type**: `multipart/form-data`
- **Form Field**: `file` containing image file
- **Supported Formats**: JPG, PNG, JPEG, BMP, TIFF, WEBP, HEIC
- **Max File Size**: 10MB
- **Image Processing**: Automatic format detection and base64 encoding

**Response:**
```json
{
  "success": true,
  "extracted_text": "明天需要完成季度报告\n项目评审会议安排在下周三\n团队培训计划制定",
  "message": "Text extraction successful",
  "ocr_method": "AI OCR"
}
```

**➡️ Next Step**: Use the extracted text with `POST /api/tasks/generate` to create tasks with automatic execution procedure generation.

#### POST /api/tasks/generate-from-image (Legacy)
Direct image-to-task generation with automatic execution procedures.

**🆕 Enhanced with Execution Procedures**: Tasks generated from images automatically include AI-powered execution guidance.

**Request:**
- **Content-Type**: `multipart/form-data`
- **Form Field**: `file` containing image file
- **Supported Formats**: JPG, PNG, JPEG, BMP, TIFF, WEBP, HEIC
- **Max File Size**: 10MB

**Response:**
```json
{
  "tasks": [
    {
      "id": 15,
      "title": "完成项目报告",
      "content": "从图片中提取的任务内容",
      "execution_procedures": [
        {
          "procedure_number": 1,
          "procedure_content": "收集项目数据和进度信息",
          "key_result": "完成项目数据整理报告"
        }
      ],
      "source": "ai_generated",
      "status": "undo"
    }
  ]
}
```

**OCR Method Values:**
- `"AI OCR"` - Extracted using configured AI vision model
- `"EasyOCR"` - Extracted using local EasyOCR engine  
- `"Fallback"` - AI OCR failed, used EasyOCR as backup

**🔧 AI OCR Configuration:**
Configure image OCR providers in AI Provider Management:
```json
{
  "provider_name": "Qwen Vision OCR",
  "provider_type": "imageOCR",
  "api_key": "your_dashscope_api_key",
  "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
  "model": "qwen-vl-ocr-latest",
  "is_active": true
}
```

**📊 Image Processing Pipeline:**
1. **Upload Validation**: File format and size validation
2. **Format Detection**: PIL/Pillow automatic format detection
3. **Base64 Encoding**: Convert to `data:image/{format};base64,{data}` format
4. **AI OCR Attempt**: Send to active vision models with OCR prompt
5. **Fallback Processing**: Use EasyOCR if AI OCR fails or unavailable
6. **Text Cleaning**: Remove extra whitespace and normalize output

**Error Responses:**
```json
{
  "success": false,
  "error": "No active imageOCR providers found",
  "message": "Please configure at least one AI OCR provider or ensure EasyOCR is available"
}
```

#### GET /api/tasks
List tasks with filtering and pagination.

**Query Parameters:**
- `urgency` (optional): Filter by urgency ("low", "high")
- `importance` (optional): Filter by importance ("low", "high")
- `status` (optional): Filter by status ("pending", "in_progress", "completed")
- `limit` (optional): Number of results per page (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "tasks": [
    {
      "id": 1,
      "title": "完成季度报告",
      "content": "准备和完成本季度的工作报告",
      "deadline": "2025-01-02T23:59:59Z",
      "urgency": "high",
      "importance": "high",
      "difficulty": 7,
      "status": "undo"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

#### GET /api/tasks/stats
Get task statistics with Eisenhower Matrix distribution.

**Response:**
```json
{
  "total_tasks": 15,
  "by_status": {
    "pending": 8,
    "in_progress": 5,
    "completed": 2
  },
  "eisenhower_matrix": {
    "urgent_important": 3,
    "not_urgent_important": 5,
    "urgent_not_important": 4,
    "not_urgent_not_important": 3
  },
  "average_difficulty": 6.2
}
```

### 🆕 Task Execution Procedures APIs

The Task Execution Procedures system provides AI-powered execution guidance for every task. This 2-step workflow automatically generates structured, actionable execution steps based on professional project management methodology.

#### GET /api/tasks/{task_id}/execution-procedures
Retrieve execution procedures for a specific task.

**Path Parameters:**
- `task_id` (integer): The ID of the task

**Response:**
```json
{
  "task_id": 14,
  "has_procedures": true,
  "execution_procedures": [
    {
      "procedure_number": 1,
      "procedure_content": "分析上次数据回刷导致数据缺失的根本原因，确定缺失数据的时间范围和具体字段",
      "key_result": "完成数据缺失分析报告，明确缺失数据的时间段和受影响字段",
      "completed": true
    },
    {
      "procedure_number": 2,
      "procedure_content": "检查当前mid表的生命周期设置，确认需要修改的具体参数和配置",
      "key_result": "获取当前mid表生命周期配置文档，识别需要调整的参数",
      "completed": false
    },
    {
      "procedure_number": 3,
      "procedure_content": "设计mid表生命周期修改方案，确保数据回刷可以从指定时间点开始而非2022-01-01",
      "key_result": "完成mid表生命周期优化方案设计文档"
    }
  ]
}
```

**Error Response (Task not found):**
```json
{
  "detail": "Task not found"
}
```

#### POST /api/tasks/{task_id}/regenerate-execution-procedures
Manually regenerate execution procedures for a specific task.

**Path Parameters:**
- `task_id` (integer): The ID of the task

**Response:**
```json
{
  "task_id": 14,
  "execution_procedures": [
    {
      "procedure_number": 1,
      "procedure_content": "分析任务需求和目标，制定详细的执行计划",
      "key_result": "完成任务分析报告和执行计划文档"
    },
    {
      "procedure_number": 2,
      "procedure_content": "准备必要的工具和资源，确保执行环境就绪",
      "key_result": "工具和环境配置完成，具备执行条件"
    }
  ],
  "message": "Successfully generated 2 execution procedures"
}
```

**🤖 AI-Powered Generation Features:**
- **User Context Integration**: Leverages user profile, job type, level, and colleague relationships
- **Professional Methodology**: Based on SMART/RACI project management principles
- **Structured Output**: Each procedure includes number, content, and key result
- **Background Processing**: Procedures generated asynchronously after task creation
- **Fallback Handling**: Graceful degradation when AI provider unavailable

#### 🆕 PATCH /api/tasks/{task_id}/execution-procedures/{procedure_number}
Update individual execution procedure content, completion status, or key results with real-time persistence.

**🎯 Interactive Procedure Management**: This endpoint enables users to edit procedure content, mark steps as complete with checkboxes, and update key results directly in the UI with immediate database synchronization.

**Path Parameters:**
- `task_id` (integer): The ID of the task
- `procedure_number` (integer): The number of the procedure to update (1, 2, 3, etc.)

**Request Body:**
```json
{
  "procedure_content": "Updated procedure content with new details",
  "key_result": "Updated key result description",
  "completed": true
}
```

**Field Descriptions:**
- `procedure_content` (optional): Updated text content for the procedure step
- `key_result` (optional): Updated description of the expected key result
- `completed` (optional): Boolean flag to mark procedure as complete/incomplete

**Response:**
```json
{
  "task_id": 14,
  "procedure_number": 2,
  "message": "Procedure updated successfully",
  "updated_procedure": {
    "procedure_number": 2,
    "procedure_content": "Updated procedure content with new details",
    "key_result": "Updated key result description",
    "completed": true
  }
}
```

**✨ Features:**
- **Partial Updates**: Only fields provided in request are updated
- **Real-time Persistence**: Changes immediately saved to database
- **UI Integration**: Designed for inline editing and checkbox completion tracking
- **Optimistic Updates**: Frontend can update UI immediately while API call processes

#### 🆕 DELETE /api/tasks/{task_id}/execution-procedures/{procedure_number}
Delete individual execution procedure with automatic renumbering of remaining procedures.

**🗑️ Smart Deletion**: This endpoint removes a specific procedure step and automatically renumbers all remaining procedures to maintain sequential order (1, 2, 3, etc.).

**Path Parameters:**
- `task_id` (integer): The ID of the task
- `procedure_number` (integer): The number of the procedure to delete

**Response:**
```json
{
  "task_id": 14,
  "deleted_procedure_number": 2,
  "remaining_procedures": 3,
  "message": "Procedure deleted successfully"
}
```

**🔄 Auto-Renumbering Logic:**
- Procedures are automatically renumbered after deletion
- If procedure 2 is deleted from [1, 2, 3, 4], remaining procedures become [1, 2, 3]
- Maintains sequential numbering for consistent UI display
- Social advice linkages are preserved through renumbering

**Error Responses:**
```json
{
  "status_code": 404,
  "detail": "Procedure 5 not found"
}
```

---

### 🆕 Social Intelligence Advice APIs

#### GET /api/tasks/{task_id}/social-advice
Retrieve AI-powered social intelligence advice for a specific task based on execution procedures and colleague personality analysis.

**Path Parameters:**
- `task_id` (integer): The ID of the task

**Response:**
```json
{
  "task_id": 14,
  "has_advice": true,
  "social_advice": [
    {
      "procedure_number": 6,
      "procedure_content": "在生产环境中执行mid表生命周期配置修改",
      "social_advice": "关键互动对象：运维或数据工程师；可能的反应预测：他们可能担心变更影响生产环境稳定性；最佳沟通策略：通过正式邮件或会议提前沟通，强调已测试验证和回滚方案，避免直接操作；潜在的社交陷阱：未经沟通直接修改可能引发冲突，建议先获得批准。"
    },
    {
      "procedure_number": 7,
      "procedure_content": "执行数据回刷操作，从指定时间点开始补全缺失数据",
      "social_advice": "关键互动对象：团队领导或相关同事；可能的反应预测：他们可能关注进度和资源占用；最佳沟通策略：通过团队聊天或简短更新分享进度，强调时间点和预期完成时间，避免干扰他人工作；潜在的社交陷阱：长时间运行可能影响系统，建议选择低峰期并提前通知。"
    },
    {
      "procedure_number": 9,
      "procedure_content": "验证回刷后数据的完整性和准确性，与预期结果进行比对",
      "social_advice": "null"
    }
  ]
}
```

**Response with No Advice:**
```json
{
  "task_id": 15,
  "has_advice": false,
  "social_advice": []
}
```

#### POST /api/tasks/{task_id}/generate-social-advice
Generate social intelligence advice for a specific task. Requires existing execution procedures.

**Path Parameters:**
- `task_id` (integer): The ID of the task

**Prerequisites:**
- Task must have execution procedures generated first
- User must have colleague personality profiles configured for optimal results

**Response:**
```json
{
  "task_id": 14,
  "social_advice": [
    {
      "procedure_number": 1,
      "procedure_content": "分析上次数据回刷导致数据缺失的根本原因",
      "social_advice": "null"
    },
    {
      "procedure_number": 6,
      "procedure_content": "在生产环境中执行mid表生命周期配置修改",
      "social_advice": "关键互动对象：运维或数据工程师；可能的反应预测：他们可能担心变更影响生产环境稳定性；最佳沟通策略：通过正式邮件或会议提前沟通，强调已测试验证和回滚方案，避免直接操作；潜在的社交陷阱：未经沟通直接修改可能引发冲突，建议先获得批准。"
    }
  ],
  "message": "Successfully generated social advice for 10 steps"
}
```

**Error Response (No Execution Procedures):**
```json
{
  "detail": "Task must have execution procedures before generating social advice. Please generate execution procedures first."
}
```

**🧠 AI-Powered Social Intelligence Features:**
- **Organizational Psychology**: AI acts as top organizational psychologist with Big Five expertise
- **Personality Analysis**: Analyzes colleague personalities using OCEAN psychological model
- **Communication Strategies**: Provides specific wording, channels, and approach recommendations
- **Risk Assessment**: Identifies potential social traps and relationship obstacles
- **Context Integration**: Considers user's career stage, management status, and team relationships
- **Personality-Aware Guidance**: Tailored advice based on colleague personality profiles from user's work relationships
- **Background Processing**: Social advice generated automatically after execution procedures
- **Fallback Handling**: Graceful handling when colleague personality data unavailable

**📋 Enhanced Automatic Integration:**
Both execution procedures AND social intelligence advice are automatically generated for:
- **Manual Task Creation** (`POST /api/tasks`) - 3-step AI workflow
- **AI Task Generation** (`POST /api/tasks/generate`) - 3-step AI workflow 
- **Image-to-Task Workflows** (`POST /api/tasks/generate-from-image`) - 3-step AI workflow

**⚠️ Requirements:**
- Active text AI provider must be configured
- User must have valid authentication token
- Task must exist and belong to the requesting user
- **🆕 For optimal social advice**: User should have colleague personality profiles configured in work relationships

**Error Response (No AI Provider):**
```json
{
  "detail": "No active text AI provider configured"
}
```

**Error Response (AI Generation Failed):**
```json
{
  "detail": "Failed to regenerate execution procedures: AI service temporarily unavailable"
}
```

#### PUT /api/tasks/{task_id}
Update an existing task with comprehensive field editing and automatic Eisenhower Matrix repositioning.

**🆕 Enhanced with UI Integration**: This endpoint now powers the sophisticated edit modal in the frontend dashboard, providing seamless task modification with real-time quadrant repositioning based on urgency/importance changes.

**Path Parameters:**
- `task_id` (integer): The ID of the task to update

**Request Body:**
All fields are optional. Only provided fields will be updated.

```json
{
  "title": "Updated Task Title",
  "content": "Updated task description with more details",
  "deadline": "2025-01-10T15:30:00Z",
  "assignee": "Updated Assignee Name",
  "participant": "Updated Participant",
  "urgency": "low",
  "importance": "high",
  "difficulty": 8,
  "cost_time_hours": 5.5,
  "status": "in_progress"
}
```

**Field Specifications:**
- `title` (string): Task title
- `content` (string): Task description/content
- `deadline` (string, ISO 8601): Task deadline in UTC format
- `assignee` (string): Person who assigned/proposed the task
- `participant` (string): Person who will participate in the task
- `urgency` (enum): "low" or "high" - affects Eisenhower Matrix positioning
- `importance` (enum): "low" or "high" - affects Eisenhower Matrix positioning  
- `difficulty` (integer): Task difficulty from 1-10
- `cost_time_hours` (float): Estimated time to complete task in hours (supports decimal values like 0.5, 1.5, 2.0)
- `status` (enum): "pending", "in_progress", or "completed"

**Eisenhower Matrix Integration:**
Changes to `urgency` and `importance` automatically reposition tasks in the dashboard:
- **High urgency + High importance** → 重要且紧急 (Red quadrant)
- **Low urgency + High importance** → 重要不紧急 (Orange quadrant)
- **High urgency + Low importance** → 紧急不重要 (Blue quadrant)  
- **Low urgency + Low importance** → 不重要不紧急 (Gray quadrant)

**Response:**
```json
{
  "id": 13,
  "title": "Updated Task Title",
  "content": "Updated task description with more details",
  "deadline": "2025-01-10T15:30:00Z",
  "assignee": "Updated Assignee Name", 
  "participant": "Updated Participant",
  "urgency": "low",
  "importance": "high",
  "difficulty": 8,
  "cost_time_hours": 5.5,
  "source": "manual",
  "status": "in_progress",
  "execution_procedures": [
    {
      "procedure_number": 1,
      "procedure_content": "Existing procedure content (preserved)",
      "key_result": "Existing key result (preserved)"
    }
  ],
  "social_advice": [
    {
      "procedure_number": 1,
      "procedure_content": "Existing procedure content",
      "social_advice": "Existing social advice (preserved)"
    }
  ],
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T12:30:00Z"
}
```

**Frontend UI Integration:**
- **Edit Modal**: Professional edit form with pre-populated fields
- **Real-time Validation**: Form validation with proper data types
- **Automatic Repositioning**: Tasks move between Eisenhower Matrix quadrants based on priority changes
- **User Experience**: Loading states, success messages, and error handling
- **DateTime Picker**: Integrated datetime-local input for deadline editing

**Error Responses:**

Task not found (404):
```json
{
  "detail": "Task not found"
}
```

Validation error (422):
```json
{
  "detail": [
    {
      "loc": ["body", "difficulty"],
      "msg": "ensure this value is less than or equal to 10",
      "type": "value_error.number.not_le",
      "ctx": {"limit_value": 10}
    }
  ]
}
```

Unauthorized access (401):
```json
{
  "detail": "Could not validate credentials"
}
```

**Usage Notes:**
- Only provided fields are updated; omitted fields remain unchanged
- Execution procedures and social advice are preserved during updates
- The `updated_at` timestamp is automatically updated
- Changes to urgency/importance trigger automatic quadrant repositioning in the UI
- All updates are immediately reflected in the Eisenhower Matrix dashboard

#### 🆕 PATCH /api/tasks/{task_id}/status

Update task status with real-time deadline calculation and timer functionality.

**🆕 Timer System Features:**
- **Two-State Status**: Simple "undo" ↔ "done" toggle for task management
- **Real-Time Deadline Categories**: Automatic categorization based on deadline proximity
- **Color-Coded Visual Feedback**: Dynamic UI updates with countdown tags
- **Timezone-Aware Calculations**: Accurate time remaining calculations

**Request Body:**
```json
{
  "status": "done"
}
```

**Response:**
```json
{
  "id": 13,
  "title": "产品需求分析报告",
  "content": "完成一个新的产品需求分析报告，需要在本周五之前提交给产品经理张三",
  "deadline": "2025-01-05T17:00:00Z",
  "assignee": "产品经理张三",
  "participant": "你",
  "urgency": "high",
  "importance": "high",
  "difficulty": 7,
  "source": "manual",
  "status": "done",
  "deadline_category": "完成",
  "execution_procedures": [...],
  "social_advice": [...],
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T10:30:00Z"
}
```

**🆕 Deadline Categories:**
- **进行中** - Tasks without deadlines or >5 days remaining
- **仅剩X天** - Tasks with 1-5 days remaining (e.g., "仅剩3天")
- **仅剩X小时** - Tasks with ≤24 hours remaining (e.g., "仅剩8小时")
- **已过期** - Overdue tasks with "undo" status
- **完成** - Tasks marked as "done"

**Status Values:**
- `"undo"` - Task is pending/in progress
- `"done"` - Task is completed

**Real-Time Features:**
- Frontend automatically updates countdown every minute
- Deadline categories change dynamically as time passes
- Color-coded tags provide instant visual feedback
- Status changes immediately reflect in Eisenhower Matrix quadrants

---

### 🆕 Procedure Memorandum APIs

The procedure memorandum system allows users to add personal notes and reminders to individual procedure steps through an intuitive hover-based interface.

#### GET /api/tasks/{task_id}/procedures/{procedure_number}/memorandum

Retrieve a memorandum for a specific procedure step.

**Path Parameters:**
- `task_id` (integer): The ID of the task
- `procedure_number` (integer): The procedure step number (1, 2, 3, etc.)

**Response (Success):**
```json
{
  "id": 1,
  "user_id": 1,
  "task_id": 15,
  "procedure_number": 1,
  "memorandum_text": "记住要提前联系王部长确认时间安排",
  "created_at": "2025-01-01T10:00:00Z",
  "updated_at": "2025-01-01T14:30:00Z"
}
```

**Response (Not Found):**
```json
{
  "detail": "Memorandum not found for this procedure"
}
```

#### POST /api/tasks/{task_id}/procedures/{procedure_number}/memorandum

Create or update a memorandum for a specific procedure step. This endpoint handles both creation and updates automatically.

**Path Parameters:**
- `task_id` (integer): The ID of the task
- `procedure_number` (integer): The procedure step number

**Request Body:**
```json
{
  "task_id": 15,
  "procedure_number": 1,
  "memorandum_text": "记住要提前联系王部长确认时间安排，他通常在上午10点后有空"
}
```

**Response:**
```json
{
  "id": 1,
  "user_id": 1,
  "task_id": 15,
  "procedure_number": 1,
  "memorandum_text": "记住要提前联系王部长确认时间安排，他通常在上午10点后有空",
  "created_at": "2025-01-01T10:00:00Z",
  "updated_at": "2025-01-01T15:45:00Z"
}
```

#### PUT /api/tasks/{task_id}/procedures/{procedure_number}/memorandum

Update an existing memorandum for a specific procedure step.

**Path Parameters:**
- `task_id` (integer): The ID of the task
- `procedure_number` (integer): The procedure step number

**Request Body:**
```json
{
  "memorandum_text": "更新后的备忘录内容：记住要带上上次的会议纪要文档"
}
```

**Response:**
```json
{
  "id": 1,
  "user_id": 1,
  "task_id": 15,
  "procedure_number": 1,
  "memorandum_text": "更新后的备忘录内容：记住要带上上次的会议纪要文档",
  "created_at": "2025-01-01T10:00:00Z",
  "updated_at": "2025-01-01T16:20:00Z"
}
```

#### DELETE /api/tasks/{task_id}/procedures/{procedure_number}/memorandum

Delete a memorandum for a specific procedure step.

**Path Parameters:**
- `task_id` (integer): The ID of the task
- `procedure_number` (integer): The procedure step number

**Response:**
```json
{
  "task_id": 15,
  "procedure_number": 1,
  "message": "Memorandum deleted successfully"
}
```

**Memorandum System Features:**
- **Hover-Activated Interface**: Appear instantly when hovering over procedure cards
- **Auto-Save Functionality**: Content automatically saves when mouse leaves hover box
- **Smart Content Management**: Empty memorandums are automatically deleted
- **User Isolation**: Each user can only access their own memorandums
- **Real-Time Updates**: Changes immediately reflect in the UI
- **Persistent Storage**: Memorandums persist across sessions and popup reopenings

---

### Chat APIs

#### WebSocket /api/chat/ws/{session_id}
Real-time chat streaming with AI models.

**Connection URL:**
```
ws://localhost:8000/api/chat/ws/{session_id}?token={jwt_token}
```

**Send Message Format:**
```json
{
  "message": "你好，请帮我分析一下这个任务的难度",
  "user_id": 1,
  "model_id": 2
}
```

**Receive Message Format:**
```json
{
  "type": "message",
  "content": "你好！我来帮你分析任务难度...",
  "thinking": "用户想要分析任务难度，我需要考虑...",
  "role": "assistant",
  "timestamp": "2025-01-01T00:00:00Z",
  "streaming_status": "streaming"
}
```

#### POST /api/chat/sessions
Create a new chat session.

**Request Body:**
```json
{
  "title": "任务分析讨论"
}
```

**Response:**
```json
{
  "id": 1,
  "title": "任务分析讨论",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z",
  "message_count": 0
}
```

#### GET /api/chat/sessions
List user's chat sessions.

**Response:**
```json
[
  {
    "id": 1,
    "title": "任务分析讨论",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z",
    "message_count": 5,
    "last_message_preview": "基于你的Big Five性格特征..."
  }
]
```

#### POST /api/chat/sessions/{session_id}/stop
Manually stop ongoing AI streaming response.

**Response:**
```json
{
  "success": true,
  "message": "AI response stopped successfully"
}
```

### User Profile APIs

#### GET /api/profile
Get current user's profile information.

**Response:**
```json
{
  "id": 1,
  "user_id": 1,
  "name": "张三",
  "work_nickname": "产品小张",
  "gender": "男",
  "job_type": "产品经理",
  "job_level": "中级",
  "is_manager": true,
  "personality_openness": ["好奇心强", "创新思维"],
  "personality_conscientiousness": ["注重细节", "有条理"],
  "personality_extraversion": ["善于沟通", "团队合作"],
  "personality_agreeableness": ["友善", "乐于助人"],
  "personality_neuroticism": ["情绪稳定"],
  "work_relationships": [
    {
      "id": 1,
      "coworker_name": "李四",
      "relationship_type": "下属",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

#### PUT /api/profile/personality/{dimension}
Update specific Big Five personality dimension tags.

**Path Parameters:**
- `dimension`: One of "openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"

**Request Body:**
```json
{
  "tags": ["好奇心强", "创新思维", "开放包容"]
}
```

**Response:**
```json
{
  "success": true,
  "dimension": "openness",
  "tags": ["好奇心强", "创新思维", "开放包容"]
}
```

#### POST /api/profile/relationships
Create a new work relationship with enhanced colleague profiling.

**Request Body:**
```json
{
  "coworker_name": "王五",
  "work_nickname": "产品老王",
  "relationship_type": "上级",
  "job_type": "产品总监", 
  "job_level": "高级",
  "personality_openness": ["创新思维", "好奇心强"],
  "personality_conscientiousness": ["注重细节", "有条理"],
  "personality_extraversion": ["善于沟通", "领导力强"],
  "personality_agreeableness": ["友善", "支持团队"],
  "personality_neuroticism": ["情绪稳定", "抗压能力强"]
}
```

**Response:**
```json
{
  "id": 2,
  "user_profile_id": 1,
  "coworker_name": "王五",
  "work_nickname": "产品老王",
  "relationship_type": "上级",
  "job_type": "产品总监",
  "job_level": "高级",
  "personality_openness": ["创新思维", "好奇心强"],
  "personality_conscientiousness": ["注重细节", "有条理"],
  "personality_extraversion": ["善于沟通", "领导力强"],
  "personality_agreeableness": ["友善", "支持团队"],
  "personality_neuroticism": ["情绪稳定", "抗压能力强"],
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

#### PUT /api/profile/relationships/{id}
Update existing work relationship with full colleague information.

**Request Body:** Same schema as POST (all fields optional for updates)

**Response:** Updated work relationship object with same structure as POST response

#### DELETE /api/profile/relationships/{id}
Delete work relationship.

**Response:**
```json
{
  "success": true,
  "message": "Work relationship deleted successfully"
}
```

---

## Data Models

### Task Model
```json
{
  "id": "integer",
  "user_id": "integer",
  "title": "string (max 8 chars)",
  "content": "string",
  "deadline": "datetime|null",
  "assignee": "string|null",
  "participant": "string (default: '你')",
  "urgency": "enum: low|high",
  "importance": "enum: low|high",
  "difficulty": "integer (1-10)",
  "cost_time_hours": "float (estimated completion time in hours, supports decimals like 0.5, 1.5, 2.0)",
  "source": "enum: manual|extension|ai_generated",
  "status": "enum: pending|in_progress|completed",
  "execution_procedures": "array|null",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

**🆕 Enhanced Task Model with Execution Procedures:**
The `execution_procedures` field contains an array of structured execution steps with **✨ interactive completion tracking**:
```json
{
  "execution_procedures": [
    {
      "procedure_number": 1,
      "procedure_content": "分析任务需求和目标",
      "key_result": "完成任务分析报告",
      "completed": false
    },
    {
      "procedure_number": 2,
      "procedure_content": "制定详细的执行计划",
      "key_result": "完成执行计划文档", 
      "completed": true
    }
  ]
}
```

**✨ Interactive Features:**
- **`completed`** (boolean): Tracks completion status for each procedure step
- **Inline Editing**: `procedure_content` and `key_result` can be updated via PATCH endpoint
- **Real-time Updates**: Changes persist immediately to database
- **Auto-folding**: Completed procedures can be folded in UI for better focus
- **Sequential Numbering**: Maintained automatically even after deletions

### 🆕 Task Preview Models

#### TaskPreview Model
Task preview data for two-stage workflow (no database fields):
```json
{
  "title": "string (max 200 chars)",
  "content": "string (max 1000 chars)", 
  "deadline": "datetime|null",
  "assignee": "string|null",
  "participant": "string (default: '你')",
  "urgency": "enum: low|high",
  "importance": "enum: low|high", 
  "difficulty": "integer (1-10)",
  "cost_time_hours": "float (estimated completion time in hours)"
}
```

#### TaskPreviewResponse Model
Response containing preview tasks and message:
```json
{
  "tasks": "[TaskPreview]",
  "message": "string (default: '任务预览生成成功，请确认后保存')"
}
```

#### TaskConfirmRequest Model
Request to confirm and save preview tasks:
```json
{
  "tasks": "[TaskCreate]"
}
```

**Two-Stage Workflow:**
1. **Preview Stage**: `POST /api/tasks/generate-preview` → `TaskPreviewResponse`
2. **Confirmation Stage**: `POST /api/tasks/confirm-tasks` → `[TaskResponse]`

### AI Provider Model
```json
{
  "id": "integer",
  "user_id": "integer",
  "provider_name": "string",
  "provider_type": "enum: openai|deepseek|imageOCR",
  "category": "enum: text|image",
  "config": "object",
  "is_active": "boolean",
  "last_tested": "datetime|null",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### User Profile Model
```json
{
  "id": "integer",
  "user_id": "integer",
  "name": "string|null",
  "work_nickname": "string|null",
  "gender": "enum: 男|女|无性别|其他性别",
  "job_type": "string|null",
  "job_level": "enum: 实习|初级|中级|高级",
  "is_manager": "boolean",
  "personality_openness": "array of strings",
  "personality_conscientiousness": "array of strings",
  "personality_extraversion": "array of strings",
  "personality_agreeableness": "array of strings",
  "personality_neuroticism": "array of strings",
  "work_relationships": "array of WorkRelationship",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Work Relationship Model (Enhanced)
```json
{
  "id": "integer",
  "user_profile_id": "integer",
  "coworker_name": "string",
  "work_nickname": "string|null",
  "relationship_type": "enum: 下属|同级|上级|团队负责人|公司老板",
  "job_type": "string|null",
  "job_level": "enum: 实习|初级|中级|高级|null",
  "personality_openness": "array of strings",
  "personality_conscientiousness": "array of strings", 
  "personality_extraversion": "array of strings",
  "personality_agreeableness": "array of strings",
  "personality_neuroticism": "array of strings",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

**🆕 Enhanced Features:**
- **Extended Information**: Work nickname, job type, and job level tracking
- **Big Five Personality Profiling**: Complete personality assessment for each colleague
- **Auto-Save Support**: Draft management for colleague editing with localStorage persistence
- **Inline Editing**: Direct editing functionality on colleague cards
- **Visual Organization**: Color-coded personality tags by psychological dimensions

---

## Error Handling

The API uses standard HTTP status codes and returns errors in the following format:

```json
{
  "detail": "Error message describing what went wrong",
  "error_code": "SPECIFIC_ERROR_CODE",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

---

## Rate Limiting

- Authentication endpoints: 5 requests per minute
- AI provider testing: 10 requests per minute
- Task generation: 30 requests per minute
- Chat streaming: No limit (real-time)
- Other endpoints: 100 requests per minute

---

## WebSocket Events

### Chat WebSocket Events

**Connection Events:**
- `connected` - Successfully connected to chat session
- `disconnected` - Connection closed
- `error` - Connection error occurred

**Message Events:**
- `message` - New message chunk received
- `thinking` - AI thinking process update
- `completed` - Message streaming completed
- `stopped` - Message streaming manually stopped
- `interrupted` - Message streaming interrupted

---

## Examples

### Complete Task Generation Workflow

1. **Extract text from image:**
```bash
curl -X POST "http://localhost:8000/api/tasks/extract-text-from-image" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@task_image.jpg"
```

2. **Generate tasks from extracted text:**
```bash
curl -X POST "http://localhost:8000/api/tasks/generate" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "明天需要完成季度报告，下周三要参加项目评审会议"}'
```

3. **List generated tasks:**
```bash
curl -X GET "http://localhost:8000/api/tasks?urgency=high" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Chat Session Workflow

1. **Create chat session:**
```bash
curl -X POST "http://localhost:8000/api/chat/sessions" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "任务讨论"}'
```

2. **Connect to WebSocket:**
```javascript
const ws = new WebSocket('ws://localhost:8000/api/chat/ws/1?token=YOUR_TOKEN');
ws.send(JSON.stringify({
  message: "请帮我分析这个任务的难度",
  user_id: 1,
  model_id: 2
}));
```

3. **Stop ongoing response:**
```bash
curl -X POST "http://localhost:8000/api/chat/sessions/1/stop" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## OpenAPI Specification

The complete OpenAPI 3.0 specification is available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## Getting Started

1. **Start the backend server:**
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Access the interactive API documentation:**
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

3. **Register a new user and get authentication token**

4. **Configure AI providers through the API or frontend interface**

5. **Start using the task generation and chat features**

---

## Calendar & Task Scheduling APIs

### POST /api/calendar/schedule-tasks
**AI-Powered Intelligent Task Scheduling**

Automatically schedules all undone tasks using AI-powered analysis of task properties, deadlines, priorities, and user context.

**Request Body:**
```json
{
  "date_range_start": "2024-01-15T00:00:00Z",
  "date_range_end": "2024-01-22T00:00:00Z",
  "work_hours_start": "09:00",
  "work_hours_end": "18:00",
  "break_duration_minutes": 15,
  "include_weekends": false
}
```

**Response:**
```json
{
  "events": [
    {
      "id": 1,
      "task_id": 123,
      "scheduled_start_time": "2024-01-15T09:00:00Z",
      "scheduled_end_time": "2024-01-15T11:00:00Z",
      "event_type": "work",
      "ai_reasoning": "高优先级任务，安排在上午精力充沛时段",
      "created_at": "2024-01-15T08:00:00Z",
      "updated_at": "2024-01-15T08:00:00Z",
      "task": {
        "id": 123,
        "title": "项目方案设计",
        "content": "完成新产品功能设计方案",
        "urgency": "high",
        "importance": "high",
        "difficulty": 7,
        "cost_time_hours": 2.0
      }
    }
  ],
  "ai_reasoning": "AI智能分析了 5 个待办任务，根据截止时间、重要性、紧急度和难度等因素进行合理安排",
  "message": "成功为 5 个任务生成智能时间安排"
}
```

### GET /api/calendar/events
**Get Calendar Events**

Retrieve calendar events within a specified date range.

**Query Parameters:**
- `start_date` (optional): ISO datetime string for range start
- `end_date` (optional): ISO datetime string for range end

**Response:**
```json
[
  {
    "id": 1,
    "task_id": 123,
    "scheduled_start_time": "2024-01-15T09:00:00Z",
    "scheduled_end_time": "2024-01-15T11:00:00Z",
    "event_type": "work",
    "ai_reasoning": "高优先级任务，安排在上午精力充沛时段",
    "created_at": "2024-01-15T08:00:00Z",
    "updated_at": "2024-01-15T08:00:00Z",
    "task": {
      "id": 123,
      "title": "项目方案设计",
      "urgency": "high",
      "importance": "high"
    }
  }
]
```

### PUT /api/calendar/events/{event_id}
**Update Calendar Event**

Update scheduling details for a calendar event.

**Request Body:**
```json
{
  "scheduled_start_time": "2024-01-15T10:00:00Z",
  "scheduled_end_time": "2024-01-15T12:00:00Z",
  "event_type": "work",
  "ai_reasoning": "用户手动调整时间安排"
}
```

### DELETE /api/calendar/events/{event_id}
**Delete Calendar Event**

Remove a specific calendar event.

**Response:**
```json
{
  "message": "日程事件已删除"
}
```

### DELETE /api/calendar/events
**Clear Calendar Events**

Remove multiple calendar events within a date range.

**Query Parameters:**
- `start_date` (optional): ISO datetime string for range start
- `end_date` (optional): ISO datetime string for range end

**Response:**
```json
{
  "message": "已清除 3 个日程事件"
}
```

**AI Scheduling Features:**
- **Multi-Factor Analysis**: Considers urgency, importance, difficulty, estimated time, and deadlines
- **User Context Integration**: Leverages user profile and work relationships for personalized scheduling  
- **Energy Management**: Schedules high-concentration tasks during optimal time periods
- **Time Buffer Management**: Automatic break time allocation between tasks
- **Fallback Mechanism**: Deadline-priority based scheduling when AI is unavailable

---

## SDK and Integration

For frontend integration, the API is designed to work seamlessly with:
- React 18+ with TypeScript
- React Query for data fetching
- Zustand for state management
- WebSocket for real-time chat

Example TypeScript client implementation available in the frontend codebase.