# API Endpoints Reference
Generated from OpenAPI specification
## Authentication
### POST /api/auth/register
**Summary:** Register
**Request Body:**
- Content-Type: application/json
- Schema: UserCreate
**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---

### POST /api/auth/login
**Summary:** Login
**Request Body:**
- Content-Type: application/json
- Schema: UserLogin
**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---

### GET /api/auth/me
**Summary:** Get Current User Info
**Description:** Get current user information
**Authentication:** Required (JWT Bearer Token)
**Responses:**
- `200`: Successful Response

---

## AI Providers
### GET /api/ai-providers
**Summary:** Get Ai Providers
**Description:** Get all AI providers for the current user
**Authentication:** Required (JWT Bearer Token)
**Responses:**
- `200`: Successful Response

---

### POST /api/ai-providers
**Summary:** Create Ai Provider
**Description:** Create a new AI provider configuration
**Authentication:** Required (JWT Bearer Token)
**Request Body:**
- Content-Type: application/json
- Schema: AIProviderCreate
**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---

### PUT /api/ai-providers/{provider_id}
**Summary:** Update Ai Provider
**Description:** Update an AI provider configuration
**Authentication:** Required (JWT Bearer Token)
**Parameters:**
- `provider_id` (path) - integer (required): 
**Request Body:**
- Content-Type: application/json
- Schema: AIProviderUpdate
**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---

### DELETE /api/ai-providers/{provider_id}
**Summary:** Delete Ai Provider
**Description:** Delete an AI provider configuration
**Authentication:** Required (JWT Bearer Token)
**Parameters:**
- `provider_id` (path) - integer (required): 
**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---

### POST /api/ai-providers/{provider_id}/test
**Summary:** Test Ai Provider
**Description:** Test an AI provider configuration
**Authentication:** Required (JWT Bearer Token)
**Parameters:**
- `provider_id` (path) - integer (required): 
**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---

### GET /api/ai-providers/active/{category}
**Summary:** Get Active Provider By Category
**Description:** Get the active AI provider for a specific category
**Authentication:** Required (JWT Bearer Token)
**Parameters:**
- `category` (path) - string (required): 
**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---

### GET /api/ai-providers/text-models
**Summary:** Get Available Text Models
**Description:** Get all ACTIVE text models for chat selection
**Authentication:** Required (JWT Bearer Token)
**Responses:**
- `200`: Successful Response

---

### GET /api/ai-providers/active
**Summary:** Get Active Provider
**Description:** Get the active text AI provider for backward compatibility
**Authentication:** Required (JWT Bearer Token)
**Responses:**
- `200`: Successful Response

---

## Chat
### GET /api/chat/sessions
**Summary:** Get Chat Sessions
**Authentication:** Required (JWT Bearer Token)
**Responses:**
- `200`: Successful Response

---

### POST /api/chat/sessions
**Summary:** Create Chat Session
**Authentication:** Required (JWT Bearer Token)
**Request Body:**
- Content-Type: application/json
- Schema: ChatSessionCreate
**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---

### GET /api/chat/sessions/{session_id}/messages
**Summary:** Get Chat Messages
**Authentication:** Required (JWT Bearer Token)
**Parameters:**
- `session_id` (path) - integer (required): 
**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---

### DELETE /api/chat/sessions/{session_id}
**Summary:** Delete Chat Session
**Authentication:** Required (JWT Bearer Token)
**Parameters:**
- `session_id` (path) - integer (required): 
**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---

### POST /api/chat/sessions/{session_id}/generate-title
**Summary:** Generate Session Title
**Authentication:** Required (JWT Bearer Token)
**Parameters:**
- `session_id` (path) - integer (required): 
**Request Body:**
- Content-Type: application/json
- Schema: GenerateTitleRequest
**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---

### PUT /api/chat/sessions/{session_id}/title
**Summary:** Rename Session
**Authentication:** Required (JWT Bearer Token)
**Parameters:**
- `session_id` (path) - integer (required): 
**Request Body:**
- Content-Type: application/json
- Schema: ChatSessionRename
**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---

### GET /api/chat/sessions/{session_id}/status
**Summary:** Get Session Status
**Description:** Get session status including any streaming or interrupted messages
**Authentication:** Required (JWT Bearer Token)
**Parameters:**
- `session_id` (path) - integer (required): 
**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---

### POST /api/chat/sessions/{session_id}/stop
**Summary:** Stop Chat Stream
**Description:** Stop ongoing AI streaming for this session
**Authentication:** Required (JWT Bearer Token)
**Parameters:**
- `session_id` (path) - integer (required): 
**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---

