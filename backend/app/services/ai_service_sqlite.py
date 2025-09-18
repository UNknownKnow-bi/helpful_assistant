from typing import AsyncGenerator, Dict, Any, Optional, List
from sqlalchemy.orm import Session
from app.database.sqlite_models import AIProvider, UserProfile, WorkRelationship
import json
import re
import httpx
import asyncio
import logging

# Configure logging
logger = logging.getLogger(__name__)

class AIServiceSQLite:
    # Configuration Constants
    DEFAULT_TIMEOUT = httpx.Timeout(connect=30.0, read=120.0, write=30.0, pool=30.0)
    EXTENDED_TIMEOUT = httpx.Timeout(connect=30.0, read=300.0, write=30.0, pool=30.0)
    DEFAULT_MAX_TOKENS = 2000
    TITLE_MAX_TOKENS = 100
    
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

    def _get_timeout_config(self, config: Dict[str, Any]) -> httpx.Timeout:
        """Get appropriate timeout configuration based on model type"""
        model = config.get("model", "")
        if "deepseek-reasoner" in model:
            return self.EXTENDED_TIMEOUT
        return self.DEFAULT_TIMEOUT

    async def _make_ai_request(self, provider: AIProvider, messages: List[Dict[str, Any]], 
                              stream: bool = False, max_tokens_override: Optional[int] = None) -> Dict[str, Any]:
        """Unified AI API request handler with error management"""
        try:
            config = provider.config
            timeout = self._get_timeout_config(config)
            
            async with httpx.AsyncClient(timeout=timeout) as client:
                # Build payload using user configuration
                payload = self._build_payload(config, messages, stream=stream, max_tokens_override=max_tokens_override)
                
                headers = {
                    "Authorization": f"Bearer {config.get('api_key', '')}",
                    "Content-Type": "application/json"
                }
                
                response = await client.post(
                    f"{config.get('base_url', 'https://api.openai.com')}/chat/completions",
                    json=payload,
                    headers=headers
                )
                
                if response.status_code != 200:
                    error_text = response.text
                    raise Exception(f"AI API error {response.status_code}: {error_text}")
                
                return response.json()
                
        except Exception as e:
            logger.error(f"AI request failed: {e}")
            raise

    def _extract_and_clean_json(self, ai_response: str) -> Any:
        """Extract and clean JSON from AI response with intelligent parsing"""
        try:
            import re
            
            # First try to extract from markdown code block (support both objects and arrays)
            markdown_match = re.search(r'```(?:json)?\s*(\[.*?\]|\{.*?\})\s*```', ai_response, re.DOTALL)
            if markdown_match:
                json_str = markdown_match.group(1)
                logger.info(f"Extracted JSON from markdown block")
            else:
                # Fallback to direct JSON extraction (support both objects and arrays)
                json_match = re.search(r'(\[.*?\]|\{.*?\})', ai_response, re.DOTALL)
                if json_match:
                    json_str = json_match.group()
                    logger.info(f"Extracted JSON directly from response")
                else:
                    raise ValueError("No JSON found in response")
            
            # Clean up JavaScript-style comments that are invalid in JSON
            # Remove // single-line comments
            json_str = re.sub(r'//.*?(?=\n|$)', '', json_str, flags=re.MULTILINE)
            # Remove /* multi-line comments */
            json_str = re.sub(r'/\*.*?\*/', '', json_str, flags=re.DOTALL)
            # Clean up any trailing commas that might be left after comment removal
            json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
            
            return json.loads(json_str)
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"JSON parsing error: {e}, AI response: {ai_response}")
            raise

    def _build_user_context_string(self, user_context: Dict[str, Any]) -> str:
        """Build standardized user context string for AI prompts"""
        user_info = user_context["user_info"]
        
        # Build colleague context string
        colleague_context = ""
        if user_context["colleagues"]:
            colleague_names = []
            for colleague in user_context["colleagues"]:
                name_info = colleague["name"]
                if colleague["work_nickname"]:
                    name_info += f"（{colleague['work_nickname']}）"
                name_info += f" - {colleague['relationship_type']}"
                if colleague["job_type"]:
                    name_info += f"，{colleague['job_type']}"
                colleague_names.append(name_info)
            colleague_context = f"\n用户的同事关系：{'; '.join(colleague_names)}"

        return f"""
用户信息：
- 姓名：{user_info['name']}
- 工作昵称：{user_info['work_nickname'] or '无'}
- 职位类型：{user_info['job_type'] or '未知'}
- 职位级别：{user_info['job_level'] or '未知'}
- 管理层：{'是' if user_info['is_manager'] else '否'}{colleague_context}"""

    def _handle_ai_error(self, error: Exception, fallback_data: Any = None) -> Any:
        """Unified error handling with fallback data"""
        import traceback
        logger.error(f"AI service error: {error}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        
        if fallback_data is not None:
            logger.info("Using fallback data due to AI service error")
            return fallback_data
        else:
            raise error

    # ===================== PROMPT GENERATORS =====================
    
    def _build_task_extraction_prompt(self, user_context_string: str) -> str:
        """Build prompt for AI task extraction using Eisenhower Matrix"""
        json_template_single = """{
  "title": "8字内任务标题",
  "content": "详细任务描述",
  "deadline": "2024-01-15T09:00:00" 或 null,
  "assignee": "提出人" 或 null,
  "participant": "你",
  "urgency": "low|high",
  "importance": "low|high",
  "difficulty": 1-10,
  "cost_time_hours": 2.5
}"""
        
        json_template_multi = """[
  {
    "title": "任务1标题",
    "content": "任务1详细描述",
    "deadline": "2024-01-15T09:00:00" 或 null,
    "assignee": "提出人" 或 null,
    "participant": "你",
    "urgency": "low|high",
    "importance": "low|high",
    "difficulty": 1-10,
    "cost_time_hours": 2.5
  },
  {
    "title": "任务2标题",
    "content": "任务2详细描述",
    "deadline": "2024-01-16T14:00:00" 或 null,
    "assignee": "提出人" 或 null,
    "participant": "你",
    "urgency": "low|high",
    "importance": "low|high",
    "difficulty": 1-10,
    "cost_time_hours": 1.0
  }
]"""
        
        return f"""你是一个智能任务解析助手。请从用户输入的中文文本中提取任务信息，返回固定的JSON格式。

{user_context_string}

规则：
1. 只提取明确的任务信息，不确定的部分设为null
2. title: 字数8个字以内，简洁概括任务内容（例如："完成项目报告"、"参加会议讨论"）
3. deadline格式为ISO 8601 (YYYY-MM-DDTHH:mm:ss)
4. assignee: 根据用户的同事关系识别，提出该任务或将任务分配给用户的人，没有明确指定时设为null
5. participant: 参与执行任务的人，默认为"你"，如果有识别到相关可能为姓名的人也一并加入
6. 使用艾森豪威尔矩阵评估优先级：
   - urgency（紧迫性）: "low"或"high" - 是否有时间限制，需要立即关注
   - importance（重要性）: "low"或"high" - 是否对长期目标或个人成长价值有重要贡献，结合用户的职位类型、职级、是否管理层判断
7. difficulty是1-10的数字，基于任务复杂度，需要结合用户的职位类型、职级来判断
8. cost_time_hours: 根据任务的难度和用户的职级能力来给出预估的任务时间（以小时为单位），结合用户的职位类型、职级来判断。考虑用户的经验水平，新手级别的任务可能需要更多时间，高级/管理层可能完成相同任务用时更短。返回数值类型，支持小数（如0.5, 1.5, 2.5等）
9. 如果识别到多个独立任务，返回JSON数组；如果只有一个任务，返回单个JSON对象
10. 重要：返回纯净的JSON格式，不要添加任何注释（//或/**/）

单任务返回格式：
{json_template_single}

多任务返回格式：
{json_template_multi}"""

    def _build_title_generation_prompt(self) -> str:
        """Build prompt for chat session title generation"""
        return """请根据用户的对话内容生成一个简短、贴切的中文会话标题，字数控制在10个字以内。
            
例如：
- 如果用户说'帮我写一封感谢信'，标题可以是'感谢信草稿'
- 如果用户说'解释一下Python的装饰器'，标题可以是'Python装饰器'
- 如果用户说'今天天气怎么样'，标题可以是'天气查询'

只返回标题文字，不要其他内容。"""

    def _build_execution_guidance_prompt(self, user_context_string: str, task_context: str) -> str:
        """Build prompt for task execution guidance generation"""
        return f"""# 角色定义
你是一位专业的项目管理专家和工作执行顾问，精通SMART、RACI等多种项目管理方法论。你的思维极度结构化、逻辑严谨，并始终以任务的结果目标为导向。

# 核心任务
你的唯一目标是将用户提出的一个复杂职场任务，分解成一个清晰、有序、可执行的步骤序列。你必须完全忽略所有关于人员性格、情绪或人际关系的软性信息，只做任务涉及人员和资源识别与排布。

{user_context_string}

{task_context}

# 分析要求
你需要：
1. 分析目标：深入理解该任务的核心目标和最终要达成的关键结果（Key Results）
2. 识别关键阶段：将实现该目标划分为几个逻辑上连续的关键阶段
3. 分解具备可操作性的具体步骤：在每个阶段下，拆分出具体的、可操作的执行步骤
4. 明确产出物：为关键步骤指明需要产出的具体成果
5. 简单任务控制在5个步骤内，复杂任务不超过10个步骤，细碎的步骤进行整合。

# 严格禁止
绝对不要提供任何关于沟通方式、说服技巧、如何与人相处或考虑他人感受的建议。你的输出必须是100%客观的任务清单。

# 输出格式要求
必须返回标准JSON数组格式，每个步骤包含：procedure_number（从1开始的序号）、procedure_content（步骤内容）、key_result（关键结果）

示例格式：
[
  {{
    "procedure_number": 1,
    "procedure_content": "收集项目相关的技术资料和竞品分析数据",
    "key_result": "完成一份包含技术可行性和市场竞品对比的分析报告"
  }},
  {{
    "procedure_number": 2,
    "procedure_content": "设计项目方案并制作管理层汇报材料",
    "key_result": "制作一份面向管理层的PPT提案，包含项目目标、实施计划和预算需求"
  }}
]

只返回JSON数组，不要其他内容。"""

    def _build_social_advice_prompt(self, user_info_context: str, colleague_context: str, procedures_context: str) -> str:
        """Build prompt for social intelligence advice generation"""
        return f"""角色
你是一位顶级的组织心理学家和职场情商教练，尤其擅长应用大五人格（Big Five/OCEAN）等心理学模型来解决复杂的职场人际动态问题。你具有极高的情商和同理心。

核心任务
你的任务是接收一个已经制定好的客观行动计划，并为其中的每一步注入深刻的社会化智慧。你需要分析计划中涉及人员的性格特点，并评估实际的实现可能，进而提供具体的、可操作的沟通和行为建议，以提高计划的成功率。

输入信息
你将接收到以下两部分信息：

1. 人物性格档案:{user_info_context}{colleague_context}
    
2. 待优化的行动计划:{procedures_context}

处理指令
第一步：人格特质推断
  对于档案中的每一个人（包括用户自己），首先根据其"性格描述/标签"文本，推断出其在大五人格（OCEAN）模型中可能的倾向。
  以一个简洁的摘要形式在内部进行分析（例如：老板 - 责任心(高)、外向性(中)、神经质(低)；财务负责人 - 责任心(极高)、开放性(低)）。你不需要直接输出这个分析表，但必须在后续建议中运用它。
    
第二步：逐条丰富计划
  严格按照输入的行动计划编号，逐一分析每个步骤。
  对于每个步骤，结合你对关键人物性格的推断，提供深入的"社会化建议补充"。
    
第三步：提供具体建议
  在"社会化建议补充"中，必须回答以下问题：
    关键互动对象： 这个步骤主要需要和谁打交道？
    可能的反应预测： 基于此人的性格，他们对这一步最可能的正面和负面反应是什么？
    最佳沟通策略：
      应该选择什么沟通渠道（办公聊天软件、线下会议、非正式聊天、邮件或是其他方式）？
      沟通时，应该如何组织语言和论据才能最大化地被对方接受？（例如："对老板，要先说结论和收益，后附数据；对财务，要先展示风险控制和详细数据;对运营，要先说关键问题和解决方案"）
      应该强调什么，避免什么？
    潜在的社交陷阱： 在这个步骤中，可能会遇到什么人际关系的障碍？如何提前规避？
      
输出格式
将以上问题的答案整合为一句完整的话，使用MD格式，如果某一步骤没有以上问题的补充请填写null，并且以温暖、平常的语句输出，不要使用过多专业名词。

必须返回标准JSON数组格式：
[
  {{
    "procedure_number": 1,
    "procedure_content": "步骤内容",
    "social_advice": "社会化建议内容或null"
  }},
  {{
    "procedure_number": 2,
    "procedure_content": "步骤内容",
    "social_advice": "社会化建议内容或null"
  }}
]

只返回JSON数组，不要其他内容。"""

    def _build_ocr_prompt(self) -> str:
        """Build prompt for OCR text extraction"""
        return """你是一个专业的图像文字识别助手。请仔细分析用户上传的图片，提取其中的所有文字内容。

要求：
1. 识别图片中的所有中文和英文文字
2. 保持原有的文字顺序和段落结构
3. 对于表格或列表，尽量保持原有格式
4. 忽略图片中的装饰性元素，只专注于文字内容
5. 如果文字不清楚，请尽力推测并标注[不清楚]
6. 直接输出提取的文字，不需要额外说明

请开始识别图片中的文字内容："""

    # ===================== PUBLIC METHODS =====================

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
    
    def get_user_profile_info(self, user_id: int, db: Session) -> Dict[str, Any]:
        """Get user profile and work relationships for task generation context"""
        try:
            # Get user profile
            profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
            
            # Get work relationships
            relationships = db.query(WorkRelationship).join(UserProfile).filter(
                UserProfile.user_id == user_id
            ).all()
            
            # Build context information
            context = {
                "user_info": {
                    "name": profile.name if profile else "用户",
                    "work_nickname": profile.work_nickname if profile else None,
                    "job_type": profile.job_type if profile else None,
                    "job_level": profile.job_level if profile else None,
                    "is_manager": profile.is_manager if profile else False
                },
                "colleagues": []
            }
            
            # Add colleague information
            for rel in relationships:
                colleague_info = {
                    "name": rel.coworker_name,
                    "work_nickname": rel.work_nickname,
                    "relationship_type": rel.relationship_type,
                    "job_type": rel.job_type,
                    "job_level": rel.job_level
                }
                context["colleagues"].append(colleague_info)
            
            return context
            
        except Exception:
            # Return default context if profile retrieval fails
            return {
                "user_info": {
                    "name": "用户",
                    "work_nickname": None,
                    "job_type": None,
                    "job_level": None,
                    "is_manager": False
                },
                "colleagues": []
            }

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
                    f"{config.get('base_url', 'https://api.openai.com')}/chat/completions",
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
        """Generate structured task from text using AI with user profile context"""
        try:
            # Step 1: Get AI provider
            provider = self.get_active_provider(user_id, db, "text")
            if not provider:
                raise ValueError("No active text AI provider configured")

            # Step 2: Build user context
            user_context = self.get_user_profile_info(user_id, db)
            user_context_string = self._build_user_context_string(user_context)

            # Step 3: Build system prompt
            system_prompt = self._build_task_extraction_prompt(user_context_string)
            user_prompt = f"请从以下文本中提取任务信息：\n\n{text}"

            # Step 4: Make AI request
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
            
            # Dynamic max_tokens based on model type
            max_tokens = self.DEFAULT_MAX_TOKENS
            if "deepseek-reasoner" in provider.config.get("model", ""):
                max_tokens = provider.config.get("max_tokens", 2000)
            else:
                max_tokens = provider.config.get("max_tokens", 1000)

            result = await self._make_ai_request(provider, messages, stream=False, max_tokens_override=max_tokens)

            # Step 5: Extract and parse response
            message = result.get("choices", [{}])[0].get("message", {})
            ai_response = message.get("content", "")
            
            # Log reasoning content for DeepSeek models (but use content for parsing)
            if message.get("reasoning_content"):
                logger.info(f"DeepSeek reasoning: {message.get('reasoning_content')}")
            
            logger.info(f"AI response content: {ai_response}")
            print(f"[DEBUG] Full AI response content:\n{ai_response}")
            print(f"[DEBUG] AI response length: {len(ai_response)}")

            # Step 6: Parse JSON response
            task_data = self._extract_and_clean_json(ai_response)
            logger.info(f"Parsed task data: {task_data}")
            print(f"[DEBUG] Parsed task data type: {type(task_data)}")
            print(f"[DEBUG] Parsed task data: {task_data}")

            # Step 7: Validate and return results
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
            logger.error(f"JSON parsing error: {e}")
            print(f"[DEBUG] JSON parsing failed with error: {e}")
            # Fallback to simple parsing
            fallback_task = self._create_fallback_task(text)
            print(f"[DEBUG] Using fallback task: {fallback_task}")
            return [fallback_task]
                
        except Exception as e:
            # Unified error handling with fallback
            fallback_task = self._create_fallback_task(text)
            return self._handle_ai_error(e, [fallback_task])

    def _create_fallback_task(self, text: str) -> Dict[str, Any]:
        """Create a fallback task when AI processing fails"""
        return {
            "title": text[:8] if len(text) <= 8 else text[:7] + "...",
            "content": text,
            "deadline": None,
            "assignee": None,
            "participant": "你",
            "urgency": "low",
            "importance": "low",
            "difficulty": 5,
            "cost_time_hours": 2.0
        }

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
        
        # Handle cost_time_hours field - can be null or number
        cost_time_raw = task_data.get("cost_time_hours", 2.0)
        if cost_time_raw is None:
            cost_time_hours = 2.0  # Default value when null
        else:
            try:
                cost_time_hours = max(0.1, float(cost_time_raw))  # Minimum 0.1 hours (6 minutes)
            except (ValueError, TypeError):
                cost_time_hours = 2.0  # Default on conversion error
        
        validated_data = {
            "title": title,
            "content": content,
            "deadline": task_data.get("deadline"),
            "assignee": task_data.get("assignee"),
            "participant": task_data.get("participant", "你"),
            "urgency": task_data.get("urgency", "low"),
            "importance": task_data.get("importance", "low"),
            "difficulty": difficulty,
            "cost_time_hours": cost_time_hours
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
            
            # For imageOCR providers, use vision model format with base64 test image
            if provider.provider_type == "imageOCR":
                # Use a simple base64 encoded test image (small PNG with "Test" text)
                # This is a minimal 1x1 transparent PNG for testing API connectivity
                test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
                
                test_messages = [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "请识别这张测试图片中的内容（这是一个连接测试）"
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{test_image_base64}"
                                }
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
        try:
            # Step 1: Get AI provider
            provider = self.get_active_provider(user_id, db, "text")
            if not provider:
                return "新对话"

            # Step 2: Build system prompt
            system_prompt = self._build_title_generation_prompt()
            user_prompt = f"用户消息是：{first_message}"

            # Step 3: Make AI request with appropriate token limits
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
            
            # Dynamic max_tokens for title generation
            model = provider.config.get("model", "gpt-3.5-turbo")
            if "deepseek-reasoner" in model:
                max_tokens = provider.config.get("max_tokens", 3000)  # Reasoning models need more
            else:
                user_max_tokens = provider.config.get("max_tokens", self.TITLE_MAX_TOKENS)
                max_tokens = min(user_max_tokens, self.TITLE_MAX_TOKENS)  # Cap for efficiency

            result = await self._make_ai_request(provider, messages, stream=False, max_tokens_override=max_tokens)

            # Step 4: Extract and clean title
            message = result.get("choices", [{}])[0].get("message", {})
            
            print(f"Title generation response: {result}")
            print(f"Message object: {message}")
            
            # Extract title from content (never from reasoning_content for titles)
            title = ""
            if "content" in message and message["content"]:
                title = message["content"].strip()
                print(f"Found title in content: '{title}'")
            
            # Clean up the title
            import re
            title = re.sub(r'<think>.*?</think>', '', title, flags=re.DOTALL).strip()
            title = title.strip('"').strip("'").strip()
            if len(title) > 10:
                title = title[:10]
            
            print(f"Final cleaned title: '{title}'")
            return title if title else "新对话"

        except Exception as e:
            return self._handle_ai_error(e, "新对话")

    def get_active_image_ocr_provider(self, user_id: int, db: Session) -> Optional[AIProvider]:
        """Get active AI provider specifically for image OCR (using image category)"""
        logger.info(f"Searching for active image OCR provider for user {user_id}")
        
        # Get all image providers for debugging
        all_image_providers = db.query(AIProvider).filter(
            AIProvider.user_id == user_id,
            AIProvider.category == "image"
        ).all()
        
        logger.info(f"Found {len(all_image_providers)} total image providers for user {user_id}")
        for provider in all_image_providers:
            logger.info(f"  Provider {provider.id}: {provider.name}, active={provider.is_active}, category={provider.category}")
        
        active_provider = db.query(AIProvider).filter(
            AIProvider.user_id == user_id,
            AIProvider.is_active == True,
            AIProvider.category == "image"
        ).first()
        
        if active_provider:
            logger.info(f"Active image OCR provider found: {active_provider.name} (ID: {active_provider.id})")
        else:
            logger.warning(f"No active image OCR provider found for user {user_id}")
        
        return active_provider

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
        logger.info(f"Starting AI OCR extraction for user {user_id}")
        provider = self.get_active_image_ocr_provider(user_id, db)
        if not provider:
            logger.error(f"No active AI OCR provider configured for user {user_id}")
            raise ValueError("No active AI OCR provider configured")
        
        logger.info(f"Using AI OCR provider: {provider.name} (model: {provider.config.get('model')})")
        
        try:
            import base64
            from PIL import Image
            from io import BytesIO
            
            # Convert image bytes to base64
            logger.info(f"Converting {len(image_bytes)} bytes to base64...")
            image_base64 = base64.b64encode(image_bytes).decode('utf-8')
            logger.info(f"Base64 conversion complete, length: {len(image_base64)}")
            
            # Detect image format using PIL and set proper Content-Type
            try:
                with BytesIO(image_bytes) as image_buffer:
                    pil_image = Image.open(image_buffer)
                    image_format = pil_image.format.lower() if pil_image.format else 'jpeg'
                    logger.info(f"Detected image format: {image_format}, size: {pil_image.size}")
            except Exception as e:
                # Fallback to jpeg if detection fails
                logger.warning(f"Image format detection failed: {e}, using jpeg fallback")
                image_format = 'jpeg'
            
            content_type_map = {
                'jpeg': 'image/jpeg',
                'jpg': 'image/jpeg', 
                'png': 'image/png',
                'bmp': 'image/bmp',
                'tiff': 'image/tiff',
                'webp': 'image/webp',
                'heic': 'image/heic'
            }
            
            # Default to jpeg if format detection fails
            content_type = content_type_map.get(image_format, 'image/jpeg')
            logger.info(f"Detected image format: {image_format}, content-type: {content_type}")
            
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
            logger.info(f"Provider config - base_url: {config.get('base_url')}, model: {config.get('model')}")
            logger.info(f"API key present: {bool(config.get('api_key'))}")
            
            # Build message with image using proper base64 data URL format
            logger.info("Building multimodal message with image...")
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
                                "url": f"data:{content_type};base64,{image_base64}"
                            }
                        }
                    ]
                }
            ]
            
            timeout = httpx.Timeout(connect=30.0, read=120.0, write=30.0, pool=30.0)
            async with httpx.AsyncClient(timeout=timeout) as client:
                # Build payload using user configuration
                payload = self._build_payload(config, messages, stream=False, max_tokens_override=2000)
                logger.info(f"Built API payload with model: {payload.get('model')}, max_tokens: {payload.get('max_tokens')}")
                
                headers = {
                    "Authorization": f"Bearer {config.get('api_key', '')}",
                    "Content-Type": "application/json"
                }
                
                # Use the exact configured base URL - trust user configuration
                api_url = f"{config.get('base_url', 'https://api.openai.com')}/chat/completions"
                logger.info(f"Making API request to: {api_url}")
                logger.info(f"Request headers: {dict(headers)}")
                logger.info(f"Request payload keys: {list(payload.keys())}")
                logger.info(f"Message structure: {[msg.get('role') for msg in payload.get('messages', [])]}")
                
                try:
                    response = await client.post(
                        api_url,
                        json=payload,
                        headers=headers
                    )
                    logger.info(f"API response status: {response.status_code}")
                except Exception as req_error:
                    logger.error(f"HTTP request failed: {type(req_error).__name__}: {req_error}")
                    logger.error(f"API URL: {api_url}")
                    logger.error(f"Config base_url: {config.get('base_url')}")
                    logger.error(f"Config model: {config.get('model')}")
                    raise
                
                if response.status_code == 200:
                    try:
                        response_data = response.json()
                        logger.info(f"API response keys: {list(response_data.keys())}")
                        
                        if "choices" in response_data and len(response_data["choices"]) > 0:
                            message = response_data["choices"][0]["message"]
                            extracted_text = message.get("content", "").strip()
                            logger.info(f"Extracted text length: {len(extracted_text)}")
                            logger.debug(f"Extracted text preview: {extracted_text[:200]}...")
                            
                            # Clean up the response
                            if extracted_text:
                                logger.info("AI OCR extraction successful")
                                return extracted_text
                            else:
                                logger.error("AI OCR returned empty response")
                                raise ValueError("AI OCR returned empty response")
                        else:
                            logger.error(f"Invalid response format: {response_data}")
                            raise ValueError("Invalid response format from AI OCR")
                    except json.JSONDecodeError as e:
                        logger.error(f"Failed to parse JSON response: {e}")
                        logger.error(f"Raw response: {response.text}")
                        raise ValueError(f"Invalid JSON response from AI OCR: {e}")
                else:
                    error_text = response.text
                    logger.error(f"API error {response.status_code}: {error_text}")
                    raise ValueError(f"AI OCR API error {response.status_code}: {error_text}")
                    
        except Exception as e:
            logger.error(f"AI OCR extraction failed: {str(e)}")
            logger.exception("Full AI OCR error traceback:")
            raise ValueError(f"AI OCR failed: {str(e)}")

    async def generate_task_execution_guidance(self, user_id: int, task_data: Dict[str, Any], db: Session) -> List[Dict[str, Any]]:
        """
        Generate task execution guidance using AI based on task information
        
        Args:
            user_id: User ID to get active provider and context
            task_data: Dict containing task information (content, deadline, assignee, participant, urgency, importance, difficulty)
            db: Database session
            
        Returns:
            List of execution procedures: [{"procedure_number": int, "procedure_content": str, "key_result": str}]
        """
        logger.info(f"Generating task execution guidance for user {user_id}")
        
        provider = self.get_active_provider(user_id, db, "text")
        if not provider:
            raise ValueError("No active text AI provider configured")
        
        # Get user profile and colleague information for context
        user_context = self.get_user_profile_info(user_id, db)
        
        # Build colleague context string
        colleague_context = ""
        if user_context["colleagues"]:
            colleague_names = []
            for colleague in user_context["colleagues"]:
                name_info = colleague["name"]
                if colleague["work_nickname"]:
                    name_info += f"（{colleague['work_nickname']}）"
                name_info += f" - {colleague['relationship_type']}"
                if colleague["job_type"]:
                    name_info += f"，{colleague['job_type']}"
                colleague_names.append(name_info)
            colleague_context = f"\n用户的同事关系：{'; '.join(colleague_names)}"
        
        # Build user info context
        user_info = user_context["user_info"]
        user_info_context = f"""
用户信息：
- 姓名：{user_info['name']}
- 工作昵称：{user_info['work_nickname'] or '无'}
- 职位类型：{user_info['job_type'] or '未知'}
- 职位级别：{user_info['job_level'] or '未知'}
- 管理层：{'是' if user_info['is_manager'] else '否'}{colleague_context}"""
        
        # Build task context
        task_context = f"""
任务信息：
- 任务内容：{task_data.get('content', '')}
- 截止时间：{task_data.get('deadline') or '无'}
- 提出人：{task_data.get('assignee') or '无'}
- 参与人员：{task_data.get('participant', '你')}
- 紧急度：{task_data.get('urgency', 'low')}
- 重要性：{task_data.get('importance', 'low')}
- 难度等级：{task_data.get('difficulty', 5)}/10"""
        
        # Enhanced AI prompt for task execution guidance
        system_prompt = f"""# 角色定义
你是一位专业的项目管理专家和工作执行顾问，精通SMART、RACI等多种项目管理方法论。你的思维极度结构化、逻辑严谨，并始终以任务的结果目标为导向。

# 核心任务
你的唯一目标是将用户提出的一个复杂职场任务，分解成一个清晰、有序、可执行的步骤序列。你必须完全忽略所有关于人员性格、情绪或人际关系的软性信息，只做任务涉及人员和资源识别与排布。

{user_info_context}

{task_context}

# 分析要求
你需要：
1. 分析目标：深入理解该任务的核心目标和最终要达成的关键结果（Key Results）
2. 识别关键阶段：将实现该目标划分为几个逻辑上连续的关键阶段
3. 分解具备可操作性的具体步骤：在每个阶段下，拆分出具体的、可操作的执行步骤
4. 明确产出物：为关键步骤指明需要产出的具体成果
5. 简单任务控制在5个步骤内，复杂任务不超过10个步骤，细碎的步骤进行整合。

# 严格禁止
绝对不要提供任何关于沟通方式、说服技巧、如何与人相处或考虑他人感受的建议。你的输出必须是100%客观的任务清单。

# 输出格式要求
必须返回标准JSON数组格式，每个步骤包含：procedure_number（从1开始的序号）、procedure_content（步骤内容）、key_result（关键结果）

示例格式：
[
  {{
    "procedure_number": 1,
    "procedure_content": "收集项目相关的技术资料和竞品分析数据",
    "key_result": "完成一份包含技术可行性和市场竞品对比的分析报告"
  }},
  {{
    "procedure_number": 2,
    "procedure_content": "设计项目方案并制作管理层汇报材料",
    "key_result": "制作一份面向管理层的PPT提案，包含项目目标、实施计划和预算需求"
  }}
]

只返回JSON数组，不要其他内容。"""
        
        user_prompt = "请基于以上任务信息，生成详细的执行步骤指导。"
        
        try:
            config = provider.config
            
            # Set 5 minutes timeout for AI requests
            timeout = httpx.Timeout(connect=30.0, read=300.0, write=30.0, pool=30.0)
            async with httpx.AsyncClient(timeout=timeout) as client:
                # Build payload using user configuration
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
                
                # Use appropriate token limits for task execution guidance
                max_tokens_for_execution = None
                if "deepseek-reasoner" in config.get("model", ""):
                    max_tokens_for_execution = config.get("max_tokens", 3000)
                else:
                    max_tokens_for_execution = config.get("max_tokens", 2000)
                
                payload = self._build_payload(config, messages, stream=False, max_tokens_override=max_tokens_for_execution)
                
                headers = {
                    "Authorization": f"Bearer {config.get('api_key', '')}",
                    "Content-Type": "application/json"
                }
                
                response = await client.post(
                    f"{config.get('base_url', 'https://api.openai.com')}/chat/completions",
                    json=payload,
                    headers=headers
                )
                
                if response.status_code != 200:
                    error_text = response.text
                    logger.error(f"AI API error {response.status_code}: {error_text}")
                    raise Exception(f"AI API error {response.status_code}: {error_text}")
                
                result = response.json()
                message = result.get("choices", [{}])[0].get("message", {})
                ai_response = message.get("content", "")
                
                # Log reasoning content for DeepSeek models (but use content for parsing)
                if message.get("reasoning_content"):
                    logger.info(f"DeepSeek reasoning: {message.get('reasoning_content')}")
                
                logger.info(f"AI execution guidance response: {ai_response}")
                
                # Try to parse JSON from AI response
                try:
                    import re
                    
                    # Extract JSON from response (handle markdown code blocks)
                    markdown_match = re.search(r'```(?:json)?\s*(\[.*?\])\s*```', ai_response, re.DOTALL)
                    if markdown_match:
                        json_str = markdown_match.group(1)
                        logger.info(f"Extracted JSON from markdown: {json_str}")
                    else:
                        # Fallback to direct JSON extraction
                        json_match = re.search(r'(\[.*?\])', ai_response, re.DOTALL)
                        if json_match:
                            json_str = json_match.group()
                            logger.info(f"Extracted JSON directly: {json_str}")
                        else:
                            raise ValueError("No JSON array found in response")
                    
                    # Clean up JavaScript-style comments that are invalid in JSON
                    json_str = re.sub(r'//.*?(?=\n|$)', '', json_str, flags=re.MULTILINE)
                    json_str = re.sub(r'/\*.*?\*/', '', json_str, flags=re.DOTALL)
                    json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
                    
                    procedures_data = json.loads(json_str)
                    logger.info(f"Parsed procedures data: {procedures_data}")
                    
                    # Validate the structure
                    if isinstance(procedures_data, list):
                        validated_procedures = []
                        for i, procedure in enumerate(procedures_data):
                            validated_procedure = {
                                "procedure_number": procedure.get("procedure_number", i + 1),
                                "procedure_content": procedure.get("procedure_content", ""),
                                "key_result": procedure.get("key_result", "")
                            }
                            validated_procedures.append(validated_procedure)
                        
                        logger.info(f"Generated {len(validated_procedures)} execution procedures")
                        return validated_procedures
                    else:
                        raise ValueError("Response is not a JSON array")
                        
                except (json.JSONDecodeError, ValueError) as e:
                    logger.error(f"JSON parsing error: {e}, AI response: {ai_response}")
                    # Fallback to simple procedure if AI response is invalid
                    fallback_procedures = [{
                        "procedure_number": 1,
                        "procedure_content": f"执行任务：{task_data.get('content', '')}",
                        "key_result": "完成任务目标"
                    }]
                    logger.info("Using fallback procedures due to parsing error")
                    return fallback_procedures
                    
        except Exception as e:
            import traceback
            logger.error(f"Task execution guidance generation failed: {e}")
            logger.error(f"Full traceback: {traceback.format_exc()}")
            # Fallback to simple procedure if AI service fails
            fallback_procedures = [{
                "procedure_number": 1,
                "procedure_content": f"执行任务：{task_data.get('content', '')}",
                "key_result": "完成任务目标"
            }]
            logger.info("Using fallback procedures due to service error")
            return fallback_procedures

    def get_colleague_personality_info(self, user_id: int, colleague_names: List[str], db: Session) -> List[Dict[str, Any]]:
        """Get detailed personality info for specific colleagues involved in a task"""
        try:
            # Get user profile
            profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
            if not profile:
                return []
            
            # Get colleagues by name
            colleagues = db.query(WorkRelationship).filter(
                WorkRelationship.user_profile_id == profile.id,
                WorkRelationship.coworker_name.in_(colleague_names)
            ).all()
            
            colleague_info = []
            for colleague in colleagues:
                # Build personality description from Big Five tags
                personality_desc = []
                
                # Openness (经验开放性)
                if colleague.personality_openness:
                    openness_tags = ', '.join(colleague.personality_openness)
                    personality_desc.append(f"经验开放性: {openness_tags}")
                
                # Conscientiousness (尽责性)
                if colleague.personality_conscientiousness:
                    conscientiousness_tags = ', '.join(colleague.personality_conscientiousness)
                    personality_desc.append(f"尽责性: {conscientiousness_tags}")
                
                # Extraversion (外向性)
                if colleague.personality_extraversion:
                    extraversion_tags = ', '.join(colleague.personality_extraversion)
                    personality_desc.append(f"外向性: {extraversion_tags}")
                
                # Agreeableness (宜人性)
                if colleague.personality_agreeableness:
                    agreeableness_tags = ', '.join(colleague.personality_agreeableness)
                    personality_desc.append(f"宜人性: {agreeableness_tags}")
                
                # Neuroticism (神经质)
                if colleague.personality_neuroticism:
                    neuroticism_tags = ', '.join(colleague.personality_neuroticism)
                    personality_desc.append(f"神经质: {neuroticism_tags}")
                
                colleague_personality = '; '.join(personality_desc) if personality_desc else '未设置'
                
                colleague_info.append({
                    "name": colleague.coworker_name,
                    "work_nickname": colleague.work_nickname,
                    "job_type": colleague.job_type,
                    "job_level": colleague.job_level,
                    "relationship_type": colleague.relationship_type,
                    "personality_description": colleague_personality
                })
            
            return colleague_info
            
        except Exception as e:
            logger.error(f"Error getting colleague personality info: {e}")
            return []

    async def generate_social_advice(self, user_id: int, task_data: Dict[str, Any], execution_procedures: List[Dict[str, Any]], db: Session) -> List[Dict[str, Any]]:
        """
        Generate social advice for task execution based on user profile, colleague personalities, and execution procedures
        
        Args:
            user_id: User ID to get active provider and context
            task_data: Dict containing task information (content, deadline, assignee, participant, urgency, importance, difficulty)
            execution_procedures: List of execution procedures from previous AI generation
            db: Database session
            
        Returns:
            List of social advice: [{"procedure_number": int, "procedure_content": str, "social_advice": str}]
        """
        logger.info(f"Generating social advice for user {user_id}")
        
        provider = self.get_active_provider(user_id, db, "text")
        if not provider:
            raise ValueError("No active text AI provider configured")
        
        # Get user profile and colleague information for context
        user_context = self.get_user_profile_info(user_id, db)
        
        # Extract colleague names from task participants and assignee
        colleague_names = []
        if task_data.get('assignee') and task_data['assignee'] != '你':
            colleague_names.append(task_data['assignee'])
        if task_data.get('participant') and task_data['participant'] != '你':
            # Handle comma-separated participants
            participants = [p.strip() for p in task_data['participant'].split(',')]
            for participant in participants:
                if participant != '你' and participant not in colleague_names:
                    colleague_names.append(participant)
        
        # Get detailed colleague personality information
        colleague_personalities = self.get_colleague_personality_info(user_id, colleague_names, db)
        
        # Build user personality description
        user_profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        user_personality_desc = "未设置"
        if user_profile:
            personality_parts = []
            if user_profile.personality_openness:
                personality_parts.append(f"经验开放性: {', '.join(user_profile.personality_openness)}")
            if user_profile.personality_conscientiousness:
                personality_parts.append(f"尽责性: {', '.join(user_profile.personality_conscientiousness)}")
            if user_profile.personality_extraversion:
                personality_parts.append(f"外向性: {', '.join(user_profile.personality_extraversion)}")
            if user_profile.personality_agreeableness:
                personality_parts.append(f"宜人性: {', '.join(user_profile.personality_agreeableness)}")
            if user_profile.personality_neuroticism:
                personality_parts.append(f"神经质: {', '.join(user_profile.personality_neuroticism)}")
            if personality_parts:
                user_personality_desc = '; '.join(personality_parts)
        
        # Build user info context
        user_info = user_context["user_info"]
        user_info_context = f"""
用户:
  姓名: {user_info['name']}
  工作昵称：{user_info['work_nickname'] or '无'}
  职位：{user_info['job_type'] or '未知'}
  职级：{user_info['job_level'] or '未知'}
  大五人格标签: {user_personality_desc}"""
        
        # Build colleague context
        colleague_context = ""
        if colleague_personalities:
            colleague_context = "\n任务卡片相关参与人:"
            for colleague in colleague_personalities:
                colleague_context += f"""
  姓名: {colleague['name']}
  职位: {colleague['job_type'] or '未知'}
  职级：{colleague['job_level'] or '未知'}
  与我的关系: {colleague['relationship_type']}
  性格描述/标签: {colleague['personality_description']}"""
        
        # Build execution procedures context
        procedures_context = ""
        if execution_procedures:
            procedures_context = "\n待优化的行动计划:"
            for proc in execution_procedures:
                procedures_context += f"\n{proc['procedure_number']}. {proc['procedure_content']}"
        
        # Build task context
        task_context = f"""
任务信息：
- 任务内容：{task_data.get('content', '')}
- 截止时间：{task_data.get('deadline') or '无'}
- 提出人：{task_data.get('assignee') or '无'}
- 参与人员：{task_data.get('participant', '你')}"""
        
        # Social advice AI prompt
        system_prompt = f"""角色
你是一位顶级的组织心理学家和职场情商教练，尤其擅长应用大五人格（Big Five/OCEAN）等心理学模型来解决复杂的职场人际动态问题。你具有极高的情商和同理心。

核心任务
你的任务是接收一个已经制定好的客观行动计划，并为其中的每一步注入深刻的社会化智慧。你需要分析计划中涉及人员的性格特点，并评估实际的实现可能，进而提供具体的、可操作的沟通和行为建议，以提高计划的成功率。

输入信息
你将接收到以下两部分信息：

1. 人物性格档案:{user_info_context}{colleague_context}
    
2. 待优化的行动计划:{procedures_context}

处理指令
第一步：人格特质推断
  对于档案中的每一个人（包括用户自己），首先根据其"性格描述/标签"文本，推断出其在大五人格（OCEAN）模型中可能的倾向。
  以一个简洁的摘要形式在内部进行分析（例如：老板 - 责任心(高)、外向性(中)、神经质(低)；财务负责人 - 责任心(极高)、开放性(低)）。你不需要直接输出这个分析表，但必须在后续建议中运用它。
    
第二步：逐条丰富计划
  严格按照输入的行动计划编号，逐一分析每个步骤。
  对于每个步骤，结合你对关键人物性格的推断，提供深入的"社会化建议补充"。
    
第三步：提供具体建议
  在"社会化建议补充"中，必须回答以下问题：
    关键互动对象： 这个步骤主要需要和谁打交道？
    可能的反应预测： 基于此人的性格，他们对这一步最可能的正面和负面反应是什么？
    最佳沟通策略：
      应该选择什么沟通渠道（办公聊天软件、线下会议、非正式聊天、邮件或是其他方式）？
      沟通时，应该如何组织语言和论据才能最大化地被对方接受？（例如："对老板，要先说结论和收益，后附数据；对财务，要先展示风险控制和详细数据;对运营，要先说关键问题和解决方案"）
      应该强调什么，避免什么？
    潜在的社交陷阱： 在这个步骤中，可能会遇到什么人际关系的障碍？如何提前规避？
      
输出格式
将以上问题的答案整合为一句完整的话，使用MD格式，如果某一步骤没有以上问题的补充请填写null，并且以温暖、平常的语句输出，不要使用过多专业名词。

必须返回标准JSON数组格式：
[
  {{
    "procedure_number": 1,
    "procedure_content": "步骤内容",
    "social_advice": "社会化建议内容或null"
  }},
  {{
    "procedure_number": 2,
    "procedure_content": "步骤内容",
    "social_advice": "社会化建议内容或null"
  }}
]

只返回JSON数组，不要其他内容。"""
        
        user_prompt = "请基于以上信息，为每个执行步骤提供社会化建议。"
        
        try:
            config = provider.config
            
            # Set 5 minutes timeout for AI requests
            timeout = httpx.Timeout(connect=30.0, read=300.0, write=30.0, pool=30.0)
            async with httpx.AsyncClient(timeout=timeout) as client:
                # Build payload using user configuration
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
                
                # Use appropriate token limits for social advice generation
                max_tokens_for_social = None
                if "deepseek-reasoner" in config.get("model", ""):
                    max_tokens_for_social = config.get("max_tokens", 4000)
                else:
                    max_tokens_for_social = config.get("max_tokens", 3000)
                
                payload = self._build_payload(config, messages, stream=False, max_tokens_override=max_tokens_for_social)
                
                headers = {
                    "Authorization": f"Bearer {config.get('api_key', '')}",
                    "Content-Type": "application/json"
                }
                
                response = await client.post(
                    f"{config.get('base_url', 'https://api.openai.com')}/chat/completions",
                    json=payload,
                    headers=headers
                )
                
                if response.status_code != 200:
                    error_text = response.text
                    logger.error(f"AI API error {response.status_code}: {error_text}")
                    raise Exception(f"AI API error {response.status_code}: {error_text}")
                
                result = response.json()
                message = result.get("choices", [{}])[0].get("message", {})
                ai_response = message.get("content", "")
                
                # Log reasoning content for DeepSeek models (but use content for parsing)
                if message.get("reasoning_content"):
                    logger.info(f"DeepSeek reasoning: {message.get('reasoning_content')}")
                
                logger.info(f"AI social advice response: {ai_response}")
                
                # Try to parse JSON from AI response
                try:
                    import re
                    
                    # Extract JSON from response (handle markdown code blocks)
                    markdown_match = re.search(r'```(?:json)?\s*(\[.*?\])\s*```', ai_response, re.DOTALL)
                    if markdown_match:
                        json_str = markdown_match.group(1)
                        logger.info(f"Extracted JSON from markdown: {json_str}")
                    else:
                        # Fallback to direct JSON extraction
                        json_match = re.search(r'(\[.*?\])', ai_response, re.DOTALL)
                        if json_match:
                            json_str = json_match.group()
                            logger.info(f"Extracted JSON directly: {json_str}")
                        else:
                            raise ValueError("No JSON array found in response")
                    
                    # Clean up JavaScript-style comments that are invalid in JSON
                    json_str = re.sub(r'//.*?(?=\n|$)', '', json_str, flags=re.MULTILINE)
                    json_str = re.sub(r'/\*.*?\*/', '', json_str, flags=re.DOTALL)
                    json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
                    
                    social_advice_data = json.loads(json_str)
                    logger.info(f"Parsed social advice data: {social_advice_data}")
                    
                    # Validate the structure
                    if isinstance(social_advice_data, list):
                        validated_advice = []
                        for i, advice in enumerate(social_advice_data):
                            validated_advice_item = {
                                "procedure_number": advice.get("procedure_number", i + 1),
                                "procedure_content": advice.get("procedure_content", ""),
                                "social_advice": advice.get("social_advice", "null")
                            }
                            validated_advice.append(validated_advice_item)
                        
                        logger.info(f"Generated {len(validated_advice)} social advice items")
                        return validated_advice
                    else:
                        raise ValueError("Response is not a JSON array")
                        
                except (json.JSONDecodeError, ValueError) as e:
                    logger.error(f"JSON parsing error: {e}, AI response: {ai_response}")
                    # Fallback to simple advice if AI response is invalid
                    fallback_advice = []
                    for proc in execution_procedures:
                        fallback_advice.append({
                            "procedure_number": proc["procedure_number"],
                            "procedure_content": proc["procedure_content"],
                            "social_advice": "null"
                        })
                    logger.info("Using fallback advice due to parsing error")
                    return fallback_advice
                    
        except Exception as e:
            import traceback
            logger.error(f"Social advice generation failed: {e}")
            logger.error(f"Full traceback: {traceback.format_exc()}")
            # Fallback to simple advice if AI service fails
            fallback_advice = []
            for proc in execution_procedures:
                fallback_advice.append({
                    "procedure_number": proc["procedure_number"],
                    "procedure_content": proc["procedure_content"],
                    "social_advice": "null"
                })
            logger.info("Using fallback advice due to service error")
            return fallback_advice

ai_service_sqlite = AIServiceSQLite()