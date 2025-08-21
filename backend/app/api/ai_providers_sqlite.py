from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
from app.models.sqlite_models import User
from app.models.sqlite_models import AIProviderCreate, AIProviderUpdate, AIProviderResponse
from app.database.sqlite_models import AIProvider as SQLiteAIProvider
from app.core.auth_sqlite import get_current_user
from app.database.sqlite_connection import get_database
from app.services.ai_service_sqlite import ai_service_sqlite
from datetime import datetime

router = APIRouter(prefix="/ai-providers", tags=["AI Providers"])

def get_db_sync():
    """Get synchronous database session"""
    from app.database.sqlite_connection import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("", response_model=AIProviderResponse)
async def create_ai_provider(
    provider_create: AIProviderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_sync)
):
    """Create a new AI provider configuration"""
    # Auto-set category based on provider_type if not provided
    category = provider_create.category
    if not category:
        category = "image" if provider_create.provider_type == "imageOCR" else "text"
    
    # Create new AI provider
    db_provider = SQLiteAIProvider(
        user_id=current_user.id,
        name=provider_create.name,
        provider_type=provider_create.provider_type,
        category=category,
        config=provider_create.config,
        is_active=False,
        created_at=datetime.utcnow()
    )
    
    db.add(db_provider)
    db.commit()
    db.refresh(db_provider)
    
    return AIProviderResponse(
        id=db_provider.id,
        name=db_provider.name,
        provider_type=db_provider.provider_type,
        category=db_provider.category,
        config=db_provider.config,
        is_active=db_provider.is_active,
        last_tested=db_provider.last_tested,
        created_at=db_provider.created_at
    )

@router.get("", response_model=List[AIProviderResponse])
async def get_ai_providers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_sync)
):
    """Get all AI providers for the current user"""
    providers = db.query(SQLiteAIProvider).filter(
        SQLiteAIProvider.user_id == current_user.id
    ).all()
    
    return [
        AIProviderResponse(
            id=provider.id,
            name=provider.name,
            provider_type=provider.provider_type,
            category=provider.category,
            config=provider.config,
            is_active=provider.is_active,
            last_tested=provider.last_tested,
            created_at=provider.created_at
        )
        for provider in providers
    ]

@router.put("/{provider_id}", response_model=AIProviderResponse)
async def update_ai_provider(
    provider_id: int,
    provider_update: AIProviderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_sync)
):
    """Update an AI provider configuration"""
    # Get the provider
    db_provider = db.query(SQLiteAIProvider).filter(
        SQLiteAIProvider.id == provider_id,
        SQLiteAIProvider.user_id == current_user.id
    ).first()
    
    if not db_provider:
        raise HTTPException(status_code=404, detail="AI provider not found")
    
    # Update fields
    update_data = provider_update.dict(exclude_unset=True)
    
    # Allow multiple active models per category - no need to deactivate others
    # Just update this provider's status without affecting others
    
    # Apply updates
    for field, value in update_data.items():
        setattr(db_provider, field, value)
    
    db.commit()
    db.refresh(db_provider)
    
    return AIProviderResponse(
        id=db_provider.id,
        name=db_provider.name,
        provider_type=db_provider.provider_type,
        category=db_provider.category,
        config=db_provider.config,
        is_active=db_provider.is_active,
        last_tested=db_provider.last_tested,
        created_at=db_provider.created_at
    )

@router.post("/{provider_id}/test")
async def test_ai_provider(
    provider_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_sync)
):
    """Test an AI provider configuration"""
    # Get the provider
    db_provider = db.query(SQLiteAIProvider).filter(
        SQLiteAIProvider.id == provider_id,
        SQLiteAIProvider.user_id == current_user.id
    ).first()
    
    if not db_provider:
        raise HTTPException(status_code=404, detail="AI provider not found")
    
    # Convert to Pydantic model for service
    from app.models.sqlite_models import AIProvider
    provider = AIProvider(
        id=db_provider.id,
        user_id=db_provider.user_id,
        name=db_provider.name,
        provider_type=db_provider.provider_type,
        config=db_provider.config,
        is_active=db_provider.is_active,
        last_tested=db_provider.last_tested,
        created_at=db_provider.created_at
    )
    
    test_result = await ai_service_sqlite.test_provider(provider)
    
    # Update last_tested timestamp
    db_provider.last_tested = datetime.utcnow()
    db.commit()
    
    return test_result

@router.delete("/{provider_id}")
async def delete_ai_provider(
    provider_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_sync)
):
    """Delete an AI provider configuration"""
    # Get the provider
    db_provider = db.query(SQLiteAIProvider).filter(
        SQLiteAIProvider.id == provider_id,
        SQLiteAIProvider.user_id == current_user.id
    ).first()
    
    if not db_provider:
        raise HTTPException(status_code=404, detail="AI provider not found")
    
    # If this was the active provider, update user's active provider for this category
    if db_provider.is_active:
        from app.database.sqlite_models import User as SQLiteUser
        if db_provider.category == "text":
            db.query(SQLiteUser).filter(
                SQLiteUser.id == current_user.id
            ).update({"active_text_provider_id": None})
        elif db_provider.category == "image":
            db.query(SQLiteUser).filter(
                SQLiteUser.id == current_user.id
            ).update({"active_image_provider_id": None})
    
    # Delete the provider
    db.delete(db_provider)
    db.commit()
    
    return {"message": "AI provider deleted successfully"}

@router.get("/active/{category}", response_model=AIProviderResponse)
async def get_active_provider_by_category(
    category: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_sync)
):
    """Get the active AI provider for a specific category"""
    if category not in ["text", "image"]:
        raise HTTPException(status_code=400, detail="Invalid category. Must be 'text' or 'image'")
    
    db_provider = db.query(SQLiteAIProvider).filter(
        SQLiteAIProvider.user_id == current_user.id,
        SQLiteAIProvider.category == category,
        SQLiteAIProvider.is_active == True
    ).first()
    
    if not db_provider:
        raise HTTPException(status_code=404, detail=f"No active {category} AI provider found")
    
    return AIProviderResponse(
        id=db_provider.id,
        name=db_provider.name,
        provider_type=db_provider.provider_type,
        category=db_provider.category,
        config=db_provider.config,
        is_active=db_provider.is_active,
        last_tested=db_provider.last_tested,
        created_at=db_provider.created_at
    )

@router.get("/text-models", response_model=List[AIProviderResponse])
async def get_available_text_models(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_sync)
):
    """Get all ACTIVE text models for chat selection"""
    providers = db.query(SQLiteAIProvider).filter(
        SQLiteAIProvider.user_id == current_user.id,
        SQLiteAIProvider.category == "text",
        SQLiteAIProvider.is_active == True
    ).all()
    
    return [
        AIProviderResponse(
            id=provider.id,
            name=provider.name,
            provider_type=provider.provider_type,
            category=provider.category,
            config=provider.config,
            is_active=provider.is_active,
            last_tested=provider.last_tested,
            created_at=provider.created_at
        )
        for provider in providers
    ]

@router.get("/active", response_model=AIProviderResponse)
async def get_active_provider(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_sync)
):
    """Get the active text AI provider for backward compatibility"""
    return await get_active_provider_by_category("text", current_user, db)