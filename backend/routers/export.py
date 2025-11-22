from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from prisma import Prisma
import database, auth, doc_generator

router = APIRouter(prefix="/export", tags=["Export"])

@router.get("/{project_id}")
async def export_project(project_id: int, db: Prisma = Depends(database.get_db), current_user = Depends(auth.get_current_user)):
    project = await db.project.find_first(
        where={
            "id": project_id,
            "userId": current_user.id
        },
        include={
            "sections": {
                "order_by": {"orderIndex": "asc"}
            }
        }
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.type == "docx":
        file_stream = doc_generator.create_docx(project)
        filename = f"{project.title}.docx"
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif project.type == "pptx":
        file_stream = doc_generator.create_pptx(project)
        filename = f"{project.title}.pptx"
        media_type = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    else:
        raise HTTPException(status_code=400, detail="Unknown project type")

    return StreamingResponse(
        file_stream,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
