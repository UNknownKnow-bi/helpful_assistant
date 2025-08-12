from typing import AsyncGenerator, Dict, Any, Optional, List
from sqlalchemy.orm import Session
from app.database.sqlite_models import AIProvider
import json
import re
import httpx
import asyncio

class AIServiceSQLite:
    def __init__(self):
        self.models_cache = {}

    def get_active_provider(self, user_id: int, db: Session) -> Optional[AIProvider]:
        """Get active AI provider for user from SQLite"""
        return db.query(AIProvider).filter(
            AIProvider.user_id == user_id,
            AIProvider.is_active == True
        ).first()

    async def chat_stream(self, user_id: int, messages: List[Dict[str, str]], db: Session) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream chat responses using httpx"""
        provider = self.get_active_provider(user_id, db)
        if not provider:
            yield {"error": "No active AI provider configured"}
            return
        
        try:
            config = provider.config
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Prepare the request payload
                payload = {
                    "model": config.get("model", "gpt-3.5-turbo"),
                    "messages": messages,
                    "stream": True,
                    "temperature": config.get("temperature", 0.7),
                    "max_tokens": config.get("max_tokens", 1000)
                }
                
                headers = {
                    "Authorization": f"Bearer {config.get('api_key', '')}",
                    "Content-Type": "application/json"
                }
                
                # Make the streaming request
                async with client.stream(
                    "POST",
                    f"{config.get('base_url', 'https://api.openai.com')}/v1/chat/completions",
                    json=payload,
                    headers=headers
                ) as response:
                    if response.status_code != 200:
                        error_text = await response.aread()
                        yield {"error": f"API error {response.status_code}: {error_text.decode()}"}
                        return
                    
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data = line[6:]  # Remove "data: " prefix
                            if data == "[DONE]":
                                yield {"type": "done"}
                                break
                            
                            try:
                                chunk_data = json.loads(data)
                                
                                if "choices" in chunk_data and len(chunk_data["choices"]) > 0:
                                    choice = chunk_data["choices"][0]
                                    delta = choice.get("delta", {})
                                    
                                    # Regular content
                                    content = delta.get("content", "")
                                    # Reasoning content for DeepSeek reasoning models
                                    reasoning_content = delta.get("reasoning_content", "")
                                    
                                    chunk_thinking = None
                                    
                                    # Handle DeepSeek reasoning content
                                    if reasoning_content:
                                        chunk_thinking = reasoning_content
                                    
                                    # Handle <think> tags in content
                                    if content:
                                        thinking_match = re.search(r'<think>(.*?)</think>', content, re.DOTALL)
                                        if thinking_match:
                                            thinking_text = thinking_match.group(1)
                                            chunk_thinking = thinking_text
                                            # Remove <think> tags from main content
                                            content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL)
                                    
                                    # Send content and/or thinking if we have any
                                    if content or chunk_thinking:
                                        yield {
                                            "type": "content", 
                                            "content": content or "",
                                            "thinking": chunk_thinking
                                        }
                                            
                            except json.JSONDecodeError:
                                # Skip malformed JSON chunks
                                continue
                                
        except Exception as e:
            yield {"error": f"AI service error: {str(e)}"}

    async def generate_task_from_text(self, user_id: int, text: str, db: Session) -> List[Dict[str, Any]]:
        """Generate structured task from text using AI"""
        import logging
        logger = logging.getLogger(__name__)
        
        provider = self.get_active_provider(user_id, db)
        if not provider:
            logger.warning(f"No active AI provider found for user {user_id}")
            raise ValueError("No active AI provider configured")
        
        logger.info(f"Found active provider: {provider.name} (ID: {provider.id}) for user {user_id}")

        # AI prompt for Chinese task extraction
        system_prompt = """你是一个智能任务解析助手。请从用户输入的中文文本中提取任务信息，返回固定的JSON格式。

规则：
1. 只提取明确的任务信息，不确定的部分设为null
2. deadline格式为ISO 8601 (YYYY-MM-DDTHH:mm:ss)
3. priority只能是: "low", "medium", "high"
4. difficulty是1-10的数字，基于任务复杂度
5. 如果没有明确时间信息，deadline设为null
6. 如果没有指定负责人，assignee设为null
7. 如果识别到多个独立任务，返回JSON数组；如果只有一个任务，返回单个JSON对象

单任务返回格式：
{
  "content": "任务描述",
  "deadline": "2024-01-15T09:00:00" 或 null,
  "assignee": "负责人" 或 null,
  "priority": "low|medium|high",
  "difficulty": 1-10
}

