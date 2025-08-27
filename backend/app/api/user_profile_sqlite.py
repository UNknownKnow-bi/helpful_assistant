from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.database.sqlite_connection import SessionLocal
from app.database.sqlite_models import UserProfile as UserProfileModel, WorkRelationship as WorkRelationshipModel, User
from app.models.sqlite_models import (
    UserProfileCreate, UserProfileUpdate, UserProfileResponse, UserProfile,
    WorkRelationshipCreate, WorkRelationshipUpdate, WorkRelationshipResponse, WorkRelationship
)
from app.core.auth_sqlite import get_current_user

router = APIRouter(prefix="/profile", tags=["User Profile"])

def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# User Profile Endpoints
@router.get("/", response_model=UserProfileResponse)
async def get_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's profile"""
    profile = db.query(UserProfileModel).filter(UserProfileModel.user_id == current_user.id).first()
    
    if not profile:
        # Create empty profile if doesn't exist
        profile = UserProfileModel(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    return profile

@router.post("/", response_model=UserProfileResponse)
async def create_or_update_profile(
    profile_data: UserProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or update user profile"""
    existing_profile = db.query(UserProfileModel).filter(UserProfileModel.user_id == current_user.id).first()
    
    if existing_profile:
        # Update existing profile
        for field, value in profile_data.model_dump(exclude_unset=True).items():
            setattr(existing_profile, field, value)
        
        db.commit()
        db.refresh(existing_profile)
        return existing_profile
    else:
        # Create new profile
        profile = UserProfileModel(
            user_id=current_user.id,
            **profile_data.model_dump(exclude_unset=True)
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return profile

@router.put("/", response_model=UserProfileResponse)
async def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user profile"""
    profile = db.query(UserProfileModel).filter(UserProfileModel.user_id == current_user.id).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    
    # Update only provided fields
    update_data = profile_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)
    
    db.commit()
    db.refresh(profile)
    return profile


# Work Relationship Endpoints
@router.get("/relationships", response_model=List[WorkRelationshipResponse])
async def get_work_relationships(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all work relationships for current user"""
    profile = db.query(UserProfileModel).filter(UserProfileModel.user_id == current_user.id).first()
    
    if not profile:
        return []
    
    relationships = db.query(WorkRelationshipModel).filter(
        WorkRelationshipModel.user_profile_id == profile.id
    ).all()
    
    return relationships

@router.post("/relationships", response_model=WorkRelationshipResponse)
async def create_work_relationship(
    relationship_data: WorkRelationshipCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new work relationship"""
    # Ensure user profile exists
    profile = db.query(UserProfileModel).filter(UserProfileModel.user_id == current_user.id).first()
    
    if not profile:
        # Create profile if it doesn't exist
        profile = UserProfileModel(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    # Check for duplicate relationship (same name only, allow multiple types for same person)
    existing = db.query(WorkRelationshipModel).filter(
        WorkRelationshipModel.user_profile_id == profile.id,
        WorkRelationshipModel.coworker_name == relationship_data.coworker_name
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Colleague {relationship_data.coworker_name} already exists. Use the edit function to update their information."
        )
    
    relationship = WorkRelationshipModel(
        user_profile_id=profile.id,
        **relationship_data.model_dump()
    )
    
    db.add(relationship)
    db.commit()
    db.refresh(relationship)
    
    return relationship

@router.put("/relationships/{relationship_id}", response_model=WorkRelationshipResponse)
async def update_work_relationship(
    relationship_id: int,
    relationship_data: WorkRelationshipUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update work relationship"""
    profile = db.query(UserProfileModel).filter(UserProfileModel.user_id == current_user.id).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    
    relationship = db.query(WorkRelationshipModel).filter(
        WorkRelationshipModel.id == relationship_id,
        WorkRelationshipModel.user_profile_id == profile.id
    ).first()
    
    if not relationship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work relationship not found"
        )
    
    # Update only provided fields
    update_data = relationship_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(relationship, field, value)
    
    db.commit()
    db.refresh(relationship)
    
    return relationship

@router.delete("/relationships/{relationship_id}")
async def delete_work_relationship(
    relationship_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete work relationship"""
    profile = db.query(UserProfileModel).filter(UserProfileModel.user_id == current_user.id).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    
    relationship = db.query(WorkRelationshipModel).filter(
        WorkRelationshipModel.id == relationship_id,
        WorkRelationshipModel.user_profile_id == profile.id
    ).first()
    
    if not relationship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work relationship not found"
        )
    
    db.delete(relationship)
    db.commit()
    
    return {"message": "Work relationship deleted successfully"}

# Big Five Personality Endpoints
@router.put("/personality/{dimension}", response_model=UserProfileResponse)
async def update_personality_dimension(
    dimension: str,
    tags: List[str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update specific Big Five personality dimension tags"""
    valid_dimensions = ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"]
    
    if dimension not in valid_dimensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid personality dimension. Must be one of: {valid_dimensions}"
        )
    
    profile = db.query(UserProfileModel).filter(UserProfileModel.user_id == current_user.id).first()
    
    if not profile:
        # Create profile if it doesn't exist
        profile = UserProfileModel(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    # Update the specific personality dimension
    field_name = f"personality_{dimension}"
    setattr(profile, field_name, tags)
    
    db.commit()
    db.refresh(profile)
    
    return profile