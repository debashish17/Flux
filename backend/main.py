from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import connect_db, disconnect_db
from routers import auth, projects, generation, export, chat

app = FastAPI(title="AI Document Authoring Platform")

# Database lifecycle management
@app.on_event("startup")
async def startup():
    """Connect to database on startup"""
    await connect_db()
    print("[Startup] Prisma database connection established.")

@app.on_event("shutdown")
async def shutdown():
    """Disconnect from database on shutdown"""
    await disconnect_db()
    print("[Shutdown] Prisma database connection closed.")

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

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Document Authoring Platform API"}