## Tasks
### GET /api/tasks/stats
**Summary:** Get Task Stats
**Description:** Get task statistics for current user
**Authentication:** Required (JWT Bearer Token)
**Responses:**
- `200`: Successful Response

---

### POST /api/tasks
**Summary:** Create Task
**Description:** Create a new task manually
**Authentication:** Required (JWT Bearer Token)
**Request Body:**
- Content-Type: application/json
- Schema: TaskCreate
**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---

### GET /api/tasks
**Summary:** Get Tasks
**Description:** Get all tasks for current user with optional filtering
**Authentication:** Required (JWT Bearer Token)
**Parameters:**
- `status` (query) - string (optional): 
- `urgency` (query) - string (optional): 
- `importance` (query) - string (optional): 
**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---

### GET /api/tasks/{task_id}
**Summary:** Get Task
**Description:** Get specific task by ID
**Authentication:** Required (JWT Bearer Token)
**Parameters:**
- `task_id` (path) - integer (required): 
**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---

### PUT /api/tasks/{task_id}
**Summary:** Update Task
**Description:** Update task by ID
**Authentication:** Required (JWT Bearer Token)
**Parameters:**
- `task_id` (path) - integer (required): 
**Request Body:**
- Content-Type: application/json
- Schema: TaskUpdate
**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---

### DELETE /api/tasks/{task_id}
**Summary:** Delete Task
**Description:** Delete task by ID
**Authentication:** Required (JWT Bearer Token)
**Parameters:**
- `task_id` (path) - integer (required): 
**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---

### POST /api/tasks/generate
**Summary:** Generate Task From Text
**Description:** Generate task cards from Chinese text using AI (supports multiple tasks)
**Authentication:** Required (JWT Bearer Token)
**Request Body:**
**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---

### POST /api/tasks/extract-text-from-image
**Summary:** Extract Text From Image
**Description:** Extract text from image using OCR (preview step before task generation)
Uses AI OCR if active imageOCR provider is configured, otherwise falls back to EasyOCR
**Authentication:** Required (JWT Bearer Token)
**Request Body:**
- Content-Type: multipart/form-data (file upload)
**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---

### POST /api/tasks/generate-from-image
**Summary:** Generate Task From Image
**Description:** Generate task cards from image using OCR + AI (supports multiple tasks)
**Authentication:** Required (JWT Bearer Token)
**Request Body:**
- Content-Type: multipart/form-data (file upload)
**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---

## User Profile
### GET /api/profile/
**Summary:** Get User Profile
**Description:** Get current user's profile
**Authentication:** Required (JWT Bearer Token)
**Responses:**
- `200`: Successful Response

---

### PUT /api/profile/
**Summary:** Update Profile
**Description:** Update user profile
**Authentication:** Required (JWT Bearer Token)
**Request Body:**
- Content-Type: application/json
- Schema: UserProfileUpdate
**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---

### POST /api/profile/
**Summary:** Create Or Update Profile
**Description:** Create or update user profile
**Authentication:** Required (JWT Bearer Token)
**Request Body:**
- Content-Type: application/json
- Schema: UserProfileCreate
**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---

### GET /api/profile/relationships
**Summary:** Get Work Relationships
**Description:** Get all work relationships for current user
**Authentication:** Required (JWT Bearer Token)
**Responses:**
- `200`: Successful Response

---

### POST /api/profile/relationships
**Summary:** Create Work Relationship
**Description:** Create new work relationship
**Authentication:** Required (JWT Bearer Token)
**Request Body:**
- Content-Type: application/json
- Schema: WorkRelationshipCreate
**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---

### PUT /api/profile/relationships/{relationship_id}
**Summary:** Update Work Relationship
**Description:** Update work relationship
**Authentication:** Required (JWT Bearer Token)
**Parameters:**
- `relationship_id` (path) - integer (required): 
**Request Body:**
- Content-Type: application/json
- Schema: WorkRelationshipUpdate
**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---

### DELETE /api/profile/relationships/{relationship_id}
**Summary:** Delete Work Relationship
**Description:** Delete work relationship
**Authentication:** Required (JWT Bearer Token)
**Parameters:**
- `relationship_id` (path) - integer (required): 
**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---

### PUT /api/profile/personality/{dimension}
**Summary:** Update Personality Dimension
**Description:** Update specific Big Five personality dimension tags
**Authentication:** Required (JWT Bearer Token)
**Parameters:**
- `dimension` (path) - string (required): 
**Request Body:**
**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---

## Untagged
### GET /
**Summary:** Root
**Responses:**
- `200`: Successful Response

---

### GET /health
**Summary:** Health Check
**Responses:**
- `200`: Successful Response

---

