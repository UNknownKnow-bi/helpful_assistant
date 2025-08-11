from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from typing import List
from app.models.user import User
from app.models.chat import ChatSession, ChatMessage, ChatSessionCreate, ChatSessionResponse, ChatMessageResponse
from app.core.auth import get_current_user
from app.database.connection import get_database
from app.services.ai_service import ai_service
from bson import ObjectId
import json
from datetime import datetime

router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("/sessions", response_model=ChatSessionResponse)
async def create_chat_session(
    session_create: ChatSessionCreate,
    current_user: User = Depends(get_current_user)
):
    db = get_database()
    
    session_dict = {
        "user_id": current_user.id,
        "title": session_create.title,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "message_count": 0
    }
    
    result = await db.chat_sessions.insert_one(session_dict)
    session_dict["_id"] = result.inserted_id
    
    return ChatSessionResponse(
        id=str(result.inserted_id),
        title=session_dict["title"],
        created_at=session_dict["created_at"],
        updated_at=session_dict["updated_at"],
        message_count=0
    )

@router.get("/sessions", response_model=List[ChatSessionResponse])
async def get_chat_sessions(current_user: User = Depends(get_current_user)):
    db = get_database()
    
    sessions = await db.chat_sessions.find(
        {"user_id": current_user.id}
    ).sort("updated_at", -1).to_list(100)
    
    return [
        ChatSessionResponse(
            id=str(session["_id"]),
            title=session["title"],
            created_at=session["created_at"],
            updated_at=session["updated_at"],
            message_count=session["message_count"]
        )
        for session in sessions
    ]

@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
async def get_chat_messages(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    db = get_database()
    
    # Verify session belongs to user
    session = await db.chat_sessions.find_one({
        "_id": ObjectId(session_id),
        "user_id": current_user.id
    })
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    messages = await db.chat_messages.find(
        {"session_id": ObjectId(session_id)}
    ).sort("timestamp", 1).to_list(1000)
    
    return [
        ChatMessageResponse(
            id=str(msg["_id"]),
            role=msg["role"],
            content=msg["content"],
            thinking=msg.get("thinking"),
            timestamp=msg["timestamp"],
            token_usage=msg.get("token_usage")
        )
        for msg in messages
    ]

@router.delete("/sessions/{session_id}")
async def delete_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    db = get_database()
    
    # Verify session belongs to user
    result = await db.chat_sessions.delete_one({
        "_id": ObjectId(session_id),
        "user_id": current_user.id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    # Delete all messages in the session
    await db.chat_messages.delete_many({"session_id": ObjectId(session_id)})
    
    return {"message": "Chat session deleted successfully"}

@router.websocket("/ws/{session_id}")
async def websocket_chat(websocket: WebSocket, session_id: str):
    await websocket.accept()
    db = get_database()
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # For simplicity, we'll skip user authentication in WebSocket
            # In production, you should verify the user token
            user_message = message_data.get("message", "")
            user_id = ObjectId(message_data.get("user_id"))
            
            # Save user message
            user_msg_dict = {
                "session_id": ObjectId(session_id),
                "role": "user",
                "content": user_message,
                "timestamp": datetime.utcnow()
            }
            await db.chat_messages.insert_one(user_msg_dict)
            
            # Get chat history for context
            messages = await db.chat_messages.find(
                {"session_id": ObjectId(session_id)}
            ).sort("timestamp", 1).to_list(50)  # Last 50 messages
            
            message_history = [
                {"role": msg["role"], "content": msg["content"]}
                for msg in messages[:-1]  # Exclude the just-added user message
            ]
            message_history.append({"role": "user", "content": user_message})
            
            # Stream AI response
            assistant_content = ""
            assistant_thinking = ""
            
            async for chunk in ai_service.chat_stream(user_id, message_history):
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
                    assistant_msg_dict = {
                        "session_id": ObjectId(session_id),
                        "role": "assistant",
                        "content": assistant_content,
                        "thinking": assistant_thinking if assistant_thinking else None,
                        "timestamp": datetime.utcnow()
                    }
                    await db.chat_messages.insert_one(assistant_msg_dict)
                    
                    # Update session
                    await db.chat_sessions.update_one(
                        {"_id": ObjectId(session_id)},
                        {
                            "$set": {"updated_at": datetime.utcnow()},
                            "$inc": {"message_count": 2}  # User + Assistant
                        }
                    )
                    
                    await websocket.send_text(json.dumps({
                        "type": "done"
                    }))
                    break
                    
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