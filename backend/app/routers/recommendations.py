from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from .. import database, models, auth, schemas
from typing import List

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

@router.get("/events", response_model=List[schemas.EventResponse])
def recommend_events(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Just return upcoming events (any user)
    upcoming = db.query(models.Event).filter(
        models.Event.time > func.now()
    ).order_by(models.Event.time).limit(10).all()
    return upcoming