from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

# ---------- User Schemas ----------
class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# ---------- Event Schemas ----------
class EventCreate(BaseModel):
    title: str
    description: str
    location: str
    latitude: Optional[str] = None
    longitude: Optional[str] = None
    max_participants: int = 10
    is_private: bool = False
    invite_code: Optional[str] = None   # <-- add this

class EventResponse(EventCreate):
    id: int
    time: datetime
    creator_id: int
    participants_count: int = 0
    invite_code: Optional[str] = None   # <-- ADD THIS

    class Config:
        from_attributes = True

# ---------- Chat Schemas ----------
class ChatMessageCreate(BaseModel):
    event_id: int
    message: str

class ChatMessageResponse(BaseModel):
    id: int
    event_id: int
    user_id: int
    username: str
    message: str
    timestamp: datetime

    class Config:
        from_attributes = True


class JoinWithCodeRequest(BaseModel):
    code: str