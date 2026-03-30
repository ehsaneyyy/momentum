from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import events

app = FastAPI(title="Momentum API")

# Allow CORS for frontend (adjust for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events.router)

@app.get("/")
def root():
    return {"message": "Momentum API is running"}