from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List, Optional
from pydantic import BaseModel
from prisma import Prisma
import database, auth, ai_service

router = APIRouter(prefix="/projects", tags=["Projects"])

class ProjectCreate(BaseModel):
    title: str
    type: str # "docx" or "pptx"
    initial_sections: List[str] # List of titles for sections/slides
    auto_generate: bool = False  # Whether to auto-generate content on creation
    prompt: Optional[str] = None  # Original user prompt for detailed generation

class ProjectPlanRequest(BaseModel):
    prompt: str
    type: str  # "docx" or "pptx"

class SectionResponse(BaseModel):
    id: int
    title: str
    content: Optional[str]
    htmlContent: Optional[str]
    orderIndex: int

    class Config:
        from_attributes = True

class ProjectResponse(BaseModel):
    id: int
    title: str
    type: str
    sections: List[SectionResponse] = []

    class Config:
        from_attributes = True

@router.post("/", response_model=ProjectResponse)
async def create_project(
    project: ProjectCreate,
    background_tasks: BackgroundTasks,
    db: Prisma = Depends(database.get_db),
    current_user = Depends(auth.get_current_user)
):
    # Create project
    db_project = await db.project.create(
        data={
            "title": project.title,
            "type": project.type,
            "prompt": project.prompt,
            "userId": current_user.id
        }
    )

    # Create sections
    for idx, title in enumerate(project.initial_sections):
        await db.documentsection.create(
            data={
                "title": title,
                "orderIndex": idx,
                "projectId": db_project.id,
                "content": ""
            }
        )

    # Fetch the complete project with sections
    complete_project = await db.project.find_unique(
        where={"id": db_project.id},
        include={"sections": True}
    )

    return complete_project

@router.post("/plan")
async def plan_project_from_prompt(request: ProjectPlanRequest, current_user = Depends(auth.get_current_user)):
    """Analyze user prompt and generate intelligent project structure (like Gamma.app)"""
    import logging
    logger = logging.getLogger("uvicorn.error")
    logger.info(f"PLAN PROJECT CALLED. Prompt: {request.prompt}, Type: {request.type}")
    if request.type == "pptx":
        structure = ai_service.plan_presentation_structure(request.prompt)
        logger.info(f"Gemini PPTX structure: {structure}")
        return {
            "title": structure.get("title", "Untitled Presentation"),
            "sections": structure.get("slides", []),
            "type": "pptx",
            "error": structure.get("error") if "error" in structure else None
        }
    else:  # docx
        structure = ai_service.plan_document_structure(request.prompt)
        logger.info(f"Gemini DOCX structure: {structure}")
        return {
            "title": structure.get("title", "Untitled Document"),
            "sections": structure.get("sections", []),
            "type": "docx",
            "error": structure.get("error") if "error" in structure else None
        }

@router.post("/{project_id}/generate-full-document")
async def generate_full_document(
    project_id: int,
    db: Prisma = Depends(database.get_db),
    current_user = Depends(auth.get_current_user)
):
    """Generate entire document at once in Markdown format for DOCX projects"""
    import logging
    import markdown_utils

    logger = logging.getLogger("uvicorn.error")

    logger.info(f"\n{'='*80}\nGENERATE FULL DOCUMENT ENDPOINT CALLED")
    logger.info(f"Project ID: {project_id}")
    logger.info(f"User ID: {current_user.id}")

    project = await db.project.find_first(
        where={
            "id": project_id,
            "userId": current_user.id
        }
    )

    if not project:
        logger.error(f"Project {project_id} not found")
        raise HTTPException(status_code=404, detail="Project not found")

    logger.info(f"Found project: {project.title} (type: {project.type})")

    if project.type != "docx":
        logger.error(f"Invalid project type: {project.type}")
        raise HTTPException(status_code=400, detail="Full document generation only available for DOCX projects")

    # Get section titles
    sections = await db.documentsection.find_many(
        where={"projectId": project_id},
        order={"orderIndex": "asc"}
    )

    section_titles = [s.title for s in sections]
    logger.info(f"Retrieved {len(sections)} sections: {section_titles}")

    # Generate full Markdown document
    logger.info("Calling AI service to generate Markdown...")
    markdown_content = await ai_service.generate_full_markdown_document(
        title=project.title,
        sections=section_titles,
        user_prompt=project.prompt or f"Create a comprehensive document about {project.title}"
    )

    logger.info(f"Markdown generation complete. Content length: {len(markdown_content)}")

    # Split markdown into sections
    logger.info("Splitting markdown into sections...")
    sections_content = markdown_utils.split_markdown_by_sections(markdown_content, section_titles)

    # Update each section with its content and HTML
    for section in sections:
        section_markdown = sections_content.get(section.title, f"## {section.title}\n\nContent not generated.")
        section_html = markdown_utils.markdown_to_html(section_markdown)

        logger.info(f"Updating section {section.id} ({section.title}): {len(section_markdown)} chars markdown, {len(section_html)} chars HTML")

        await db.documentsection.update(
            where={"id": section.id},
            data={
                "content": section_markdown,
                "htmlContent": section_html
            }
        )

    logger.info(f"All {len(sections)} sections updated successfully")
    logger.info(f"={'='*80}\n")

    return {
        "message": "Full document generated successfully",
        "sections_count": len(sections),
        "total_length": len(markdown_content)
    }

@router.get("/", response_model=List[ProjectResponse])
async def get_projects(db: Prisma = Depends(database.get_db), current_user = Depends(auth.get_current_user)):
    projects = await db.project.find_many(
        where={"userId": current_user.id},
        include={
            "sections": {
                "order_by": {"orderIndex": "asc"}
            }
        }
    )
    return projects

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: int, db: Prisma = Depends(database.get_db), current_user = Depends(auth.get_current_user)):
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
    return project

@router.delete("/{project_id}")
async def delete_project(project_id: int, db: Prisma = Depends(database.get_db), current_user = Depends(auth.get_current_user)):
    import logging
    logger = logging.getLogger("uvicorn.error")
    
    logger.info(f"Delete request for project {project_id} by user {current_user.id}")
    
    project = await db.project.find_first(
        where={
            "id": project_id,
            "userId": current_user.id
        }
    )
    if not project:
        logger.warning(f"Project {project_id} not found or unauthorized for user {current_user.id}")
        raise HTTPException(status_code=404, detail="Project not found")

    # Delete the project - cascade will handle sections and refinement history
    logger.info(f"Deleting project {project_id}: {project.title}")
    await db.project.delete(where={"id": project_id})
    logger.info(f"Successfully deleted project {project_id}")

    return {"message": "Project deleted successfully"}
