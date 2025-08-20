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
    
    def _build_payload(self, config: Dict[str, Any], messages: List[Dict[str, str]], 
                      stream: bool = False, max_tokens_override: int = None) -> Dict[str, Any]:
        """Build API payload using user configuration with optional overrides"""
        model = config.get("model", "gpt-3.5-turbo")
        
        payload = {
            "model": model,
            "messages": messages,
            "stream": stream
        }
        
        # Handle reasoning models that don't support certain parameters
        if "deepseek-reasoner" in model:
            # DeepSeek reasoning models don't support temperature and some other parameters
            if max_tokens_override:
                payload["max_tokens"] = min(max_tokens_override, 8192)  # Cap at 8192
            elif "max_tokens" in config:
                payload["max_tokens"] = min(config["max_tokens"], 8192)  # Cap at 8192
        else:
            # Use user's configured parameters for regular models
            if "temperature" in config:
                payload["temperature"] = config["temperature"]
            if "max_tokens" in config or max_tokens_override:
                max_tokens_value = max_tokens_override or config["max_tokens"]
                payload["max_tokens"] = min(max_tokens_value, 8192)  # Cap at 8192
            if "top_p" in config:
                payload["top_p"] = config["top_p"]
            if "frequency_penalty" in config:
                payload["frequency_penalty"] = config["frequency_penalty"]
            if "presence_penalty" in config:
                payload["presence_penalty"] = config["presence_penalty"]
        
        return payload

    def get_active_provider(self, user_id: int, db: Session, category: str = "text") -> Optional[AIProvider]:
        """Get active AI provider for user from SQLite by category"""
        return db.query(AIProvider).filter(
            AIProvider.user_id == user_id,
            AIProvider.category == category,
            AIProvider.is_active == True
        ).first()
    
    def get_provider_by_id(self, provider_id: int, user_id: int, db: Session) -> Optional[AIProvider]:
        """Get specific AI provider by ID (must belong to user)"""
        return db.query(AIProvider).filter(
            AIProvider.id == provider_id,
            AIProvider.user_id == user_id
        ).first()

    async def chat_stream(self, user_id: int, messages: List[Dict[str, str]], db: Session, model_id: int = None) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream chat responses using httpx with optional model selection"""
        if model_id:
            provider = self.get_provider_by_id(model_id, user_id, db)
            if not provider:
                yield {"error": f"AI provider {model_id} not found or not accessible"}
                return
        else:
            provider = self.get_active_provider(user_id, db, "text")
            if not provider:
                yield {"error": "No active text AI provider configured"}
                return
        
        try:
            config = provider.config
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Prepare the request payload using user configuration
                payload = self._build_payload(config, messages, stream=True)
                
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

        # AI prompt for Chinese task extraction using Eisenhower Matrix
        system_prompt = """你是一个智能任务解析助手。请从用户输入的中文文本中提取任务信息，返回固定的JSON格式。

规则：
1. 只提取明确的任务信息，不确定的部分设为null
2. title: 用8个字以内简洁概括任务内容（例如："完成项目报告"、"参加会议讨论"）
3. deadline格式为ISO 8601 (YYYY-MM-DDTHH:mm:ss)
4. assignee: 将任务分配给用户的人，没有明确指定时设为null
5. participant: 参与执行任务的人，默认为"你"
6. 使用艾森豪威尔矩阵评估优先级：
   - urgency（紧迫性）: "low"或"high" - 是否有时间限制，需要立即关注
   - importance（重要性）: "low"或"high" - 是否对长期目标有重要贡献
7. difficulty是1-10的数字，基于任务复杂度
8. 如果识别到多个独立任务，返回JSON数组；如果只有一个任务，返回单个JSON对象
9. 重要：返回纯净的JSON格式，不要添加任何注释（//或/**/）

单任务返回格式：
{
  "title": "8字内任务标题",
  "content": "详细任务描述",
  "deadline": "2024-01-15T09:00:00" 或 null,
  "assignee": "提出人" 或 null,
  "participant": "你",
  "urgency": "low|high",
  "importance": "low|high",
  "difficulty": 1-10
}

