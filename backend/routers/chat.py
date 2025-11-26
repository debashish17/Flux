from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from prisma import Prisma
from typing import List
from datetime import datetime
import database, auth, ai_service
import logging

router = APIRouter(prefix="/chat", tags=["Chat"])
logger = logging.getLogger("uvicorn.error")

class ChatRequest(BaseModel):
    message: str
    project_id: int = None

class ChatMessageResponse(BaseModel):
    id: int
    role: str
    message: str
    createdAt: datetime

@router.post("/")
async def chat(
    request: ChatRequest,
    db: Prisma = Depends(database.get_db),
    current_user = Depends(auth.get_current_user)
):
    """Chat with AI assistant and save message history"""
    project_context = ""

    if request.project_id:
        # Verify user has access to project
        project = await db.project.find_first(
            where={
                "id": request.project_id,
                "userId": current_user.id
            },
            include={"sections": True}
        )

        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        sections_text = "\n".join([f"- {s.title}" for s in project.sections])
        project_context = f"Project: {project.title} (Type: {project.type})\nSections:\n{sections_text}"

        # Save user message
        await db.chatmessage.create(
            data={
                "projectId": request.project_id,
                "userId": current_user.id,
                "role": "user",
                "message": request.message
            }
        )
        logger.info(f"Saved user message for project {request.project_id}")

    # Get AI response
    response = ai_service.chat_with_ai(request.message, project_context)

    if request.project_id:
        # Save assistant response
        await db.chatmessage.create(
            data={
                "projectId": request.project_id,
                "userId": current_user.id,
                "role": "assistant",
                "message": response
            }
        )
        logger.info(f"Saved assistant response for project {request.project_id}")

    return {"response": response}

@router.get("/projects/{project_id}/history")
async def get_chat_history(
    project_id: int,
    db: Prisma = Depends(database.get_db),
    current_user = Depends(auth.get_current_user)
):
    """Get chat history for a project"""
    # Verify user has access to project
    project = await db.project.find_first(
        where={
            "id": project_id,
            "userId": current_user.id
        }
    )

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get all messages for this project, ordered by creation time
    messages = await db.chatmessage.find_many(
        where={
            "projectId": project_id
        },
        order={"createdAt": "asc"}
    )

    logger.info(f"Retrieved {len(messages)} chat messages for project {project_id}")

    return messages
