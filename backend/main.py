import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import connect_db, disconnect_db
from routers import projects, generation, export, chat
from routers import sections, feedback

# Only print debug info in development
if os.getenv("ENVIRONMENT") == "development":
    print(f"[STARTUP] Sections router loaded: {sections.router}")
    print(f"[STARTUP] Sections router prefix: {sections.router.prefix}")
    print(f"[STARTUP] Sections router routes: {len(sections.router.routes)}")

# Database lifecycle management with lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage database connection lifecycle"""
    # Startup
    await connect_db()
    print("[Startup] Prisma database connection established.")
    yield
    # Shutdown
    await disconnect_db()
    print("[Shutdown] Prisma database connection closed.")

app = FastAPI(title="AI Document Authoring Platform", lifespan=lifespan)

# CORS - Configure based on environment
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

if ENVIRONMENT == "production":
    # Restrict CORS in production to specific origins
    origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
    origins = [origin.strip() for origin in origins if origin.strip()]
else:
    # Allow all origins in development
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

app.include_router(projects.router)
app.include_router(generation.router)
app.include_router(export.router)
app.include_router(chat.router)
app.include_router(sections.router)
app.include_router(feedback.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Document Authoring Platform API"}
