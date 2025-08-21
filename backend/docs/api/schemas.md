# Data Models Reference
Generated from OpenAPI specification
## AIProviderCreate
**Properties:**
- `name` (string) (required): 
- `provider_type` (string) (required): 
- `category` (string) (optional): 
- `config` (object) (optional): 

## AIProviderResponse
**Properties:**
- `name` (string) (required): 
- `provider_type` (string) (required): 
- `category` (string) (optional): 
- `config` (object) (optional): 
- `id` (integer) (required): 
- `is_active` (boolean) (required): 
- `last_tested` (unknown) (optional): 
- `created_at` (string) (required): 

## AIProviderUpdate
**Properties:**
- `name` (unknown) (optional): 
- `category` (unknown) (optional): 
- `config` (unknown) (optional): 
- `is_active` (unknown) (optional): 

## BigFivePersonality
**Properties:**
- `openness` (array of string) (optional): 经验开放性 - 对新事物、新想法的好奇心和想象力
- `conscientiousness` (array of string) (optional): 尽责性 - 自律、有条理、可靠的程度
- `extraversion` (array of string) (optional): 外向性 - 从社交中获取能量的程度，热情、健谈
- `agreeableness` (array of string) (optional): 宜人性 - 对他人友好、合作、有同情心的程度
- `neuroticism` (array of string) (optional): 神经质 - 情绪的稳定性，感受负面情绪的倾向

## Body_extract_text_from_image_api_tasks_extract_text_from_image_post
**Properties:**
- `file` (string) (required): 

## Body_generate_task_from_image_api_tasks_generate_from_image_post
**Properties:**
- `file` (string) (required): 

## ChatMessageResponse
**Properties:**
- `id` (integer) (required): 
- `role` (string) (required): 
- `content` (string) (required): 
- `thinking` (unknown) (optional): 
- `timestamp` (string) (required): 
- `token_usage` (unknown) (optional): 
- `streaming_status` (unknown) (optional): 

## ChatSessionCreate
**Properties:**
- `title` (unknown) (optional): 

## ChatSessionRename
**Properties:**
- `title` (string) (required): 

## ChatSessionResponse
**Properties:**
- `id` (integer) (required): 
- `title` (string) (required): 
- `created_at` (string) (required): 
- `updated_at` (string) (required): 
- `message_count` (integer) (required): 

## GenerateTitleRequest
**Properties:**
- `first_message` (string) (required): 

## HTTPValidationError
**Properties:**
- `detail` (array of unknown) (optional): 

## TaskCreate
**Properties:**
- `title` (string) (required): 
- `content` (string) (required): 
- `deadline` (unknown) (optional): 
- `assignee` (unknown) (optional): 
- `participant` (string) (optional): 
- `urgency` (string) (optional): 
- `importance` (string) (optional): 
- `difficulty` (integer) (optional): 

## TaskResponse
**Properties:**
- `title` (string) (required): 
- `content` (string) (required): 
- `deadline` (unknown) (optional): 
- `assignee` (unknown) (optional): 
- `participant` (string) (optional): 
- `urgency` (string) (optional): 
- `importance` (string) (optional): 
- `difficulty` (integer) (optional): 
- `id` (integer) (required): 
- `source` (string) (required): 
- `status` (string) (required): 
- `created_at` (string) (required): 
- `updated_at` (string) (required): 

## TaskUpdate
**Properties:**
- `title` (unknown) (optional): 
- `content` (unknown) (optional): 
- `deadline` (unknown) (optional): 
- `assignee` (unknown) (optional): 
- `participant` (unknown) (optional): 
- `urgency` (unknown) (optional): 
- `importance` (unknown) (optional): 
- `difficulty` (unknown) (optional): 
- `status` (unknown) (optional): 

## UserCreate
**Properties:**
- `username` (string) (required): 
- `password` (string) (required): 

## UserLogin
**Properties:**
- `username` (string) (required): 
- `password` (string) (required): 

## UserProfileCreate
**Properties:**
- `name` (unknown) (optional): 
- `work_nickname` (unknown) (optional): 
- `gender` (unknown) (optional): 
- `job_type` (unknown) (optional): 
- `job_level` (unknown) (optional): 
- `is_manager` (unknown) (optional): 
- `personality_openness` (unknown) (optional): 
- `personality_conscientiousness` (unknown) (optional): 
- `personality_extraversion` (unknown) (optional): 
- `personality_agreeableness` (unknown) (optional): 
- `personality_neuroticism` (unknown) (optional): 
- `personality_assessment` (unknown) (optional): 
- `work_context` (unknown) (optional): 
- `ai_analysis` (unknown) (optional): 
- `knowledge_base` (unknown) (optional): 

## UserProfileResponse
**Properties:**
- `name` (unknown) (optional): 
- `work_nickname` (unknown) (optional): 
- `gender` (unknown) (optional): 
- `job_type` (unknown) (optional): 
- `job_level` (unknown) (optional): 
- `is_manager` (unknown) (optional): 
- `personality_openness` (unknown) (optional): 
- `personality_conscientiousness` (unknown) (optional): 
- `personality_extraversion` (unknown) (optional): 
- `personality_agreeableness` (unknown) (optional): 
- `personality_neuroticism` (unknown) (optional): 
- `personality_assessment` (unknown) (optional): 
- `work_context` (unknown) (optional): 
- `ai_analysis` (unknown) (optional): 
- `knowledge_base` (unknown) (optional): 
- `id` (integer) (required): 
- `created_at` (string) (required): 
- `updated_at` (string) (required): 
- `work_relationships` (array of unknown) (optional): 

## UserProfileSummary
**Properties:**
- `basic_info` (object) (optional): 
- `big_five_personality` (reference to BigFivePersonality) (optional): 
- `work_relationships` (array of unknown) (optional): 

## UserProfileUpdate
**Properties:**
- `name` (unknown) (optional): 
- `work_nickname` (unknown) (optional): 
- `gender` (unknown) (optional): 
- `job_type` (unknown) (optional): 
- `job_level` (unknown) (optional): 
- `is_manager` (unknown) (optional): 
- `personality_openness` (unknown) (optional): 
- `personality_conscientiousness` (unknown) (optional): 
- `personality_extraversion` (unknown) (optional): 
- `personality_agreeableness` (unknown) (optional): 
- `personality_neuroticism` (unknown) (optional): 
- `personality_assessment` (unknown) (optional): 
- `work_context` (unknown) (optional): 
- `ai_analysis` (unknown) (optional): 
- `knowledge_base` (unknown) (optional): 

## UserResponse
**Properties:**
- `username` (string) (required): 
- `id` (integer) (required): 
- `created_at` (string) (required): 
- `active_text_provider_id` (unknown) (optional): 
- `active_image_provider_id` (unknown) (optional): 

## ValidationError
**Properties:**
- `loc` (array of unknown) (required): 
- `msg` (string) (required): 
- `type` (string) (required): 

## WorkRelationshipCreate
**Properties:**
- `coworker_name` (string) (required): 
- `relationship_type` (string) (required): 

## WorkRelationshipResponse
**Properties:**
- `coworker_name` (string) (required): 
- `relationship_type` (string) (required): 
- `id` (integer) (required): 
- `created_at` (string) (required): 

## WorkRelationshipUpdate
**Properties:**
- `coworker_name` (unknown) (optional): 
- `relationship_type` (unknown) (optional): 

