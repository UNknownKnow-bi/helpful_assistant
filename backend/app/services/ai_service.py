from typing import AsyncGenerator, Dict, Any, Optional
from app.database.connection import get_database
from app.models.ai_provider import AIProvider
from app.models.user import PyObjectId
import json
import re
import httpx

class AIService:
    def __init__(self):
        self.models_cache = {}

    async def get_active_provider(self, user_id: PyObjectId) -> Optional[AIProvider]:
        db = get_database()
        provider_doc = await db.ai_providers.find_one({
            "user_id": user_id,
            "is_active": True
        })
        if provider_doc:
            return AIProvider(**provider_doc)
        return None

    async def chat_stream(self, user_id: PyObjectId, messages: list[Dict[str, str]]) -> AsyncGenerator[Dict[str, Any], None]:
        provider = await self.get_active_provider(user_id)
        if not provider:
            yield {"error": "No active AI provider configured"}
            return

        try:
            config = provider.config
            async with httpx.AsyncClient() as client:
                # Simple HTTP streaming implementation
                response = await client.post(
                    f"{config.get('base_url', 'https://api.openai.com')}/v1/chat/completions",
                    json={
                        "model": config.get("model", "gpt-3.5-turbo"),
                        "messages": messages,
                        "stream": True,
                        "temperature": config.get("temperature", 0.7),
                        "max_tokens": config.get("max_tokens", 1000)
                    },
                    headers={
                        "Authorization": f"Bearer {config.get('api_key', '')}",
                        "Content-Type": "application/json"
                    }
                )
                
                if response.status_code == 200:
                    async for chunk in response.aiter_text():
                        if chunk.strip():
                            yield {"type": "content", "content": chunk}
                    yield {"type": "done"}
                else:
                    yield {"error": f"API error: {response.status_code}"}

        except Exception as e:
            yield {"error": f"AI service error: {str(e)}"}

    async def generate_task_from_text(self, user_id: PyObjectId, text: str) -> Dict[str, Any]:
        provider = await self.get_active_provider(user_id)
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
        try:
            config = provider.config
            async with httpx.AsyncClient() as client:
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
                    return {
                        "success": False,
                        "message": f"Provider test failed: HTTP {response.status_code}"
                    }
        except Exception as e:
            return {
                "success": False,
                "message": f"Provider test failed: {str(e)}"
            }

ai_service = AIService()