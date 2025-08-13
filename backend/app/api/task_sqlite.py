from fastapi import APIRouter, Depends, HTTPException, status
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

router = APIRouter()

def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Task Statistics (before other routes to avoid conflicts)
@router.get("/tasks/stats")
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
@router.post("/tasks", response_model=TaskResponse)
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

@router.get("/tasks", response_model=List[TaskResponse])
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

@router.get("/tasks/{task_id}", response_model=TaskResponse)
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

@router.put("/tasks/{task_id}", response_model=TaskResponse)
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

@router.delete("/tasks/{task_id}")
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
@router.post("/tasks/generate", response_model=List[TaskResponse])
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
            detail=f"Failed to generate task: {str(e)}"
        )

