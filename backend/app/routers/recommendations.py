from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from .. import database, models, auth, schemas
from typing import List

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

@router.get("/events", response_model=List[schemas.EventResponse])
def recommend_events(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Subquery to count participants per event
    participants_count_subq = select(
        models.EventParticipant.event_id,
        func.count(models.EventParticipant.user_id).label("count")
    ).group_by(models.EventParticipant.event_id).subquery()

    upcoming = db.query(
        models.Event,
        func.coalesce(participants_count_subq.c.count, 0).label("participants_count")
    ).outerjoin(
        participants_count_subq,
        models.Event.id == participants_count_subq.c.event_id
    ).filter(
        models.Event.time > func.now()
    ).order_by(models.Event.time).limit(10).all()

    # Convert to EventResponse objects
    result = []
    for event, count in upcoming:
        event.participants_count = count  # add the count to the event object
        result.append(event)
    return result