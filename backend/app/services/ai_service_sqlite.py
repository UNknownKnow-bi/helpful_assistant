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

    async def generate_task_from_text(self, user_id: int, text: str, db: Session) -> Dict[str, Any]:
        """Generate structured task from text using AI"""
        provider = self.get_active_provider(user_id, db)
        if not provider:
            raise ValueError("No active AI provider configured")

        # Simple fallback task parsing for now
        return {
            "content": text,
            "deadline": None,
            "assignee": None,
            "priority": "medium",
            "difficulty": 5
        }

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

ai_service_sqlite = AIServiceSQLite()