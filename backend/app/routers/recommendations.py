from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from .. import database, models, auth
from typing import List

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

@router.get("/events")
def recommend_events(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Get events user already joined
    user_joined = db.query(models.EventParticipant.event_id).filter(
        models.EventParticipant.user_id == current_user.id
    ).all()
    user_joined_ids = {e[0] for e in user_joined}
    
    # If no history, return popular events
    if not user_joined_ids:
        popular = db.query(models.Event).filter(
            models.Event.time > func.now()
        ).order_by(models.Event.participants_count.desc()).limit(10).all()
        return popular
    
    # Find similar users (joined same events)
    similar_users = db.query(
        models.EventParticipant.user_id,
        func.count(models.EventParticipant.event_id).label("common_events")
    ).filter(
        models.EventParticipant.event_id.in_(user_joined_ids),
        models.EventParticipant.user_id != current_user.id
    ).group_by(models.EventParticipant.user_id).all()
    
    if not similar_users:
        popular = db.query(models.Event).filter(
            models.Event.time > func.now()
        ).order_by(models.Event.participants_count.desc()).limit(10).all()
        return popular
    
    similar_user_ids = [u.user_id for u in similar_users]
    # Get events liked by similar users but not current user
    candidate_events = db.query(
        models.EventParticipant.event_id,
        func.count(models.EventParticipant.user_id).label("score")
    ).filter(
        models.EventParticipant.user_id.in_(similar_user_ids),
        models.EventParticipant.event_id.notin_(user_joined_ids)
    ).group_by(models.EventParticipant.event_id).order_by(
        func.count(models.EventParticipant.user_id).desc()
    ).limit(10).all()
    
    if not candidate_events:
        popular = db.query(models.Event).filter(
            models.Event.time > func.now()
        ).order_by(models.Event.participants_count.desc()).limit(10).all()
        return popular
    
    event_ids = [e.event_id for e in candidate_events]
    recommended = db.query(models.Event).filter(models.Event.id.in_(event_ids)).all()
    # Sort by score descending
    score_map = {e.event_id: e.score for e in candidate_events}
    recommended.sort(key=lambda x: score_map.get(x.id, 0), reverse=True)
    return recommended