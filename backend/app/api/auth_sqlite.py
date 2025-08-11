from fastapi import APIRouter, HTTPException, status, Depends
from datetime import timedelta
from app.models.sqlite_models import UserCreate, UserLogin, UserResponse
from app.database.sqlite_models import User
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.auth_sqlite import get_current_user
from app.database.sqlite_connection import get_database
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/register", response_model=dict)
async def register(user_create: UserCreate):
    database = get_database()
    
    try:
        # Check if username already exists
        query = "SELECT id FROM users WHERE username = :username"
        existing_user = await database.fetch_one(query=query, values={"username": user_create.username})
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )
        
        # Create new user
        hashed_password = get_password_hash(user_create.password)
        query = """
            INSERT INTO users (username, password_hash, created_at) 
            VALUES (:username, :password_hash, :created_at)
        """
        values = {
            "username": user_create.username,
            "password_hash": hashed_password,
            "created_at": "datetime('now')"
        }
        
        # Use raw SQL to handle datetime properly
        result = await database.execute(
            query="INSERT INTO users (username, password_hash, created_at) VALUES (:username, :password_hash, datetime('now'))",
            values={"username": user_create.username, "password_hash": hashed_password}
        )
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = create_access_token(
            data={"sub": user_create.username}, expires_delta=access_token_expires
        )
        
        logger.info(f"User {user_create.username} registered successfully")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "message": "User registered successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed. Please try again."
        )

@router.post("/login", response_model=dict)
async def login(user_login: UserLogin):
    database = get_database()
    
    try:
        # Find user
        query = "SELECT id, username, password_hash FROM users WHERE username = :username"
        user_record = await database.fetch_one(query=query, values={"username": user_login.username})
        
        if not user_record or not verify_password(user_login.password, user_record["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = create_access_token(
            data={"sub": user_login.username}, expires_delta=access_token_expires
        )
        
        logger.info(f"User {user_login.username} logged in successfully")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "message": "Login successful"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed. Please try again."
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information"""
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        created_at=current_user.created_at.isoformat(),
        active_ai_provider_id=current_user.active_ai_provider_id
    )
