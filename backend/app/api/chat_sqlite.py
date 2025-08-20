from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from typing import List
from sqlalchemy.orm import Session
from app.database.sqlite_connection import get_session
from app.database.sqlite_models import User, ChatSession, ChatMessage
from app.core.auth_sqlite import get_current_user
from app.services.ai_service_sqlite import ai_service_sqlite
from app.services.background_chat_service import background_chat_service
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
    streaming_status: Optional[str] = "completed"

class ChatSessionRename(BaseModel):
    title: str

class GenerateTitleRequest(BaseModel):
    first_message: str

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
            token_usage=msg.token_usage,
            streaming_status=msg.streaming_status
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

@router.post("/sessions/{session_id}/generate-title", response_model=Dict[str, str])
async def generate_session_title(
    session_id: int,
    request: GenerateTitleRequest,
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
    
    try:
        # Generate title using AI service
        generated_title = await ai_service_sqlite.generate_session_title(
            current_user.id, request.first_message, db
        )
        
        # Update session title
        session.title = generated_title
        session.updated_at = datetime.utcnow()
        db.commit()
        
        return {"title": generated_title}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate title: {str(e)}")

@router.put("/sessions/{session_id}/title", response_model=Dict[str, str])
async def rename_session(
    session_id: int,
    rename_data: ChatSessionRename,
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
    
    # Validate title length
    if len(rename_data.title.strip()) == 0:
        raise HTTPException(status_code=400, detail="Title cannot be empty")
    
    if len(rename_data.title) > 200:
        raise HTTPException(status_code=400, detail="Title too long (max 200 characters)")
    
    # Update session title
    session.title = rename_data.title.strip()
    session.updated_at = datetime.utcnow()
    db.commit()
    
    return {"title": session.title}

@router.get("/sessions/{session_id}/status")
async def get_session_status(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Get session status including any streaming or interrupted messages"""
    # Verify session belongs to user
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    # Check for streaming messages
    streaming_msg = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id,
        ChatMessage.streaming_status == "streaming"
    ).first()
    
    # Check for interrupted messages
    interrupted_msg = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id,
        ChatMessage.streaming_status == "interrupted"
    ).first()
    
    return {
        "session_id": session_id,
        "has_streaming": streaming_msg is not None,
        "has_interrupted": interrupted_msg is not None,
        "streaming_message": {
            "id": streaming_msg.id,
            "content": streaming_msg.content,
            "thinking": streaming_msg.thinking
        } if streaming_msg else None,
        "interrupted_message": {
            "id": interrupted_msg.id,
            "content": interrupted_msg.content,
            "thinking": interrupted_msg.thinking
        } if interrupted_msg else None,
        "updated_at": session.updated_at
    }

@router.post("/sessions/{session_id}/stop")
async def stop_chat_stream(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Stop ongoing AI streaming for this session"""
    # Verify session belongs to user
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    # Request stop from background service
    stopped = await background_chat_service.stop_session_task(session_id)
    
    if not stopped:
        raise HTTPException(status_code=404, detail="No active streaming found for this session")
    
    return {"message": "Chat stream stopped successfully"}

@router.websocket("/ws/{session_id}")
async def websocket_chat(websocket: WebSocket, session_id: int):
    await websocket.accept()
    print(f"WebSocket connection accepted for session {session_id}")
    
    try:
        # Add this connection to the background service
        background_chat_service.add_connection(session_id, websocket)
        
        # Check for any ongoing background tasks and notify client
        db = next(get_session())
        try:
            # Check for streaming messages (ongoing background tasks)
            streaming_msg = db.query(ChatMessage).filter(
                ChatMessage.session_id == session_id,
                ChatMessage.streaming_status == "streaming"
            ).first()
            
            if streaming_msg:
                print(f"Found ongoing streaming message: {streaming_msg.id}")
                await websocket.send_text(json.dumps({
                    "type": "streaming_resumed",
                    "message_id": streaming_msg.id,
                    "content": streaming_msg.content or "",
                    "thinking": streaming_msg.thinking or ""
                }))
            
            # Check for interrupted messages and notify client
            interrupted_msg = db.query(ChatMessage).filter(
                ChatMessage.session_id == session_id,
                ChatMessage.streaming_status == "interrupted"
            ).first()
            
            if interrupted_msg:
                print(f"Found interrupted streaming message: {interrupted_msg.id}")
                await websocket.send_text(json.dumps({
                    "type": "streaming_interrupted",
                    "message_id": interrupted_msg.id,
                    "content": interrupted_msg.content or "",
                    "thinking": interrupted_msg.thinking or ""
                }))
        finally:
            db.close()
        
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
            model_id = message_data.get("model_id")  # Optional AI provider ID
            
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
                
                # Create assistant message placeholder with streaming status
                assistant_msg = ChatMessage(
                    session_id=session_id,
                    role="assistant",
                    content="",
                    thinking="",
                    streaming_status="streaming"
                )
                db.add(assistant_msg)
                db.commit()
                db.refresh(assistant_msg)
                
                # Notify client of streaming start
                await websocket.send_text(json.dumps({
                    "type": "streaming_start",
                    "message_id": assistant_msg.id
                }))
                
                # Get chat history for context (last 50 messages, excluding the streaming placeholder)
                messages = db.query(ChatMessage).filter(
                    ChatMessage.session_id == session_id,
                    ChatMessage.streaming_status.in_(["completed", "interrupted"])
                ).order_by(ChatMessage.timestamp.asc()).limit(50).all()
                
                message_history = [
                    {"role": msg.role, "content": msg.content}
                    for msg in messages
                ]
                message_history.append({"role": "user", "content": user_message})
                
                # Start background AI processing task
                await background_chat_service.start_background_chat(
                    session_id, user_id, message_history, assistant_msg.id, model_id
                )
                
            finally:
                db.close()
                        
    except WebSocketDisconnect:
        print(f"WebSocket disconnected for session {session_id}")
        # Remove this connection from background service
        background_chat_service.remove_connection(session_id, websocket)
        # Background task continues running even after disconnect
            
    except Exception as e:
        print(f"WebSocket error: {e}")
        # Remove this connection from background service
        background_chat_service.remove_connection(session_id, websocket)
        
        try:
            await websocket.send_text(json.dumps({
                "type": "error",
                "content": f"Connection error: {str(e)}"
            }))
        except:
            pass