from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    events_created = relationship("Event", back_populates="creator")
    event_participations = relationship("EventParticipant", back_populates="user")

class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String)
    location = Column(String)       # address or place name
    latitude = Column(String, nullable=True)   # for maps
    longitude = Column(String, nullable=True)
    time = Column(DateTime, default=datetime.utcnow)
    creator_id = Column(Integer, ForeignKey("users.id"))
    max_participants = Column(Integer, default=10)
    is_private = Column(Boolean, default=False)

    creator = relationship("User", back_populates="events_created")
    participants = relationship("EventParticipant", back_populates="event")

class EventParticipant(Base):
    __tablename__ = "event_participants"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    joined_at = Column(DateTime, default=datetime.utcnow)

    event = relationship("Event", back_populates="participants")
    user = relationship("User", back_populates="event_participations")