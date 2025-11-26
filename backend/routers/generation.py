from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from prisma import Prisma
import database, auth, ai_service

router = APIRouter(prefix="/generate", tags=["Generation"])

class RefineRequest(BaseModel):
    instruction: str

@router.post("/section/{section_id}")
async def generate_section(section_id: int, db: Prisma = Depends(database.get_db), current_user = Depends(auth.get_current_user)):
    section = await db.documentsection.find_unique(
        where={"id": section_id},
        include={"project": True}
    )
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    # Verify ownership
    if section.project.userId != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    content = ai_service.generate_section_content(section.project.title, section.project.type, section.title)

    await db.documentsection.update(
        where={"id": section_id},
        data={"content": content}
    )

    # Update project's updatedAt timestamp
    from datetime import datetime
    await db.project.update(
        where={"id": section.project.id},
        data={"updatedAt": datetime.now()}
    )

    return {"content": content}

@router.post("/refine/{section_id}")
async def refine_section(section_id: int, request: RefineRequest, db: Prisma = Depends(database.get_db), current_user = Depends(auth.get_current_user)):
    section = await db.documentsection.find_unique(
        where={"id": section_id},
        include={"project": True}
    )
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    if section.project.userId != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Generate new content
    new_content = ai_service.refine_section_content(section.content, request.instruction, section.project.type)

    # Save history
    await db.refinementhistory.create(
        data={
            "sectionId": section.id,
            "prompt": request.instruction,
            "previousContent": section.content or "",
            "newContent": new_content
        }
    )

    # Update section
    await db.documentsection.update(
        where={"id": section_id},
        data={"content": new_content}
    )

    # Update project's updatedAt timestamp
    from datetime import datetime
    await db.project.update(
        where={"id": section.project.id},
        data={"updatedAt": datetime.now()}
    )

    return {"content": new_content}

@router.post("/project/{project_id}/generate-all")
async def generate_all_sections(project_id: int, db: Prisma = Depends(database.get_db), current_user = Depends(auth.get_current_user)):
    """Generate content for all sections in a project that don't have content yet"""
    project = await db.project.find_unique(
        where={"id": project_id},
        include={"sections": True}
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.userId != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    generated_count = 0
    for section in project.sections:
        if not section.content or section.content.strip() == "":
            content = ai_service.generate_section_content(project.title, project.type, section.title)
            await db.documentsection.update(
                where={"id": section.id},
                data={"content": content}
            )
            generated_count += 1

    # Update project's updatedAt timestamp if any sections were generated
    if generated_count > 0:
        from datetime import datetime
        await db.project.update(
            where={"id": project_id},
            data={"updatedAt": datetime.now()}
        )

    return {"message": f"Generated content for {generated_count} sections", "count": generated_count}
