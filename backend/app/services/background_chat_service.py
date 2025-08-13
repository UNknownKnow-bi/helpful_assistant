import asyncio
import json
from typing import Dict, Set
from datetime import datetime
from sqlalchemy.orm import Session
from app.database.sqlite_connection import SessionLocal
from app.database.sqlite_models import ChatMessage, ChatSession
from app.services.ai_service_sqlite import ai_service_sqlite
import logging

logger = logging.getLogger(__name__)

class BackgroundChatService:
    def __init__(self):
        # Track running tasks: session_id -> asyncio.Task
        self.running_tasks: Dict[int, asyncio.Task] = {}
        # Track active connections: session_id -> set of websocket connections
        self.active_connections: Dict[int, Set] = {}
    
    def add_connection(self, session_id: int, websocket):
        """Add a WebSocket connection for a session"""
        if session_id not in self.active_connections:
            self.active_connections[session_id] = set()
        self.active_connections[session_id].add(websocket)
        logger.info(f"Added connection for session {session_id}, total: {len(self.active_connections[session_id])}")
    
    def remove_connection(self, session_id: int, websocket):
        """Remove a WebSocket connection for a session"""
        if session_id in self.active_connections:
            self.active_connections[session_id].discard(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
            logger.info(f"Removed connection for session {session_id}")
    
    async def broadcast_to_session(self, session_id: int, message: dict):
        """Broadcast message to all active connections for a session"""
        if session_id in self.active_connections:
            disconnected = set()
            for websocket in self.active_connections[session_id].copy():
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.warning(f"Failed to send to websocket in session {session_id}: {e}")
                    disconnected.add(websocket)
            
            # Remove disconnected websockets
            for ws in disconnected:
                self.active_connections[session_id].discard(ws)
    
    async def start_background_chat(self, session_id: int, user_id: int, message_history: list, assistant_message_id: int):
        """Start AI chat as background task that continues even if WebSocket disconnects"""
        
        # Cancel any existing task for this session
        if session_id in self.running_tasks:
            self.running_tasks[session_id].cancel()
        
        # Create background task
        task = asyncio.create_task(
            self._background_chat_worker(session_id, user_id, message_history, assistant_message_id)
        )
        self.running_tasks[session_id] = task
        
        logger.info(f"Started background chat task for session {session_id}")
        return task
    
    async def stop_session_task(self, session_id: int) -> bool:
        """Stop running background task for a session"""
        logger.info(f"Attempting to stop task for session {session_id}. Running tasks: {list(self.running_tasks.keys())}")
        
        if session_id in self.running_tasks:
            task = self.running_tasks[session_id]
            task.cancel()
            logger.info(f"Cancelled background task for session {session_id}")
            
            # Update database to mark as interrupted
            db = SessionLocal()
            try:
                # Find streaming message and mark as interrupted
                streaming_msg = db.query(ChatMessage).filter(
                    ChatMessage.session_id == session_id,
                    ChatMessage.streaming_status == "streaming"
                ).first()
                
                if streaming_msg:
                    streaming_msg.streaming_status = "interrupted"
                    db.commit()
                    logger.info(f"Marked streaming message {streaming_msg.id} as interrupted for session {session_id}")
                else:
                    logger.info(f"No streaming message found to mark as interrupted for session {session_id}")
                
            except Exception as e:
                logger.error(f"Error updating database for session {session_id}: {e}")
                try:
                    db.rollback()
                except:
                    pass
            finally:
                db.close()
            
            # Broadcast stop notification to connected clients
            try:
                await self.broadcast_to_session(session_id, {
                    "type": "stopped",
                    "content": "AI response stopped by user"
                })
                logger.info(f"Broadcasted stop notification for session {session_id}")
            except Exception as e:
                logger.error(f"Error broadcasting stop notification for session {session_id}: {e}")
            
            # Remove from running tasks
            del self.running_tasks[session_id]
            logger.info(f"Stopped background task for session {session_id}")
            return True
        else:
            # Check if there's a streaming message in the database that we can mark as interrupted
            db = SessionLocal()
            try:
                streaming_msg = db.query(ChatMessage).filter(
                    ChatMessage.session_id == session_id,
                    ChatMessage.streaming_status == "streaming"
                ).first()
                
                if streaming_msg:
                    logger.info(f"Found orphaned streaming message {streaming_msg.id} for session {session_id}, marking as interrupted")
                    streaming_msg.streaming_status = "interrupted"
                    db.commit()
                    
                    # Broadcast stop notification
                    await self.broadcast_to_session(session_id, {
                        "type": "stopped",
                        "content": "AI response stopped by user"
                    })
                    
                    return True
            except Exception as e:
                logger.error(f"Error checking for orphaned streaming message in session {session_id}: {e}")
                try:
                    db.rollback()
                except:
                    pass
            finally:
                db.close()
        
        logger.info(f"No active streaming found for session {session_id}")
        return False

    async def _background_chat_worker(self, session_id: int, user_id: int, message_history: list, assistant_message_id: int):
        """Background worker that processes AI response and saves to database"""
        db = SessionLocal()
        try:
            # Get the assistant message record
            assistant_msg = db.query(ChatMessage).filter(ChatMessage.id == assistant_message_id).first()
            if not assistant_msg:
                logger.error(f"Assistant message {assistant_message_id} not found")
                return
            
            assistant_content = ""
            assistant_thinking = ""
            
            try:
                # Stream AI response in background
                async for chunk in ai_service_sqlite.chat_stream(user_id, message_history, db):
                    # Check if task was cancelled
                    if asyncio.current_task().cancelled():
                        logger.info(f"Background task cancelled for session {session_id}")
                        assistant_msg.streaming_status = "interrupted"
                        assistant_msg.content = assistant_content
                        assistant_msg.thinking = assistant_thinking if assistant_thinking else None
                        db.commit()
                        return
                    
                    if "error" in chunk:
                        # Mark as interrupted on error
                        assistant_msg.streaming_status = "interrupted"
                        db.commit()
                        
                        # Broadcast error to all connected clients
                        await self.broadcast_to_session(session_id, {
                            "type": "error",
                            "content": chunk["error"]
                        })
                        break
                        
                    elif chunk.get("type") == "content":
                        content = chunk.get("content", "")
                        thinking = chunk.get("thinking", "")
                        
                        assistant_content += content
                        if thinking:
                            assistant_thinking += thinking
                        
                        # Update database with current progress
                        try:
                            assistant_msg.content = assistant_content
                            if assistant_thinking:
                                assistant_msg.thinking = assistant_thinking
                            db.commit()
                        except Exception as commit_error:
                            logger.error(f"Error updating content for session {session_id}: {commit_error}")
                            try:
                                db.rollback()
                                # Retry with fresh session
                                db.refresh(assistant_msg)
                                assistant_msg.content = assistant_content
                                if assistant_thinking:
                                    assistant_msg.thinking = assistant_thinking
                                db.commit()
                            except:
                                logger.error(f"Failed to retry content update for session {session_id}")
                                pass
                        
                        # Broadcast to all connected clients
                        await self.broadcast_to_session(session_id, {
                            "type": "content",
                            "content": content,
                            "thinking": thinking if thinking else None
                        })
                        
                    elif chunk.get("type") == "done":
                        # Finalize assistant message
                        assistant_msg.content = assistant_content
                        assistant_msg.thinking = assistant_thinking if assistant_thinking else None
                        assistant_msg.streaming_status = "completed"
                        
                        # Update session
                        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
                        if session:
                            session.message_count += 2  # User + Assistant
                            session.updated_at = datetime.utcnow()
                        
                        db.commit()
                        
                        # Broadcast completion to all connected clients
                        await self.broadcast_to_session(session_id, {
                            "type": "done"
                        })
                        break
                        
            except asyncio.CancelledError:
                logger.info(f"Background task cancelled for session {session_id}")
                # Mark as interrupted when cancelled
                assistant_msg.streaming_status = "interrupted"
                assistant_msg.content = assistant_content
                assistant_msg.thinking = assistant_thinking if assistant_thinking else None
                db.commit()
                raise
                
            except Exception as stream_error:
                logger.error(f"Background streaming error for session {session_id}: {stream_error}")
                # Mark as interrupted on streaming error
                assistant_msg.streaming_status = "interrupted"
                assistant_msg.content = assistant_content
                assistant_msg.thinking = assistant_thinking if assistant_thinking else None
                db.commit()
                
                # Broadcast error to all connected clients
                await self.broadcast_to_session(session_id, {
                    "type": "error",
                    "content": f"Streaming error: {str(stream_error)}"
                })
        
        finally:
            db.close()
            # Remove task from tracking
            if session_id in self.running_tasks:
                del self.running_tasks[session_id]
            logger.info(f"Background chat task completed for session {session_id}")

# Global instance
background_chat_service = BackgroundChatService()