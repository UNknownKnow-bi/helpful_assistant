from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.models.user import User
from app.models.ai_provider import AIProvider, AIProviderCreate, AIProviderUpdate, AIProviderResponse
from app.core.auth import get_current_user
from app.database.connection import get_database
from app.services.ai_service import ai_service
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/ai-providers", tags=["ai_providers"])

@router.post("", response_model=AIProviderResponse)
async def create_ai_provider(
    provider_create: AIProviderCreate,
    current_user: User = Depends(get_current_user)
):
    db = get_database()
    
    provider_dict = {
        "user_id": current_user.id,
        "name": provider_create.name,
        "provider_type": provider_create.provider_type,
        "config": provider_create.config,
        "is_active": False,
        "created_at": datetime.utcnow()
    }
    
    result = await db.ai_providers.insert_one(provider_dict)
    provider_dict["_id"] = result.inserted_id
    
    return AIProviderResponse(
        id=str(result.inserted_id),
        name=provider_dict["name"],
        provider_type=provider_dict["provider_type"],
        config=provider_dict["config"],
        is_active=provider_dict["is_active"],
        created_at=provider_dict["created_at"]
    )

@router.get("", response_model=List[AIProviderResponse])
async def get_ai_providers(current_user: User = Depends(get_current_user)):
    db = get_database()
    
    providers = await db.ai_providers.find(
        {"user_id": current_user.id}
    ).to_list(100)
    
    return [
        AIProviderResponse(
            id=str(provider["_id"]),
            name=provider["name"],
            provider_type=provider["provider_type"],
            config=provider["config"],
            is_active=provider["is_active"],
            last_tested=provider.get("last_tested"),
            created_at=provider["created_at"]
        )
        for provider in providers
    ]

@router.put("/{provider_id}", response_model=AIProviderResponse)
async def update_ai_provider(
    provider_id: str,
    provider_update: AIProviderUpdate,
    current_user: User = Depends(get_current_user)
):
    db = get_database()
    
    update_data = {k: v for k, v in provider_update.dict().items() if v is not None}
    
    # If setting as active, deactivate others
    if update_data.get("is_active", False):
        await db.ai_providers.update_many(
            {"user_id": current_user.id},
            {"$set": {"is_active": False}}
        )
        
        # Update user's active provider
        await db.users.update_one(
            {"_id": current_user.id},
            {"$set": {"active_ai_provider_id": ObjectId(provider_id)}}
        )
    
    result = await db.ai_providers.update_one(
        {"_id": ObjectId(provider_id), "user_id": current_user.id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="AI provider not found")
    
    updated_provider = await db.ai_providers.find_one({
        "_id": ObjectId(provider_id),
        "user_id": current_user.id
    })
    
    return AIProviderResponse(
        id=str(updated_provider["_id"]),
        name=updated_provider["name"],
        provider_type=updated_provider["provider_type"],
        config=updated_provider["config"],
        is_active=updated_provider["is_active"],
        last_tested=updated_provider.get("last_tested"),
        created_at=updated_provider["created_at"]
    )

@router.post("/{provider_id}/test")
async def test_ai_provider(
    provider_id: str,
    current_user: User = Depends(get_current_user)
):
    db = get_database()
    
    provider_doc = await db.ai_providers.find_one({
        "_id": ObjectId(provider_id),
        "user_id": current_user.id
    })
    
    if not provider_doc:
        raise HTTPException(status_code=404, detail="AI provider not found")
    
    provider = AIProvider(**provider_doc)
    test_result = await ai_service.test_provider(provider)
    
    # Update last_tested timestamp
    await db.ai_providers.update_one(
        {"_id": ObjectId(provider_id)},
        {"$set": {"last_tested": datetime.utcnow()}}
    )
    
    return test_result

@router.get("/active", response_model=AIProviderResponse)
async def get_active_provider(current_user: User = Depends(get_current_user)):
    db = get_database()
    
    provider_doc = await db.ai_providers.find_one({
        "user_id": current_user.id,
        "is_active": True
    })
    
    if not provider_doc:
        raise HTTPException(status_code=404, detail="No active AI provider found")
    
    return AIProviderResponse(
        id=str(provider_doc["_id"]),
        name=provider_doc["name"],
        provider_type=provider_doc["provider_type"],
        config=provider_doc["config"],
        is_active=provider_doc["is_active"],
        last_tested=provider_doc.get("last_tested"),
        created_at=provider_doc["created_at"]
    )