多任务返回格式：
[
  {
    "title": "任务1标题",
    "content": "任务1详细描述",
    "deadline": "2024-01-15T09:00:00" 或 null,
    "assignee": "提出人" 或 null,
    "participant": "你",
    "urgency": "low|high",
    "importance": "low|high",
    "difficulty": 1-10
  },
  {
    "title": "任务2标题",
    "content": "任务2详细描述",
    "deadline": "2024-01-16T14:00:00" 或 null,
    "assignee": "提出人" 或 null,
    "participant": "你",
    "urgency": "low|high",
    "importance": "low|high",
    "difficulty": 1-10
  }
]"""

        user_prompt = f"请从以下文本中提取任务信息：\n\n{text}"
        
        try:
            config = provider.config
            model = config.get("model", "gpt-3.5-turbo")
            
            # Set 5 minutes timeout for AI requests
            timeout = httpx.Timeout(connect=30.0, read=300.0, write=30.0, pool=30.0)
            async with httpx.AsyncClient(timeout=timeout) as client:
                # Build payload using user configuration
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
                
                # For task generation, we prefer higher token limits for JSON responses
                # But still respect user's max_tokens if they configured it
                max_tokens_for_task = None
                if "deepseek-reasoner" in config.get("model", ""):
                    max_tokens_for_task = config.get("max_tokens", 2000)  # More tokens for reasoning
                else:
                    max_tokens_for_task = config.get("max_tokens", 1000)  # User config or reasonable default
                
                payload = self._build_payload(config, messages, stream=False, max_tokens_override=max_tokens_for_task)
                
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
                print(f"[DEBUG] Full AI response content:\n{ai_response}")
                print(f"[DEBUG] AI response length: {len(ai_response)}")
                
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
                    
                    # Clean up JavaScript-style comments that are invalid in JSON
                    # Remove // single-line comments
                    json_str = re.sub(r'//.*?(?=\n|$)', '', json_str, flags=re.MULTILINE)
                    # Remove /* multi-line comments */
                    json_str = re.sub(r'/\*.*?\*/', '', json_str, flags=re.DOTALL)
                    # Clean up any trailing commas that might be left after comment removal
                    json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
                    print(f"[DEBUG] Cleaned JSON: {json_str[:200]}...")
                    
                    task_data = json.loads(json_str)
                    logger.info(f"Parsed task data: {task_data}")
                    print(f"[DEBUG] Parsed task data type: {type(task_data)}")
                    print(f"[DEBUG] Parsed task data: {task_data}")
                    
                    # Handle both single task and array of tasks
                    if isinstance(task_data, list):
                        logger.info(f"AI returned {len(task_data)} tasks")
                        print(f"[DEBUG] AI returned {len(task_data)} tasks as array")
                        validated_tasks = []
                        for i, single_task in enumerate(task_data):
                            print(f"[DEBUG] Processing task {i+1}: {single_task}")
                            validated_task = self._validate_single_task(single_task, text, logger)
                            validated_tasks.append(validated_task)
                        print(f"[DEBUG] Final validated tasks count: {len(validated_tasks)}")
                        return validated_tasks
                    else:
                        # Single task
                        logger.info("AI returned single task")
                        print(f"[DEBUG] AI returned single task object")
                        validated_task = self._validate_single_task(task_data, text, logger)
                        return [validated_task]  # Return as array for consistency
                        
                except (json.JSONDecodeError, ValueError) as e:
                    logger.error(f"JSON parsing error: {e}, AI response: {ai_response}")
                    print(f"[DEBUG] JSON parsing failed with error: {e}")
                    print(f"[DEBUG] AI response that failed to parse:\n{ai_response}")
                    # Fallback to simple parsing if AI response is invalid
                    fallback_task = {
                        "title": text[:8] if len(text) <= 8 else text[:7] + "...",
                        "content": text,
                        "deadline": None,
                        "assignee": None,
                        "participant": "你",
                        "urgency": "low",
                        "importance": "low",
                        "difficulty": 5
                    }
                    print(f"[DEBUG] Using fallback task: {fallback_task}")
                    return [fallback_task]
                    
        except Exception as e:
            import traceback
            logger.error(f"AI service error: {e}")
            logger.error(f"Full traceback: {traceback.format_exc()}")
            print(f"[DEBUG] AI service failed with exception: {e}")
            print(f"[DEBUG] Using fallback due to AI service failure")
            # Fallback to simple parsing if AI service fails
            fallback_task = {
                "title": text[:8] if len(text) <= 8 else text[:7] + "...",
                "content": text,
                "deadline": None,
                "assignee": None,
                "participant": "你",
                "urgency": "low",
                "importance": "low",
                "difficulty": 5
            }
            print(f"[DEBUG] Service fallback task: {fallback_task}")
            return [fallback_task]

    def _validate_single_task(self, task_data: Dict[str, Any], original_text: str, logger) -> Dict[str, Any]:
        """Validate and clean a single task data object"""
        # Validate and clean the data
        title = task_data.get("title", "")
        if not title:
            # Generate a simple title from content or original text
            content_for_title = task_data.get("content", original_text)
            title = content_for_title[:8] if len(content_for_title) <= 8 else content_for_title[:7] + "..."
            logger.warning(f"AI response missing 'title' field, using generated title: {title}")
        
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
            "title": title,
            "content": content,
            "deadline": task_data.get("deadline"),
            "assignee": task_data.get("assignee"),
            "participant": task_data.get("participant", "你"),
            "urgency": task_data.get("urgency", "low"),
            "importance": task_data.get("importance", "low"),
            "difficulty": difficulty
        }
        
        # Validate urgency and importance
        if validated_data["urgency"] not in ["low", "high"]:
            validated_data["urgency"] = "low"
        if validated_data["importance"] not in ["low", "high"]:
            validated_data["importance"] = "low"
        
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
            base_url = config.get('base_url', 'https://api.openai.com')
            endpoint = f"{base_url}/v1/chat/completions"
            
            # For imageOCR providers, use vision model format with test image
            if provider.provider_type == "imageOCR":
                test_messages = [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": "https://goeastmandarin.com/wp-content/uploads/2023/06/nihao1-1024x576.jpg"
                            },
                            {
                                "type": "text",
                                "text": "请识别这张图片中的文字内容"
                            }
                        ]
                    }
                ]
                test_model = config.get("model", "qwen-vl-max")
                payload = {
                    "model": test_model,
                    "messages": test_messages,
                    "max_tokens": 50
                }
            else:
                test_messages = [{"role": "user", "content": "Hello, please respond with 'OK'"}]
                test_model = config.get("model", "gpt-3.5-turbo")
                payload = {
                    "model": test_model,
                    "messages": test_messages,
                    "max_tokens": 20
                }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    endpoint,
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {config.get('api_key', '')}",
                        "Content-Type": "application/json"
                    }
                )
                
                if response.status_code == 200:
                    try:
                        response_data = response.json()
                        content = response_data.get("choices", [{}])[0].get("message", {}).get("content", "")
                        return {
                            "success": True,
                            "message": f"Provider connection successful. Model: {test_model}",
                            "response": content.strip()
                        }
                    except Exception as parse_error:
                        return {
                            "success": True,
                            "message": f"Provider connection successful (response parsing issue: {str(parse_error)})",
                            "response": "Connection OK"
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
                # For title generation, limit tokens appropriately but respect user config
                model = config.get("model", "gpt-3.5-turbo")
                if "deepseek-reasoner" in model:
                    # Reasoning models need more tokens to complete the reasoning process
                    max_tokens_for_title = config.get("max_tokens", 3000)
                else:
                    # For title generation, use user config but cap at reasonable limit for titles
                    user_max_tokens = config.get("max_tokens", 100)
                    max_tokens_for_title = min(user_max_tokens, 100)  # Cap at 100 for efficiency
                
                payload = self._build_payload(config, messages, stream=False, max_tokens_override=max_tokens_for_title)
                
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

    def get_active_image_ocr_provider(self, user_id: int, db: Session) -> Optional[AIProvider]:
        """Get active AI provider specifically for image OCR"""
        return db.query(AIProvider).filter(
            AIProvider.user_id == user_id,
            AIProvider.is_active == True,
            AIProvider.provider_type == "imageOCR"
        ).first()

    async def extract_text_from_image_ai(self, user_id: int, image_bytes: bytes, db: Session) -> str:
        """
        Extract text from image using AI-powered OCR (Qwen-OCR)
        
        Args:
            user_id: User ID to get active OCR provider
            image_bytes: Raw image bytes
            db: Database session
            
        Returns:
            Extracted text as string
        """
        provider = self.get_active_image_ocr_provider(user_id, db)
        if not provider:
            raise ValueError("No active AI OCR provider configured")
        
        try:
            import base64
            
            # Convert image bytes to base64
            image_base64 = base64.b64encode(image_bytes).decode('utf-8')
            
            # Build OCR prompt for Chinese/English text extraction
            system_prompt = """你是一个专业的图像文字识别助手。请仔细分析用户上传的图片，提取其中的所有文字内容。

