from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from prisma import Prisma
from typing import Optional
from datetime import datetime
import database, auth

router = APIRouter(prefix="/sections", tags=["Sections"])

# Pydantic Models for Request/Response
class SectionUpdateRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class SectionCreateRequest(BaseModel):
    projectId: int
    title: str
    content: Optional[str] = ""
    insertAfter: Optional[int] = None  # section_id to insert after, None = append

class SectionReorderRequest(BaseModel):
    newOrderIndex: int


@router.get("/{section_id}")
async def get_section(
    section_id: int,
    db: Prisma = Depends(database.get_db),
    current_user = Depends(auth.get_current_user)
):
    """Get a single section by ID"""
    import logging
    logger = logging.getLogger("uvicorn.error")

    logger.info(f"GET /sections/{section_id} by user {current_user.id}")

    section = await db.documentsection.find_unique(
        where={"id": section_id},
        include={"project": True}
    )

    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    if section.project.userId != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    return section


@router.patch("/{section_id}")
async def update_section(
    section_id: int,
    request: SectionUpdateRequest,
    db: Prisma = Depends(database.get_db),
    current_user = Depends(auth.get_current_user)
):
    """Update section title and/or content"""
    import logging
    logger = logging.getLogger("uvicorn.error")

    logger.info(f"PATCH /sections/{section_id} by user {current_user.id}")

    # Fetch section with project relationship
    section = await db.documentsection.find_unique(
        where={"id": section_id},
        include={"project": True}
    )

    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    if section.project.userId != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Build update data
    update_data = {}
    if request.title is not None:
        update_data["title"] = request.title
    if request.content is not None:
        update_data["content"] = request.content
        # For DOCX: Regenerate HTML from markdown
        if section.project.type == "docx":
            import markdown_utils
            update_data["htmlContent"] = markdown_utils.markdown_to_html(request.content)

    # Update section
    updated_section = await db.documentsection.update(
        where={"id": section_id},
        data=update_data
    )

    # Update project's updatedAt timestamp
    await db.project.update(
        where={"id": section.project.id},
        data={"updatedAt": datetime.now()}
    )

    logger.info(f"Section {section_id} updated successfully")
    return updated_section


@router.post("/")
async def create_section(
    request: SectionCreateRequest,
    db: Prisma = Depends(database.get_db),
    current_user = Depends(auth.get_current_user)
):
    """Add new section to project"""
    import logging
    logger = logging.getLogger("uvicorn.error")

    logger.info(f"POST /sections/ for project {request.projectId} by user {current_user.id}")

    # Verify project ownership
    project = await db.project.find_first(
        where={
            "id": request.projectId,
            "userId": current_user.id
        }
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Determine order index
    if request.insertAfter:
        # Insert after specific section
        after_section = await db.documentsection.find_unique(
            where={"id": request.insertAfter}
        )
        if not after_section or after_section.projectId != request.projectId:
            raise HTTPException(status_code=400, detail="Invalid insertAfter section")

        new_order_index = after_section.orderIndex + 1

        # Shift subsequent sections down
        await db.documentsection.update_many(
            where={
                "projectId": request.projectId,
                "orderIndex": {"gte": new_order_index}
            },
            data={
                "orderIndex": {"increment": 1}
            }
        )
    else:
        # Append to end
        last_section = await db.documentsection.find_first(
            where={"projectId": request.projectId},
            order={"orderIndex": "desc"}
        )
        new_order_index = (last_section.orderIndex + 1) if last_section else 0

    # Create section
    new_section = await db.documentsection.create(
        data={
            "title": request.title,
            "content": request.content or "",
            "orderIndex": new_order_index,
            "projectId": request.projectId,
            "htmlContent": ""
        }
    )

    # Update project timestamp
    await db.project.update(
        where={"id": request.projectId},
        data={"updatedAt": datetime.now()}
    )

    logger.info(f"Section {new_section.id} created at order {new_order_index}")
    return new_section


@router.delete("/{section_id}")
async def delete_section(
    section_id: int,
    db: Prisma = Depends(database.get_db),
    current_user = Depends(auth.get_current_user)
):
    """Delete section and reorder remaining sections"""
    import logging
    logger = logging.getLogger("uvicorn.error")

    logger.info(f"DELETE /sections/{section_id} by user {current_user.id}")

    # Fetch section with project
    section = await db.documentsection.find_unique(
        where={"id": section_id},
        include={"project": True}
    )

    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    if section.project.userId != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Check minimum section requirement
    section_count = await db.documentsection.count(
        where={"projectId": section.projectId}
    )
    if section_count <= 1:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete the last section. Projects must have at least one section."
        )

    # Store values before deletion
    project_id = section.projectId
    deleted_order = section.orderIndex

    # Delete section
    await db.documentsection.delete(where={"id": section_id})

    # Shift subsequent sections up
    await db.documentsection.update_many(
        where={
            "projectId": project_id,
            "orderIndex": {"gt": deleted_order}
        },
        data={
            "orderIndex": {"decrement": 1}
        }
    )

    # Update project timestamp
    await db.project.update(
        where={"id": project_id},
        data={"updatedAt": datetime.now()}
    )

    logger.info(f"Section {section_id} deleted successfully")
    return {"message": "Section deleted successfully"}


@router.patch("/{section_id}/reorder")
async def reorder_section(
    section_id: int,
    request: SectionReorderRequest,
    db: Prisma = Depends(database.get_db),
    current_user = Depends(auth.get_current_user)
):
    """Move section to new position"""
    import logging
    logger = logging.getLogger("uvicorn.error")

    logger.info(f"PATCH /sections/{section_id}/reorder to index {request.newOrderIndex}")

    # Fetch section with project
    section = await db.documentsection.find_unique(
        where={"id": section_id},
        include={"project": True}
    )

    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    if section.project.userId != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Validate new order index
    max_order = await db.documentsection.count(
        where={"projectId": section.projectId}
    ) - 1

    if request.newOrderIndex < 0 or request.newOrderIndex > max_order:
        raise HTTPException(status_code=400, detail="Invalid order index")

    if request.newOrderIndex == section.orderIndex:
        logger.info("No reordering needed (same position)")
        return section

    # Reorder logic
    old_order = section.orderIndex
    new_order = request.newOrderIndex

    if new_order < old_order:
        # Moving up - shift sections down
        await db.documentsection.update_many(
            where={
                "projectId": section.projectId,
                "orderIndex": {
                    "gte": new_order,
                    "lt": old_order
                }
            },
            data={"orderIndex": {"increment": 1}}
        )
    else:
        # Moving down - shift sections up
        await db.documentsection.update_many(
            where={
                "projectId": section.projectId,
                "orderIndex": {
                    "gt": old_order,
                    "lte": new_order
                }
            },
            data={"orderIndex": {"decrement": 1}}
        )

    # Update target section
    updated_section = await db.documentsection.update(
        where={"id": section_id},
        data={"orderIndex": new_order}
    )

    # Update project timestamp
    await db.project.update(
        where={"id": section.projectId},
        data={"updatedAt": datetime.now()}
    )

    logger.info(f"Section {section_id} reordered from {old_order} to {new_order}")
    return updated_section
