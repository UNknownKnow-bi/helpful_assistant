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

## Body_extract_text_from_image_api_tasks_extract_text_from_image_post
**Properties:**
- `file` (string) (required): 

## Body_generate_task_from_image_api_tasks_generate_from_image_post
**Properties:**
- `file` (string) (required): 

## CalendarEventResponse
**Properties:**
- `task_id` (integer) (required): 
- `scheduled_start_time` (string) (required): 
- `scheduled_end_time` (string) (required): 
- `event_type` (string) (optional): 
- `ai_reasoning` (unknown) (optional): 
- `id` (integer) (required): 
- `created_at` (string) (required): 
- `updated_at` (string) (required): 
- `task` (unknown) (optional): 

## CalendarEventUpdate
**Properties:**
- `scheduled_start_time` (unknown) (optional): 
- `scheduled_end_time` (unknown) (optional): 
- `event_type` (unknown) (optional): 
- `ai_reasoning` (unknown) (optional): 

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

## ExecutionProcedureUpdate
**Properties:**
- `procedure_content` (unknown) (optional): 
- `key_result` (unknown) (optional): 
- `completed` (unknown) (optional): 

## GenerateTitleRequest
**Properties:**
- `first_message` (string) (required): 

## HTTPValidationError
**Properties:**
- `detail` (array of unknown) (optional): 

## TaskConfirmRequest
Request to confirm and save preview tasks
**Properties:**
- `tasks` (array of unknown) (required): 

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
- `cost_time_hours` (number) (optional): 

## TaskPreview
Task preview data returned by AI generation without database storage
**Properties:**
- `title` (string) (required): 
- `content` (string) (required): 
- `deadline` (unknown) (optional): 
- `assignee` (unknown) (optional): 
- `participant` (string) (optional): 
- `urgency` (string) (optional): 
- `importance` (string) (optional): 
- `difficulty` (integer) (optional): 
- `cost_time_hours` (number) (optional): 

## TaskPreviewResponse
Response containing preview tasks that haven't been saved yet
**Properties:**
- `tasks` (array of unknown) (required): 
- `message` (string) (optional): 

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
- `cost_time_hours` (number) (optional): 
- `id` (integer) (required): 
- `source` (string) (required): 
- `status` (string) (required): 
- `deadline_category` (unknown) (optional): 
- `execution_procedures` (unknown) (optional): 
- `social_advice` (unknown) (optional): 
- `created_at` (string) (required): 
- `updated_at` (string) (required): 

## TaskScheduleRequest
Request to schedule undone tasks using AI
**Properties:**
- `date_range_start` (string) (required): Start date for scheduling (e.g., today)
- `date_range_end` (string) (required): End date for scheduling (e.g., one week from today)
- `work_hours_start` (string) (optional): Daily work start time (HH:MM format)
- `work_hours_end` (string) (optional): Daily work end time (HH:MM format)
- `break_duration_minutes` (integer) (optional): Break time between tasks in minutes
- `include_weekends` (boolean) (optional): Whether to schedule tasks on weekends

## TaskScheduleResponse
Response containing scheduled tasks with AI reasoning
**Properties:**
- `events` (array of unknown) (required): 
- `ai_reasoning` (string) (required): AI explanation for the scheduling decisions
- `message` (string) (optional): 

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
- `cost_time_hours` (unknown) (optional): 
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
- `work_nickname` (unknown) (optional): 
- `job_type` (unknown) (optional): 
- `job_level` (unknown) (optional): 
- `personality_openness` (unknown) (optional): 
- `personality_conscientiousness` (unknown) (optional): 
- `personality_extraversion` (unknown) (optional): 
- `personality_agreeableness` (unknown) (optional): 
- `personality_neuroticism` (unknown) (optional): 

## WorkRelationshipResponse
**Properties:**
- `coworker_name` (string) (required): 
- `relationship_type` (string) (required): 
- `work_nickname` (unknown) (optional): 
- `job_type` (unknown) (optional): 
- `job_level` (unknown) (optional): 
- `personality_openness` (unknown) (optional): 
- `personality_conscientiousness` (unknown) (optional): 
- `personality_extraversion` (unknown) (optional): 
- `personality_agreeableness` (unknown) (optional): 
- `personality_neuroticism` (unknown) (optional): 
- `id` (integer) (required): 
- `created_at` (string) (required): 
- `updated_at` (string) (required): 

## WorkRelationshipUpdate
**Properties:**
- `coworker_name` (unknown) (optional): 
- `relationship_type` (unknown) (optional): 
- `work_nickname` (unknown) (optional): 
- `job_type` (unknown) (optional): 
- `job_level` (unknown) (optional): 
- `personality_openness` (unknown) (optional): 
- `personality_conscientiousness` (unknown) (optional): 
- `personality_extraversion` (unknown) (optional): 
- `personality_agreeableness` (unknown) (optional): 
- `personality_neuroticism` (unknown) (optional): 

