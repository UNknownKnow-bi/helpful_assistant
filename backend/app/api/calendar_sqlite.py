from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging

from app.database.sqlite_connection import SessionLocal
from app.core.auth_sqlite import get_current_user
from app.database.sqlite_models import CalendarEvent, Task, User
from app.models.sqlite_models import (
    CalendarEventCreate, CalendarEventUpdate, CalendarEventResponse,
    TaskScheduleRequest, TaskScheduleResponse, TaskResponse
)
from app.services.ai_service_sqlite import ai_service_sqlite

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/calendar", tags=["calendar"])

def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/schedule-tasks", response_model=TaskScheduleResponse)
async def schedule_tasks_with_ai(
    request: TaskScheduleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Use AI to intelligently schedule undone tasks based on their properties
    """
    try:
        logger.info(f"Starting AI task scheduling for user {current_user.id}")
        
        # Get all undone tasks for the user
        undone_tasks = db.query(Task).filter(
            Task.user_id == current_user.id,
            Task.status == "undo"
        ).all()
        
        if not undone_tasks:
            return TaskScheduleResponse(
                events=[],
                ai_reasoning="用户没有待办任务需要安排",
                message="没有找到待办任务"
            )
        
        logger.info(f"Found {len(undone_tasks)} undone tasks")
        
        # Convert tasks to dictionary format for AI service
        tasks_data = []
        for task in undone_tasks:
            task_dict = {
                "id": task.id,
                "title": task.title,
                "content": task.content,
                "deadline": task.deadline,
                "urgency": task.urgency,
                "importance": task.importance,
                "difficulty": task.difficulty,
                "cost_time_hours": task.cost_time_hours
            }
            tasks_data.append(task_dict)
        
        # Prepare schedule parameters
        schedule_params = {
            "date_range_start": request.date_range_start,
            "date_range_end": request.date_range_end,
            "work_hours_start": request.work_hours_start,
            "work_hours_end": request.work_hours_end,
            "break_duration_minutes": request.break_duration_minutes,
            "include_weekends": request.include_weekends
        }
        
        # Use AI service to generate schedule
        schedule_events = await ai_service_sqlite.schedule_tasks_with_ai(
            current_user.id, tasks_data, schedule_params, db
        )
        
        logger.info(f"AI generated {len(schedule_events)} scheduling events")
        
        # Clear existing calendar events for the user in the date range
        db.query(CalendarEvent).filter(
            CalendarEvent.user_id == current_user.id,
            CalendarEvent.scheduled_start_time >= request.date_range_start,
            CalendarEvent.scheduled_start_time <= request.date_range_end
        ).delete()
        
        # Create new calendar events in database
        created_events = []
        ai_reasoning_summary = []
        
        for event_data in schedule_events:
            # Find the corresponding task
            task = db.query(Task).filter(
                Task.id == event_data["task_id"],
                Task.user_id == current_user.id
            ).first()
            
            if not task:
                logger.warning(f"Task {event_data['task_id']} not found, skipping")
                continue
            
            # Parse datetime strings
            try:
                start_time = datetime.fromisoformat(event_data["scheduled_start_time"].replace('Z', '+00:00'))
                end_time = datetime.fromisoformat(event_data["scheduled_end_time"].replace('Z', '+00:00'))
            except ValueError as e:
                logger.error(f"Invalid datetime format: {e}")
                continue
            
            # Create calendar event
            calendar_event = CalendarEvent(
                user_id=current_user.id,
                task_id=task.id,
                scheduled_start_time=start_time,
                scheduled_end_time=end_time,
                event_type="work",
                ai_reasoning=event_data["ai_reasoning"]
            )
            
            db.add(calendar_event)
            db.flush()  # Get the ID
            
            # Prepare response data
            event_response = CalendarEventResponse(
                id=calendar_event.id,
                task_id=task.id,
                scheduled_start_time=start_time,
                scheduled_end_time=end_time,
                event_type="work",
                ai_reasoning=event_data["ai_reasoning"],
                created_at=calendar_event.created_at,
                updated_at=calendar_event.updated_at,
                task=TaskResponse(
                    id=task.id,
                    title=task.title,
                    content=task.content,
                    deadline=task.deadline,
                    assignee=task.assignee,
                    participant=task.participant,
                    urgency=task.urgency,
                    importance=task.importance,
                    difficulty=task.difficulty,
                    cost_time_hours=task.cost_time_hours,
                    source=task.source,
                    status=task.status,
                    created_at=task.created_at,
                    updated_at=task.updated_at
                )
            )
            
            created_events.append(event_response)
            ai_reasoning_summary.append(f"任务「{task.title}」: {event_data['ai_reasoning']}")
        
        db.commit()
        
        # Build comprehensive AI reasoning summary
        overall_reasoning = f"AI智能分析了 {len(undone_tasks)} 个待办任务，根据截止时间、重要性、紧急度和难度等因素进行合理安排。具体安排如下：\n\n" + "\n".join(ai_reasoning_summary)
        
        logger.info(f"Successfully created {len(created_events)} calendar events")
        
        return TaskScheduleResponse(
            events=created_events,
            ai_reasoning=overall_reasoning,
            message=f"成功为 {len(created_events)} 个任务生成智能时间安排"
        )
        
    except Exception as e:
        logger.error(f"Calendar scheduling failed: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"日程安排失败: {str(e)}"
        )

@router.get("/events", response_model=List[CalendarEventResponse])
def get_calendar_events(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get calendar events for a user within a date range
    """
    try:
        query = db.query(CalendarEvent).filter(CalendarEvent.user_id == current_user.id)
        
        if start_date:
            query = query.filter(CalendarEvent.scheduled_start_time >= start_date)
        
        if end_date:
            query = query.filter(CalendarEvent.scheduled_start_time <= end_date)
        
        events = query.order_by(CalendarEvent.scheduled_start_time).all()
        
        # Convert to response format with task information
        event_responses = []
        for event in events:
            task = db.query(Task).filter(Task.id == event.task_id).first()
            
            task_response = None
            if task:
                task_response = TaskResponse(
                    id=task.id,
                    title=task.title,
                    content=task.content,
                    deadline=task.deadline,
                    assignee=task.assignee,
                    participant=task.participant,
                    urgency=task.urgency,
                    importance=task.importance,
                    difficulty=task.difficulty,
                    cost_time_hours=task.cost_time_hours,
                    source=task.source,
                    status=task.status,
                    created_at=task.created_at,
                    updated_at=task.updated_at
                )
            
            event_response = CalendarEventResponse(
                id=event.id,
                task_id=event.task_id,
                scheduled_start_time=event.scheduled_start_time,
                scheduled_end_time=event.scheduled_end_time,
                event_type=event.event_type,
                ai_reasoning=event.ai_reasoning,
                created_at=event.created_at,
                updated_at=event.updated_at,
                task=task_response
            )
            
            event_responses.append(event_response)
        
        logger.info(f"Retrieved {len(event_responses)} calendar events for user {current_user.id}")
        return event_responses
        
    except Exception as e:
        logger.error(f"Failed to get calendar events: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取日程事件失败: {str(e)}"
        )

@router.put("/events/{event_id}", response_model=CalendarEventResponse)
def update_calendar_event(
    event_id: int,
    update_data: CalendarEventUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a calendar event
    """
    try:
        event = db.query(CalendarEvent).filter(
            CalendarEvent.id == event_id,
            CalendarEvent.user_id == current_user.id
        ).first()
        
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="日程事件未找到"
            )
        
        # Update fields
        if update_data.scheduled_start_time is not None:
            event.scheduled_start_time = update_data.scheduled_start_time
        
        if update_data.scheduled_end_time is not None:
            event.scheduled_end_time = update_data.scheduled_end_time
        
        if update_data.event_type is not None:
            event.event_type = update_data.event_type
        
        if update_data.ai_reasoning is not None:
            event.ai_reasoning = update_data.ai_reasoning
        
        db.commit()
        
        # Get task information for response
        task = db.query(Task).filter(Task.id == event.task_id).first()
        task_response = None
        if task:
            task_response = TaskResponse(
                id=task.id,
                title=task.title,
                content=task.content,
                deadline=task.deadline,
                assignee=task.assignee,
                participant=task.participant,
                urgency=task.urgency,
                importance=task.importance,
                difficulty=task.difficulty,
                cost_time_hours=task.cost_time_hours,
                source=task.source,
                status=task.status,
                created_at=task.created_at,
                updated_at=task.updated_at
            )
        
        event_response = CalendarEventResponse(
            id=event.id,
            task_id=event.task_id,
            scheduled_start_time=event.scheduled_start_time,
            scheduled_end_time=event.scheduled_end_time,
            event_type=event.event_type,
            ai_reasoning=event.ai_reasoning,
            created_at=event.created_at,
            updated_at=event.updated_at,
            task=task_response
        )
        
        logger.info(f"Updated calendar event {event_id} for user {current_user.id}")
        return event_response
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update calendar event: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新日程事件失败: {str(e)}"
        )

@router.delete("/events/{event_id}")
def delete_calendar_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a calendar event
    """
    try:
        event = db.query(CalendarEvent).filter(
            CalendarEvent.id == event_id,
            CalendarEvent.user_id == current_user.id
        ).first()
        
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="日程事件未找到"
            )
        
        db.delete(event)
        db.commit()
        
        logger.info(f"Deleted calendar event {event_id} for user {current_user.id}")
        return {"message": "日程事件已删除"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete calendar event: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除日程事件失败: {str(e)}"
        )

@router.delete("/events")
def clear_calendar_events(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Clear calendar events within a date range (or all if no dates specified)
    """
    try:
        query = db.query(CalendarEvent).filter(CalendarEvent.user_id == current_user.id)
        
        if start_date:
            query = query.filter(CalendarEvent.scheduled_start_time >= start_date)
        
        if end_date:
            query = query.filter(CalendarEvent.scheduled_start_time <= end_date)
        
        deleted_count = query.count()
        query.delete()
        db.commit()
        
        logger.info(f"Cleared {deleted_count} calendar events for user {current_user.id}")
        return {"message": f"已清除 {deleted_count} 个日程事件"}
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to clear calendar events: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"清除日程事件失败: {str(e)}"
        )