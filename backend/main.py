from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional, Literal
import json

app = FastAPI()


class SurveyQuestion(BaseModel):
    id: str
    question: str
    type: Literal["multiple_choice", "short_answer"]
    options: Optional[List[str]] = None  # Only for multiple_choice


class WorkoutPreferences(BaseModel):
    time: int  # in minutes
    intensity: Literal["low", "medium", "high"]
    body_part: str  # e.g., "upper", "lower", "full", "arms", "legs", etc.
    equipment_available: Optional[List[str]] = []  # e.g., ["dumbbells", "pull-up bar"]


class GenerateWorkoutRequest(BaseModel):
    preferences: WorkoutPreferences
    survey_questions: List[SurveyQuestion]


class Exercise(BaseModel):
    name: str
    sets: Optional[int] = None
    reps: Optional[int] = None
    duration: Optional[int] = None  # in seconds
    equipment: Optional[str] = None


class WorkoutSegment(BaseModel):
    question_id: str
    question: str
    question_type: str
    exercises: List[Exercise]  # For MC: different exercises for different answers
    is_break: bool = False  # True for short_answer questions


class GeneratedWorkout(BaseModel):
    total_duration: int  # in minutes
    segments: List[WorkoutSegment]
    summary: str


def mock_llm_generate_workout(preferences: WorkoutPreferences, questions: List[SurveyQuestion]) -> GeneratedWorkout:
    """
    Mock LLM call that generates a workout based on preferences and survey questions.
    In production, this would call Gemini API.
    """
    segments = []
    total_exercises = len(questions)
    
    # Map body parts to exercise categories
    exercise_pool = {
        "upper": ["Push-ups", "Plank", "Shoulder Press", "Bicep Curls", "Tricep Dips", "Pull-ups"],
        "lower": ["Squats", "Lunges", "Jumping Jacks", "Calf Raises", "Leg Raises", "Wall Sit"],
        "full": ["Burpees", "Mountain Climbers", "Jumping Jacks", "Plank", "Squats", "Push-ups"],
        "arms": ["Bicep Curls", "Tricep Dips", "Push-ups", "Plank Hold", "Arm Circles"],
        "legs": ["Squats", "Lunges", "Jumping Jacks", "Calf Raises", "Wall Sit"],
        "core": ["Plank", "Sit-ups", "Crunches", "Russian Twists", "Leg Raises", "Mountain Climbers"]
    }
    
    # Select exercises based on body part
    available_exercises = exercise_pool.get(preferences.body_part.lower(), exercise_pool["full"])
    
    # Calculate exercise parameters based on intensity
    intensity_multiplier = {
        "low": {"sets": 1, "reps": 5, "duration": 20},
        "medium": {"sets": 2, "reps": 10, "duration": 30},
        "high": {"sets": 3, "reps": 15, "duration": 45}
    }
    params = intensity_multiplier[preferences.intensity]
    
    # Time per segment (roughly distribute time across questions)
    time_per_segment = preferences.time // total_exercises if total_exercises > 0 else preferences.time
    
    exercise_index = 0
    for i, question in enumerate(questions):
        if question.type == "short_answer":
            # Short answer questions are breaks
            segments.append(WorkoutSegment(
                question_id=question.id,
                question=question.question,
                question_type="short_answer",
                exercises=[],
                is_break=True
            ))
        else:
            # Multiple choice: assign different exercises to each option
            exercises = []
            for j, option in enumerate(question.options or []):
                exercise_name = available_exercises[exercise_index % len(available_exercises)]
                exercises.append(Exercise(
                    name=exercise_name,
                    sets=params["sets"],
                    reps=params["reps"],
                    equipment=None  # Could map from preferences.equipment_available
                ))
                exercise_index += 1
            
            segments.append(WorkoutSegment(
                question_id=question.id,
                question=question.question,
                question_type="multiple_choice",
                exercises=exercises,
                is_break=False
            ))
    
    summary = f"Generated {len(segments)} workout segments for {preferences.time} minutes of {preferences.intensity} intensity {preferences.body_part} workout."
    
    return GeneratedWorkout(
        total_duration=preferences.time,
        segments=segments,
        summary=summary
    )


@app.get("/")
def read_root():
    return {"message": "Hello World"}


@app.post("/generate-workout", response_model=GeneratedWorkout)
def generate_workout(request: GenerateWorkoutRequest):
    """
    Generate a workout plan based on preferences and survey questions.
    Mock LLM call simulates workout generation.
    """
    workout = mock_llm_generate_workout(request.preferences, request.survey_questions)
    return workout


@app.get("/items/{item_id}")
def read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "q": q}