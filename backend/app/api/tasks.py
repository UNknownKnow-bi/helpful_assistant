from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from app.models.user import User
from app.models.task import Task, TaskCreate, TaskUpdate, TaskResponse, TaskStatus, TaskPriority
from app.core.auth import get_current_user
from app.database.connection import get_database
from app.services.ai_service import ai_service
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/tasks", tags=["tasks"])

@router.post("/generate", response_model=TaskResponse)
async def generate_task_from_text(
    text: str,
    current_user: User = Depends(get_current_user)
):
    """Generate a task from Chinese text input using AI"""
    try:
        # Use AI to parse the text and extract task information
        task_data = await ai_service.generate_task_from_text(current_user.id, text)
        
        # Create task in database
        task_dict = {
            "user_id": current_user.id,
            "content": task_data.get("content", text),
            "deadline": task_data.get("deadline"),
            "assignee": task_data.get("assignee"),
            "priority": task_data.get("priority", "medium"),
            "difficulty": task_data.get("difficulty", 5),
            "source": "manual",
            "status": "pending",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        db = get_database()
        result = await db.tasks.insert_one(task_dict)
        task_dict["_id"] = result.inserted_id
        
        return TaskResponse(
            id=str(result.inserted_id),
            content=task_dict["content"],
            deadline=task_dict["deadline"],
            assignee=task_dict["assignee"],
            priority=task_dict["priority"],
            difficulty=task_dict["difficulty"],
            source=task_dict["source"],
            status=task_dict["status"],
            created_at=task_dict["created_at"],
            updated_at=task_dict["updated_at"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Task generation failed: {str(e)}")

@router.post("", response_model=TaskResponse)
async def create_task(
    task_create: TaskCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new task manually"""
    db = get_database()
    
    task_dict = {
        "user_id": current_user.id,
        "content": task_create.content,
        "deadline": task_create.deadline,
        "assignee": task_create.assignee,
        "priority": task_create.priority,
        "difficulty": task_create.difficulty,
        "source": "manual",
        "status": "pending",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.tasks.insert_one(task_dict)
    task_dict["_id"] = result.inserted_id
    
    return TaskResponse(
        id=str(result.inserted_id),
        content=task_dict["content"],
        deadline=task_dict["deadline"],
        assignee=task_dict["assignee"],
        priority=task_dict["priority"],
        difficulty=task_dict["difficulty"],
        source=task_dict["source"],
        status=task_dict["status"],
        created_at=task_dict["created_at"],
        updated_at=task_dict["updated_at"]
    )

@router.get("", response_model=List[TaskResponse])
async def get_tasks(
    status: Optional[TaskStatus] = Query(None),
    priority: Optional[TaskPriority] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user)
):
    """Get user's tasks with optional filtering"""
    db = get_database()
    
    query_filter = {"user_id": current_user.id}
    if status:
        query_filter["status"] = status
    if priority:
        query_filter["priority"] = priority
    
    tasks = await db.tasks.find(query_filter).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return [
        TaskResponse(
            id=str(task["_id"]),
            content=task["content"],
            deadline=task.get("deadline"),
            assignee=task.get("assignee"),
            priority=task["priority"],
            difficulty=task["difficulty"],
            source=task["source"],
            status=task["status"],
            created_at=task["created_at"],
            updated_at=task["updated_at"]
        )
        for task in tasks
    ]

@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific task"""
    db = get_database()
    
    task = await db.tasks.find_one({
        "_id": ObjectId(task_id),
        "user_id": current_user.id
    })
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return TaskResponse(
        id=str(task["_id"]),
        content=task["content"],
        deadline=task.get("deadline"),
        assignee=task.get("assignee"),
        priority=task["priority"],
        difficulty=task["difficulty"],
        source=task["source"],
        status=task["status"],
        created_at=task["created_at"],
        updated_at=task["updated_at"]
    )

@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    task_update: TaskUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a task"""
    db = get_database()
    
    update_data = {k: v for k, v in task_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.tasks.update_one(
        {"_id": ObjectId(task_id), "user_id": current_user.id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    updated_task = await db.tasks.find_one({
        "_id": ObjectId(task_id),
        "user_id": current_user.id
    })
    
    return TaskResponse(
        id=str(updated_task["_id"]),
        content=updated_task["content"],
        deadline=updated_task.get("deadline"),
        assignee=updated_task.get("assignee"),
        priority=updated_task["priority"],
        difficulty=updated_task["difficulty"],
        source=updated_task["source"],
        status=updated_task["status"],
        created_at=updated_task["created_at"],
        updated_at=updated_task["updated_at"]
    )

@router.delete("/{task_id}")
async def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a task"""
    db = get_database()
    
    result = await db.tasks.delete_one({
        "_id": ObjectId(task_id),
        "user_id": current_user.id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"message": "Task deleted successfully"}