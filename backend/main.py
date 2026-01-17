"""
Main entry point for the application.
This file imports the FastAPI app from the app package for backward compatibility.
For new deployments, use: uvicorn app.main:app --reload
"""
from app.main import app

__all__ = ["app"]
