"""FastAPI application main file"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import CORS_ORIGINS
from app.routers import health, exercise, workout, survey

# Create FastAPI app
app = FastAPI(
    title="HIIT Exercise Detection API",
    description="API for detecting exercises from video frames and generating workouts",
    version="1.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["health"])
app.include_router(exercise.router, prefix="/api", tags=["exercise"])
app.include_router(workout.router, prefix="/api", tags=["workout"])
app.include_router(survey.router, tags=["survey"])  # No prefix to match frontend expectations
