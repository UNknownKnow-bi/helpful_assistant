"""
Feishu Webhook Settings API for SQLite

Provides endpoints for managing Feishu webhook notifications:
- CRUD operations for webhook settings
- Webhook testing functionality
- Integration with task deadline notifications
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional
import httpx
import json
import asyncio
from datetime import datetime

from ..core.auth_sqlite import get_current_user
from ..database.sqlite_connection import get_session
from ..database.sqlite_models import FeishuWebhookSettings, User
from ..models.sqlite_models import (
    FeishuWebhookSettingsCreate, 
    FeishuWebhookSettingsUpdate, 
    FeishuWebhookSettingsResponse,
    FeishuWebhookTestRequest,
    FeishuWebhookTestResponse
)

router = APIRouter()

@router.get("/feishu-webhook", response_model=Optional[FeishuWebhookSettingsResponse])
async def get_webhook_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Get current user's Feishu webhook settings"""
    settings = db.query(FeishuWebhookSettings).filter(
        FeishuWebhookSettings.user_id == current_user.id
    ).first()
    
    return settings

@router.post("/feishu-webhook", response_model=FeishuWebhookSettingsResponse)
async def create_webhook_settings(
    settings_data: FeishuWebhookSettingsCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Create or update Feishu webhook settings"""
    # Check if settings already exist
    existing_settings = db.query(FeishuWebhookSettings).filter(
        FeishuWebhookSettings.user_id == current_user.id
    ).first()
    
    if existing_settings:
        # Update existing settings
        for key, value in settings_data.dict(exclude_unset=True).items():
            setattr(existing_settings, key, value)
        existing_settings.updated_at = datetime.utcnow()
        
        try:
            db.commit()
            db.refresh(existing_settings)
            return existing_settings
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update webhook settings"
            )
    else:
        # Create new settings
        new_settings = FeishuWebhookSettings(
            user_id=current_user.id,
            **settings_data.dict()
        )
        
        try:
            db.add(new_settings)
            db.commit()
            db.refresh(new_settings)
            return new_settings
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create webhook settings"
            )

@router.put("/feishu-webhook", response_model=FeishuWebhookSettingsResponse)
async def update_webhook_settings(
    settings_data: FeishuWebhookSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Update existing Feishu webhook settings"""
    settings = db.query(FeishuWebhookSettings).filter(
        FeishuWebhookSettings.user_id == current_user.id
    ).first()
    
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook settings not found"
        )
    
    # Update fields
    update_data = settings_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(settings, key, value)
    settings.updated_at = datetime.utcnow()
    
    try:
        db.commit()
        db.refresh(settings)
        return settings
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update webhook settings"
        )

