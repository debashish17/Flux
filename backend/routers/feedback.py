

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from prisma import Prisma
from typing import Optional
from datetime import datetime
import database, auth, ai_service, markdown_utils
import logging

router = APIRouter(prefix="/feedback", tags=["Feedback"])
logger = logging.getLogger("uvicorn.error")

# Pydantic Models
class FeedbackRequest(BaseModel):
    type: str  # "LIKE" or "DISLIKE"

class CommentRequest(BaseModel):
    comment: str

class RegenerateFeedbackRequest(BaseModel):
    feedback: Optional[str] = None  # User's feedback on why they dislike it (optional - will fetch from comments if not provided)


@router.get("/projects/{project_id}/comments")
async def get_project_comments_batch(
    project_id: int,
    db: Prisma = Depends(database.get_db),
    current_user = Depends(auth.get_current_user)
):
    """Get all comments for all sections in a project (batch request to reduce API calls)"""
    logger.info(f"GET /feedback/projects/{project_id}/comments (batch)")

    # Verify project exists and user has access
    project = await db.project.find_unique(
        where={"id": project_id},
        include={
            "sections": {
                "include": {
                    "comments": {
                        "where": {"userId": current_user.id},
                        "orderBy": {"createdAt": "desc"}
                    }
                }
            }
        }
    )

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.userId != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Build response: {sectionId: [comments]}
    comments_map = {}
    for section in project.sections:
        comments_map[section.id] = [
            {"id": c.id, "comment": c.comment, "createdAt": c.createdAt.isoformat()} for c in section.comments
        ]

    logger.info(f"Returned batch comments for {len(project.sections)} sections")
    return comments_map


@router.post("/sections/{section_id}")
async def add_feedback(
    section_id: int,
    request: FeedbackRequest,
    db: Prisma = Depends(database.get_db),
    current_user = Depends(auth.get_current_user)
):
    """Add or update feedback (like/dislike) for a section"""
    logger.info(f"POST /feedback/sections/{section_id} - type: {request.type} by user {current_user.id}")

    # Verify section exists and user has access
    section = await db.documentsection.find_unique(
        where={"id": section_id},
        include={"project": True}
    )

    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    if section.project.userId != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Validate feedback type
    if request.type not in ["LIKE", "DISLIKE"]:
        raise HTTPException(status_code=400, detail="Feedback type must be 'LIKE' or 'DISLIKE'")

    try:
        # Use upsert to handle both create and update
        feedback = await db.sectionfeedback.upsert(
            where={
                "sectionId_userId": {
                    "sectionId": section_id,
                    "userId": current_user.id
                }
            },
            data={
                "create": {
                    "sectionId": section_id,
                    "userId": current_user.id,
                    "type": request.type
                },
                "update": {
                    "type": request.type
                }
            }
        )
        logger.info(f"Upserted feedback {feedback.id} with type {request.type}")
        return feedback
    except Exception as e:
        logger.error(f"Failed to upsert feedback: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save feedback: {str(e)}")


@router.get("/projects/{project_id}/batch")
async def get_project_feedback_batch(
    project_id: int,
    db: Prisma = Depends(database.get_db),
    current_user = Depends(auth.get_current_user)
):
    """Get feedback for all sections in a project (batch request to reduce API calls)"""
    logger.info(f"GET /feedback/projects/{project_id}/batch")

    # Verify project exists and user has access - use nested include to avoid N+1 query
    project = await db.project.find_unique(
        where={"id": project_id},
        include={
            "sections": {
                "include": {
                    "feedback": {
                        "where": {"userId": current_user.id}
                    }
                }
            }
        }
    )

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.userId != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Build response: {sectionId: {userFeedback: "LIKE"/"DISLIKE"/null}}
    feedback_map = {}
    for section in project.sections:
        # Each section now has feedback included
        user_feedback = section.feedback[0] if section.feedback else None
        feedback_map[section.id] = {
            "userFeedback": user_feedback.type if user_feedback else None
        }

    logger.info(f"Returned batch feedback for {len(project.sections)} sections")
    return feedback_map


@router.get("/sections/{section_id}")
async def get_feedback(
    section_id: int,
    db: Prisma = Depends(database.get_db),
    current_user = Depends(auth.get_current_user)
):
    """Get all feedback for a section"""
    logger.info(f"GET /feedback/sections/{section_id}")

    # Verify section exists and user has access
    section = await db.documentsection.find_unique(
        where={"id": section_id},
        include={"project": True}
    )

    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    if section.project.userId != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get feedback stats using database COUNT queries for better performance
    likes_count = await db.sectionfeedback.count(
        where={
            "sectionId": section_id,
            "type": "LIKE"
        }
    )

    dislikes_count = await db.sectionfeedback.count(
        where={
            "sectionId": section_id,
            "type": "DISLIKE"
        }
    )

    # Get current user's feedback
    user_feedback = await db.sectionfeedback.find_unique(
        where={
            "sectionId_userId": {
                "sectionId": section_id,
                "userId": current_user.id
            }
        }
    )

    return {
        "likes": likes_count,
        "dislikes": dislikes_count,
        "userFeedback": user_feedback.type if user_feedback else None
    }


