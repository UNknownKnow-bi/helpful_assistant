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

router = APIRouter(prefix="/ai-providers", tags=["ai_providers"])

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
    # Create new AI provider
    db_provider = SQLiteAIProvider(
        user_id=current_user.id,
        name=provider_create.name,
        provider_type=provider_create.provider_type,
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
    
    # If setting as active, deactivate others
    if update_data.get("is_active", False):
        db.query(SQLiteAIProvider).filter(
            SQLiteAIProvider.user_id == current_user.id
        ).update({"is_active": False})
        
        # Update user's active provider
        from app.database.sqlite_models import User as SQLiteUser
        db.query(SQLiteUser).filter(
            SQLiteUser.id == current_user.id
        ).update({"active_ai_provider_id": provider_id})
    
    # Apply updates
    for field, value in update_data.items():
        setattr(db_provider, field, value)
    
    db.commit()
    db.refresh(db_provider)
    
    return AIProviderResponse(
        id=db_provider.id,
        name=db_provider.name,
        provider_type=db_provider.provider_type,
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

@router.get("/active", response_model=AIProviderResponse)
async def get_active_provider(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_sync)
):
    """Get the active AI provider for the current user"""
    db_provider = db.query(SQLiteAIProvider).filter(
        SQLiteAIProvider.user_id == current_user.id,
        SQLiteAIProvider.is_active == True
    ).first()
    
    if not db_provider:
        raise HTTPException(status_code=404, detail="No active AI provider found")
    
    return AIProviderResponse(
        id=db_provider.id,
        name=db_provider.name,
        provider_type=db_provider.provider_type,
        config=db_provider.config,
        is_active=db_provider.is_active,
        last_tested=db_provider.last_tested,
        created_at=db_provider.created_at
    )