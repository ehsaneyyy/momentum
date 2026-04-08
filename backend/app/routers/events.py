from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import models, schemas, auth
from ..database import SessionLocal
import secrets
import string

router = APIRouter(prefix="/events", tags=["events"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def generate_invite_code():
    return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))

# Create event
@router.post("/", response_model=schemas.EventResponse)
def create_event(event: schemas.EventCreate, db: Session = Depends(get_db), current_user = Depends(auth.get_current_user)):
    invite_code = None
    if event.is_private:
        if event.invite_code and event.invite_code.strip():
            invite_code = event.invite_code.strip().upper()
            # Ensure uniqueness
            while db.query(models.Event).filter(models.Event.invite_code == invite_code).first():
                invite_code = generate_invite_code()  # fallback if duplicate
        else:
            invite_code = generate_invite_code()
    db_event = models.Event(
        **event.dict(exclude={'invite_code'}),
        creator_id=current_user.id,
        invite_code=invite_code
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    # Auto-join creator
    participant = models.EventParticipant(event_id=db_event.id, user_id=current_user.id)
    db.add(participant)
    db.commit()
    return db_event

# List all events
@router.get("/", response_model=list[schemas.EventResponse])
def list_events(db: Session = Depends(get_db)):
    events = db.query(models.Event).all()
    for event in events:
        event.participants_count = db.query(models.EventParticipant).filter(models.EventParticipant.event_id == event.id).count()
    return events

# Get single event
@router.get("/{event_id}", response_model=schemas.EventResponse)
def get_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    event.participants_count = db.query(models.EventParticipant).filter(models.EventParticipant.event_id == event.id).count()
    return event

# Join an event (public only – private events must use /join-with-code)
@router.post("/{event_id}/join")
def join_event(event_id: int, db: Session = Depends(get_db), current_user = Depends(auth.get_current_user)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Private events cannot be joined via this endpoint
    if event.is_private:
        raise HTTPException(status_code=403, detail="Private event – use invitation code")
    
    # Check if already joined
    existing = db.query(models.EventParticipant).filter(
        models.EventParticipant.event_id == event_id,
        models.EventParticipant.user_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already joined")
    
    # Capacity check
    current_count = db.query(models.EventParticipant).filter(models.EventParticipant.event_id == event_id).count()
    if current_count >= event.max_participants:
        raise HTTPException(status_code=400, detail="Event is full")
    
    participant = models.EventParticipant(event_id=event_id, user_id=current_user.id)
    db.add(participant)
    db.commit()
    return {"message": "Joined event"}

# Join private event with invitation code
@router.post("/{event_id}/join-with-code")
def join_private_event(event_id: int, req: schemas.JoinWithCodeRequest, db: Session = Depends(get_db), current_user = Depends(auth.get_current_user)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if not event.is_private:
        raise HTTPException(status_code=400, detail="Event is not private")
    if event.invite_code != req.code:
        raise HTTPException(status_code=403, detail="Invalid invitation code")
    
    # Check if already joined
    existing = db.query(models.EventParticipant).filter(
        models.EventParticipant.event_id == event_id,
        models.EventParticipant.user_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already joined")
    
    # Capacity check
    current_count = db.query(models.EventParticipant).filter(models.EventParticipant.event_id == event_id).count()
    if current_count >= event.max_participants:
        raise HTTPException(status_code=400, detail="Event is full")
    
    participant = models.EventParticipant(event_id=event_id, user_id=current_user.id)
    db.add(participant)
    db.commit()
    return {"message": "Joined private event"}

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

# Delete event
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

# Get participants
@router.get("/{event_id}/participants")
def get_participants(event_id: int, db: Session = Depends(get_db)):
    participants = db.query(models.User).join(models.EventParticipant).filter(models.EventParticipant.event_id == event_id).all()
    return [{"username": p.username, "first_name": p.first_name, "last_name": p.last_name} for p in participants]

# Update event
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

# Remove participant
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

# Get chat messages
@router.get("/{event_id}/messages")
def get_chat_messages(event_id: int, db: Session = Depends(get_db)):
    messages = db.query(models.ChatMessage).filter(models.ChatMessage.event_id == event_id).order_by(models.ChatMessage.timestamp.asc()).all()
    return messages

# Save chat message
@router.post("/{event_id}/messages")
def save_chat_message(event_id: int, message_data: schemas.ChatMessageCreate, db: Session = Depends(get_db), current_user = Depends(auth.get_current_user)):
    new_msg = models.ChatMessage(event_id=event_id, user_id=current_user.id, message=message_data.message)
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    return new_msg