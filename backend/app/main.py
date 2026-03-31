from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from .routers import events, users
from . import models, database

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Momentum API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events.router)
app.include_router(users.router)

# WebSocket manager for chat
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}  # event_id -> list of websockets

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

@app.websocket("/ws/chat/{event_id}")
async def websocket_chat(websocket: WebSocket, event_id: int):
    await manager.connect(websocket, event_id)
    try:
        while True:
            data = await websocket.receive_text()
            # In production, you'd save the message to the database here
            await manager.broadcast(event_id, data)
    except WebSocketDisconnect:
        manager.disconnect(websocket, event_id)
        await manager.broadcast(event_id, f"User left chat")

@app.get("/")
def root():
    return {"message": "Momentum API is running"}