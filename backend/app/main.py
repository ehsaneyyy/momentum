import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from .routers import events, users, recommendations
from . import models, database

# Create database tables (if not exist)
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Momentum API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://momentum-eight-sigma.vercel.app",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events.router)
app.include_router(users.router)
app.include_router(recommendations.router)


# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, event_id: int):
        await websocket.accept()
        if event_id not in self.active_connections:
            self.active_connections[event_id] = []
        self.active_connections[event_id].append(websocket)

    def disconnect(self, websocket: WebSocket, event_id: int):
        if event_id in self.active_connections:
            self.active_connections[event_id].remove(websocket)

    async def broadcast(self, event_id: int, message: str):
        if event_id in self.active_connections:
            for connection in self.active_connections[event_id]:
                await connection.send_text(message)


manager = ConnectionManager()


# WebSocket endpoint for event chat
@app.websocket("/ws/chat/{event_id}")
async def websocket_chat(websocket: WebSocket, event_id: int):
    await manager.connect(websocket, event_id)
    # Optionally send previous chat messages (implement if needed)
    db = database.SessionLocal()
    # Load last 20 messages from ChatMessage table
    past_messages = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.event_id == event_id)
        .order_by(models.ChatMessage.timestamp.desc())
        .limit(20)
        .all()
    )
    for msg in reversed(past_messages):
        await websocket.send_text(
            json.dumps(
                {
                    "user": {"username": msg.user.username},
                    "message": msg.message,
                    "timestamp": msg.timestamp.isoformat(),
                }
            )
        )
    db.close()

    try:
        while True:
            data = await websocket.receive_text()
            # Broadcast to all clients in the same event room
            await manager.broadcast(event_id, data)
            # (Optional: save message to database here, but frontend also sends via REST)
    except WebSocketDisconnect:
        manager.disconnect(websocket, event_id)
        await manager.broadcast(event_id, "A user left the chat")


@app.get("/")
def root():
    return {"message": "Momentum API is running"}
