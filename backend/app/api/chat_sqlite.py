from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from typing import List
from sqlalchemy.orm import Session
from app.database.sqlite_connection import get_session
from app.database.sqlite_models import User, ChatSession, ChatMessage
from app.core.auth_sqlite import get_current_user
from app.services.ai_service_sqlite import ai_service_sqlite
import json
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, Dict, Any

router = APIRouter(prefix="/chat", tags=["chat"])

# Pydantic models for requests/responses
class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Chat"

class ChatSessionResponse(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int

class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    thinking: Optional[str] = None
    timestamp: datetime
    token_usage: Optional[Dict[str, Any]] = None

@router.post("/sessions", response_model=ChatSessionResponse)
async def create_chat_session(
    session_create: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    chat_session = ChatSession(
        user_id=current_user.id,
        title=session_create.title or "New Chat",
        message_count=0
    )
    
    db.add(chat_session)
    db.commit()
    db.refresh(chat_session)
    
    return ChatSessionResponse(
        id=chat_session.id,
        title=chat_session.title,
        created_at=chat_session.created_at,
        updated_at=chat_session.updated_at,
        message_count=chat_session.message_count
    )

@router.get("/sessions", response_model=List[ChatSessionResponse])
async def get_chat_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    sessions = db.query(ChatSession).filter(
        ChatSession.user_id == current_user.id
    ).order_by(ChatSession.updated_at.desc()).limit(100).all()
    
    return [
        ChatSessionResponse(
            id=session.id,
            title=session.title,
            created_at=session.created_at,
            updated_at=session.updated_at,
            message_count=session.message_count
        )
        for session in sessions
    ]

@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
async def get_chat_messages(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    # Verify session belongs to user
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.timestamp.asc()).limit(1000).all()
    
    return [
        ChatMessageResponse(
            id=msg.id,
            role=msg.role,
            content=msg.content,
            thinking=msg.thinking,
            timestamp=msg.timestamp,
            token_usage=msg.token_usage
        )
        for msg in messages
    ]

@router.delete("/sessions/{session_id}")
async def delete_chat_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    # Verify session belongs to user
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    # Delete all messages in the session
    db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
    
    # Delete the session
    db.delete(session)
    db.commit()
    
    return {"message": "Chat session deleted successfully"}

@router.websocket("/ws/{session_id}")
async def websocket_chat(websocket: WebSocket, session_id: int):
    await websocket.accept()
    print(f"WebSocket connection accepted for session {session_id}")
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            print(f"Received WebSocket data: {data}")
            
            try:
                message_data = json.loads(data)
            except json.JSONDecodeError as e:
                print(f"JSON decode error: {e}")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "content": "Invalid JSON format"
                }))
                continue
            
            user_message = message_data.get("message", "")
            user_id = message_data.get("user_id")
            
            if not user_message or not user_id:
                await websocket.send_text(json.dumps({
                    "type": "error", 
                    "content": "Missing message or user_id"
                }))
                continue
            
            # Get database session
            db = next(get_session())
            try:
                # Verify session exists and belongs to user
                session = db.query(ChatSession).filter(
                    ChatSession.id == session_id,
                    ChatSession.user_id == user_id
                ).first()
                
                if not session:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "content": "Chat session not found"
                    }))
                    break
                
                # Save user message
                user_msg = ChatMessage(
                    session_id=session_id,
                    role="user",
                    content=user_message
                )
                db.add(user_msg)
                db.commit()
                
                # Get chat history for context (last 50 messages)
                messages = db.query(ChatMessage).filter(
                    ChatMessage.session_id == session_id
                ).order_by(ChatMessage.timestamp.asc()).limit(50).all()
                
                message_history = [
                    {"role": msg.role, "content": msg.content}
                    for msg in messages[:-1]  # Exclude the just-added user message
                ]
                message_history.append({"role": "user", "content": user_message})
                
                # Stream AI response
                assistant_content = ""
                assistant_thinking = ""
                
                async for chunk in ai_service_sqlite.chat_stream(user_id, message_history, db):
                    if "error" in chunk:
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "content": chunk["error"]
                        }))
                        break
                    elif chunk.get("type") == "content":
                        content = chunk.get("content", "")
                        thinking = chunk.get("thinking", "")
                        
                        assistant_content += content
                        if thinking:
                            assistant_thinking += thinking
                        
                        await websocket.send_text(json.dumps({
                            "type": "content",
                            "content": content,
                            "thinking": thinking if thinking else None
                        }))
                    elif chunk.get("type") == "done":
                        # Save assistant message
                        assistant_msg = ChatMessage(
                            session_id=session_id,
                            role="assistant",
                            content=assistant_content,
                            thinking=assistant_thinking if assistant_thinking else None
                        )
                        db.add(assistant_msg)
                        
                        # Update session
                        session.message_count += 2  # User + Assistant
                        session.updated_at = datetime.utcnow()
                        db.commit()
                        
                        await websocket.send_text(json.dumps({
                            "type": "done"
                        }))
                        break
            finally:
                db.close()
                        
    except WebSocketDisconnect:
        print(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.send_text(json.dumps({
                "type": "error",
                "content": f"Connection error: {str(e)}"
            }))
        except:
            pass