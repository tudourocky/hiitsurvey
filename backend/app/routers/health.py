"""Health check router"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def read_root():
    """Root endpoint"""
    return {"message": "HIIT Exercise Detection API"}


@router.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
