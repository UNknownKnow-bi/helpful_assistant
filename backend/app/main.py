from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database.sqlite_connection import connect_to_database, disconnect_from_database
from app.api import auth_sqlite, ai_providers_sqlite, chat_sqlite, task_sqlite, user_profile_sqlite

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_database()
    yield
    # Shutdown
    await disconnect_from_database()

app = FastAPI(
    title="智时助手 (Cortex Assistant) API",
    description="""
    ## AI-powered intelligent assistant for Chinese knowledge workers

    This API provides comprehensive functionality for:
    
    * **🤖 AI Provider Management** - Configure and manage multiple AI models (text/image)
    * **📋 Task Management** - AI-powered task generation with Eisenhower Matrix
    * **💬 Real-time Chat** - WebSocket-based chat with AI models and thinking visualization
    * **👤 User Profiling** - Big Five personality model and work relationship management
    * **🖼️ OCR Integration** - Extract text from images using EasyOCR and AI vision models
    * **🔐 JWT Authentication** - Secure user authentication and authorization

    ### Key Features:
    - **Multi-modal AI Support**: Text generation, image OCR, and vision-language models
    - **Real-time Streaming**: WebSocket-based chat with background task management
    - **Personality-based Customization**: Big Five model for personalized AI interactions
    - **Eisenhower Matrix**: Task prioritization with urgency/importance classification
    - **Chinese Language Optimized**: Designed specifically for Chinese knowledge workers
    """,
    version="2.0.0",
    lifespan=lifespan,
    contact={
        "name": "Cortex Assistant Team",
        "url": "https://github.com/your-org/helpful-assistant",
        "email": "support@cortex-assistant.com",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
    servers=[
        {
            "url": "http://localhost:8000",
            "description": "Development server"
        },
        {
            "url": "https://api.cortex-assistant.com",
            "description": "Production server"
        }
    ],
    openapi_tags=[
        {
            "name": "Authentication",
            "description": "User registration, login, and JWT token management",
        },
        {
            "name": "AI Providers",
            "description": "Configure and manage AI models (text/image categories)",
        },
        {
            "name": "Tasks",
            "description": "AI-powered task generation and management with Eisenhower Matrix",
        },
        {
            "name": "Chat",
            "description": "Real-time chat interface with WebSocket streaming",
        },
        {
            "name": "User Profile",
            "description": "User profiling with Big Five personality model and work relationships",
        },
        {
            "name": "OCR",
            "description": "Image text extraction using EasyOCR and AI vision models",
        }
    ]
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_sqlite.router, prefix="/api")
app.include_router(ai_providers_sqlite.router, prefix="/api")
app.include_router(chat_sqlite.router, prefix="/api")
app.include_router(task_sqlite.router, prefix="/api")
app.include_router(user_profile_sqlite.router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Helpful Assistant API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)