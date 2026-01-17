"""Workout generation router"""
from fastapi import APIRouter
from app.models.workout import GenerateWorkoutRequest, GeneratedWorkout
from app.services.workout_generation import workout_generation_service

router = APIRouter()


@router.post("/generate-workout", response_model=GeneratedWorkout)
def generate_workout(request: GenerateWorkoutRequest):
    """
    Generate a workout plan based on preferences and survey questions.
    Mock LLM call simulates workout generation.
    """
    workout = workout_generation_service.generate_workout(
        request.preferences, 
        request.survey_questions
    )
    return workout
