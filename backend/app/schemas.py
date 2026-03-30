from pydantic import BaseModel
from datetime import datetime

class EventCreate(BaseModel):
    title: str
    description: str
    location: str

class EventResponse(EventCreate):
    id: int
    time: datetime

    class Config:
        orm_mode = True