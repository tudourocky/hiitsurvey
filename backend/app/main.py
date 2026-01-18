"""FastAPI application main file"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import CORS_ORIGINS, CORS_ALLOW_CREDENTIALS
from app.routers import health, exercise, workout, survey, tts
from app.utils.database import connect_to_mongo, close_mongo_connection


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    # Startup
    await connect_to_mongo()
    yield
    # Shutdown
    await close_mongo_connection()


# Create FastAPI app
app = FastAPI(
    title="HIIT Exercise Detection API",
    description="API for detecting exercises from video frames and generating workouts",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend
allow_credentials = CORS_ALLOW_CREDENTIALS
# Browsers reject wildcard origins when credentials are enabled.
if "*" in CORS_ORIGINS:
    allow_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["health"])
app.include_router(exercise.router, prefix="/api", tags=["exercise"])
app.include_router(workout.router, prefix="/api", tags=["workout"])
app.include_router(survey.router, tags=["survey"])  # No prefix to match frontend expectations
app.include_router(tts.router, prefix="/api", tags=["tts"])