@router.delete("/sections/{section_id}")
async def remove_feedback(
    section_id: int,
    db: Prisma = Depends(database.get_db),
    current_user = Depends(auth.get_current_user)
):
    """Remove user's feedback from a section"""
    logger.info(f"DELETE /feedback/sections/{section_id}")

    # Check if feedback exists
    feedback = await db.sectionfeedback.find_unique(
        where={
            "sectionId_userId": {
                "sectionId": section_id,
                "userId": current_user.id
            }
        }
    )

    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")

    await db.sectionfeedback.delete(where={"id": feedback.id})

    logger.info(f"Removed feedback {feedback.id}")
    return {"message": "Feedback removed successfully"}


@router.post("/sections/{section_id}/regenerate")
async def regenerate_with_feedback(
    section_id: int,
    db: Prisma = Depends(database.get_db),
    current_user = Depends(auth.get_current_user),
    request: RegenerateFeedbackRequest = None
):
    """Regenerate section content based on user feedback"""
    logger.info(f"POST /feedback/sections/{section_id}/regenerate")

    # Verify section exists and user has access
    section = await db.documentsection.find_unique(
        where={"id": section_id},
        include={"project": True}
    )

    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    if section.project.userId != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    try:
        # Frontend always sends the user's typed feedback in the request body.
        feedback_text = (request.feedback if request else "") or ""
        feedback_text = feedback_text.strip()
        if not feedback_text:
            raise HTTPException(
                status_code=400,
                detail="No feedback provided. Please add a comment explaining what needs improvement.",
            )

        logger.info(f"Regenerating section {section_id} with feedback: {feedback_text[:50]}...")

        # Use specialized feedback regeneration function
        refined_content = ai_service.regenerate_with_feedback(
            section.content or "",
            feedback_text,
            section.project.type
        )

        # Only save snapshot if content actually changed
        if section.content != refined_content:
            await db.sectionsnapshot.create(
                data={
                    "sectionId": section_id,
                    "title": section.title,
                    "content": section.content or "",
                    "changeType": f"feedback_regeneration: {feedback_text[:100]}"
                }
            )

        # Update section
        updated_section = await db.documentsection.update(
            where={"id": section_id},
            data={"content": refined_content}
        )

        # Update project timestamp
        await db.project.update(
            where={"id": section.project.id},
            data={"updatedAt": datetime.now()}
        )

        # Reset dislike feedback to neutral (delete feedback and comments)
        # Only reset if user had disliked it - keep likes persistent
        user_feedback = await db.sectionfeedback.find_unique(
            where={
                "sectionId_userId": {
                    "sectionId": section_id,
                    "userId": current_user.id
                }
            }
        )

        if user_feedback and user_feedback.type == "DISLIKE":
            # Delete the dislike feedback
            await db.sectionfeedback.delete(where={"id": user_feedback.id})
            logger.info(f"Reset dislike feedback for section {section_id}")

            # Delete any feedback comments
            comments = await db.sectioncomment.find_many(
                where={
                    "sectionId": section_id,
                    "userId": current_user.id
                }
            )
            for comment in comments:
                await db.sectioncomment.delete(where={"id": comment.id})
            logger.info(f"Deleted {len(comments)} feedback comments for section {section_id}")

        logger.info(f"Section {section_id} regenerated based on feedback")
        
        # Return full section object for frontend cache consistency
        return {
            "id": updated_section.id,
            "title": updated_section.title,
            "content": updated_section.content,
            "orderIndex": updated_section.orderIndex
        }

    except Exception as e:
        logger.error(f"Failed to regenerate section: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to regenerate content: {str(e)}")


# Comment endpoints
@router.post("/sections/{section_id}/comments")
async def add_comment(
    section_id: int,
    request: CommentRequest,
    db: Prisma = Depends(database.get_db),
    current_user = Depends(auth.get_current_user)
):
    """Add a comment to a section"""
    logger.info(f"POST /feedback/sections/{section_id}/comments")

    # Verify section exists and user has access
    section = await db.documentsection.find_unique(
        where={"id": section_id},
        include={"project": True}
    )

    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    if section.project.userId != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Create comment
    comment = await db.sectioncomment.create(
        data={
            "sectionId": section_id,
            "userId": current_user.id,
            "comment": request.comment
        },
        include={"user": True}
    )

    logger.info(f"Created comment {comment.id}")
    return comment


@router.get("/sections/{section_id}/comments")
async def get_comments(
    section_id: int,
    db: Prisma = Depends(database.get_db),
    current_user = Depends(auth.get_current_user)
):
    """Get all comments for a section"""
    logger.info(f"GET /feedback/sections/{section_id}/comments")

    # Verify section exists and user has access
    section = await db.documentsection.find_unique(
        where={"id": section_id},
        include={"project": True}
    )

    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    if section.project.userId != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get comments
    comments = await db.sectioncomment.find_many(
        where={"sectionId": section_id},
        include={"user": True},
        order={"createdAt": "desc"}
    )

    logger.info(f"Found {len(comments)} comments")
    return comments


@router.delete("/sections/{section_id}/comments/{comment_id}")
async def delete_comment(
    section_id: int,
    comment_id: int,
    db: Prisma = Depends(database.get_db),
    current_user = Depends(auth.get_current_user)
):
    """Delete a comment"""
    logger.info(f"DELETE /feedback/sections/{section_id}/comments/{comment_id}")

    # Verify comment exists and belongs to user
    comment = await db.sectioncomment.find_unique(
        where={"id": comment_id}
    )

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.sectionId != section_id:
        raise HTTPException(status_code=400, detail="Comment does not belong to this section")

    if comment.userId != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

    await db.sectioncomment.delete(where={"id": comment_id})

    logger.info(f"Deleted comment {comment_id}")
    return {"message": "Comment deleted successfully"}
