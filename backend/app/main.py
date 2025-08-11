from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database.sqlite_connection import connect_to_database, disconnect_from_database
from app.api import auth_sqlite, ai_providers_sqlite, chat_sqlite

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_database()
    yield
    # Shutdown
    await disconnect_from_database()

app = FastAPI(
    title="Helpful Assistant API",
    description="AI-powered intelligent assistant for Chinese knowledge workers",
    version="1.0.0",
    lifespan=lifespan
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
# TODO: Update other routers to use SQLite
# app.include_router(tasks.router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Helpful Assistant API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)