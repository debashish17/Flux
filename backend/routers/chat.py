from fastapi import APIRouter, Depends
from pydantic import BaseModel
from prisma import Prisma
import database, auth, ai_service

router = APIRouter(prefix="/chat", tags=["Chat"])

class ChatRequest(BaseModel):
    message: str
    project_id: int = None

@router.post("/")
async def chat(
    request: ChatRequest,
    db: Prisma = Depends(database.get_db),
    current_user = Depends(auth.get_current_user)
):
    """Chat with AI assistant"""
    project_context = ""

    if request.project_id:
        # Get project context
        project = await db.project.find_first(
            where={
                "id": request.project_id,
                "userId": current_user.id
            },
            include={"sections": True}
        )

        if project:
            sections_text = "\n".join([f"- {s.title}" for s in project.sections])
            project_context = f"Project: {project.title} (Type: {project.type})\nSections:\n{sections_text}"

    response = ai_service.chat_with_ai(request.message, project_context)

    return {"response": response}
