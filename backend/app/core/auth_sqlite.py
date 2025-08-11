from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import verify_token
from app.database.sqlite_connection import get_database
from app.models.sqlite_models import User

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current user from JWT token using SQLite database"""
    database = get_database()
    
    username = verify_token(credentials.credentials)
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Query SQLite database for user
    query = "SELECT id, username, password_hash, created_at, active_ai_provider_id FROM users WHERE username = :username"
    user_record = await database.fetch_one(query=query, values={"username": username})
    
    if user_record is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials", 
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Convert to User model (adapting for integer IDs instead of ObjectId)
    return User(
        id=user_record["id"],
        username=user_record["username"], 
        password_hash=user_record["password_hash"],
        created_at=user_record["created_at"],
        active_ai_provider_id=user_record["active_ai_provider_id"]
    )