多任务返回格式：
[
  {
    "content": "任务1描述",
    "deadline": "2024-01-15T09:00:00" 或 null,
    "assignee": "负责人" 或 null,
    "priority": "low|medium|high",
    "difficulty": 1-10
  },
  {
    "content": "任务2描述",
    "deadline": "2024-01-16T14:00:00" 或 null,
    "assignee": "负责人" 或 null,
    "priority": "low|medium|high",
    "difficulty": 1-10
  }
]"""

        user_prompt = f"请从以下文本中提取任务信息：\n\n{text}"
        
        try:
            config = provider.config
            model = config.get("model", "gpt-3.5-turbo")
            
            # DeepSeek reasoning model may take longer, set 60s timeout
            timeout = httpx.Timeout(60.0, read=60.0)
            async with httpx.AsyncClient(timeout=timeout) as client:
                # Base payload
                payload = {
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ]
                }
                
                # DeepSeek reasoning model doesn't support temperature and other parameters
                if "deepseek-reasoner" in model:
                    payload["max_tokens"] = 2000  # Increase for JSON response
                else:
                    payload.update({
                        "temperature": 0.3,  # Lower temperature for more consistent JSON output
                        "max_tokens": 500
                    })
                
                headers = {
                    "Authorization": f"Bearer {config.get('api_key', '')}",
                    "Content-Type": "application/json"
                }
                
                response = await client.post(
                    f"{config.get('base_url', 'https://api.openai.com')}/v1/chat/completions",
                    json=payload,
                    headers=headers
                )
                
                if response.status_code != 200:
                    error_text = response.text
                    raise Exception(f"AI API error {response.status_code}: {error_text}")
                
                result = response.json()
                message = result.get("choices", [{}])[0].get("message", {})
                ai_response = message.get("content", "")
                
                # Log reasoning content for DeepSeek models (but use content for parsing)
                if message.get("reasoning_content"):
                    logger.info(f"DeepSeek reasoning: {message.get('reasoning_content')}")
                
                logger.info(f"AI response content: {ai_response}")
                
                # Try to parse JSON from AI response
                try:
                    # Extract JSON from response (handle markdown code blocks)
                    import re
                    
                    # First try to extract from markdown code block (support both objects and arrays)
                    markdown_match = re.search(r'```(?:json)?\s*(\[.*?\]|\{.*?\})\s*```', ai_response, re.DOTALL)
                    if markdown_match:
                        json_str = markdown_match.group(1)
                        logger.info(f"Extracted JSON from markdown: {json_str}")
                    else:
                        # Fallback to direct JSON extraction (support both objects and arrays)
                        json_match = re.search(r'(\[.*?\]|\{.*?\})', ai_response, re.DOTALL)
                        if json_match:
                            json_str = json_match.group()
                            logger.info(f"Extracted JSON directly: {json_str}")
                        else:
                            raise ValueError("No JSON found in response")
                    
                    task_data = json.loads(json_str)
                    logger.info(f"Parsed task data: {task_data}")
                    
                    # Handle both single task and array of tasks
                    if isinstance(task_data, list):
                        logger.info(f"AI returned {len(task_data)} tasks")
                        validated_tasks = []
                        for single_task in task_data:
                            validated_task = self._validate_single_task(single_task, text, logger)
                            validated_tasks.append(validated_task)
                        return validated_tasks
                    else:
                        # Single task
                        logger.info("AI returned single task")
                        validated_task = self._validate_single_task(task_data, text, logger)
                        return [validated_task]  # Return as array for consistency
                        
                except (json.JSONDecodeError, ValueError) as e:
                    logger.error(f"JSON parsing error: {e}, AI response: {ai_response}")
                    # Fallback to simple parsing if AI response is invalid
                    return [{
                        "content": text,
                        "deadline": None,
                        "assignee": None,
                        "priority": "medium",
                        "difficulty": 5
                    }]
                    
        except Exception as e:
            import traceback
            logger.error(f"AI service error: {e}")
            logger.error(f"Full traceback: {traceback.format_exc()}")
            # Fallback to simple parsing if AI service fails
            return [{
                "content": text,
                "deadline": None,
                "assignee": None,
                "priority": "medium",
                "difficulty": 5
            }]

    def _validate_single_task(self, task_data: Dict[str, Any], original_text: str, logger) -> Dict[str, Any]:
        """Validate and clean a single task data object"""
        # Validate and clean the data
        content = task_data.get("content")
        if not content:
            logger.warning(f"AI response missing 'content' field, using original text")
            content = original_text
        
        # Handle difficulty field - can be null or number
        difficulty_raw = task_data.get("difficulty", 5)
        if difficulty_raw is None:
            difficulty = 5  # Default value when null
        else:
            try:
                difficulty = max(1, min(10, int(difficulty_raw)))
            except (ValueError, TypeError):
                difficulty = 5  # Default on conversion error
        
        validated_data = {
            "content": content,
            "deadline": task_data.get("deadline"),
            "assignee": task_data.get("assignee"),
            "priority": task_data.get("priority", "medium"),
            "difficulty": difficulty
        }
        
        # Validate priority
        if validated_data["priority"] not in ["low", "medium", "high"]:
            validated_data["priority"] = "medium"
        
        # Parse deadline if it's a string
        if validated_data["deadline"]:
            try:
                from datetime import datetime
                if isinstance(validated_data["deadline"], str):
                    validated_data["deadline"] = datetime.fromisoformat(validated_data["deadline"].replace('Z', '+00:00'))
            except:
                validated_data["deadline"] = None
        
        logger.info(f"Final validated task: {validated_data}")
        return validated_data

    async def test_provider(self, provider: AIProvider) -> Dict[str, Any]:
        """Test AI provider connection using httpx"""
        try:
            config = provider.config
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{config.get('base_url', 'https://api.openai.com')}/v1/chat/completions",
                    json={
                        "model": config.get("model", "gpt-3.5-turbo"),
                        "messages": [{"role": "user", "content": "Hello, please respond with 'OK'"}],
                        "max_tokens": 10
                    },
                    headers={
                        "Authorization": f"Bearer {config.get('api_key', '')}",
                        "Content-Type": "application/json"
                    }
                )
                
                if response.status_code == 200:
                    return {
                        "success": True,
                        "message": "Provider connection successful",
                        "response": "OK"
                    }
                else:
                    error_text = response.text
                    return {
                        "success": False,
                        "message": f"Provider test failed: HTTP {response.status_code} - {error_text}"
                    }
        except Exception as e:
            return {
                "success": False,
                "message": f"Provider test failed: {str(e)}"
            }

    async def generate_session_title(self, user_id: int, first_message: str, db: Session) -> str:
        """Generate a short session title based on user's first message"""
        provider = self.get_active_provider(user_id, db)
        if not provider:
            return "新对话"
        
        try:
            config = provider.config
            
            # System prompt for title generation
            system_prompt = """请根据用户的对话内容生成一个简短、贴切的中文会话标题，字数控制在10个字以内。
            
例如：
- 如果用户说'帮我写一封感谢信'，标题可以是'感谢信草稿'
- 如果用户说'解释一下Python的装饰器'，标题可以是'Python装饰器'
- 如果用户说'今天天气怎么样'，标题可以是'天气查询'

只返回标题文字，不要其他内容。"""

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"用户消息是：{first_message}"}
            ]
            
            async with httpx.AsyncClient(timeout=60.0) as client:  # Increased timeout for reasoning models
                # Use non-streaming request for title generation
                payload = {
                    "model": config.get("model", "gpt-3.5-turbo"),
                    "messages": messages,
                    "max_tokens": 3000,  # Fixed token limit for all models
                    "temperature": 0.3,
                    "stream": False  # Important: disable streaming for simple response
                }
                
                response = await client.post(
                    f"{config.get('base_url', 'https://api.openai.com')}/v1/chat/completions",
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {config.get('api_key', '')}",
                        "Content-Type": "application/json"
                    }
                )
                
                print(f"Title generation request payload: {payload}")
                print(f"Title generation response status: {response.status_code}")
                
                if response.status_code == 200:
                    response_data = response.json()
                    print(f"Full response data: {response_data}")
                    
                    choice = response_data["choices"][0]
                    message = choice["message"]
                    finish_reason = choice.get("finish_reason")
                    
                    print(f"Message object: {message}")
                    print(f"Finish reason: {finish_reason}")
                    
                    # Handle both regular and reasoning models
                    title = ""
                    
                    # For both regular and reasoning models, the final answer is in 'content'
                    # reasoning_content (if exists) is just the thinking process, not the answer
                    if "content" in message and message["content"]:
                        title = message["content"].strip()
                        print(f"Found title in content: '{title}'")
                    
                    # If content is empty but we have reasoning_content, it means generation was truncated
                    if not title and "reasoning_content" in message and message["reasoning_content"]:
                        print(f"Content is empty but reasoning_content exists: '{message['reasoning_content']}'")
                        print(f"This suggests the generation was truncated due to max_tokens limit")
                        # Don't use reasoning_content as title - it's just thinking process
                    
                    # Remove <think> tags if present
                    import re
                    title = re.sub(r'<think>.*?</think>', '', title, flags=re.DOTALL).strip()
                    
                    # Clean up the title - remove quotes, ensure max length
                    title = title.strip('"').strip("'").strip()
                    if len(title) > 10:
                        title = title[:10]
                    
                    print(f"Final cleaned title: '{title}'")
                    return title if title else "新对话"
                else:
                    error_text = response.text
                    print(f"API error: {response.status_code} - {error_text}")
                    return "新对话"
                    
        except Exception as e:
            import traceback
            print(f"Title generation error: {e}")
            print(f"Full traceback: {traceback.format_exc()}")
            return "新对话"

ai_service_sqlite = AIServiceSQLite()