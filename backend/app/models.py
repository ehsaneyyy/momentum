from sqlalchemy import Column, Integer, String, DateTime
from .database import Base
from datetime import datetime

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String)
    location = Column(String)
    time = Column(DateTime, default=datetime.utcnow)