@router.delete("/feishu-webhook")
async def delete_webhook_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Delete Feishu webhook settings"""
    settings = db.query(FeishuWebhookSettings).filter(
        FeishuWebhookSettings.user_id == current_user.id
    ).first()
    
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook settings not found"
        )
    
    db.delete(settings)
    db.commit()
    
    return {"message": "Webhook settings deleted successfully"}

@router.post("/feishu-webhook/test", response_model=FeishuWebhookTestResponse)
async def test_webhook(
    test_request: FeishuWebhookTestRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Test Feishu webhook by sending a test notification"""
    webhook_url = test_request.webhook_url
    
    # If no URL provided in request, get from saved settings
    if not webhook_url:
        settings = db.query(FeishuWebhookSettings).filter(
            FeishuWebhookSettings.user_id == current_user.id
        ).first()
        
        if not settings:
            return FeishuWebhookTestResponse(
                success=False,
                message="No webhook settings found. Please configure webhook URL first."
            )
        
        webhook_url = settings.webhook_url
    
    # Prepare test notification data
    test_data = {
        "msg_type": "interactive",
        "card": {
            "elements": [
                {
                    "tag": "div",
                    "text": {
                        "content": "🧪 **智时助手 测试通知**\n\n这是一条测试消息，用于验证飞书 Webhook 配置是否正常工作。",
                        "tag": "lark_md"
                    }
                },
                {
                    "tag": "hr"
                },
                {
                    "tag": "div",
                    "text": {
                        "content": f"📅 **测试时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n👤 **用户**: {current_user.username}\n✅ **状态**: 配置成功",
                        "tag": "lark_md"
                    }
                }
            ],
            "header": {
                "title": {
                    "content": "智时助手 - 测试通知",
                    "tag": "plain_text"
                },
                "template": "blue"
            }
        }
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                webhook_url,
                json=test_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                return FeishuWebhookTestResponse(
                    success=True,
                    message="测试消息发送成功！请检查您的飞书群组。",
                    response_data={"status_code": response.status_code, "response_text": response.text}
                )
            else:
                return FeishuWebhookTestResponse(
                    success=False,
                    message=f"测试失败：HTTP {response.status_code} - {response.text}",
                    response_data={"status_code": response.status_code, "response_text": response.text}
                )
                
    except httpx.TimeoutException:
        return FeishuWebhookTestResponse(
            success=False,
            message="测试超时：请检查 Webhook URL 是否正确。"
        )
    except httpx.RequestError as e:
        return FeishuWebhookTestResponse(
            success=False,
            message=f"网络错误：{str(e)}"
        )
    except Exception as e:
        return FeishuWebhookTestResponse(
            success=False,
            message=f"测试失败：{str(e)}"
        )

# Feishu Webhook Service Functions
async def send_deadline_notification(
    webhook_url: str,
    task_title: str,
    task_content: str,
    deadline: str,
    deadline_category: str
) -> bool:
    """
    Send task deadline notification to Feishu webhook
    
    Args:
        webhook_url: Feishu webhook URL
        task_title: Task title
        task_content: Task content/description
        deadline: Task deadline (ISO format)
        deadline_category: Category like "仅剩2天", "仅剩X小时", "已过期"
    
    Returns:
        bool: True if notification sent successfully, False otherwise
    """
    
    # Format deadline for display
    try:
        deadline_dt = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
        formatted_deadline = deadline_dt.strftime('%Y-%m-%d %H:%M')
    except:
        formatted_deadline = deadline
    
    # Choose color and emoji based on deadline category
    color_map = {
        "仅剩2天": ("orange", "📅"),
        "仅剩": ("red", "⏰"),  # For 仅剩X小时 etc
        "已过期": ("red", "🚨"),
        "进行中": ("blue", "📋"),
        "完成": ("green", "✅")
    }
    
    # Determine color and emoji
    template_color = "red"  # default
    emoji = "⏰"  # default
    
    for category_key, (color, category_emoji) in color_map.items():
        if category_key in deadline_category:
            template_color = color
            emoji = category_emoji
            break
    
    # Prepare notification data
    notification_data = {
        "msg_type": "interactive",
        "card": {
            "elements": [
                {
                    "tag": "div",
                    "text": {
                        "content": f"{emoji} **任务提醒**\n\n**{task_title}**",
                        "tag": "lark_md"
                    }
                },
                {
                    "tag": "hr"
                },
                {
                    "tag": "div",
                    "text": {
                        "content": f"📝 **内容**: {task_content}\n📅 **截止时间**: {formatted_deadline}\n⏳ **状态**: {deadline_category}",
                        "tag": "lark_md"
                    }
                }
            ],
            "header": {
                "title": {
                    "content": f"智时助手 - {deadline_category}",
                    "tag": "plain_text"
                },
                "template": template_color
            }
        }
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                webhook_url,
                json=notification_data,
                headers={"Content-Type": "application/json"}
            )
            return response.status_code == 200
            
    except Exception as e:
        print(f"Failed to send Feishu notification: {e}")
        return False

def get_feishu_webhook_settings(user_id: int, db: Session) -> Optional[FeishuWebhookSettings]:
    """Get Feishu webhook settings for a user"""
    return db.query(FeishuWebhookSettings).filter(
        FeishuWebhookSettings.user_id == user_id
    ).first()

@router.post("/feishu-webhook/send-notification")
async def send_webhook_notification(
    notification_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Send notification via user's configured Feishu webhook"""
    # Get user's webhook settings
    settings = get_feishu_webhook_settings(current_user.id, db)
    
    if not settings or not settings.is_enabled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook settings not found or disabled"
        )
    
    # Extract notification data
    task_title = notification_data.get('task_title', '')
    task_content = notification_data.get('task_content', '')
    deadline = notification_data.get('deadline', '')
    deadline_category = notification_data.get('deadline_category', '')
    
    # Send webhook notification
    success = await send_deadline_notification(
        webhook_url=settings.webhook_url,
        task_title=task_title,
        task_content=task_content,
        deadline=deadline,
        deadline_category=deadline_category
    )
    
    if success:
        return {"message": "Webhook notification sent successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send webhook notification"
        )