# 智时助手 (Cortex Assistant) API Documentation

## Overview

Welcome to the comprehensive API documentation for Cortex Assistant, an AI-powered intelligent assistant designed specifically for Chinese knowledge workers. This documentation provides detailed information about all available endpoints, data models, and integration patterns.

## Quick Links

### 📖 Documentation Files
- **[Complete API Documentation](../../API_DOCUMENTATION.md)** - Comprehensive guide with examples
- **[Endpoint Reference](./endpoints.md)** - Auto-generated endpoint documentation
- **[Data Models](./schemas.md)** - Auto-generated schema documentation
- **[OpenAPI Specification](./openapi.json)** - Raw OpenAPI 3.0 JSON schema

### 🌐 Interactive Documentation
- **[Swagger UI](http://localhost:8000/docs)** - Interactive API explorer
- **[ReDoc](http://localhost:8000/redoc)** - Clean, responsive documentation
- **[OpenAPI JSON](http://localhost:8000/openapi.json)** - Raw specification endpoint

## API Overview

### Base Information
- **Base URL**: `http://localhost:8000`
- **API Version**: 2.0.0
- **Authentication**: JWT Bearer Token
- **Content Type**: `application/json`

### Core Features

#### 🤖 AI Provider Management
Configure and manage multiple AI models categorized as:
- **Text Models**: For chat, task generation, and text processing
- **Image Models**: For OCR and vision-language tasks

#### 📋 Task Management
AI-powered task generation and management featuring:
- **Eisenhower Matrix**: Urgency/importance classification
- **Multi-task Generation**: Generate multiple tasks from single input
- **OCR Integration**: Extract tasks from images with text

#### 💬 Real-time Chat
WebSocket-based chat interface with:
- **Streaming Responses**: Real-time AI response streaming
- **Thinking Visualization**: Display AI reasoning process
- **Background Processing**: Continue responses even after disconnection
- **Model Selection**: Switch between different AI models mid-conversation

#### 👤 User Profiling
Comprehensive user profiling system including:
- **Big Five Personality Model**: Psychology-based personality assessment
- **Work Relationships**: Manage colleague relationships and hierarchies
- **Personalized AI**: Tailor AI responses based on user profile

## Authentication

All protected endpoints require a JWT bearer token:

```bash
Authorization: Bearer <your_jwt_token>
```

### Getting Started

1. **Register a user account**: `POST /api/auth/register`
2. **Login to get token**: `POST /api/auth/login`
3. **Include token in requests**: Add `Authorization: Bearer <token>` header

## API Categories

### 🔐 Authentication (3 endpoints)
- User registration and login
- JWT token management
- User information retrieval

### 🤖 AI Providers (7 endpoints)
- Create, update, delete AI provider configurations
- Test provider connections
- Manage active providers by category
- Support for text and image model categories

### 📋 Tasks (9 endpoints)
- AI-powered task generation from text and images
- CRUD operations for task management
- Task statistics with Eisenhower Matrix
- OCR text extraction from images

### 💬 Chat (8 endpoints)
- Real-time WebSocket chat streaming
- Chat session management
- Message history and retrieval
- Background task management

### 👤 User Profile (2 endpoints)
- User profile management with Big Five personality model
- Work relationship tracking and management

## Data Models

The API uses 26 different data models including:

- **User Models**: User, UserProfile, WorkRelationship
- **Task Models**: Task, TaskCreate, TaskUpdate, TaskResponse
- **AI Provider Models**: AIProvider, AIProviderCreate, AIProviderResponse
- **Chat Models**: ChatSession, ChatMessage, ChatSessionResponse
- **Personality Models**: BigFivePersonality, UserProfileSummary

## WebSocket Usage

### Chat WebSocket Connection
```javascript
const ws = new WebSocket('ws://localhost:8000/api/chat/ws/{session_id}?token={jwt_token}');

// Send message
ws.send(JSON.stringify({
  message: "你好，请帮我分析一下这个任务",
  user_id: 1,
  model_id: 2  // Optional: specific AI model
}));

// Receive responses
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('AI Response:', data.content);
  console.log('AI Thinking:', data.thinking);
};
```

## Example Workflows

### 1. Complete Task Generation Workflow

```bash
# 1. Extract text from image
curl -X POST "http://localhost:8000/api/tasks/extract-text-from-image" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@task_image.jpg"

# 2. Generate tasks from extracted text
curl -X POST "http://localhost:8000/api/tasks/generate" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "明天需要完成季度报告，下周三要参加项目评审会议"}'

# 3. List generated tasks with filtering
curl -X GET "http://localhost:8000/api/tasks?urgency=high&importance=high" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. AI Provider Configuration

```bash
# 1. Create DeepSeek text provider
curl -X POST "http://localhost:8000/api/ai-providers" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DeepSeek Text Model",
    "provider_type": "deepseek",
    "config": {
      "api_key": "your_api_key",
      "base_url": "https://api.deepseek.com/v1",
      "model": "deepseek-chat",
      "temperature": 0.7,
      "max_tokens": 4096
    },
    "is_active": true
  }'

# 2. Test provider connection
curl -X POST "http://localhost:8000/api/ai-providers/1/test" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Get active text models for chat
curl -X GET "http://localhost:8000/api/ai-providers/text-models" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. User Profile Setup

```bash
# 1. Create user profile
curl -X POST "http://localhost:8000/api/profile" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "张三",
    "work_nickname": "产品小张",
    "gender": "男",
    "job_type": "产品经理",
    "job_level": "中级",
    "is_manager": true
  }'

# 2. Update personality traits
curl -X PUT "http://localhost:8000/api/profile/personality/openness" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tags": ["好奇心强", "创新思维", "开放包容"]}'

# 3. Add work relationship
curl -X POST "http://localhost:8000/api/profile/relationships" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "coworker_name": "李四",
    "relationship_type": "下属"
  }'
```

## Error Handling

The API uses standard HTTP status codes and returns errors in JSON format:

```json
{
  "detail": "Error message describing what went wrong",
  "error_code": "SPECIFIC_ERROR_CODE",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

### Common Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `422` - Validation Error (invalid request data)
- `500` - Internal Server Error

## Rate Limiting

- **Authentication endpoints**: 5 requests per minute
- **AI provider testing**: 10 requests per minute  
- **Task generation**: 30 requests per minute
- **Chat streaming**: No limit (real-time)
- **Other endpoints**: 100 requests per minute

## Development

### Prerequisites
- Python 3.11+
- FastAPI
- SQLite database
- JWT authentication setup

### Running the Server
```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Regenerating Documentation
```bash
cd backend
python3 generate_api_docs.py
```

## Support

For questions, issues, or contributions:
- **GitHub Issues**: [Report issues or request features](https://github.com/your-org/helpful-assistant/issues)
- **Email**: support@cortex-assistant.com
- **Documentation**: Check the [complete API documentation](../../API_DOCUMENTATION.md)

## License

This API is licensed under the MIT License. See the LICENSE file for details.

---

*Generated automatically from OpenAPI specification v2.0.0*