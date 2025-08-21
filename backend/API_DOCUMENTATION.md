# Cortex Assistant API Documentation

## Overview

This is the comprehensive API documentation for "智时助手 (Cortex Assistant)" - an AI-powered intelligent assistant for Chinese knowledge workers. The API provides endpoints for task management, AI configuration, real-time chat, user profiling, and OCR-based image processing.

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
- `POST /api/tasks/generate` - Generate tasks from text using AI
- `POST /api/tasks/extract-text-from-image` - Extract text from image using OCR
- `POST /api/tasks/generate-from-image` - Generate tasks from image (legacy)
- `GET /api/tasks` - List tasks with filtering
- `GET /api/tasks/stats` - Get task statistics
- `GET /api/tasks/{task_id}` - Get specific task
- `PUT /api/tasks/{task_id}` - Update task
- `DELETE /api/tasks/{task_id}` - Delete task

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

#### POST /api/tasks/generate
Generate structured task cards from text input using AI.

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
      "source": "ai_generated",
      "status": "pending",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ],
  "total_generated": 3
}
```

#### POST /api/tasks/extract-text-from-image
Extract text from uploaded image using OCR (EasyOCR + AI OCR dual-mode).

**Request:**
- Form data with `file` field containing image file
- Supported formats: JPG, PNG, JPEG, BMP, TIFF, WEBP, HEIC
- Max file size: 10MB

**Response:**
```json
{
  "success": true,
  "extracted_text": "明天需要完成季度报告\n项目评审会议安排在下周三\n团队培训计划制定",
  "message": "Text extraction successful",
  "ocr_method": "AI OCR"
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
      "status": "pending"
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
Create a new work relationship.

**Request Body:**
```json
{
  "coworker_name": "王五",
  "relationship_type": "上级"
}
```

**Response:**
```json
{
  "id": 2,
  "user_profile_id": 1,
  "coworker_name": "王五",
  "relationship_type": "上级",
  "created_at": "2025-01-01T00:00:00Z"
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
  "source": "enum: manual|extension|ai_generated",
  "status": "enum: pending|in_progress|completed",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

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

### Work Relationship Model
```json
{
  "id": "integer",
  "user_profile_id": "integer",
  "coworker_name": "string",
  "relationship_type": "enum: 下属|同级|上级|团队负责人|公司老板",
  "created_at": "datetime"
}
```

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

## SDK and Integration

For frontend integration, the API is designed to work seamlessly with:
- React 18+ with TypeScript
- React Query for data fetching
- Zustand for state management
- WebSocket for real-time chat

Example TypeScript client implementation available in the frontend codebase.