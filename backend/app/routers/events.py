from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import models, schemas, auth
from ..database import SessionLocal

router = APIRouter(prefix="/events", tags=["events"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=schemas.EventResponse)
def create_event(event: schemas.EventCreate, db: Session = Depends(get_db), current_user = Depends(auth.get_current_user)):
    db_event = models.Event(
        **event.dict(),
        creator_id=current_user.id
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    # Add creator as participant automatically
    participant = models.EventParticipant(event_id=db_event.id, user_id=current_user.id)
    db.add(participant)
    db.commit()
    return db_event

@router.get("/", response_model=list[schemas.EventResponse])
def list_events(db: Session = Depends(get_db)):
    events = db.query(models.Event).all()
    # Add participant count
    for event in events:
        event.participants_count = db.query(models.EventParticipant).filter(models.EventParticipant.event_id == event.id).count()
    return events

@router.post("/{event_id}/join")
def join_event(event_id: int, db: Session = Depends(get_db), current_user = Depends(auth.get_current_user)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    # Check if already joined
    existing = db.query(models.EventParticipant).filter(
        models.EventParticipant.event_id == event_id,
        models.EventParticipant.user_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already joined")
    # Check capacity
    current_count = db.query(models.EventParticipant).filter(models.EventParticipant.event_id == event_id).count()
    if current_count >= event.max_participants:
        raise HTTPException(status_code=400, detail="Event is full")
    participant = models.EventParticipant(event_id=event_id, user_id=current_user.id)
    db.add(participant)
    db.commit()
    return {"message": "Joined event"}

@router.post("/{event_id}/leave")
def leave_event(event_id: int, db: Session = Depends(get_db), current_user = Depends(auth.get_current_user)):
    participant = db.query(models.EventParticipant).filter(
        models.EventParticipant.event_id == event_id,
        models.EventParticipant.user_id == current_user.id
    ).first()
    if not participant:
        raise HTTPException(status_code=400, detail="Not a participant")
    db.delete(participant)
    db.commit()
    return {"message": "Left event"}