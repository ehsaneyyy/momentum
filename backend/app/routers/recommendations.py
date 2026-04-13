from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import database, auth, models
from typing import List

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

@router.get("/events")
def recommend_events(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    try:
        # Test: return a simple list of public events (no fancy logic)
        events = db.query(models.Event).filter(
            models.Event.time > db.func.now()
        ).limit(5).all()
        return events
    except Exception as e:
        # Log the error and return a clear message
        print(f"ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))