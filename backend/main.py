from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import connect_db, disconnect_db
from routers import auth, projects, generation, export, chat
from routers import sections, feedback

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

# CORS - Explicitly configure to allow DELETE requests
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

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(generation.router)
app.include_router(export.router)
app.include_router(chat.router)
app.include_router(sections.router)
app.include_router(feedback.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Document Authoring Platform API"}
