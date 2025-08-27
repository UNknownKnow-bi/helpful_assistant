from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime

from app.database.sqlite_connection import SessionLocal
from app.database.sqlite_models import Task as TaskModel, User
from app.models.sqlite_models import (
    TaskCreate, TaskUpdate, TaskResponse, Task,
    UserResponse
)
from app.core.auth_sqlite import get_current_user
from app.services.ai_service_sqlite import ai_service_sqlite
from app.services.ocr_service import ocr_service
import logging

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tasks", tags=["Tasks"])

def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Task Statistics (before other routes to avoid conflicts)
@router.get("/stats")
async def get_task_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get task statistics for current user"""
    tasks = db.query(TaskModel).filter(TaskModel.user_id == current_user.id).all()
    
    total = len(tasks)
    completed = len([t for t in tasks if t.status == "completed"])
    in_progress = len([t for t in tasks if t.status == "in_progress"])
    pending = len([t for t in tasks if t.status == "pending"])
    
    # Priority distribution based on Eisenhower Matrix
    urgent_important = len([t for t in tasks if t.urgency == "high" and t.importance == "high"])
    urgent_not_important = len([t for t in tasks if t.urgency == "high" and t.importance == "low"])
    not_urgent_important = len([t for t in tasks if t.urgency == "low" and t.importance == "high"])
    not_urgent_not_important = len([t for t in tasks if t.urgency == "low" and t.importance == "low"])
    
    # Average difficulty
    avg_difficulty = sum([t.difficulty for t in tasks]) / total if total > 0 else 0
    
    return {
        "total": total,
        "completed": completed,
        "in_progress": in_progress,
        "pending": pending,
        "completion_rate": (completed / total * 100) if total > 0 else 0,
        "priority_distribution": {
            "urgent_important": urgent_important,
            "urgent_not_important": urgent_not_important,
            "not_urgent_important": not_urgent_important,
            "not_urgent_not_important": not_urgent_not_important
        },
        "average_difficulty": round(avg_difficulty, 1)
    }

# Task CRUD Operations
@router.post("", response_model=TaskResponse)
async def create_task(
    task: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new task manually"""
    db_task = TaskModel(
        user_id=current_user.id,
        title=task.title,
        content=task.content,
        deadline=task.deadline,
        assignee=task.assignee,
        participant=task.participant,
        urgency=task.urgency,
        importance=task.importance,
        difficulty=task.difficulty,
        source="manual"
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.get("", response_model=List[TaskResponse])
async def get_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status: str = None,
    urgency: str = None,
    importance: str = None
):
    """Get all tasks for current user with optional filtering"""
    query = db.query(TaskModel).filter(TaskModel.user_id == current_user.id)
    
    if status:
        query = query.filter(TaskModel.status == status)
    if urgency:
        query = query.filter(TaskModel.urgency == urgency)
    if importance:
        query = query.filter(TaskModel.importance == importance)
    
    tasks = query.order_by(TaskModel.created_at.desc()).all()
    return tasks

@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific task by ID"""
    task = db.query(TaskModel).filter(
        TaskModel.id == task_id,
        TaskModel.user_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    return task

@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_update: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update task by ID"""
    task = db.query(TaskModel).filter(
        TaskModel.id == task_id,
        TaskModel.user_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Update fields that are provided
    update_data = task_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)
    
    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return task

@router.delete("/{task_id}")
async def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete task by ID"""
    task = db.query(TaskModel).filter(
        TaskModel.id == task_id,
        TaskModel.user_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    db.delete(task)
    db.commit()
    return {"message": "Task deleted successfully"}

# AI-powered Task Generation
@router.post("/generate", response_model=List[TaskResponse])
async def generate_task_from_text(
    request: Dict[str, str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate task cards from Chinese text using AI (supports multiple tasks)"""
    text = request.get("text", "").strip()
    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text input is required"
        )
    
    try:
        # Use AI service to extract task information (returns list)
        tasks_data = await ai_service_sqlite.generate_task_from_text(
            user_id=current_user.id,
            text=text,
            db=db
        )
        
        # Create tasks from AI-generated data
        created_tasks = []
        for task_data in tasks_data:
            db_task = TaskModel(
                user_id=current_user.id,
                title=task_data.get("title", text[:8] if len(text) <= 8 else text[:7] + "..."),
                content=task_data.get("content", text),
                deadline=task_data.get("deadline"),
                assignee=task_data.get("assignee"),
                participant=task_data.get("participant", "你"),
                urgency=task_data.get("urgency", "low"),
                importance=task_data.get("importance", "low"),
                difficulty=task_data.get("difficulty", 5),
                source="ai_generated"
            )
            
            db.add(db_task)
            db.flush()
            created_tasks.append(db_task)
        
        # Commit all tasks at once
        db.commit()
        
        # Refresh all tasks to get updated data
        for task in created_tasks:
            db.refresh(task)
            
        return created_tasks
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate task: {str(e)}"
        )