要求：
1. 识别图片中的所有中文和英文文字
2. 保持原有的文字顺序和段落结构
3. 对于表格或列表，尽量保持原有格式
4. 忽略图片中的装饰性元素，只专注于文字内容
5. 如果文字不清楚，请尽力推测并标注[不清楚]
6. 直接输出提取的文字，不需要额外说明

请开始识别图片中的文字内容："""
            
            config = provider.config
            
            # Build message with image
            messages = [
                {
                    "role": "system", 
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "请识别这张图片中的所有文字内容："
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            }
                        }
                    ]
                }
            ]
            
            timeout = httpx.Timeout(connect=30.0, read=120.0, write=30.0, pool=30.0)
            async with httpx.AsyncClient(timeout=timeout) as client:
                # Build payload using user configuration
                payload = self._build_payload(config, messages, stream=False, max_tokens_override=2000)
                
                headers = {
                    "Authorization": f"Bearer {config.get('api_key', '')}",
                    "Content-Type": "application/json"
                }
                
                response = await client.post(
                    f"{config.get('base_url', 'https://api.openai.com')}/v1/chat/completions",
                    json=payload,
                    headers=headers
                )
                
                if response.status_code == 200:
                    response_data = response.json()
                    if "choices" in response_data and len(response_data["choices"]) > 0:
                        message = response_data["choices"][0]["message"]
                        extracted_text = message.get("content", "").strip()
                        
                        # Clean up the response
                        if extracted_text:
                            return extracted_text
                        else:
                            raise ValueError("AI OCR returned empty response")
                    else:
                        raise ValueError("Invalid response format from AI OCR")
                else:
                    error_text = response.text
                    raise ValueError(f"AI OCR API error {response.status_code}: {error_text}")
                    
        except Exception as e:
            raise ValueError(f"AI OCR failed: {str(e)}")

ai_service_sqlite = AIServiceSQLite()