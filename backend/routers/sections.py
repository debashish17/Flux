
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from prisma import Prisma
from typing import Optional, List
from datetime import datetime
import database, auth


# Router
router = APIRouter(tags=["Sections"])

class SectionUpdateRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class SectionCreateRequest(BaseModel):
    title: str
    content: Optional[str] = ""
    insertAfter: Optional[int] = None  # section_id to insert after, None = append

class SectionReorderRequest(BaseModel):
    newOrderIndex: int


class BulkDeleteRequest(BaseModel):
    sectionIds: List[int]

class BulkReorderRequest(BaseModel):
    sectionOrder: List[int]  # List of section IDs in new order

class SectionSnapshotCreateRequest(BaseModel):
    title: str
    content: str
    changeType: Optional[str] = "manual"


async def verify_project_ownership(db: Prisma, project_id: int, user_id: int):
    project = await db.project.find_first(
        where={"id": project_id, "userId": user_id}
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


# Create section under a project
@router.post("/projects/{project_id}/sections")
async def create_section(
    project_id: int,
    request: SectionCreateRequest,
    db: Prisma = Depends(database.get_db),
    current_user = Depends(auth.get_current_user)
):
    """Add new section to project (RESTful)"""
    import logging
    logger = logging.getLogger("uvicorn.error")

    logger.info(f"POST /projects/{project_id}/sections for project {project_id} by user {current_user.id}")

    # Verify project ownership
    await verify_project_ownership(db, project_id, current_user.id)

    # Determine order index
    if request.insertAfter:
        # Insert after specific section
        after_section = await db.documentsection.find_unique(
            where={"id": request.insertAfter}
        )
        if not after_section or after_section.projectId != project_id:
            raise HTTPException(status_code=400, detail="Invalid insertAfter section")

        new_order_index = after_section.orderIndex + 1

        # Shift subsequent sections down
        await db.documentsection.update_many(
            where={
                "projectId": project_id,
                "orderIndex": {"gte": new_order_index}
            },
            data={
                "orderIndex": {"increment": 1}
            }
        )
    else:
        # Append to end
        last_section = await db.documentsection.find_first(
            where={"projectId": project_id},
            order={"orderIndex": "desc"}
        )
        new_order_index = (last_section.orderIndex + 1) if last_section else 0

    # Create section
    new_section = await db.documentsection.create(
        data={
            "title": request.title,
            "content": request.content or "",
            "orderIndex": new_order_index,
            "projectId": project_id
        }
    )

    # Update project timestamp
    await db.project.update(
        where={"id": project_id},
        data={"updatedAt": datetime.now()}
    )

    logger.info(f"Section {new_section.id} created at order {new_order_index}")
    return new_section


# Bulk delete sections
@router.delete("/projects/{project_id}/sections")
async def bulk_delete_sections(
    project_id: int,
    request: BulkDeleteRequest,
    db: Prisma = Depends(database.get_db),
    current_user = Depends(auth.get_current_user)
):
    """Bulk delete sections from a project"""
    await verify_project_ownership(db, project_id, current_user.id)
    await db.documentsection.delete_many(
        where={"projectId": project_id, "id": {"in": request.sectionIds}}
    )
    await db.project.update(
        where={"id": project_id},
        data={"updatedAt": datetime.now()}
    )
    return {"message": "Sections deleted successfully"}


# Bulk reorder sections
@router.patch("/projects/{project_id}/sections/reorder")
async def bulk_reorder_sections(
    project_id: int,
    request: BulkReorderRequest,
    db: Prisma = Depends(database.get_db),
    current_user = Depends(auth.get_current_user)
):
    """Bulk reorder sections in a project"""
    await verify_project_ownership(db, project_id, current_user.id)
    for idx, section_id in enumerate(request.sectionOrder):
        await db.documentsection.update(
            where={"id": section_id, "projectId": project_id},
            data={"orderIndex": idx}
        )
    await db.project.update(
        where={"id": project_id},
        data={"updatedAt": datetime.now()}
    )
    return {"message": "Sections reordered successfully"}

# -------------------
# /sections/{section_id} endpoints (single section resource)
# -------------------

# Get a single section
@router.get("/sections/{section_id}")
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



# Update a section
@router.patch("/sections/{section_id}")
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


# Delete a section
@router.delete("/sections/{section_id}")
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



# Reorder a single section
@router.patch("/sections/{section_id}/reorder")
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


@router.get("/sections/{section_id}/refinement-history")
async def get_section_refinement_history(
    section_id: int,
    db: Prisma = Depends(database.get_db),
    current_user = Depends(auth.get_current_user)
):
    """
    Get refinement history for a section.
    This endpoint returns the list of section snapshots for a section,
    using the SectionSnapshot model (replaces RefinementHistory).
    """
    import logging
    logger = logging.getLogger("uvicorn.error")

    logger.info(f"GET /sections/{section_id}/refinement-history by user {current_user.id}")

    # Verify section exists and user has access
    section = await db.documentsection.find_unique(
        where={"id": section_id},
        include={"project": True}
    )

    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    if section.project.userId != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Fetch section snapshots (refinement history)
    snapshots = await db.sectionsnapshot.find_many(
        where={"sectionId": section_id},
        order={"createdAt": "desc"}
    )

    logger.info(f"Found {len(snapshots)} section snapshots for section {section_id}")
    return snapshots

@router.post("/sections/{section_id}/refinement-history")
async def create_section_snapshot(
    section_id: int,
    request: SectionSnapshotCreateRequest,
    db: Prisma = Depends(database.get_db),
    current_user = Depends(auth.get_current_user)
):
    """
    Create a new section snapshot (refinement history entry) for a section.
    This should be called before regenerating or refining a section, to preserve the previous state.
    """
    import logging
    logger = logging.getLogger("uvicorn.error")

    logger.info(f"POST /sections/{section_id}/refinement-history by user {current_user.id}")

    # Verify section exists and user has access
    section = await db.documentsection.find_unique(
        where={"id": section_id},
        include={"project": True}
    )

    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    if section.project.userId != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Create snapshot
    snapshot = await db.sectionsnapshot.create(
        data={
            "sectionId": section_id,
            "title": request.title,
            "content": request.content,
            "changeType": request.changeType or "manual"
        }
    )

    logger.info(f"SectionSnapshot {snapshot.id} created for section {section_id}")
    return snapshot


@router.post("/sections/{section_id}/refinement-history/{snapshot_id}/restore")
async def restore_section_snapshot(
    section_id: int,
    snapshot_id: int,
    db: Prisma = Depends(database.get_db),
    current_user = Depends(auth.get_current_user)
):
    """
    Restore a section to a previous snapshot version.
    Creates a new snapshot of current state before restoring.
    """
    import logging
    import markdown_utils
    logger = logging.getLogger("uvicorn.error")

    logger.info(f"POST /sections/{section_id}/refinement-history/{snapshot_id}/restore by user {current_user.id}")

    # Verify section exists and user has access
    section = await db.documentsection.find_unique(
        where={"id": section_id},
        include={"project": True}
    )

    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    if section.project.userId != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get the snapshot to restore
    snapshot = await db.sectionsnapshot.find_unique(
        where={"id": snapshot_id}
    )

    if not snapshot or snapshot.sectionId != section_id:
        raise HTTPException(status_code=404, detail="Snapshot not found")

    # Restore the section to the snapshot state
    updated_section = await db.documentsection.update(
        where={"id": section_id},
        data={
            "title": snapshot.title,
            "content": snapshot.content
        }
    )

    # Update project timestamp
    await db.project.update(
        where={"id": section.project.id},
        data={"updatedAt": datetime.now()}
    )

    logger.info(f"Section {section_id} restored to snapshot {snapshot_id}")
    return updated_section