# OCR Text Extraction Only (Preview Step)
@router.post("/extract-text-from-image")
async def extract_text_from_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Extract text from image using OCR (preview step before task generation)
    Uses AI OCR if active imageOCR provider is configured, otherwise falls back to EasyOCR"""
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image (PNG, JPG, JPEG, etc.)"
        )
    
    # Check file size (limit to 10MB)
    file_content = await file.read()
    if len(file_content) > 10 * 1024 * 1024:  # 10MB
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image file size must be less than 10MB"
        )
    
    try:
        logger.info(f"Starting OCR text extraction for user {current_user.id}, file size: {len(file_content)} bytes")
        
        # Debug: Show all AI providers for this user
        from app.database.sqlite_models import AIProvider
        all_providers = db.query(AIProvider).filter(AIProvider.user_id == current_user.id).all()
        logger.info(f"User has {len(all_providers)} total AI providers configured")
        for provider in all_providers:
            logger.info(f"  Provider {provider.id}: {provider.name}, category={provider.category}, active={provider.is_active}")
        
        # Check if user has an active AI OCR provider
        ai_ocr_provider = ai_service_sqlite.get_active_image_ocr_provider(current_user.id, db)
        extracted_text = ""
        ocr_method = ""
        
        if ai_ocr_provider:
            logger.info(f"Found active AI OCR provider: {ai_ocr_provider.name} (ID: {ai_ocr_provider.id})")
            logger.info(f"Provider config: model={ai_ocr_provider.config.get('model')}, base_url={ai_ocr_provider.config.get('base_url')}")
            
            # Use AI-powered OCR (Qwen-OCR)
            try:
                logger.info("Attempting AI-powered OCR extraction...")
                extracted_text = await ai_service_sqlite.extract_text_from_image_ai(
                    current_user.id, file_content, db
                )
                logger.info(f"AI OCR successful, extracted {len(extracted_text)} characters")
                ocr_method = "AI OCR"
            except Exception as ai_error:
                # Fallback to EasyOCR if AI OCR fails
                logger.error(f"AI OCR failed, falling back to EasyOCR: {ai_error}")
                logger.exception("Full AI OCR error traceback:")
                try:
                    extracted_text = await ocr_service.extract_text_from_image(file_content)
                    logger.info(f"EasyOCR fallback successful, extracted {len(extracted_text)} characters")
                    ocr_method = "EasyOCR (AI OCR fallback)"
                except Exception as easy_error:
                    logger.error(f"EasyOCR fallback also failed: {easy_error}")
                    raise
        else:
            logger.info("No active AI OCR provider found, using local EasyOCR")
            # Use local EasyOCR
            extracted_text = await ocr_service.extract_text_from_image(file_content)
            logger.info(f"EasyOCR extraction successful, extracted {len(extracted_text)} characters")
            ocr_method = "EasyOCR"
        
        if not extracted_text or not extracted_text.strip():
            logger.warning(f"No text extracted using {ocr_method}")
            return {
                "success": False,
                "extracted_text": "",
                "ocr_method": ocr_method,
                "message": f"No text could be extracted from the image using {ocr_method}. Please ensure the image contains readable text."
            }
        
        return {
            "success": True,
            "extracted_text": extracted_text,
            "ocr_method": ocr_method,
            "message": f"Text extracted successfully using {ocr_method}. Please review and confirm to generate tasks."
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract text from image: {str(e)}"
        )

# AI-powered Task Generation from Image (OCR)
@router.post("/generate-from-image", response_model=List[TaskResponse])
async def generate_task_from_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate task cards from image using OCR + AI (supports multiple tasks)"""
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image (PNG, JPG, JPEG, etc.)"
        )
    
    # Check file size (limit to 10MB)
    file_content = await file.read()
    if len(file_content) > 10 * 1024 * 1024:  # 10MB
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image file size must be less than 10MB"
        )
    
    try:
        # Extract text from image using OCR
        extracted_text = await ocr_service.extract_text_from_image(file_content)
        
        if not extracted_text or not extracted_text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No text could be extracted from the image. Please ensure the image contains readable text."
            )
        
        # Use AI service to extract task information from OCR text (returns list)
        tasks_data = await ai_service_sqlite.generate_task_from_text(
            user_id=current_user.id,
            text=extracted_text,
            db=db
        )
        
        # Create tasks from AI-generated data
        created_tasks = []
        for task_data in tasks_data:
            db_task = TaskModel(
                user_id=current_user.id,
                title=task_data.get("title", extracted_text[:8] if len(extracted_text) <= 8 else extracted_text[:7] + "..."),
                content=task_data.get("content", extracted_text),
                deadline=task_data.get("deadline"),
                assignee=task_data.get("assignee"),
                participant=task_data.get("participant", "你"),
                urgency=task_data.get("urgency", "low"),
                importance=task_data.get("importance", "low"),
                difficulty=task_data.get("difficulty", 5),
                source="ai_generated"
            )
            
            db.add(db_task)
            db.flush()  # Flush to get the ID but don't commit yet
            created_tasks.append(db_task)
        
        # Commit all tasks at once
        db.commit()
        
        # Refresh all tasks to get updated data
        for task in created_tasks:
            db.refresh(task)
            
        return created_tasks
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate task from image: {str(e)}"
        )

