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

# Create an event
@router.post("/", response_model=schemas.EventResponse)
def create_event(event: schemas.EventCreate, db: Session = Depends(get_db), current_user = Depends(auth.get_current_user)):
    db_event = models.Event(
        **event.dict(),
        creator_id=current_user.id
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    # Auto-join creator as participant
    participant = models.EventParticipant(event_id=db_event.id, user_id=current_user.id)
    db.add(participant)
    db.commit()
    return db_event

# List all events (with participant count)
@router.get("/", response_model=list[schemas.EventResponse])
def list_events(db: Session = Depends(get_db)):
    events = db.query(models.Event).all()
    for event in events:
        event.participants_count = db.query(models.EventParticipant).filter(models.EventParticipant.event_id == event.id).count()
    return events

# Join an event
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

# Leave an event
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

# Delete an event (only creator)
@router.delete("/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db), current_user = Depends(auth.get_current_user)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this event")
    db.delete(event)
    db.commit()
    return {"message": "Event deleted"}

# Get participants for an event
@router.get("/{event_id}/participants")
def get_participants(event_id: int, db: Session = Depends(get_db)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    participants = db.query(models.User).join(
        models.EventParticipant,
        models.User.id == models.EventParticipant.user_id
    ).filter(models.EventParticipant.event_id == event_id).all()
    
    return [{"id": p.id, "username": p.username, "email": p.email} for p in participants]

# Update an event (only creator)
@router.put("/{event_id}", response_model=schemas.EventResponse)
def update_event(event_id: int, updates: schemas.EventCreate, db: Session = Depends(get_db), current_user = Depends(auth.get_current_user)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this event")
    
    for key, value in updates.dict(exclude_unset=True).items():
        setattr(event, key, value)
    db.commit()
    db.refresh(event)
    return event

# Remove a participant from an event (only creator)
@router.post("/{event_id}/remove-participant/{username}")
def remove_participant(event_id: int, username: str, db: Session = Depends(get_db), current_user = Depends(auth.get_current_user)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to remove participants")
    
    user_to_remove = db.query(models.User).filter(models.User.username == username).first()
    if not user_to_remove:
        raise HTTPException(status_code=404, detail="User not found")
    
    participant = db.query(models.EventParticipant).filter(
        models.EventParticipant.event_id == event_id,
        models.EventParticipant.user_id == user_to_remove.id
    ).first()
    if not participant:
        raise HTTPException(status_code=400, detail="User is not a participant")
    
    db.delete(participant)
    db.commit()
    return {"message": f"Removed {username} from event"}


# Get chat messages for an event
@router.get("/{event_id}/messages")
def get_chat_messages(event_id: int, db: Session = Depends(get_db)):
    messages = db.query(models.ChatMessage).filter(
        models.ChatMessage.event_id == event_id
    ).order_by(models.ChatMessage.timestamp.asc()).all()
    return messages

# Save a new chat message (called by frontend)
@router.post("/{event_id}/messages")
def save_chat_message(event_id: int, message_data: dict, db: Session = Depends(get_db), current_user = Depends(auth.get_current_user)):
    new_msg = models.ChatMessage(
        event_id=event_id,
        user_id=current_user.id,
        message=message_data["message"]
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    return new_msg