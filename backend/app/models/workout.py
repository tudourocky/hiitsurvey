"""Workout-related Pydantic models"""
from typing import List, Optional, Literal, TYPE_CHECKING
from pydantic import BaseModel

if TYPE_CHECKING:
    from .survey import SurveyQuestion
else:
    SurveyQuestion = "SurveyQuestion"  # Forward reference string


class WorkoutPreferences(BaseModel):
    """User workout preferences"""
    time: int  # in minutes
    intensity: Literal["low", "medium", "high"]
    body_part: str  # e.g., "upper", "lower", "full", "arms", "legs", etc.
    equipment_available: Optional[List[str]] = []  # e.g., ["dumbbells", "pull-up bar"]


class Exercise(BaseModel):
    """Exercise model"""
    name: str
    sets: Optional[int] = None
    reps: Optional[int] = None
    duration: Optional[int] = None  # in seconds
    equipment: Optional[str] = None


class ExerciseMapping(BaseModel):
    """Mapping between survey option and exercise"""
    option: str  # The multiple choice option text
    exercise: Exercise


class WorkoutSegment(BaseModel):
    """Workout segment model"""
    question_id: str
    question: str
    question_type: str
    option_exercise_mapping: Optional[List[ExerciseMapping]] = None  # Explicit mapping: option -> exercise
    exercises: List[Exercise] = []  # Keep for backwards compatibility
    is_break: bool = False  # True for short_answer questions


class GeneratedWorkout(BaseModel):
    """Generated workout response model"""
    total_duration: int  # in minutes
    segments: List[WorkoutSegment]
    summary: str


class GenerateWorkoutRequest(BaseModel):
    """Request model for workout generation"""
    preferences: WorkoutPreferences
    survey_questions: List["SurveyQuestion"]
    
    class Config:
        # Allow forward references
        from_attributes = True
